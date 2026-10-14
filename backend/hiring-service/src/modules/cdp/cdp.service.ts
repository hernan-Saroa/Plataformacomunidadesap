import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';

import { Cdp, CdpAntesDeRadicar, EstadoCdp, ESTADOS_CDP_EN_CURSO } from '../../entities/cdp.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Actividad, ActividadExcluida, ETAPA_CDP } from '../../entities/actividad.entity';
import { ETAPA_RECEPCION } from '../../entities/recepcion-ofertas.entity';
import { ETAPA_LIQUIDACION } from '../../entities/informe-final.entity';
import { Proceso } from '../../entities/proceso.entity';
import { EstadoActividad, ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { DocumentoProceso } from '../../entities/documento-proceso.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { AlcanceService } from '../../auth/alcance.service';
import {
  ExpedirCdpConSoporteDto,
  ExpedirCdpDto,
  GuardarCdpAntesDeRadicarDto,
  RechazarCdpDto,
  RegistrarCdpExistenteDto,
  SolicitarCdpAnticipadoDto,
  SolicitarCdpDto,
  VerificarCdpDto,
} from './dto/cdp.dto';
import { CierreActividadService } from '../cierre-actividad/cierre-actividad.service';
import { respondeElAsignado } from '../participacion/quien-responde';
import { FirmaOtpDto } from '../cierre-actividad/dto/firma-otp.dto';
/**
 * Días que una solicitud de CDP puede estar sin que nadie la atienda.
 *
 * Tres y no dos: la solicitud llega a una bandeja compartida de otra dirección,
 * que no está mirando el expediente como sí lo está quien tomó el proceso. Y
 * tres y no treinta: esto no anticipa una fecha futura, cuenta un trámite que
 * ya está detenido. Sin CDP expedido el proceso no puede abrirse, así que lo
 * que se acumula aquí frena la etapa 5.
 *
 * Un solo número para los dos sitios que lo dicen: la bandeja marca con él qué
 * solicitudes van demoradas y el correo diario declara con él cuáles están «sin
 * atender». Si fueran dos constantes, la pantalla y el aviso acabarían
 * discrepando sobre la misma solicitud.
 */
export const TOLERANCIA_CDP_SIN_ATENDER = 3;

/**
 * Los tres montones de la bandeja, a partir de las solicitudes abiertas.
 *
 * Se separa del servicio porque es la decisión, no la consulta: qué es «mío» y
 * qué está «sin tomar» es lo que hace que dos personas no trabajen la misma
 * solicitud, y tiene que poder fijarse sin una base de datos delante.
 *
 * De quién es cada una se decide por `usuarioId` y no por el nombre: dos
 * personas pueden llamarse igual, y el nombre que guarda la participación es
 * una copia del día en que se tomó la solicitud.
 */
export function repartirLaBandeja(solicitudes: SolicitudEnBandeja[], usuarioId?: string) {
  const esMia = (s: SolicitudEnBandeja) => !!usuarioId && s.financieraId === usuarioId;
  const sinFinancieraId = ({ financieraId, ...resto }: SolicitudEnBandeja) => resto;

  return {
    sinTomar: solicitudes.filter((s) => !s.financieraId).map(sinFinancieraId),
    mias: solicitudes.filter(esMia).map(sinFinancieraId),
    /**
     * Las que lleva otro compañero. No se ocultan: la bandeja es compartida y
     * saber que algo ya está atendido —y por quién— es justo lo que evita que
     * dos personas trabajen la misma solicitud.
     */
    deOtros: solicitudes.filter((s) => s.financieraId && !esMia(s)).map(sinFinancieraId),
  };
}

/**
 * Una solicitud de CDP tal como la ve la Dirección Financiera en su bandeja.
 *
 * `financieraId` es de uso interno —reparte las solicitudes en los tres
 * montones— y no sale hacia la pantalla: allí basta con de qué montón vino y,
 * si la lleva alguien, su nombre en `aCargoDe`.
 */
export interface SolicitudEnBandeja {
  financieraId: string | null;
  procesoId: string;
  radicado: string;
  objeto: string;
  modalidad: string | null;
  valor: number | null;
  valorEsEstimado: boolean;
  rubro: string | null;
  estado: EstadoCdp;
  solicitadoPor: string | null;
  solicitadoAt: string;
  diasEsperando: number;
  demorada: boolean;
  aCargoDe: string | null;
}

/** `numeric` llega del driver como string; la bandeja lo devuelve ya en número. */
function aNumeroONulo(valor: string | number | null): number | null {
  if (valor === null || valor === undefined) return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/**
 * Con qué rubro se queda el CDP, entre el que llega y el que ya tenía.
 *
 * Lo usan la verificación y la expedición, y de que sea el mismo criterio
 * depende que la 4.3 no contradiga lo que la 4.2 certificó:
 *
 *   · lo que llega manda, porque es una corrección deliberada;
 *   · lo que no llega no borra: omitir el campo al expedir conserva el rubro
 *     verificado, en vez de dejar el certificado sin imputación;
 *   · en blanco es no haber escrito nada, no haber escrito «ningún rubro».
 *
 * Devuelve `null` cuando no hay ninguno de los dos, que es lo que el servicio
 * traduce en pedirlo: sin rubro el certificado no se concilia con la ejecución
 * presupuestal.
 */
export function rubroResultante(
  recibido: string | undefined | null,
  actual: string | null,
): string | null {
  return recibido?.trim() || actual || null;
}

/**
 * La actividad en que la Financiera trabaja el CDP: verifica, expide y adjunta.
 *
 * Desde la 096 son una sola —antes eran la 4.2, la 4.3 y la 4.4—, así que el
 * certificado y su soporte quedan en el expediente bajo este numeral.
 */
export const NUMERAL_EXPEDICION_CDP = '4.2';

/**
 * La etapa que termina justo antes del CDP: los estudios previos.
 *
 * Se escribe en función de `ETAPA_CDP` y no como un 3 suelto porque lo que la
 * regla dice es «cuando termina la etapa anterior», no «cuando termina la tres».
 */
const ETAPA_PREVIA_AL_CDP = ETAPA_CDP - 1;

/**
 * Quién figura como autor de lo que hace el sistema solo.
 *
 * El mismo rótulo que usa el aviso diario de vencimientos, para que la
 * trazabilidad distinga de un vistazo una actuación automática de una que pidió
 * una persona.
 */
const AUTOR_AUTOMATICO = 'Sistema';

/**
 * Actividad 5.7 de la matriz: la apertura del proceso.
 *
 * Está en la etapa 5 y no en la 4, así que el bloqueo por CDP cruza etapas.
 */
export const NUMERAL_APERTURA = '5.7';
export const ETAPA_APERTURA = 5;

/** Actividad 5.1: elaboración de los documentos del proceso. */
export const NUMERAL_DOCUMENTOS = '5.1';

/**
 * La única modalidad con la regla de orden reforzada del CDP (RF-EST-06).
 *
 * Es una constante y no un parámetro porque la excepción viene del requisito,
 * no de una política que la entidad pueda cambiar.
 */
export const MODALIDAD_CONTRATACION_DIRECTA = 'CONTRATACION_DIRECTA';

/**
 * Etapas con actividades ya construidas.
 *
 * El riel muestra estas y no solo la etapa en curso: si únicamente listara la
 * actual, un proceso en la etapa 3 no tendría por dónde llegar al CDP.
 *
 * La 5 entra con EFDS-1150 (publicación del proyecto de pliego). Sus otras
 * actividades sembradas —5.1 y 5.7— aparecen en el riel sin panel propio
 * todavía, que es la verdad de lo entregado: existen en la matriz y aún no se
 * trabajan desde aquí.
 *
 * La 6 entra con EFDS-1155 (recepción de ofertas) y EFDS-1156 (comité
 * evaluador). Esta lista es el filtro real del riel: sembrar la actividad en
 * `hiring.actividades` no basta, porque lo que no esté en estas etapas no se
 * devuelve y la pantalla no tiene cómo llegar a ella.
 *
 * La 7 entra con EFDS-1159 (adjudicación) y EFDS-1160 (declaratoria desierta),
 * y la 8 con EFDS-1161 (contrato electrónico), EFDS-1162 (suscripción) y
 * EFDS-1164 (garantías y ARL). Las dos llegaron por caminos distintos y con el
 * mismo olvido: sus paneles y su API estaban construidos y probados, pero la
 * etapa no figuraba aquí y el riel no tenía cómo mostrarla. Es la tercera vez
 * que pasa —ya había pasado con la 6— y por eso ahora cada etapa entra con su
 * prueba de que llega al riel.
 *
 * La declaratoria desierta no suma numeral —la matriz no le da uno—: se trabaja
 * desde el panel de la 7.1 a la 7.4.
 *
 * La 9 entra con EFDS-1167 (acta de inicio) y EFDS-1170 (trámite de pagos), y
 * la 10 con EFDS-1171 (informe final). De las dos solo tienen panel las
 * actividades construidas —9.1, 9.4 y 10.1—; las demás aparecen en el riel sin
 * él, que es la verdad de lo entregado.
 */
export const ETAPA_ADJUDICACION = 7;
export const ETAPA_LEGALIZACION = 8;

/**
 * La 9 entra con EFDS-1167: la reunión de inicio (9.1) da comienzo a la
 * ejecución, y sin la etapa en esta lista el riel no la devolvería y la
 * actividad quedaría construida pero inalcanzable desde la pantalla.
 */
export const ETAPA_EJECUCION = 9;

export const ETAPAS_ENTREGADAS = [
  3,
  ETAPA_CDP,
  ETAPA_APERTURA,
  ETAPA_RECEPCION,
  ETAPA_ADJUDICACION,
  ETAPA_LEGALIZACION,
  ETAPA_EJECUCION,
  ETAPA_LIQUIDACION,
];

/** Lo que deja multer de un archivo recibido. */
interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/** Transiciones válidas del ciclo. Lo que no esté aquí, no se puede hacer. */
const TRANSICIONES: Record<EstadoCdp, EstadoCdp[]> = {
  SOLICITADO: ['VERIFICADO', 'RECHAZADO', 'ANULADO'],
  VERIFICADO: ['EXPEDIDO', 'RECHAZADO', 'ANULADO'],
  EXPEDIDO: ['ANULADO'],
  RECHAZADO: [],
  ANULADO: [],
};

/**
 * Valida un salto de estado del CDP.
 *
 * Función pura y exportada: es la regla que impide, por ejemplo, expedir un CDP
 * que nadie verificó, y conviene poder probarla sin base de datos.
 */
export function puedeTransicionar(desde: EstadoCdp, hacia: EstadoCdp): boolean {
  return TRANSICIONES[desde]?.includes(hacia) ?? false;
}

/**
 * El CDP debe cubrir el valor estimado del proceso.
 *
 * Un CDP por debajo del estimado no alcanza a respaldar el gasto, y el error es
 * fácil de cometer al teclear una cifra larga. Se avisa en vez de bloquear: la
 * cuantía definitiva puede bajar respecto del estimado, y esa decisión es de la
 * Dirección Financiera, no del sistema.
 */
export function cdpCubreElProceso(
  valorCdp: number | null,
  valorEstimado: number | null,
): { cubre: boolean; advertencia: string | null } {
  if (valorCdp === null || valorEstimado === null) {
    return { cubre: true, advertencia: null };
  }
  if (valorCdp >= valorEstimado) return { cubre: true, advertencia: null };
  return {
    cubre: false,
    advertencia:
      'El valor del CDP es inferior al valor estimado del proceso; confirma que el respaldo presupuestal alcanza',
  };
}

/**
 * Si una etapa no tiene nada pendiente, dados los estados de lo que le aplica.
 *
 * Función pura y exportada, como `puedeTransicionar`: de esto depende que el
 * CDP se radique solo, y es la clase de regla que hay que poder fijar sin base
 * de datos —qué cuenta como «cerrada» es una decisión, no una consulta—.
 *
 * Cierran la etapa dos estados: `APROBADO`, que es el trabajo hecho, y
 * `NO_APLICA`, que es el trabajo que nunca hubo porque la modalidad lo excluye.
 * Los demás la dejan abierta, incluida `NEGADO`: una actividad negada no es una
 * etapa terminada, es un proceso que murió, y ese ni siquiera llega aquí.
 *
 * `undefined` es la actividad que la matriz declara pero que el proceso todavía
 * no tiene instanciada, y deja la etapa abierta: falta por hacerse.
 *
 * Una lista vacía no es «todo cerrado». Es una matriz a medio parametrizar, y
 * darla por terminada radicaría un CDP en un proceso que no ha recorrido nada.
 */
export function laEtapaCerro(estados: (EstadoActividad | undefined)[]): boolean {
  if (estados.length === 0) return false;
  return estados.every((estado) => estado === 'APROBADO' || estado === 'NO_APLICA');
}

/**
 * Si el estudio previo se puede enviar a revisión por el lado del CDP.
 *
 * Función pura, como `laEtapaCerro`: es la regla que el backend impone al
 * enviar y la que la pantalla anuncia antes, y tiene que poder fijarse sin base
 * de datos. Basta con un CDP en curso —solicitado, verificado o expedido—
 * (decisión de Juan): el área no espera a la Financiera para radicar.
 */
export function cdpPermiteRadicar(estado: {
  aplica: boolean;
  obligatorio: boolean;
  enCurso: boolean;
}): { permite: boolean; motivo: string | null } {
  if (!estado.aplica || !estado.obligatorio || estado.enCurso) {
    return { permite: true, motivo: null };
  }
  return {
    permite: false,
    motivo:
      'Antes de enviar el estudio previo a revisión gestiona el CDP: solicítalo o registra el que ya tienes.',
  };
}

@Injectable()
export class CdpService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cierre: CierreActividadService,
    /** Qué puede hacer quien consulta en la etapa 4 (migración 083). */
    private readonly alcance: AlcanceService,
  ) {}

  /**
   * Si la modalidad del proceso pasa por el CDP.
   *
   * Se resuelve contra la matriz y no con una constante: enajenación por
   * subasta es hoy la única exenta, pero la exclusión es un dato de la matriz y
   * mañana puede cambiar sin tocar código.
   */
  async aplicaCdp(modalidad: string | null, em?: EntityManager): Promise<boolean> {
    if (!modalidad) return true;
    const repo = (em ?? this.dataSource.manager).getRepository(ActividadExcluida);
    const excluidas = await repo.count({
      where: { modalidad, numeral: In(await this.numeralesEtapa4(em)) },
    });
    // Excluida de todas las actividades de la etapa: la modalidad no lleva CDP.
    return excluidas === 0;
  }

  private async numeralesEtapa4(em?: EntityManager): Promise<string[]> {
    const repo = (em ?? this.dataSource.manager).getRepository(Actividad);
    const filas = await repo.find({ where: { etapa: ETAPA_CDP }, order: { orden: 'ASC' } });
    return filas.map((a) => a.numeral);
  }

  /**
   * Actividades de una etapa del proceso, con el estado de cada una.
   *
   * El riel de la interfaz se alimenta de aquí y no de una lista en el bundle:
   * la matriz tiene 63 actividades y corregir el nombre de una no debería
   * exigir un despliegue del microfrontend.
   */
  async actividadesDelProceso(procesoId: string, etapa?: number) {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);

    // Sin etapa se devuelve todo el camino entregado hasta hoy, no solo la
    // etapa en curso: el riel tiene que dejar ver lo que sigue, o no habría
    // cómo llegar al CDP desde un proceso que todavía está en la etapa 3.
    const etapas = etapa !== undefined ? [etapa] : ETAPAS_ENTREGADAS;

    const [actividades, excluidas, instanciadas] = await Promise.all([
      this.dataSource.getRepository(Actividad).find({
        where: { etapa: In(etapas), activa: true },
        order: { etapa: 'ASC', orden: 'ASC' },
      }),
      proceso.modalidad
        ? this.dataSource
            .getRepository(ActividadExcluida)
            .find({ where: { modalidad: proceso.modalidad } })
        : Promise.resolve([]),
      this.dataSource
        .getRepository(ProcesoActividad)
        .find({ where: { procesoId } }),
    ]);

    const noAplica = new Set(excluidas.map((e) => e.numeral));
    const porNumeral = new Map(instanciadas.map((a) => [a.numeral, a]));

    return actividades.map((a) => {
      const propia = porNumeral.get(a.numeral);
      return {
        numeral: a.numeral,
        nombre: a.nombre,
        descripcion: a.descripcion,
        etapa: a.etapa,
        // Se listan tachadas en vez de ocultarse: que la matriz las marque NO
        // para esta modalidad es información, no un hueco.
        aplica: !noAplica.has(a.numeral),
        estado: propia?.estado ?? null,
        actualizadoEn: propia?.updatedAt ?? null,
        // El cargo que Configuración le puso, si le puso uno: manda sobre los
        // roles del alcance para decir a quién le toca.
        responsableCargo: a.responsableCargo,
        // Si de ella responde una persona del proceso y no los roles.
        responde: respondeElAsignado(a.numeral),
      };
    });
  }

  /** Actividades de la etapa 4 que aplican a la modalidad del proceso. */
  async actividadesDeLaEtapa(modalidad: string | null, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    const actividades = await manager.getRepository(Actividad).find({
      where: { etapa: ETAPA_CDP, activa: true },
      order: { orden: 'ASC' },
    });
    if (!modalidad) return actividades;

    const excluidas = new Set(
      (await manager.getRepository(ActividadExcluida).find({ where: { modalidad } })).map(
        (e) => e.numeral,
      ),
    );
    return actividades.filter((a) => !excluidas.has(a.numeral));
  }

  /**
   * Crea las actividades 4.1 a 4.4 del proceso.
   *
   * Idempotente: la tabla tiene único (proceso, numeral), y volver a llamarlo
   * tras un reintento no debe duplicar ni fallar.
   */
  async instanciarEtapa4(em: EntityManager, proceso: Proceso): Promise<ProcesoActividad[]> {
    const actividades = await this.actividadesDeLaEtapa(proceso.modalidad, em);
    if (actividades.length === 0) return [];

    const existentes = new Set(
      (
        await em.getRepository(ProcesoActividad).find({
          where: { procesoId: proceso.id, numeral: In(actividades.map((a) => a.numeral)) },
        })
      ).map((a) => a.numeral),
    );

    const nuevas = actividades
      .filter((a) => !existentes.has(a.numeral))
      .map((a) =>
        em.create(ProcesoActividad, {
          procesoId: proceso.id,
          numeral: a.numeral,
          estado: 'BORRADOR' as const,
          datos: {},
        }),
      );

    return nuevas.length > 0 ? em.save(nuevas) : [];
  }

  /**
   * CDP en curso del proceso, o null si nunca se solicitó o quedó cerrado.
   *
   * `modificacionId` nulo: desde EFDS-1176 una adición trae su propio CDP, y sin
   * este filtro la apertura del proceso podría quedar respaldada por el CDP de
   * una adición tramitada meses después.
   */
  async delProceso(procesoId: string, em?: EntityManager): Promise<Cdp | null> {
    const manager = em ?? this.dataSource.manager;
    return manager.getRepository(Cdp).findOne({
      where: { procesoId, estado: In(ESTADOS_CDP_EN_CURSO), modificacionId: IsNull() },
    });
  }

  /**
   * Estado del respaldo presupuestal del proceso, en la forma que necesitan las
   * validaciones de apertura (EFDS-1340) y de contratación directa (EFDS-1341).
   */
  async estadoRespaldo(procesoId: string, em?: EntityManager, acceso?: HiringAccess) {
    const manager = em ?? this.dataSource.manager;
    const proceso = await manager.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');

    // Quién puede hacer qué lo responde el backend, que ya tiene los roles del
    // token. Si la pantalla lo dedujera por su cuenta, ofrecería botones que la
    // API rechaza con un 403 cuando ya es tarde.
    const permisos = {
      puedeSolicitar: await this.alcance.puedeEn(acceso, 'editar', '4.1'),
      puedeGestionar: await this.alcance.puedeEn(acceso, 'editar', '4.2'),
    };

    const aplica = await this.aplicaCdp(proceso.modalidad, em);
    if (!aplica) {
      // No lleva CDP, así que nada la frena por este lado. `expedido` queda en
      // false porque es la verdad —no existe ningún certificado— y quien
      // decide si el proceso avanza es `puedeAbrirse`.
      return {
        aplica: false,
        cdp: null,
        expedido: false,
        soporteAdjunto: false,
        puedeAbrirse: true,
        motivo: null,
        ...permisos,
      };
    }

    const cdp = await this.delProceso(procesoId, em);
    const expedido = cdp?.estado === 'EXPEDIDO';

    return {
      aplica: true,
      cdp,
      /** Existe el certificado: la partida quedó apartada para el proceso. */
      expedido,
      // Se reporta aparte de `expedido` a propósito: la apertura la habilita el
      // certificado, no su PDF. Que falte el adjunto deja abierta la actividad
      // 4.4, pero no frena el proceso.
      soporteAdjunto: cdp?.documentoId !== null && cdp?.documentoId !== undefined,
      /** La pregunta que de verdad hace quien consume esto. */
      puedeAbrirse: expedido,
      motivo: expedido
        ? null
        : cdp
          ? `El CDP del proceso está en estado ${cdp.estado} y aún no ha sido expedido`
          : 'El proceso no tiene CDP solicitado',
      ...permisos,
    };
  }

  /** Cambia el estado del CDP validando que el salto sea legítimo. */
  async transicionar(cdp: Cdp, hacia: EstadoCdp) {
    if (!puedeTransicionar(cdp.estado, hacia)) {
      throw new BadRequestException(
        `Un CDP en estado ${cdp.estado} no puede pasar a ${hacia}`,
      );
    }
    cdp.estado = hacia;
    cdp.updatedAt = new Date();
    return cdp;
  }

  // --------------------------------------------------------- ciclo (4.1-4.2)

  /**
   * Actividad 4.1: el área solicitante radica la solicitud formal.
   *
   * Aquí nacen también las actividades de la etapa, porque es el momento en que
   * el proceso entra de verdad a la etapa 4.
   */
  async solicitar(procesoId: string, dto: SolicitarCdpDto, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);

      if (!(await this.aplicaCdp(proceso.modalidad, em))) {
        throw new BadRequestException(
          'Esta modalidad no requiere CDP: la entidad no compromete gasto',
        );
      }

      const enCurso = await this.delProceso(procesoId, em);
      if (enCurso) {
        throw new ConflictException(
          `El proceso ya tiene un CDP en estado ${enCurso.estado}`,
        );
      }

      await this.instanciarEtapa4(em, proceso);

      // Radicar la solicitud es lo que mete al proceso en la etapa 4. Sin esto
      // el proceso se quedaría en la 3 con su CDP en curso, y el stepper
      // mostraría una etapa que ya no es la que se está trabajando.
      if (proceso.etapa < ETAPA_CDP) {
        proceso.etapa = ETAPA_CDP;
        await em.save(proceso);
      }

      const cdp = await em.save(
        em.create(Cdp, {
          procesoId,
          rubro: dto.rubro,
          valor: dto.valor,
          vigenciaFiscal: dto.vigenciaFiscal ?? new Date().getFullYear(),
          observaciones: dto.observaciones ?? null,
          estado: 'SOLICITADO' as const,
          solicitadoPor: acceso.userName,
          solicitadoAt: new Date(),
        }),
      );

      await this.cerrarActividad(em, procesoId, '4.1', proceso.modalidad ?? null, acceso, dto.firma);
      await this.traza(em, procesoId, cdp.id, 'SOLICITAR', acceso, {
        rubro: dto.rubro,
        valor: dto.valor,
      });

      return this.conAdvertencia(cdp, proceso);
    });
  }

  /**
   * La Dirección Financiera verifica la disponibilidad (paso de la 4.2).
   *
   * No cierra la actividad: desde la 096 la 4.2 termina al expedir, y el
   * certificado se verifica y se expide en el mismo formulario
   * (`expedirConSoporte`). Se conserva como paso suelto de la API.
   *
   * Verificar es decir contra qué rubro hay saldo, no pulsar un botón. Hasta la
   * 073 no se guardaba ninguno y el expediente quedaba afirmando una
   * disponibilidad que no se podía conciliar con la ejecución presupuestal.
   *
   * El rubro solo se exige si el CDP no lo trae: el área pudo adelantarlo al
   * radicar a mano, y pedirlo otra vez sería pedir dos veces el mismo dato. La
   * solicitud automática nunca lo trae —el estudio previo no lo captura— así
   * que en la práctica es aquí donde entra.
   */
  async verificar(procesoId: string, dto: VerificarCdpDto, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      const cdp = await this.exigirCdp(em, procesoId);

      const rubro = rubroResultante(dto.rubro, cdp.rubro);
      if (!rubro) {
        throw new BadRequestException(
          'Indica el rubro presupuestal contra el que verificas la disponibilidad',
        );
      }

      await this.transicionar(cdp, 'VERIFICADO');
      cdp.rubro = rubro;
      await em.save(cdp);

      await this.traza(em, procesoId, cdp.id, 'VERIFICAR', acceso, { rubro });

      return this.conAdvertencia(cdp, proceso);
    });
  }

  /**
   * Se expide el CDP y queda afectado al proceso; cierra la 4.2.
   *
   * Mientras no exista la integración con KLIC (EFDS-1343), el número y el
   * valor se registran a mano con el soporte que expide la Financiera.
   */
  async expedir(procesoId: string, dto: ExpedirCdpDto, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      const cdp = await this.exigirCdp(em, procesoId);

      // Se acepta para corregirlo —al buscar el saldo la Financiera pudo acabar
      // imputando a otro rubro—, no para volver a pedirlo: omitirlo conserva el
      // que se verificó. Si tampoco lo hubo allí, el certificado no puede
      // salir: sin rubro no se concilia con la ejecución (restricción de la 073).
      const rubro = rubroResultante(dto.rubro, cdp.rubro);
      if (!rubro) {
        throw new BadRequestException(
          'Indica el rubro presupuestal que afecta el certificado',
        );
      }

      await this.transicionar(cdp, 'EXPEDIDO');
      cdp.numero = dto.numero;
      cdp.valor = dto.valor;
      cdp.rubro = rubro;
      cdp.fechaExpedicion = dto.fechaExpedicion;
      cdp.vigenciaFiscal = dto.vigenciaFiscal ?? cdp.vigenciaFiscal;
      cdp.expedidoPor = acceso.userName;
      await em.save(cdp);

      await this.cerrarActividad(
        em,
        procesoId,
        NUMERAL_EXPEDICION_CDP,
        proceso.modalidad ?? null,
        acceso,
        dto.firma,
      );
      await this.traza(em, procesoId, cdp.id, 'EXPEDIR', acceso, {
        numero: dto.numero,
        valor: dto.valor,
        rubro,
      });

      return this.conAdvertencia(cdp, proceso);
    });
  }

  /** No hay disponibilidad en el rubro: el ciclo se cierra con su motivo. */
  async rechazar(procesoId: string, dto: RechazarCdpDto, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      const cdp = await this.exigirCdp(em, procesoId);

      await this.transicionar(cdp, 'RECHAZADO');
      cdp.observaciones = dto.observaciones;
      await em.save(cdp);

      await this.traza(em, procesoId, cdp.id, 'RECHAZAR', acceso, {
        observaciones: dto.observaciones,
      });

      return this.conAdvertencia(cdp, proceso);
    });
  }

  /**
   * Actividad 4.2: la Financiera verifica, expide y adjunta el CDP de una vez.
   *
   * Desde la 096 es una sola actividad. Quien verifica la disponibilidad ya
   * tiene el certificado en la mano, y partirlo en tres pantallas solo
   * obligaba a firmar tres veces lo mismo. Todo va en una transacción: un
   * certificado expedido sin su soporte, o un soporte de un CDP que no llegó a
   * expedirse, es justo el expediente a medias que esto quiere evitar.
   *
   * Acepta el CDP solicitado o ya verificado: los procesos que pasaron por la
   * 4.2 antes de la 096 llegan verificados y les falta lo demás.
   */
  async expedirConSoporte(
    procesoId: string,
    dto: ExpedirCdpConSoporteDto,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    return this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      const cdp = await this.exigirCdp(em, procesoId);

      const rubro = rubroResultante(dto.rubro, cdp.rubro);
      if (!rubro) {
        throw new BadRequestException(
          'Indica el rubro presupuestal que afecta el certificado',
        );
      }

      const verificadoAqui = cdp.estado === 'SOLICITADO';
      if (verificadoAqui) await this.transicionar(cdp, 'VERIFICADO');
      await this.transicionar(cdp, 'EXPEDIDO');

      const documento = await this.guardarSoporte(em, procesoId, archivo, hash, acceso);

      cdp.numero = dto.numero;
      cdp.valor = dto.valor;
      cdp.rubro = rubro;
      cdp.fechaExpedicion = dto.fechaExpedicion;
      cdp.vigenciaFiscal = dto.vigenciaFiscal ?? cdp.vigenciaFiscal;
      cdp.expedidoPor = acceso.userName;
      cdp.documentoId = documento.id;
      await em.save(cdp);

      await this.cerrarActividad(
        em,
        procesoId,
        NUMERAL_EXPEDICION_CDP,
        proceso.modalidad ?? null,
        acceso,
        dto.firma,
      );
      if (verificadoAqui) {
        await this.traza(em, procesoId, cdp.id, 'VERIFICAR', acceso, { rubro });
      }
      await this.traza(em, procesoId, cdp.id, 'EXPEDIR', acceso, {
        numero: dto.numero,
        valor: dto.valor,
        rubro,
      });
      await this.traza(em, procesoId, cdp.id, 'ADJUNTAR', acceso, {
        documento: documento.id,
        nombre: archivo.originalname,
      });

      return { ...this.conAdvertencia(cdp, proceso), documento };
    });
  }

  /**
   * Carga el soporte de un CDP que ya se expidió sin él.
   *
   * Queda para los procesos que expidieron por la 4.3 antes de la 096 y no
   * llegaron a la 4.4: desde entonces el soporte va con la expedición. No
   * cierra ninguna actividad —la 4.2 la cerró la expedición—.
   *
   * Se exige el CDP expedido: el soporte prueba lo que el registro afirma.
   */
  async adjuntarSoporte(
    procesoId: string,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    return this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      const cdp = await this.exigirCdp(em, procesoId);

      if (cdp.estado !== 'EXPEDIDO') {
        throw new ConflictException(
          `El CDP está en estado ${cdp.estado}: el soporte se adjunta una vez expedido`,
        );
      }

      const documento = await this.guardarSoporte(em, procesoId, archivo, hash, acceso);

      // El vínculo va en el dato y no por convención de numeral: si mañana se
      // anula este CDP y se expide otro, cada uno conserva su propio soporte.
      cdp.documentoId = documento.id;
      cdp.updatedAt = new Date();
      await em.save(cdp);

      await this.traza(em, procesoId, cdp.id, 'ADJUNTAR', acceso, {
        documento: documento.id,
        nombre: archivo.originalname,
      });

      return { ...this.conAdvertencia(cdp, proceso), documento };
    });
  }

  private async guardarSoporte(
    em: EntityManager,
    procesoId: string,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ): Promise<Documento> {
    const expediente = await em.findOne(Expediente, { where: { procesoId } });
    if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

    return em.save(
      em.create(Documento, {
        expedienteId: expediente.id,
        numeral: NUMERAL_EXPEDICION_CDP,
        tipo: 'ADJUNTO',
        nombre: archivo.originalname,
        archivoUrl: `hiring/files/${archivo.filename}`,
        archivoNombreOriginal: archivo.originalname,
        archivoMimeType: archivo.mimetype,
        archivoTamano: archivo.size,
        hashSha256: hash,
        subidoPor: acceso.userName,
      } as Partial<Documento>),
    );
  }

  // ------------------------------------- gestión desde el estudio previo ---

  /**
   * Si el estudio previo de la modalidad exige el CDP antes de enviarse.
   *
   * Sin fila es opcional: es el comportamiento de antes de la 100, y una
   * modalidad nueva no debe quedar frenada porque nadie la configuró todavía.
   */
  async exigeCdpAntesDeRadicar(modalidad: string | null, em?: EntityManager): Promise<boolean> {
    if (!modalidad) return false;
    const fila = await (em ?? this.dataSource.manager)
      .getRepository(CdpAntesDeRadicar)
      .findOne({ where: { modalidad } });
    return fila?.obligatorio === true;
  }

  /**
   * El CDP tal como se ve desde el estudio previo: si aplica, si es
   * obligatorio para radicar, el que está en curso y el último que se cayó.
   *
   * El rechazado se devuelve aparte porque ya no ocupa el cupo —el área puede
   * volver a pedirlo—, pero sin él el área no sabría por qué tiene que hacerlo.
   */
  async gestionDesdeElEstudioPrevio(procesoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    const proceso = await this.exigirProceso(manager, procesoId);

    const aplica = await this.aplicaCdp(proceso.modalidad, manager);
    const obligatorio = aplica && (await this.exigeCdpAntesDeRadicar(proceso.modalidad, manager));
    const enCurso = aplica ? await this.delProceso(procesoId, manager) : null;
    const rechazado = enCurso
      ? null
      : await manager.getRepository(Cdp).findOne({
          where: { procesoId, estado: 'RECHAZADO', modificacionId: IsNull() },
          order: { updatedAt: 'DESC' },
        });

    const { permite, motivo } = cdpPermiteRadicar({ aplica, obligatorio, enCurso: !!enCurso });

    return {
      aplica,
      obligatorio,
      cdp: enCurso ? this.conAdvertencia(enCurso, proceso) : null,
      rechazado,
      /** Si con lo que hay se puede enviar el estudio previo a revisión. */
      permiteRadicar: permite,
      motivo,
    };
  }

  /**
   * La regla que frena el envío del estudio previo cuando la modalidad exige
   * el CDP y nadie lo ha gestionado.
   *
   * Corre dentro de la transacción del envío: que el área retire el CDP justo
   * mientras otro envía no debe dejar pasar un estudio previo sin él.
   */
  async exigirGestionAntesDeRadicar(em: EntityManager, proceso: Proceso) {
    const aplica = await this.aplicaCdp(proceso.modalidad, em);
    const obligatorio = aplica && (await this.exigeCdpAntesDeRadicar(proceso.modalidad, em));
    const enCurso = obligatorio ? await this.delProceso(proceso.id, em) : null;

    const { permite, motivo } = cdpPermiteRadicar({ aplica, obligatorio, enCurso: !!enCurso });
    if (!permite) {
      throw new UnprocessableEntityException({ message: motivo, cdpPendiente: true });
    }
  }

  /**
   * El área solicita el CDP desde el estudio previo.
   *
   * Es la misma solicitud que nace sola al cerrar la etapa 3, solo que antes:
   * el mismo registro, el mismo estado y la misma bandeja de la Financiera.
   * Cierra la 4.1, que es justamente «radicar la solicitud», y con eso la
   * Financiera recibe el aviso de que la 4.2 es suya.
   *
   * No mueve el proceso de etapa ni toca el estudio previo: pedir el CDP no es
   * enviar el estudio a revisión ni aprobarlo.
   *
   * Quién puede y cuándo —que el proceso sea suyo y el estudio previo esté en
   * sus manos— lo comprueba el estudio previo antes de llamar aquí.
   */
  async solicitarDesdeElEstudioPrevio(
    em: EntityManager,
    procesoId: string,
    dto: SolicitarCdpAnticipadoDto,
    acceso: HiringAccess,
  ) {
    const proceso = await this.exigirProceso(em, procesoId);
    await this.exigirQueNoTengaCdp(em, proceso);

    const cdp = await em.save(
      em.create(Cdp, {
        procesoId,
        rubro: dto.rubro?.trim() || null,
        valor: dto.valor ?? proceso.valorEstimado ?? null,
        vigenciaFiscal: dto.vigenciaFiscal ?? new Date().getFullYear(),
        observaciones: dto.observaciones?.trim() || null,
        estado: 'SOLICITADO' as const,
        origen: 'SOLICITADO_EN_ETAPA_3' as const,
        solicitadoPor: acceso.userName,
        solicitadoAt: new Date(),
      }),
    );

    await this.instanciarEtapa4(em, proceso);
    await this.cierre.resolverCierre(em, procesoId, '4.1', proceso.modalidad ?? null, acceso);

    await this.traza(em, procesoId, cdp.id, 'SOLICITAR', acceso, {
      desdeElEstudioPrevio: true,
      valor: cdp.valor,
      rubro: cdp.rubro,
    });

    return this.conAdvertencia(cdp, proceso);
  }

  /**
   * El área registra un CDP que ya tiene.
   *
   * Queda EXPEDIDO de una vez, sin pasar por la Financiera (decisión de Juan):
   * el certificado ya existe y pedirlo otra vez sería duplicarlo. La 4.1 y la
   * 4.2 se dan por atendidas al cerrarse la etapa 3, no aquí: mientras el
   * estudio previo esté en manos del área, el registro todavía se corrige.
   *
   * Si ya hay uno registrado por el área, esto lo corrige: mismo registro, sin
   * duplicar. El soporte es obligatorio al registrar y opcional al corregir.
   */
  async registrarDesdeElEstudioPrevio(
    em: EntityManager,
    procesoId: string,
    dto: RegistrarCdpExistenteDto,
    archivo: ArchivoCargado | null,
    hash: string | null,
    acceso: HiringAccess,
  ) {
    const proceso = await this.exigirProceso(em, procesoId);
    const actual = await this.delProceso(procesoId, em);
    const corrige = actual?.origen === 'REGISTRADO_EN_ETAPA_3';

    if (!corrige) await this.exigirQueNoTengaCdp(em, proceso);
    if (!corrige && !archivo) {
      throw new BadRequestException('Adjunta el certificado: es la evidencia del CDP en el expediente');
    }

    const cdp =
      corrige && actual
        ? actual
        : em.create(Cdp, {
            procesoId,
            estado: 'EXPEDIDO' as const,
            origen: 'REGISTRADO_EN_ETAPA_3' as const,
            solicitadoPor: acceso.userName,
            solicitadoAt: new Date(),
          });

    if (archivo && hash) {
      const documento = await this.guardarSoporte(em, procesoId, archivo, hash, acceso);
      cdp.documentoId = documento.id;
    }
    cdp.numero = dto.numero.trim();
    cdp.valor = dto.valor;
    cdp.rubro = dto.rubro.trim();
    cdp.fechaExpedicion = dto.fechaExpedicion;
    cdp.vigenciaFiscal = dto.vigenciaFiscal ?? Number(dto.fechaExpedicion.slice(0, 4));
    // Quién lo transcribió, que no es quien lo expidió: `origen` dice que lo
    // registró el área, y este nombre a quién pedirle cuentas del dato.
    cdp.expedidoPor = acceso.userName;
    cdp.updatedAt = new Date();
    const guardado = await em.save(cdp);

    await this.traza(em, procesoId, guardado.id, corrige ? 'GUARDAR' : 'EXPEDIR', acceso, {
      registradoPorElArea: true,
      numero: guardado.numero,
      valor: guardado.valor,
      rubro: guardado.rubro,
      fechaExpedicion: guardado.fechaExpedicion,
      ...(archivo ? { soporte: archivo.originalname } : {}),
    });

    return this.conAdvertencia(guardado, proceso);
  }

  /**
   * El área retira el CDP que gestionó desde el estudio previo.
   *
   * Para cambiar de camino —pidió uno y resultó que ya lo tenía, o al revés—
   * o para corregir un registro equivocado. Solo lo que es suyo y nadie más ha
   * tocado: una solicitud que la Financiera ya verificó o expidió es trabajo de
   * otra dirección, y retirarla desde aquí lo borraría sin avisarle.
   *
   * Anula, no borra: el expediente conserva que se pidió o se registró.
   */
  async retirarDesdeElEstudioPrevio(em: EntityManager, procesoId: string, motivo: string | undefined, acceso: HiringAccess) {
    const cdp = await this.exigirCdp(em, procesoId);

    const esSuSolicitud = cdp.origen === 'SOLICITADO_EN_ETAPA_3' && cdp.estado === 'SOLICITADO';
    const esSuRegistro = cdp.origen === 'REGISTRADO_EN_ETAPA_3';
    if (!esSuSolicitud && !esSuRegistro) {
      throw new ConflictException(
        cdp.origen === 'SOLICITADO_EN_ETAPA_3'
          ? `La Dirección Financiera ya tiene el CDP en estado ${cdp.estado}: no se puede retirar desde el estudio previo`
          : 'Este CDP no se gestionó desde el estudio previo',
      );
    }

    await this.transicionar(cdp, 'ANULADO');
    cdp.observaciones = motivo?.trim() || cdp.observaciones;
    await em.save(cdp);

    // La 4.1 vuelve a quedar pendiente: la solicitud que la cerró ya no está.
    if (esSuSolicitud) {
      await em.update(
        ProcesoActividad,
        { procesoId, numeral: '4.1' },
        { estado: 'BORRADOR', revisadoPor: null, revisadoAt: null } as any,
      );
    }

    await this.traza(em, procesoId, cdp.id, 'ANULAR', acceso, {
      desdeElEstudioPrevio: true,
      origen: cdp.origen,
      motivo: motivo?.trim() || null,
    });
    return { id: cdp.id, estado: cdp.estado };
  }

  /** Configuración: la regla de cada modalidad activa, con su fundamento. */
  async exigenciasAntesDeRadicar() {
    const [modalidades, filas] = await Promise.all([
      this.dataSource.getRepository(Modalidad).find({ where: { activa: true }, order: { orden: 'ASC' } }),
      this.dataSource.getRepository(CdpAntesDeRadicar).find(),
    ]);
    const porModalidad = new Map(filas.map((f) => [f.modalidad, f]));
    const exentas = new Set<string>();
    for (const m of modalidades) {
      if (!(await this.aplicaCdp(m.codigo))) exentas.add(m.codigo);
    }

    return modalidades.map((m) => {
      const fila = porModalidad.get(m.codigo);
      return {
        modalidad: m.codigo,
        nombre: m.nombre,
        // Una modalidad sin CDP no tiene nada que exigir: se lista para que no
        // parezca olvidada, y la pantalla no ofrece el interruptor.
        aplicaCdp: !exentas.has(m.codigo),
        obligatorio: fila?.obligatorio ?? false,
        fundamento: fila?.fundamento ?? null,
        confirmado: fila?.confirmado ?? false,
        actualizadoPor: fila?.actualizadoPor ?? null,
        updatedAt: fila?.updatedAt ?? null,
      };
    });
  }

  /**
   * Cambia la regla de una modalidad.
   *
   * Solo pesa en los envíos que vengan: un estudio previo que ya está en
   * revisión o aprobado no se devuelve porque la regla cambió.
   */
  async guardarExigenciaAntesDeRadicar(
    modalidad: string,
    dto: GuardarCdpAntesDeRadicarDto,
    acceso: HiringAccess,
  ) {
    const existe = await this.dataSource.getRepository(Modalidad).findOne({ where: { codigo: modalidad } });
    if (!existe) throw new NotFoundException('La modalidad no existe');

    const repo = this.dataSource.getRepository(CdpAntesDeRadicar);
    const fila = (await repo.findOne({ where: { modalidad } })) ?? repo.create({ modalidad });
    fila.obligatorio = dto.obligatorio;
    if (dto.fundamento !== undefined) fila.fundamento = dto.fundamento.trim() || null;
    if (dto.confirmado !== undefined) fila.confirmado = dto.confirmado;
    fila.actualizadoPor = acceso.userName;
    fila.updatedAt = new Date();
    await repo.save(fila);

    return (await this.exigenciasAntesDeRadicar()).find((e) => e.modalidad === modalidad);
  }

  /** Un solo CDP en curso por proceso, y solo si la modalidad lo lleva. */
  private async exigirQueNoTengaCdp(em: EntityManager, proceso: Proceso) {
    if (!(await this.aplicaCdp(proceso.modalidad, em))) {
      throw new BadRequestException('Esta modalidad no requiere CDP: la entidad no compromete gasto');
    }
    const enCurso = await this.delProceso(proceso.id, em);
    if (enCurso) {
      throw new ConflictException(
        enCurso.origen === 'REGISTRADO_EN_ETAPA_3'
          ? 'El proceso ya tiene registrado un CDP'
          : `El proceso ya tiene un CDP en estado ${enCurso.estado}`,
      );
    }
  }

  // ------------------------------------------------------ apertura (5.7) ---

  /**
   * Primer criterio de EFDS-1148 (RF-EST-05): sin CDP expedido no se abre.
   *
   * Vive en el backend y no solo en la pantalla porque es la regla que protege
   * el presupuesto: abrir un proceso sin respaldo compromete a la entidad con
   * una plata que nadie apartó.
   */
  async exigirCdpParaApertura(procesoId: string, em?: EntityManager) {
    const respaldo = await this.estadoRespaldo(procesoId, em);
    if (respaldo.puedeAbrirse) return;

    throw new ConflictException(
      `No se puede abrir el proceso: ${respaldo.motivo}. Se requiere el CDP expedido antes de la apertura.`,
    );
  }

  /**
   * Actividad 5.7: se abre el proceso.
   *
   * Cubre el control presupuestal y el cambio de etapa. Desde EFDS-1152 el
   * registro de la resolución de apertura y del pliego definitivo lo lleva
   * AperturaService, que invoca este método dentro de su propia transacción:
   * la mecánica de abrir es una sola, y duplicarla dejaría dos sitios donde
   * corregir la regla del CDP.
   *
   * Por eso acepta un EntityManager: sin él, la transacción de quien llama y la
   * de aquí serían dos, y un fallo posterior al registro dejaría el proceso
   * abierto sin resolución.
   */
  async abrirProceso(procesoId: string, acceso: HiringAccess, em?: EntityManager) {
    const ejecutar = async (manager: EntityManager) => {
      const proceso = await this.exigirProceso(manager, procesoId);

      if (proceso.etapa >= ETAPA_APERTURA) {
        throw new ConflictException('El proceso ya fue abierto');
      }

      await this.exigirCdpParaApertura(procesoId, manager);

      proceso.etapa = ETAPA_APERTURA;
      await manager.save(proceso);

      // Se busca antes de crear: desde EFDS-1187 el proceso nace con las 63
      // actividades de la matriz instanciadas, así que la fila de la 5.7 ya
      // existe y crearla otra vez choca contra uq_proceso_numeral.
      const actividad =
        (await manager.getRepository(ProcesoActividad).findOne({
          where: { procesoId, numeral: NUMERAL_APERTURA },
        })) ?? manager.create(ProcesoActividad, { procesoId, numeral: NUMERAL_APERTURA, datos: {} });

      actividad.estado = 'APROBADO';
      actividad.revisadoPor = acceso.userName;
      actividad.revisadoAt = new Date();
      await manager.save(actividad);

      await this.traza(manager, procesoId, procesoId, 'APROBAR', acceso, {
        actividad: NUMERAL_APERTURA,
        etapa: ETAPA_APERTURA,
      });

      return { id: proceso.id, radicado: proceso.radicado, etapa: proceso.etapa };
    };

    return em ? ejecutar(em) : this.dataSource.transaction(ejecutar);
  }

  // ---------------------------------------- documentos del proceso (5.1) ---

  /**
   * Segundo criterio de EFDS-1148 (RF-EST-06): en contratación directa el CDP
   * se exige antes de elaborar los demás documentos.
   *
   * Regla de orden reforzada, y solo para esa modalidad. En las demás el
   * control es la apertura; en directa no hay convocatoria ni pliego que
   * publicar, así que sin adelantar la exigencia el área podría redactar la
   * minuta de un contrato que el presupuesto no respalda.
   */
  async exigirCdpParaDocumentos(procesoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    const proceso = await this.exigirProceso(manager, procesoId);

    if (proceso.modalidad !== MODALIDAD_CONTRATACION_DIRECTA) return;

    const respaldo = await this.estadoRespaldo(procesoId, em);
    if (respaldo.puedeAbrirse) return;

    throw new ConflictException(
      `En contratación directa el CDP se exige antes de elaborar los documentos del proceso: ${respaldo.motivo}.`,
    );
  }

  /** Actividad 5.1: arranca la elaboración documental del proceso. */
  async iniciarDocumentos(procesoId: string, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);

      const excluida = await em.getRepository(ActividadExcluida).findOne({
        where: { numeral: NUMERAL_DOCUMENTOS, modalidad: proceso.modalidad ?? '' },
      });
      if (excluida) {
        throw new BadRequestException(
          `Esta modalidad no elabora los documentos ordinarios del proceso: ${excluida.motivo}`,
        );
      }

      await this.exigirCdpParaDocumentos(procesoId, em);

      // Que la fila exista ya no significa que la actividad esté iniciada:
      // desde EFDS-1187 el proceso nace con las 63 actividades de la matriz
      // instanciadas. Lo que la inicia es el trabajo —un documento cargado— o
      // que ya haya salido de borrador.
      const existente = await em.getRepository(ProcesoActividad).findOne({
        where: { procesoId, numeral: NUMERAL_DOCUMENTOS },
      });
      const cargados = await em.getRepository(DocumentoProceso).count({ where: { procesoId } });
      if (cargados > 0 || (existente && existente.estado !== 'BORRADOR')) {
        throw new ConflictException('La elaboración de documentos ya está iniciada');
      }

      const actividad = await em.save(
        existente ??
          em.create(ProcesoActividad, {
            procesoId,
            numeral: NUMERAL_DOCUMENTOS,
            estado: 'BORRADOR' as const,
            datos: {},
          }),
      );

      await this.traza(em, procesoId, actividad.id, 'CREAR', acceso, {
        actividad: NUMERAL_DOCUMENTOS,
      });

      return { numeral: actividad.numeral, estado: actividad.estado };
    });
  }

  // ------------------------------------------------------------- auxiliares

  private async exigirProceso(em: EntityManager, procesoId: string): Promise<Proceso> {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');
    return proceso;
  }

  private async exigirCdp(em: EntityManager, procesoId: string): Promise<Cdp> {
    const cdp = await this.delProceso(procesoId, em);
    if (!cdp) {
      throw new NotFoundException(
        'El proceso no tiene una solicitud de CDP en curso',
      );
    }
    return cdp;
  }

  /**
   * Marca cumplida la actividad del riel.
   *
   * Si no existe no se crea al vuelo: significaría que la modalidad no la
   * incluye, y darla por cumplida falsearía el expediente.
   */
  /**
   * Crea la solicitud de CDP cuando la etapa 3 termina (actividad 4.1).
   *
   * El estudio previo aprobado **es** la solicitud formal: el área ya dijo qué
   * contrata, por cuánto y con qué respaldo documental, y volver a pedírselo en
   * un formulario era transcribir lo que el proceso ya tiene. Lo que faltaba no
   * era un dato, era que alguien lo radicara, y eso puede hacerlo el sistema.
   *
   * Se dispara al cerrarse la **última actividad de la etapa 3 que aplique a la
   * modalidad**, y no en un numeral fijo: el comité no está en todas las
   * modalidades, así que atarlo a la 3.7 dejaría a mínima cuantía sin disparo y
   * atarlo a la 3.4 pediría el CDP antes de que la modalidad esté ratificada.
   * Preguntando por lo que queda pendiente, la regla sobrevive a que la entidad
   * reparametrice la matriz.
   *
   * Sin rubro: el estudio previo no lo captura desde que la 006 lo dejó fuera
   * de sus metadatos, y quien sabe contra qué rubro va es la Financiera al
   * expedir.
   *
   * Idempotente y silencioso: si el proceso no lleva CDP, si ya tiene uno en
   * curso o si aún queda algo abierto en la etapa 3, no hace nada y devuelve
   * `null`. Por eso puede llamarse desde cualquier punto que cierre una
   * actividad sin que quien llama tenga que comprobar nada.
   */
  async crearSolicitudSiCerroLaEtapa3(
    em: EntityManager,
    procesoId: string,
    acceso: HiringAccess,
  ): Promise<Cdp | null> {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });

    // Un proceso negado o cerrado no pide CDP: lo que terminó fue la
    // contratación, no la etapa.
    if (!proceso || proceso.estado !== 'EN_CURSO') return null;

    if (!(await this.aplicaCdp(proceso.modalidad, em))) return null;

    if (!(await this.etapa3Cerrada(em, proceso))) return null;

    // Ya hay CDP —gestionado desde el estudio previo, o radicado a mano—:
    // volver a crearlo chocaría contra el cupo de «CDP en curso». Lo que toca
    // es seguir con el que hay.
    const existente = await this.delProceso(procesoId, em);
    if (existente) {
      await this.continuarConElQueHay(em, proceso, existente, acceso);
      return null;
    }

    await this.instanciarEtapa4(em, proceso);

    const cdp = await em.save(
      em.create(Cdp, {
        procesoId,
        rubro: null,
        // El valor estimado del proceso, que es contra lo que la Financiera
        // verifica la disponibilidad. Si al expedir certifica menos, el propio
        // panel avisa de que no cubre.
        valor: proceso.valorEstimado ?? null,
        vigenciaFiscal: new Date().getFullYear(),
        observaciones: null,
        estado: 'SOLICITADO' as const,
        solicitadoPor: AUTOR_AUTOMATICO,
        solicitadoAt: new Date(),
      }),
    );

    if (proceso.etapa < ETAPA_CDP) {
      proceso.etapa = ETAPA_CDP;
      await em.save(proceso);
    }

    // La 4.1 queda cumplida por la propia solicitud, y sellada como del
    // sistema: nadie la radicó, así que atribuírsela a quien cerró la etapa 3
    // pondría en el expediente una actuación que esa persona no hizo.
    // Sin pasar por `cerrarActividad`: la firma la pone quien trabaja la
    // actividad, y aquí no hay quien la ponga. Exigirla bloquearía para
    // siempre la solicitud automática de una modalidad que la tuviera
    // configurada. La aprobación sí puede aplicar —queda en revisión de quien
    // corresponda—, así que se resuelve igual que en el camino manual.
    await this.cierre.resolverCierre(em, procesoId, '4.1', proceso.modalidad ?? null, {
      ...acceso,
      userName: AUTOR_AUTOMATICO,
    });

    await this.traza(em, procesoId, cdp.id, 'SOLICITAR', acceso, {
      automatica: true,
      valor: cdp.valor,
      modalidad: proceso.modalidad,
    });

    return cdp;
  }

  /**
   * La etapa 4 de un proceso que llegó con el CDP ya gestionado.
   *
   * Antes de la 100 esto solo pasaba con una 4.1 radicada a mano, que ya había
   * movido el proceso a la etapa 4; desde que el área puede gestionarlo en el
   * estudio previo, el proceso llega aquí todavía en la 3, y sin esto se
   * quedaba ahí con el CDP en curso.
   *
   * Lo que se da por atendido, sellado como del sistema:
   *   · la 4.1 si sigue abierta: ya hay solicitud, o certificado;
   *   · la 4.2 si el área registró un certificado que ya tenía (decisión de
   *     Juan): no hay nada que la Financiera tenga que expedir.
   * Una solicitud anticipada que la Financiera todavía no expide sigue su
   * trámite normal en la 4.2; si ya la expidió, la 4.2 se cerró entonces.
   */
  private async continuarConElQueHay(
    em: EntityManager,
    proceso: Proceso,
    cdp: Cdp,
    acceso: HiringAccess,
  ) {
    await this.instanciarEtapa4(em, proceso);
    if (proceso.etapa < ETAPA_CDP) {
      proceso.etapa = ETAPA_CDP;
      await em.save(proceso);
    }

    const sistema = { ...acceso, userName: AUTOR_AUTOMATICO };
    const abiertas = new Map(
      (
        await em.getRepository(ProcesoActividad).find({
          where: { procesoId: proceso.id, numeral: In(['4.1', NUMERAL_EXPEDICION_CDP]) },
        })
      ).map((a) => [a.numeral, a.estado !== 'APROBADO' && a.estado !== 'NO_APLICA']),
    );

    const atendidas: string[] = [];
    if (abiertas.get('4.1')) {
      await this.cierre.resolverCierre(em, proceso.id, '4.1', proceso.modalidad ?? null, sistema);
      atendidas.push('4.1');
    }
    if (
      cdp.origen === 'REGISTRADO_EN_ETAPA_3' &&
      cdp.estado === 'EXPEDIDO' &&
      abiertas.get(NUMERAL_EXPEDICION_CDP)
    ) {
      await this.cierre.resolverCierre(
        em,
        proceso.id,
        NUMERAL_EXPEDICION_CDP,
        proceso.modalidad ?? null,
        sistema,
      );
      atendidas.push(NUMERAL_EXPEDICION_CDP);
    }

    await this.traza(em, proceso.id, cdp.id, 'SOLICITAR', acceso, {
      automatica: true,
      yaGestionado: true,
      origen: cdp.origen,
      estado: cdp.estado,
      atendidas,
    });
  }

  /**
   * Si no queda nada por cerrar en la etapa 3.
   *
   * Cuentan como cerradas las aprobadas y las que la modalidad excluye: un
   * `NO_APLICA` no es trabajo pendiente, es trabajo que nunca hubo. Cualquier
   * otro estado —borrador, en revisión, devuelta, negada— deja la etapa abierta.
   *
   * Las excluidas se descartan además por la matriz y no solo por su estado
   * instanciado, porque un proceso creado antes de que la modalidad se
   * parametrizara puede tener la fila en BORRADOR aunque hoy no le aplique.
   */
  private async etapa3Cerrada(em: EntityManager, proceso: Proceso): Promise<boolean> {
    const actividades = await em.getRepository(Actividad).find({
      where: { etapa: ETAPA_PREVIA_AL_CDP, activa: true },
    });
    if (actividades.length === 0) return false;

    const excluidas = proceso.modalidad
      ? new Set(
          (
            await em
              .getRepository(ActividadExcluida)
              .find({ where: { modalidad: proceso.modalidad } })
          ).map((e) => e.numeral),
        )
      : new Set<string>();

    const aplicables = actividades
      .map((a) => a.numeral)
      .filter((numeral) => !excluidas.has(numeral));

    // Ninguna actividad aplicable no es «etapa terminada»: es una matriz a
    // medio parametrizar, y crear el CDP ahí sería adelantarse a la entidad.
    if (aplicables.length === 0) return false;

    const propias = await em.getRepository(ProcesoActividad).find({
      where: { procesoId: proceso.id, numeral: In(aplicables) },
    });
    const estadoDe = new Map(propias.map((a) => [a.numeral, a.estado]));

    return laEtapaCerro(aplicables.map((numeral) => estadoDe.get(numeral)));
  }

  /**
   * Cierra la actividad propia del CDP —o la deja en revisión, o exige firma
   * primero—, según lo que la matriz haya configurado (EFDS-1183, EFDS-2070).
   *
   * Antes cerraba siempre en APROBADO, sin preguntar: el área podía marcar
   * «esta actividad exige aprobación» o «exige firma» desde Configuración y
   * el ciclo del CDP la cerraba igual, como si nada se hubiera configurado.
   */
  private async cerrarActividad(
    em: EntityManager,
    procesoId: string,
    numeral: string,
    modalidad: string | null,
    acceso: HiringAccess,
    firma?: FirmaOtpDto,
  ) {
    if (await this.cierre.exigeFirma(em, numeral)) {
      this.cierre.exigirFirmaValida(firma);
    }
    await this.cierre.resolverCierre(em, procesoId, numeral, modalidad, acceso, firma);
  }

  /**
   * La bandeja de la Dirección Financiera: su trabajo de la etapa 4, en una
   * sola consulta y sin entrar proceso por proceso.
   *
   * Dos montones y no uno, porque no se atienden igual:
   *
   *   · `sinTomar` son las solicitudes que nadie ha recibido. Es la bandeja
   *     compartida que decidió la 069: quien llega primero se queda con una, y
   *     hasta que alguien lo haga el trámite está parado sin que nadie responda
   *     por él. Es lo que hay que mirar primero.
   *
   *   · `mias` son las que ya tomé y todavía no cerré —`SOLICITADO` mientras no
   *     verifico, `VERIFICADO` mientras no expido—. Un CDP expedido o rechazado
   *     salió del trabajo pendiente y no vuelve a la bandeja.
   *
   * Se cuenta desde `solicitado_at`, igual que la alerta de `CDP_SIN_ATENDER`, y
   * se marca contra la misma `TOLERANCIA_CDP_SIN_ATENDER`: lo que la pantalla
   * llama «lleva esperando» y lo que el correo llama «sin atender» tienen que
   * ser el mismo número, o la bandeja y el aviso discreparán sobre la misma
   * solicitud.
   *
   * `modificacion_id IS NULL` con el criterio de `delProceso`: el CDP de una
   * adición tiene su propio trámite y no entra aquí.
   */
  async bandeja(acceso: HiringAccess) {
    const filas = await this.dataSource.query(
      `SELECT p.id              AS proceso_id,
              p.radicado        AS radicado,
              p.objeto          AS objeto,
              p.modalidad       AS modalidad,
              p.valor_estimado  AS valor_estimado,
              c.id              AS cdp_id,
              c.estado          AS estado,
              c.valor           AS valor,
              c.rubro           AS rubro,
              c.solicitado_por  AS solicitado_por,
              c.solicitado_at   AS solicitado_at,
              f.usuario_id      AS financiera_id,
              f.nombre          AS financiera_nombre
         FROM hiring.cdp c
         JOIN hiring.procesos p ON p.id = c.proceso_id
         LEFT JOIN hiring.participaciones_proceso f
                ON f.proceso_id = p.id
               AND f.papel = 'FINANCIERA'
               AND f.estado = 'VIGENTE'
        WHERE c.modificacion_id IS NULL
          AND p.estado = 'EN_CURSO'
          AND c.estado IN ('SOLICITADO', 'VERIFICADO')
        ORDER BY c.solicitado_at ASC`,
    );

    const ahora = Date.now();
    const solicitudes: SolicitudEnBandeja[] = filas.map((f: any) => {
      const desde = f.solicitado_at instanceof Date ? f.solicitado_at : new Date(f.solicitado_at);
      const diasEsperando = Math.floor((ahora - desde.getTime()) / (24 * 60 * 60 * 1000));

      return {
        /**
         * Quién la lleva, para repartir en los tres montones de abajo. No sale
         * hacia la pantalla: la pantalla ya sabe de qué montón vino, y `aCargoDe`
         * le dice el nombre.
         */
        financieraId: f.financiera_id as string | null,
        procesoId: f.proceso_id,
        radicado: f.radicado,
        objeto: f.objeto,
        modalidad: f.modalidad,
        // El valor del CDP si ya lo tiene; si no, el estimado del proceso, que
        // es contra lo que se va a verificar la disponibilidad.
        valor: f.valor === null ? aNumeroONulo(f.valor_estimado) : aNumeroONulo(f.valor),
        // Se dice cuál de los dos es para que la pantalla no presente un
        // estimado como si ya fuera la cifra certificada.
        valorEsEstimado: f.valor === null,
        rubro: f.rubro,
        estado: f.estado as EstadoCdp,
        solicitadoPor: f.solicitado_por,
        solicitadoAt: desde.toISOString(),
        diasEsperando,
        /** Si lleva más de lo tolerable parada, que es lo que alarma el correo. */
        demorada: diasEsperando > TOLERANCIA_CDP_SIN_ATENDER,
        aCargoDe: f.financiera_nombre ?? null,
      };
    });

    return repartirLaBandeja(solicitudes, acceso.userId);
  }

  /** El CDP con el aviso de si alcanza a cubrir el valor estimado. */
  private conAdvertencia(cdp: Cdp, proceso: Proceso) {
    const { cubre, advertencia } = cdpCubreElProceso(cdp.valor, proceso.valorEstimado);
    return { ...cdp, cubreValorEstimado: cubre, advertencia };
  }

  private traza(
    em: EntityManager,
    procesoId: string,
    cdpId: string,
    accion: AccionTraza,
    acceso: HiringAccess,
    detalle?: Record<string, any>,
  ) {
    return em.save(Trazabilidad, {
      procesoId,
      entidad: 'cdp',
      entidadId: cdpId,
      accion,
      detalle,
      usuarioId: acceso.userId,
      usuarioNombre: acceso.userName,
    } as Partial<Trazabilidad>);
  }
}

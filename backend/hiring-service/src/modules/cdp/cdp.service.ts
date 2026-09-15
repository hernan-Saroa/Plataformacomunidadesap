import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';

import { Cdp, EstadoCdp, ESTADOS_CDP_EN_CURSO } from '../../entities/cdp.entity';
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
import {
  PERMISO_ACTIVIDAD_EDITAR,
  PERMISO_PRESUPUESTO_GESTIONAR,
  tienePermiso,
} from '../../auth/permisos';
import { ExpedirCdpDto, RechazarCdpDto, SolicitarCdpDto } from './dto/cdp.dto';
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

/** Actividad 4.4: el CDP cargado al expediente. */
export const NUMERAL_ADJUNTO_CDP = '4.4';

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

@Injectable()
export class CdpService {
  constructor(private readonly dataSource: DataSource) {}

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
      puedeSolicitar: tienePermiso(acceso, PERMISO_ACTIVIDAD_EDITAR),
      puedeGestionar: tienePermiso(acceso, PERMISO_PRESUPUESTO_GESTIONAR),
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

  // --------------------------------------------------------- ciclo (4.1-4.3)

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

      await this.cerrarActividad(em, procesoId, '4.1', acceso);
      await this.traza(em, procesoId, cdp.id, 'SOLICITAR', acceso, {
        rubro: dto.rubro,
        valor: dto.valor,
      });

      return this.conAdvertencia(cdp, proceso);
    });
  }

  /** Actividad 4.2: la Dirección Financiera verifica la disponibilidad. */
  async verificar(procesoId: string, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      const cdp = await this.exigirCdp(em, procesoId);

      await this.transicionar(cdp, 'VERIFICADO');
      await em.save(cdp);

      await this.cerrarActividad(em, procesoId, '4.2', acceso);
      await this.traza(em, procesoId, cdp.id, 'VERIFICAR', acceso);

      return this.conAdvertencia(cdp, proceso);
    });
  }

  /**
   * Actividad 4.3: se expide el CDP y queda afectado al proceso.
   *
   * Mientras no exista la integración con KLIC (EFDS-1343), el número y el
   * valor se registran a mano con el soporte que expide la Financiera.
   */
  async expedir(procesoId: string, dto: ExpedirCdpDto, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      const cdp = await this.exigirCdp(em, procesoId);

      await this.transicionar(cdp, 'EXPEDIDO');
      cdp.numero = dto.numero;
      cdp.valor = dto.valor;
      cdp.fechaExpedicion = dto.fechaExpedicion;
      cdp.vigenciaFiscal = dto.vigenciaFiscal ?? cdp.vigenciaFiscal;
      cdp.expedidoPor = acceso.userName;
      await em.save(cdp);

      await this.cerrarActividad(em, procesoId, '4.3', acceso);
      await this.traza(em, procesoId, cdp.id, 'EXPEDIR', acceso, {
        numero: dto.numero,
        valor: dto.valor,
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
   * Actividad 4.4: se carga el soporte del CDP al expediente.
   *
   * Se exige el CDP expedido: el soporte prueba lo que el registro afirma, y
   * adjuntar un papel a una solicitud que aún no se ha resuelto daría por
   * cumplida la actividad sin que exista el certificado.
   */
  async adjuntarSoporte(
    procesoId: string,
    archivo: { filename: string; originalname: string; mimetype: string; size: number },
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

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const documento = await em.save(
        em.create(Documento, {
          expedienteId: expediente.id,
          numeral: NUMERAL_ADJUNTO_CDP,
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

      // El vínculo va en el dato y no por convención de numeral: si mañana se
      // anula este CDP y se expide otro, cada uno conserva su propio soporte.
      cdp.documentoId = documento.id;
      cdp.updatedAt = new Date();
      await em.save(cdp);

      await this.cerrarActividad(em, procesoId, NUMERAL_ADJUNTO_CDP, acceso);
      await this.traza(em, procesoId, cdp.id, 'ADJUNTAR', acceso, {
        documento: documento.id,
        nombre: archivo.originalname,
      });

      return { ...this.conAdvertencia(cdp, proceso), documento };
    });
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

    // Ya hay solicitud —automática o radicada a mano antes de esto—: volver a
    // crearla chocaría contra el cupo de «CDP en curso» del proceso.
    if (await this.delProceso(procesoId, em)) return null;

    if (!(await this.etapa3Cerrada(em, proceso))) return null;

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
    await this.cerrarActividad(em, procesoId, '4.1', {
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

  private async cerrarActividad(
    em: EntityManager,
    procesoId: string,
    numeral: string,
    acceso: HiringAccess,
  ) {
    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral },
    });
    if (!actividad) return;
    actividad.estado = 'APROBADO';
    actividad.revisadoPor = acceso.userName;
    actividad.revisadoAt = new Date();
    await em.save(actividad);
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

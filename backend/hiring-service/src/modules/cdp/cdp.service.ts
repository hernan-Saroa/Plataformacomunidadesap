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
  CargarCdpDto,
  GuardarCdpAntesDeRadicarDto,
  RegistrarCdpExistenteDto,
} from './dto/cdp.dto';
import { CierreActividadService } from '../cierre-actividad/cierre-actividad.service';
import { cargarResponde, respondeEn, secuenciaEn } from '../participacion/quien-responde';
import { FirmaOtpDto } from '../cierre-actividad/dto/firma-otp.dto';
/**
 * La actividad en que se carga el CDP.
 *
 * Desde la 103 el CDP se pide y se expide por fuera del aplicativo, y aquí solo
 * se carga el certificado: la 4.1 (la solicitud) se desactivó y la 4.2 quedó
 * como el cargue. El soporte queda en el expediente bajo este numeral.
 */
export const NUMERAL_CARGUE_CDP = '4.2';

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
 * desde el panel de la 7.1 a la 7.3.
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
 * proceso pase solo a la etapa 4, y es la clase de regla que hay que poder fijar sin base
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
 * darla por terminada pasaría a la etapa 4 un proceso que no ha recorrido nada.
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
 * de datos. Desde la 103 exige el CDP cargado: ya no hay solicitud que baste,
 * porque el aplicativo no la tramita.
 */
export function cdpPermiteRadicar(estado: {
  aplica: boolean;
  obligatorio: boolean;
  cargado: boolean;
}): { permite: boolean; motivo: string | null } {
  if (!estado.aplica || !estado.obligatorio || estado.cargado) {
    return { permite: true, motivo: null };
  }
  return {
    permite: false,
    motivo: 'Antes de enviar el estudio previo a revisión carga el CDP que expidió la Dirección Financiera.',
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
  async actividadesDelProceso(procesoId: string, etapa?: number, acceso?: HiringAccess) {
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
    // Quién hace cada actividad en este proceso, de la configuración (109).
    const responde = await cargarResponde(this.dataSource.manager, [procesoId], acceso);

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
        responde: respondeEn(responde, procesoId, proceso.modalidad ?? null, a.numeral, acceso),
        // De qué depende y si detiene a las siguientes, en su versión del flujo (125).
        secuencia: secuenciaEn(responde, procesoId, proceso.modalidad ?? null, a.numeral),
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
      puedeCargar: await this.alcance.puedeEn(acceso, 'editar', NUMERAL_CARGUE_CDP),
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
          : 'El proceso no tiene CDP cargado',
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

  // ------------------------------------------------------ cargue (4.2) ---

  /**
   * Actividad 4.2: el área carga el CDP que la Financiera expidió por fuera.
   *
   * Desde la 103 el aplicativo no tramita el CDP: nadie lo solicita ni lo
   * verifica aquí. El certificado ya existe cuando llega, así que queda EXPEDIDO
   * de una vez, con el soporte, y la 4.2 se cierra en la misma transacción.
   *
   * Si el proceso arrastra una solicitud de antes de la 103 —SOLICITADO o
   * VERIFICADO—, cargar la completa en vez de chocar contra ella: es el mismo
   * CDP, que la Financiera expidió por fuera.
   *
   * El soporte lo exige el endpoint. Aquí puede faltar porque las pruebas de
   * otras etapas solo necesitan el CDP cargado; si falta, se adjunta después.
   */
  async cargar(
    procesoId: string,
    dto: CargarCdpDto,
    soporte: { archivo: ArchivoCargado; hash: string } | null,
    acceso: HiringAccess,
  ) {
    return this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      if (!(await this.aplicaCdp(proceso.modalidad, em))) {
        throw new BadRequestException('Esta modalidad no requiere CDP: la entidad no compromete gasto');
      }

      const pendiente = await this.delProceso(procesoId, em);
      if (pendiente?.estado === 'EXPEDIDO') {
        throw new ConflictException(
          pendiente.origen === 'REGISTRADO_EN_ETAPA_3'
            ? 'El CDP ya se cargó desde el estudio previo'
            : 'El proceso ya tiene el CDP cargado',
        );
      }

      let cdp: Cdp;
      if (pendiente) {
        if (pendiente.estado === 'SOLICITADO') await this.transicionar(pendiente, 'VERIFICADO');
        await this.transicionar(pendiente, 'EXPEDIDO');
        cdp = pendiente;
      } else {
        await this.instanciarEtapa4(em, proceso);
        cdp = em.create(Cdp, {
          procesoId,
          estado: 'EXPEDIDO' as const,
          origen: 'ETAPA_4' as const,
          solicitadoPor: acceso.userName,
          solicitadoAt: new Date(),
        });
      }

      const documento = soporte
        ? await this.guardarSoporte(em, procesoId, soporte.archivo, soporte.hash, acceso)
        : null;

      cdp.numero = dto.numero.trim();
      cdp.valor = dto.valor;
      cdp.rubro = dto.rubro.trim();
      cdp.fechaExpedicion = dto.fechaExpedicion;
      cdp.vigenciaFiscal = dto.vigenciaFiscal ?? Number(dto.fechaExpedicion.slice(0, 4));
      // Quién lo cargó, que no es quien lo expidió: el certificado lo firmó la
      // Financiera por fuera, y este nombre es a quién pedirle cuentas del dato.
      cdp.expedidoPor = acceso.userName;
      if (documento) cdp.documentoId = documento.id;
      cdp.updatedAt = new Date();
      const guardado = await em.save(cdp);

      if (proceso.etapa < ETAPA_CDP) {
        proceso.etapa = ETAPA_CDP;
        await em.save(proceso);
      }

      await this.cerrarActividad(
        em,
        procesoId,
        NUMERAL_CARGUE_CDP,
        proceso.modalidad ?? null,
        acceso,
        dto.firma,
      );
      await this.traza(em, procesoId, guardado.id, 'EXPEDIR', acceso, {
        cargado: true,
        numero: guardado.numero,
        valor: guardado.valor,
        rubro: guardado.rubro,
        fechaExpedicion: guardado.fechaExpedicion,
      });
      if (documento && soporte) {
        await this.traza(em, procesoId, guardado.id, 'ADJUNTAR', acceso, {
          documento: documento.id,
          nombre: soporte.archivo.originalname,
        });
      }

      return { ...this.conAdvertencia(guardado, proceso), documento };
    });
  }

  /**
   * Carga el soporte de un CDP que ya se expidió sin él.
   *
   * Queda para los procesos que expidieron por la 4.3 antes de la 096 y no
   * llegaron a la 4.4, y para un CDP cargado sin él: desde la 096 el soporte va
   * con el certificado. No cierra ninguna actividad —la 4.2 ya está cerrada—.
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
        numeral: NUMERAL_CARGUE_CDP,
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
   * obligatorio para radicar y el que está en curso.
   */
  async gestionDesdeElEstudioPrevio(procesoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    const proceso = await this.exigirProceso(manager, procesoId);

    const aplica = await this.aplicaCdp(proceso.modalidad, manager);
    const obligatorio = aplica && (await this.exigeCdpAntesDeRadicar(proceso.modalidad, manager));
    const enCurso = aplica ? await this.delProceso(procesoId, manager) : null;

    const { permite, motivo } = cdpPermiteRadicar({
      aplica,
      obligatorio,
      cargado: enCurso?.estado === 'EXPEDIDO',
    });

    return {
      aplica,
      obligatorio,
      cdp: enCurso ? this.conAdvertencia(enCurso, proceso) : null,
      /** Si con lo que hay se puede enviar el estudio previo a revisión. */
      permiteRadicar: permite,
      motivo,
    };
  }

  /**
   * La regla que frena el envío del estudio previo cuando la modalidad exige
   * el CDP y nadie lo ha cargado.
   *
   * Corre dentro de la transacción del envío: que el área retire el CDP justo
   * mientras otro envía no debe dejar pasar un estudio previo sin él.
   */
  async exigirGestionAntesDeRadicar(em: EntityManager, proceso: Proceso) {
    const aplica = await this.aplicaCdp(proceso.modalidad, em);
    const obligatorio = aplica && (await this.exigeCdpAntesDeRadicar(proceso.modalidad, em));
    const enCurso = obligatorio ? await this.delProceso(proceso.id, em) : null;

    const { permite, motivo } = cdpPermiteRadicar({
      aplica,
      obligatorio,
      cargado: enCurso?.estado === 'EXPEDIDO',
    });
    if (!permite) {
      throw new UnprocessableEntityException({ message: motivo, cdpPendiente: true });
    }
  }

  /**
   * El área carga desde el estudio previo el CDP que ya tiene.
   *
   * Queda EXPEDIDO de una vez: la Financiera lo expidió por fuera, y desde la
   * 103 el aplicativo no lo tramita. La 4.2 se da por atendida al cerrarse la
   * etapa 3, no aquí: mientras el estudio previo esté en manos del área, el
   * registro todavía se corrige.
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
   * El área retira el CDP que cargó desde el estudio previo.
   *
   * Para corregir un cargue equivocado. También retira una solicitud hecha
   * desde el estudio previo antes de la 103 que nadie llegó a atender: desde
   * entonces nadie la va a atender, y el área la reemplaza cargando el CDP.
   *
   * Anula, no borra: el expediente conserva que se cargó o se pidió.
   */
  async retirarDesdeElEstudioPrevio(em: EntityManager, procesoId: string, motivo: string | undefined, acceso: HiringAccess) {
    const cdp = await this.exigirCdp(em, procesoId);

    const esSuSolicitud = cdp.origen === 'SOLICITADO_EN_ETAPA_3' && cdp.estado !== 'EXPEDIDO';
    const esSuRegistro = cdp.origen === 'REGISTRADO_EN_ETAPA_3';
    if (!esSuSolicitud && !esSuRegistro) {
      throw new ConflictException('Este CDP no se cargó desde el estudio previo');
    }

    await this.transicionar(cdp, 'ANULADO');
    cdp.observaciones = motivo?.trim() || cdp.observaciones;
    await em.save(cdp);

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
   * Abre la etapa 4 cuando la etapa 3 termina.
   *
   * Desde la 103 el aplicativo no pide el CDP: la Financiera lo expide por
   * fuera y el área lo carga. Así que al cerrarse la etapa 3 el proceso pasa a
   * la 4 y la 4.2 queda esperando el cargue, salvo que el área ya lo haya
   * cargado desde el estudio previo: entonces la 4.2 se da por atendida,
   * sellada como del sistema (decisión de Juan, desde la 100).
   *
   * Se dispara al cerrarse la **última actividad de la etapa 3 que aplique a la
   * modalidad**, y no en un numeral fijo: el comité no está en todas las
   * modalidades, así que atarlo a la 3.7 dejaría a mínima cuantía sin disparo.
   *
   * Idempotente y silencioso: si el proceso no lleva CDP o si aún queda algo
   * abierto en la etapa 3, no hace nada. Por eso puede llamarse desde cualquier
   * punto que cierre una actividad sin que quien llama tenga que comprobar nada.
   */
  async abrirEtapa4SiCerroLaEtapa3(
    em: EntityManager,
    procesoId: string,
    acceso: HiringAccess,
  ): Promise<void> {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });

    // Un proceso negado o cerrado no sigue: lo que terminó fue la
    // contratación, no la etapa.
    if (!proceso || proceso.estado !== 'EN_CURSO') return;
    if (!(await this.aplicaCdp(proceso.modalidad, em))) return;
    if (!(await this.etapa3Cerrada(em, proceso))) return;

    await this.instanciarEtapa4(em, proceso);
    if (proceso.etapa < ETAPA_CDP) {
      proceso.etapa = ETAPA_CDP;
      await em.save(proceso);
    }

    const cdp = await this.delProceso(procesoId, em);
    if (cdp?.estado !== 'EXPEDIDO') return;

    const cargue = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_CARGUE_CDP },
    });
    if (!cargue || cargue.estado === 'APROBADO' || cargue.estado === 'NO_APLICA') return;

    // Sin pasar por `cerrarActividad`: la firma la pone quien trabaja la
    // actividad, y aquí no hay quien la ponga. La aprobación sí puede aplicar.
    await this.cierre.resolverCierre(em, procesoId, NUMERAL_CARGUE_CDP, proceso.modalidad ?? null, {
      ...acceso,
      userName: AUTOR_AUTOMATICO,
    });
    await this.traza(em, procesoId, cdp.id, 'EXPEDIR', acceso, {
      automatica: true,
      yaCargado: true,
      origen: cdp.origen,
      atendidas: [NUMERAL_CARGUE_CDP],
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

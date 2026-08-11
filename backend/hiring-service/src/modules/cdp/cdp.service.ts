import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

import { Cdp, EstadoCdp, ESTADOS_CDP_EN_CURSO } from '../../entities/cdp.entity';
import { Actividad, ActividadExcluida, ETAPA_CDP } from '../../entities/actividad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import {
  HiringAccess,
  ROLES_GESTION_CDP,
  ROLES_SOLICITUD_CDP,
} from '../../auth/hiring-access';
import { ExpedirCdpDto, RechazarCdpDto, SolicitarCdpDto } from './dto/cdp.dto';

/** Actividad 4.4: el CDP cargado al expediente. */
export const NUMERAL_ADJUNTO_CDP = '4.4';

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
 */
export const ETAPAS_ENTREGADAS = [3, ETAPA_CDP, ETAPA_APERTURA];

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

  /** CDP en curso del proceso, o null si nunca se solicitó o quedó cerrado. */
  async delProceso(procesoId: string, em?: EntityManager): Promise<Cdp | null> {
    const manager = em ?? this.dataSource.manager;
    return manager.getRepository(Cdp).findOne({
      where: { procesoId, estado: In(ESTADOS_CDP_EN_CURSO) },
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
      puedeSolicitar: ROLES_SOLICITUD_CDP.some((r) => acceso?.roles.includes(r) ?? false),
      puedeGestionar: ROLES_GESTION_CDP.some((r) => acceso?.roles.includes(r) ?? false),
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
   * Solo cubre el control presupuestal. Los demás requisitos de la etapa 5
   * —pliego definitivo, publicación en SECOP, respuesta a observaciones— son de
   * historias posteriores y aquí no se validan.
   */
  async abrirProceso(procesoId: string, acceso: HiringAccess) {
    return this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);

      if (proceso.etapa >= ETAPA_APERTURA) {
        throw new ConflictException('El proceso ya fue abierto');
      }

      await this.exigirCdpParaApertura(procesoId, em);

      proceso.etapa = ETAPA_APERTURA;
      await em.save(proceso);

      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_APERTURA,
          estado: 'APROBADO' as const,
          datos: {},
          revisadoPor: acceso.userName,
          revisadoAt: new Date(),
        }),
      );

      await this.traza(em, procesoId, procesoId, 'APROBAR', acceso, {
        actividad: NUMERAL_APERTURA,
        etapa: ETAPA_APERTURA,
      });

      return { id: proceso.id, radicado: proceso.radicado, etapa: proceso.etapa };
    });
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

      const existente = await em.getRepository(ProcesoActividad).findOne({
        where: { procesoId, numeral: NUMERAL_DOCUMENTOS },
      });
      if (existente) {
        throw new ConflictException('La elaboración de documentos ya está iniciada');
      }

      const actividad = await em.save(
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

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';

import { InformeEvaluacion } from '../../entities/informe-evaluacion.entity';
import { Subsanacion } from '../../entities/subsanacion.entity';
import { RecepcionOfertas } from '../../entities/recepcion-ofertas.entity';
import { Oferente } from '../../entities/oferente.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Documento } from '../../entities/documento.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { ArchivoCargado, TrasladoService } from './traslado.service';
import {
  CerrarTrasladoDto,
  RegistrarSubsanacionDto,
  ResponderSubsanacionDto,
} from './dto/subsanaciones.dto';

/** Actividad 6.5 de la matriz: recepción de subsanaciones y observaciones. */
export const NUMERAL_SUBSANACIONES = '6.5';

/** Actividad 6.6 de la matriz: respuestas a las observaciones. */
export const NUMERAL_RESPUESTAS = '6.6';

/**
 * Subsanaciones y observaciones al informe — actividad 6.5 (EFDS-1158).
 *
 * Lo que presenta un oferente durante el traslado. Llega por SECOP II y la
 * plataforma no habla con SECOP, así que el gestor lo transcribe con su
 * soporte: lo que la entidad debe poder demostrar es que lo recibió, cuándo, y
 * qué respondió.
 *
 * Hereda de `TrasladoService` para reusar el proceso, el expediente, la traza y
 * el calendario, que son los mismos de la actividad anterior. Es una clase
 * aparte porque son dos actividades distintas del riel, con su propio numeral y
 * su propio estado.
 */
@Injectable()
export class SubsanacionesService extends TrasladoService {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  // ------------------------------------------------------------- consulta --

  /**
   * Lo presentado contra el informe en juego.
   *
   * Cuelga del informe y no del proceso: si un informe se anula y se traslada
   * otro, cada uno conserva lo que se presentó contra él.
   */
  async listar(procesoId: string) {
    const proceso = await this.exigirProceso(this.dataSource.manager, procesoId);
    const informe = await this.informeEnJuego(procesoId);

    const excluida = await this.dataSource.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_SUBSANACIONES, modalidad: proceso.modalidad ?? '' },
    });

    if (!informe) {
      return {
        aplica: !excluida,
        motivoNoAplica: excluida?.motivo ?? null,
        // Sin informe trasladado no hay nada que subsanar: no es una lista
        // vacía, es que el término todavía no existe.
        trasladado: false,
        venceEl: null,
        enTermino: false,
        puedeRegistrar: false,
        subsanaciones: [],
      };
    }

    const presentadas = await this.dataSource.getRepository(Subsanacion).find({
      where: { informeId: informe.id },
      order: { fechaPresentacion: 'ASC', createdAt: 'ASC' },
    });

    const documentos = await this.documentosDe(
      presentadas.flatMap((s) => [s.soporteDocumentoId, s.respuestaDocumentoId]),
    );
    const oferentes = await this.oferentesDe(this.dataSource.manager, procesoId);

    const trasladado = informe.estado === 'TRASLADADO';

    return {
      aplica: !excluida,
      motivoNoAplica: excluida?.motivo ?? null,
      trasladado,
      informeId: informe.id,
      venceEl: informe.venceEl,
      // Si el término sigue corriendo. Lo que llegue después se registra igual,
      // marcado como extemporáneo: la entidad decide si lo acepta.
      enTermino: trasladado && !!informe.venceEl && this.hoy() <= informe.venceEl,
      puedeRegistrar: !excluida && trasladado,
      pendientesDeRespuesta: presentadas.filter((s) => !s.respondidaAt).length,
      // Cerrar antes de que venza el término le quitaría al oferente el plazo
      // que se le notificó, y cerrar con algo sin responder dejaría el traslado
      // a medias: las dos condiciones se dicen aquí para que la pantalla
      // explique cuál falta en vez de deshabilitar un botón sin motivo.
      terminoVencido: trasladado && !!informe.venceEl && this.hoy() > informe.venceEl,
      puedeCerrar:
        trasladado &&
        !!informe.venceEl &&
        this.hoy() > informe.venceEl &&
        presentadas.every((s) => !!s.respondidaAt),
      // Una subsanación aceptada puede cambiar la habilitación, y entonces el
      // comité tiene que rectificar su resultado (6.3). La plataforma no lo
      // hace sola —no evalúa—, pero sí lo advierte.
      requiereRectificacion: presentadas.some(
        (s) => s.tipo === 'SUBSANACION' && s.aceptada === true,
      ),
      subsanaciones: presentadas.map((s) => this.presentarSubsanacion(s, oferentes, documentos)),
    };
  }

  // ------------------------------------------------------------- registro --

  /**
   * Registra lo que presentó un oferente, con su soporte.
   *
   * Se admite después del vencimiento a propósito, marcado como extemporáneo.
   * Rechazarlo sería borrar el hecho de que el oferente sí presentó algo, y
   * quien decide si lo acepta es la entidad, no el sistema.
   */
  async registrar(
    procesoId: string,
    dto: RegistrarSubsanacionDto,
    soporte: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const proceso = await this.exigirProceso(em, procesoId);
      await this.exigirQueApliquen(em, proceso);

      const informe = await this.informeEnJuego(procesoId, em);
      if (!informe) {
        throw new NotFoundException('El proceso no tiene informe de evaluación');
      }
      if (informe.estado === 'BORRADOR') {
        throw new ConflictException(
          'El informe todavía no se ha trasladado: nadie ha podido presentar nada contra él',
        );
      }
      if (informe.estado === 'CERRADO') {
        throw new ConflictException(
          'El traslado ya se cerró: lo que llegue después se resuelve por otra vía',
        );
      }

      const oferente = await this.exigirOferente(em, procesoId, dto.oferenteId);

      const doc = await this.guardarDocumento(
        em,
        procesoId,
        `${dto.tipo === 'SUBSANACION' ? 'Subsanación' : 'Observación'} de ${oferente.nombre}`,
        soporte,
        hash,
        acceso,
        NUMERAL_SUBSANACIONES,
      );

      const registrada = await em.save(
        em.create(Subsanacion, {
          informeId: informe.id,
          oferenteId: oferente.id,
          tipo: dto.tipo,
          presentadoPor: dto.presentadoPor.trim(),
          identificacion: dto.identificacion?.trim() || null,
          fechaPresentacion: dto.fechaPresentacion,
          // Se resuelve al registrar y no se recalcula: si mañana se corrige el
          // plazo del informe, lo que ya se calificó de extemporáneo no cambia
          // de estado solo.
          extemporanea: this.fueraDeTermino(informe, dto.fechaPresentacion),
          asunto: dto.asunto.trim(),
          contenido: dto.contenido.trim(),
          soporteDocumentoId: doc.id,
          registradoPor: acceso.userName,
        }),
      );

      await this.marcarRecepcion(em, procesoId, acceso);
      await this.traza(
        em,
        procesoId,
        registrada.id,
        'CREAR',
        acceso,
        {
          actividad: NUMERAL_SUBSANACIONES,
          tipo: dto.tipo,
          oferta: oferente.numero,
          fechaPresentacion: dto.fechaPresentacion,
          extemporanea: registrada.extemporanea,
        },
        'subsanacion',
      );
    });

    return this.listar(procesoId);
  }

  // ------------------------------------------------------------ respuestas --

  /**
   * Responde una subsanación u observación — actividad 6.6.
   *
   * La matriz pide respuesta documentada por dimensión —jurídica, financiera y
   * técnica—, así que puede traer su documento. Se permite corregir la
   * respuesta mientras el traslado siga abierto: cada una queda en la traza, y
   * un error de digitación antes del cierre no debería obligar a rehacer el
   * informe. Cerrado ya no se toca.
   */
  async responder(
    procesoId: string,
    subsanacionId: string,
    dto: ResponderSubsanacionDto,
    documento: ArchivoCargado | null,
    hash: string | null,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId);

      const informe = await this.informeEnJuego(procesoId, em);
      if (!informe) throw new NotFoundException('El proceso no tiene informe de evaluación');
      if (informe.estado === 'CERRADO') {
        throw new ConflictException(
          'El traslado ya se cerró: las respuestas quedaron notificadas y no se reescriben',
        );
      }

      const subsanacion = await em
        .getRepository(Subsanacion)
        .findOne({ where: { id: subsanacionId, informeId: informe.id } });
      if (!subsanacion) {
        throw new NotFoundException('Eso no se presentó contra el informe en juego');
      }

      const doc = documento
        ? await this.guardarDocumento(
            em,
            procesoId,
            `Respuesta a ${subsanacion.presentadoPor}`,
            documento,
            hash as string,
            acceso,
            NUMERAL_RESPUESTAS,
          )
        : null;

      const yaRespondida = !!subsanacion.respondidaAt;

      subsanacion.respuesta = dto.respuesta.trim();
      subsanacion.aceptada = dto.aceptada;
      subsanacion.respuestaDocumentoId = doc?.id ?? subsanacion.respuestaDocumentoId;
      subsanacion.respondidaPor = acceso.userName;
      subsanacion.respondidaAt = new Date();
      await em.save(subsanacion);

      await this.marcarRespuestas(em, procesoId, informe.id, acceso);
      await this.traza(
        em,
        procesoId,
        subsanacion.id,
        'RESPONDER',
        acceso,
        {
          actividad: NUMERAL_RESPUESTAS,
          tipo: subsanacion.tipo,
          aceptada: dto.aceptada,
          // Que sea una corrección se anota: es lo que explica dos respuestas
          // en la traza sobre el mismo escrito.
          correccion: yaRespondida,
        },
        'subsanacion',
      );
    });

    return this.listar(procesoId);
  }

  /**
   * Cierra el traslado.
   *
   * Dos condiciones, y ninguna es formalismo: el término tiene que haber
   * vencido —cerrar antes le quita al oferente el plazo que se le notificó— y
   * no puede quedar nada sin responder, porque el informe definitivo se
   * sustenta en esas respuestas.
   */
  async cerrar(procesoId: string, dto: CerrarTrasladoDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      await this.exigirProceso(em, procesoId);

      const informe = await this.informeEnJuego(procesoId, em);
      if (!informe) throw new NotFoundException('El proceso no tiene informe de evaluación');
      if (informe.estado === 'BORRADOR') {
        throw new ConflictException('El informe todavía no se ha trasladado');
      }
      if (informe.estado === 'CERRADO') {
        throw new ConflictException('El traslado de este informe ya está cerrado');
      }

      if (!informe.venceEl || this.hoy() <= informe.venceEl) {
        throw new ConflictException(
          `El término sigue corriendo hasta el ${informe.venceEl}: cerrarlo ahora le quitaría al oferente el plazo que se le notificó`,
        );
      }

      const pendientes = await em
        .getRepository(Subsanacion)
        .count({ where: { informeId: informe.id, respondidaAt: IsNull() } });
      if (pendientes > 0) {
        throw new ConflictException(
          `Quedan ${pendientes} escritos sin responder: el informe definitivo se sustenta en esas respuestas`,
        );
      }

      informe.estado = 'CERRADO';
      informe.cerradoPor = acceso.userName;
      informe.cerradoAt = new Date();
      informe.notaCierre = dto.nota?.trim() || null;
      await em.save(informe);

      await this.marcarCierre(em, procesoId, acceso);
      await this.traza(em, procesoId, informe.id, 'CERRAR', acceso, {
        actividad: NUMERAL_RESPUESTAS,
        numero: informe.numero,
        venceEl: informe.venceEl,
      });
    });

    return this.listar(procesoId);
  }

  // ----------------------------------------------------------- auxiliares --

  /**
   * Si llegó después del vencimiento.
   *
   * Extemporáneo **no** es rechazado: es un hecho que se anota. Un informe sin
   * vencimiento no puede tener nada fuera de término, y eso solo pasa si el
   * traslado se registró sin plazo, que hoy no se permite.
   */
  protected fueraDeTermino(informe: InformeEvaluacion, fechaPresentacion: string): boolean {
    return !!informe.venceEl && fechaPresentacion > informe.venceEl;
  }

  protected presentarSubsanacion(
    subsanacion: Subsanacion,
    oferentes: Map<string, Oferente>,
    documentos: Map<string, Documento>,
  ) {
    const oferente = oferentes.get(subsanacion.oferenteId);
    const soporte = documentos.get(subsanacion.soporteDocumentoId);
    const respuestaDoc = subsanacion.respuestaDocumentoId
      ? documentos.get(subsanacion.respuestaDocumentoId)
      : undefined;

    return {
      id: subsanacion.id,
      tipo: subsanacion.tipo,
      oferta: oferente
        ? { id: oferente.id, numero: oferente.numero, nombre: oferente.nombre }
        : null,
      presentadoPor: subsanacion.presentadoPor,
      identificacion: subsanacion.identificacion,
      fechaPresentacion: subsanacion.fechaPresentacion,
      extemporanea: subsanacion.extemporanea,
      asunto: subsanacion.asunto,
      contenido: subsanacion.contenido,
      soporte: soporte
        ? { id: soporte.id, nombre: soporte.nombre, archivoUrl: soporte.archivoUrl }
        : null,
      respuesta: subsanacion.respuesta,
      respuestaDocumento: respuestaDoc
        ? { id: respuestaDoc.id, nombre: respuestaDoc.nombre, archivoUrl: respuestaDoc.archivoUrl }
        : null,
      aceptada: subsanacion.aceptada,
      respondidaPor: subsanacion.respondidaPor,
      respondidaAt: subsanacion.respondidaAt,
      registradoPor: subsanacion.registradoPor,
      registradoAt: subsanacion.createdAt,
    };
  }

  /** La oferta tiene que ser una de las que este proceso recibió. */
  private async exigirOferente(em: EntityManager, procesoId: string, oferenteId: string) {
    const oferentes = await this.oferentesDe(em, procesoId);
    const oferente = oferentes.get(oferenteId);

    if (!oferente) {
      throw new NotFoundException(
        'Esa oferta no está en la lista de este proceso: solo puede subsanar quien presentó oferta',
      );
    }
    return oferente;
  }

  protected async oferentesDe(
    em: EntityManager,
    procesoId: string,
  ): Promise<Map<string, Oferente>> {
    const recepcion = await em.getRepository(RecepcionOfertas).findOne({ where: { procesoId } });
    if (!recepcion) return new Map();

    const oferentes = await em
      .getRepository(Oferente)
      .find({ where: { recepcionId: recepcion.id }, order: { numero: 'ASC' } });

    return new Map(oferentes.map((o) => [o.id, o]));
  }

  private async exigirQueApliquen(em: EntityManager, proceso: Proceso) {
    const excluida = await em.getRepository(ActividadExcluida).findOne({
      where: { numeral: NUMERAL_SUBSANACIONES, modalidad: proceso.modalidad ?? '' },
    });
    if (excluida) {
      throw new ConflictException(
        `Esta modalidad no recibe subsanaciones al informe: ${excluida.motivo}`,
      );
    }
  }

  /**
   * Las respuestas quedan cumplidas cuando no queda nada sin responder.
   *
   * Vuelve a quedar en curso si después entra otro escrito —extemporáneo, que
   * también se responde—: la actividad la cierra el estado real, no el orden en
   * que ocurrieron las cosas.
   */
  private async marcarRespuestas(
    em: EntityManager,
    procesoId: string,
    informeId: string,
    acceso: HiringAccess,
  ) {
    const pendientes = await em
      .getRepository(Subsanacion)
      .count({ where: { informeId, respondidaAt: IsNull() } });
    const completas = pendientes === 0;

    await this.marcarActividadDelTraslado(
      em,
      procesoId,
      NUMERAL_RESPUESTAS,
      completas ? 'APROBADO' : 'BORRADOR',
      completas ? acceso : null,
    );
  }

  /** Cerrar el traslado cierra las dos actividades: la recepción y sus respuestas. */
  private async marcarCierre(em: EntityManager, procesoId: string, acceso: HiringAccess) {
    await this.marcarActividadDelTraslado(em, procesoId, NUMERAL_SUBSANACIONES, 'APROBADO', acceso);
    await this.marcarActividadDelTraslado(em, procesoId, NUMERAL_RESPUESTAS, 'APROBADO', acceso);
  }

  /** Crea o actualiza la fila del riel para un numeral de esta historia. */
  private async marcarActividadDelTraslado(
    em: EntityManager,
    procesoId: string,
    numeral: string,
    estado: 'APROBADO' | 'BORRADOR',
    acceso: HiringAccess | null,
  ) {
    const actividad = await em
      .getRepository(ProcesoActividad)
      .findOne({ where: { procesoId, numeral } });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral,
          estado: estado as any,
          datos: {},
          ...(acceso ? { revisadoPor: acceso.userName, revisadoAt: new Date() } : {}),
        }),
      );
      return;
    }

    actividad.estado = estado as any;
    actividad.revisadoPor = acceso ? acceso.userName : null;
    actividad.revisadoAt = acceso ? new Date() : null;
    await em.save(actividad);
  }

  /**
   * La recepción queda en curso mientras el término corre y cumplida cuando se
   * cierra el traslado (EFDS-1465): recibir no es un acto que termine por sí
   * solo, termina cuando vence el plazo y la entidad lo cierra.
   */
  private async marcarRecepcion(em: EntityManager, procesoId: string, acceso: HiringAccess) {
    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_SUBSANACIONES },
    });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_SUBSANACIONES,
          estado: 'BORRADOR' as any,
          datos: {},
        }),
      );
      return;
    }

    if (actividad.estado !== 'APROBADO') {
      actividad.estado = 'BORRADOR' as any;
      await em.save(actividad);
    }
  }
}

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

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
import { RegistrarSubsanacionDto } from './dto/subsanaciones.dto';

/** Actividad 6.5 de la matriz: recepción de subsanaciones y observaciones. */
export const NUMERAL_SUBSANACIONES = '6.5';

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

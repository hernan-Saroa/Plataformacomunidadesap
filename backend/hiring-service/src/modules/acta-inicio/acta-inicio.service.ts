import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { ActaInicio } from '../../entities/acta-inicio.entity';
import { Contrato, EstadoContrato } from '../../entities/contrato.entity';
import { SupervisionContrato } from '../../entities/supervision-contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { AnularActaInicioDto, SuscribirActaInicioDto } from './dto/acta-inicio.dto';

/** Actividad 9.1 de la matriz: la reunión y el acta de inicio. */
export const NUMERAL_ACTA_INICIO = '9.1';

/**
 * Si el contrato admite que se le suscriba acta de inicio.
 *
 * Aquí la historia y la matriz coinciden, a diferencia de lo que pasó con la
 * designación del supervisor (EFDS-1165): la 9.1 va después de toda la etapa 8,
 * y EFDS-1167 pide «un contrato legalizado con supervisor designado». Así que
 * se exige la legalización sin desviación que anotar.
 *
 * `EJECUCION` también la admite: es el estado en el que queda tras suscribir, y
 * devolver `false` haría que anular un acta para rehacerla no tuviera salida.
 *
 * Función pura para poder probar la regla sin base de datos.
 */
export function admiteActaInicio(estado: EstadoContrato): boolean {
  return estado === 'LEGALIZADO' || estado === 'EJECUCION';
}

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Reunión y acta de inicio del contrato — actividad 9.1 (EFDS-1167, RF-EJE-01).
 *
 * Donde el contrato deja de tramitarse y empieza a cumplirse. La plataforma no
 * celebra la reunión: registra que ocurrió, guarda el acta que la prueba y fija
 * desde cuándo corre el plazo.
 *
 * **Queda una tensión anotada**: la matriz describe la 9.1 con un «acta de
 * inicio firmada por ambas partes, **si fue pactada en el contrato**», y repite
 * la salvedad en la 8.7 («cuando aplique»). El módulo no sabe hoy si un
 * contrato la pactó —la tipología no lo registra— y EFDS-1167 no contempla el
 * caso, así que el acta se exige siempre. Si Contratación confirma que hay
 * contratos que arrancan sin acta, lo que falta es dónde se pacta, no esta
 * actividad.
 */
@Injectable()
export class ActaInicioService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, _acceso: HiringAccess) {
    const contrato = await this.contratoDelProceso(this.dataSource.manager, procesoId);

    if (!contrato) {
      return {
        admiteActa: false,
        motivoNoAdmite: 'el proceso todavía no tiene contrato generado',
        contrato: null,
        supervisor: null,
        acta: null,
        puedeSuscribir: false,
        historial: [] as unknown[],
      };
    }

    const admite = admiteActaInicio(contrato.estado);
    const supervisor = await this.supervisorVigente(contrato.id);
    const vigente = await this.actaVigente(contrato.id);

    const acta = vigente
      ? await this.dataSource
          .getRepository(Documento)
          .findOne({ where: { id: vigente.actaDocumentoId } })
      : null;

    // El historial conserva las anuladas: son las que explican que un contrato
    // tenga dos fechas de inicio.
    const todas = await this.dataSource.getRepository(ActaInicio).find({
      where: { contratoId: contrato.id },
      order: { createdAt: 'DESC' },
    });

    return {
      admiteActa: admite,
      motivoNoAdmite: admite ? null : this.porQueNoAdmite(contrato.estado),
      contrato: {
        numero: contrato.numero,
        objeto: contrato.objeto,
        estado: contrato.estado,
        plazoDias: contrato.plazoDias,
        enEjecucionAt: contrato.enEjecucionAt,
      },
      // Sin supervisor no se suscribe: es él quien responde por la ejecución
      // que arranca, y la pantalla tiene que decir qué falta.
      supervisor: supervisor
        ? { nombre: supervisor.nombre, cargo: supervisor.cargo, personaId: supervisor.personaId }
        : null,
      puedeSuscribir: admite && !!supervisor && !vigente,
      motivoNoSuscribe: this.porQueNoSuscribe(admite, !!supervisor, !!vigente),
      acta: vigente
        ? {
            id: vigente.id,
            fechaReunion: vigente.fechaReunion,
            fechaInicio: vigente.fechaInicio,
            // Derivada y no almacenada: si mañana una prórroga mueve el plazo,
            // guardar la fecha de terminación obligaría a recalcularla aquí.
            fechaTerminacionEstimada: this.terminacion(vigente.fechaInicio, contrato.plazoDias),
            asistentes: vigente.asistentes,
            compromisos: vigente.compromisos,
            suscritaPor: vigente.suscritaPor,
            documento: acta
              ? { nombre: acta.archivoNombreOriginal ?? acta.nombre, url: acta.archivoUrl }
              : null,
          }
        : null,
      historial: todas
        .filter((a) => a.estado === 'ANULADA')
        .map((a) => ({
          fechaReunion: a.fechaReunion,
          fechaInicio: a.fechaInicio,
          anuladaAt: a.anuladaAt,
          anuladaPor: a.anuladaPor,
          motivoAnulacion: a.motivoAnulacion,
        })),
    };
  }

  // ---------------------------------------------------------- suscripción --

  /**
   * Suscribe el acta y deja el contrato en ejecución.
   *
   * Las dos cosas en la misma transacción: un acta suscrita sobre un contrato
   * que sigue figurando legalizado sería un expediente que se contradice.
   */
  async suscribir(
    procesoId: string,
    dto: SuscribirActaInicioDto,
    acta: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoLegalizado(em, procesoId);

      const supervisor = await this.supervisorVigente(contrato.id, em);
      if (!supervisor) {
        throw new ConflictException(
          'El contrato no tiene supervisor designado: no hay quien responda por la ejecución que empieza',
        );
      }

      if (await this.actaVigente(contrato.id, em)) {
        throw new ConflictException(
          'El contrato ya tiene acta de inicio: para rehacerla se anula la vigente y se suscribe otra',
        );
      }

      this.validarFechas(dto.fechaReunion, dto.fechaInicio);

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        `Contrato ${contrato.numero} · acta de inicio`,
        acta,
        hash,
        acceso,
      );

      const registro = await em.save(
        em.create(ActaInicio, {
          contratoId: contrato.id,
          actaDocumentoId: doc.id,
          fechaReunion: dto.fechaReunion,
          fechaInicio: dto.fechaInicio,
          asistentes: dto.asistentes ?? null,
          compromisos: dto.compromisos ?? null,
          suscritaPor: acceso.userName,
          estado: 'VIGENTE' as const,
        } as Partial<ActaInicio>),
      );

      contrato.estado = 'EJECUCION';
      contrato.enEjecucionAt = new Date();
      await em.save(contrato);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, registro.id, 'INICIAR', acceso, {
        actividad: NUMERAL_ACTA_INICIO,
        contrato: contrato.numero,
        supervisor: supervisor.nombre,
        fechaReunion: dto.fechaReunion,
        fechaInicio: dto.fechaInicio,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Anula el acta vigente y devuelve el contrato a legalizado.
   *
   * No se borra: fijó la fecha desde la que corrió el plazo, y pudo haber
   * pagos y entregables contados desde ahí. El contrato vuelve a legalizado
   * porque dejar EJECUCION sin acta que lo sostenga es afirmar que se ejecuta
   * algo que nunca arrancó.
   */
  async anular(procesoId: string, dto: AnularActaInicioDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContrato(em, procesoId);
      const vigente = await this.actaVigente(contrato.id, em);
      if (!vigente) throw new NotFoundException('El contrato no tiene acta de inicio vigente');

      vigente.estado = 'ANULADA';
      vigente.anuladaAt = new Date();
      vigente.anuladaPor = acceso.userName;
      vigente.motivoAnulacion = dto.motivo;
      await em.save(vigente);

      contrato.estado = 'LEGALIZADO';
      contrato.enEjecucionAt = null;
      await em.save(contrato);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, vigente.id, 'ANULAR', acceso, {
        actividad: NUMERAL_ACTA_INICIO,
        contrato: contrato.numero,
        fechaInicio: vigente.fechaInicio,
        motivo: dto.motivo,
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------- lo que consumen otras --

  /**
   * El acta vigente del contrato, o nula si no hay.
   *
   * La consultará el trámite de pagos (EFDS-1170) para saber desde cuándo se
   * puede cobrar: no hay factura anterior al inicio de la ejecución.
   */
  actaVigente(contratoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(ActaInicio)
      .findOne({ where: { contratoId, estado: 'VIGENTE' } });
  }

  // ----------------------------------------------------------- auxiliares --

  /** Hoy en Bogotá, que es la zona en la que se cuentan las fechas. */
  private hoy(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }

  /**
   * La reunión ya ocurrió; el inicio puede pactarse hacia adelante.
   *
   * Son dos reglas distintas y por eso no comparten mensaje: registrar una
   * reunión futura es documentar algo que no pasó, mientras que pactar que la
   * ejecución empiece el primero del mes entrante es corriente.
   */
  private validarFechas(fechaReunion: string, fechaInicio: string) {
    if (fechaReunion > this.hoy()) {
      throw new BadRequestException(
        'La fecha de la reunión no puede ser futura: es la de una reunión que ya se celebró',
      );
    }

    if (fechaInicio < fechaReunion) {
      throw new BadRequestException(
        'La ejecución no puede empezar antes de la reunión que la acordó',
      );
    }
  }

  /** Cuándo termina el plazo, si el contrato lo tiene definido. */
  private terminacion(fechaInicio: string, plazoDias: number | null): string | null {
    if (plazoDias === null) return null;
    const fecha = new Date(`${fechaInicio}T00:00:00-05:00`);
    fecha.setDate(fecha.getDate() + plazoDias);
    return fecha.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }

  private porQueNoAdmite(estado: EstadoContrato): string {
    if (estado === 'RECHAZADO') return 'el proponente rechazó la minuta y no hay contrato que iniciar';
    if (estado === 'GENERADO' || estado === 'ACEPTADO') {
      return 'el contrato todavía no lo han firmado las dos partes';
    }
    return 'el contrato todavía no está legalizado: faltan las garantías o la ARL';
  }

  private porQueNoSuscribe(admite: boolean, haySupervisor: boolean, hayActa: boolean) {
    if (!admite) return null;
    if (!haySupervisor) return 'falta designar el supervisor del contrato (8.2)';
    if (hayActa) return 'el contrato ya tiene acta de inicio vigente';
    return null;
  }

  private supervisorVigente(contratoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(SupervisionContrato)
      .findOne({ where: { contratoId, estado: 'VIGENTE' } });
  }

  private async contratoDelProceso(em: EntityManager, procesoId: string, bloquear = false) {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');

    const consulta = em
      .getRepository(Contrato)
      .createQueryBuilder('c')
      .where('c.proceso_id = :procesoId', { procesoId })
      .andWhere("c.estado <> 'RECHAZADO'");

    // Dentro de la transacción se bloquea la fila, con el criterio de la 8.2:
    // dos suscripciones simultáneas leerían ambas «no hay acta» y el índice
    // parcial rechazaría la segunda con un error de llave, no de negocio.
    if (bloquear) consulta.setLock('pessimistic_write');

    return consulta.getOne();
  }

  private async exigirContrato(em: EntityManager, procesoId: string) {
    const contrato = await this.contratoDelProceso(em, procesoId, true);
    if (!contrato) throw new NotFoundException('El proceso no tiene contrato generado');
    return contrato;
  }

  private async exigirContratoLegalizado(em: EntityManager, procesoId: string) {
    const contrato = await this.exigirContrato(em, procesoId);

    if (!admiteActaInicio(contrato.estado)) {
      throw new ConflictException(
        `No se puede suscribir el acta de inicio: ${this.porQueNoAdmite(contrato.estado)}`,
      );
    }

    return contrato;
  }

  /**
   * La actividad se cumple cuando hay acta vigente.
   *
   * Al anular vuelve a quedar en curso: el contrato deja de estar en ejecución
   * hasta que se suscriba otra, y el riel tiene que decirlo.
   */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    contratoId: string,
    acceso: HiringAccess,
  ) {
    const cumplida = !!(await this.actaVigente(contratoId, em));
    const estado = cumplida ? 'APROBADO' : 'BORRADOR';

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_ACTA_INICIO },
    });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_ACTA_INICIO,
          estado: estado as any,
          datos: {},
          ...(cumplida ? { revisadoPor: acceso.userName, revisadoAt: new Date() } : {}),
        }),
      );
      return;
    }

    actividad.estado = estado as any;
    actividad.revisadoPor = cumplida ? acceso.userName : null;
    actividad.revisadoAt = cumplida ? new Date() : null;
    await em.save(actividad);
  }

  private guardarDocumento(
    em: EntityManager,
    expedienteId: string,
    nombre: string,
    archivo: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    return em.save(
      em.create(Documento, {
        expedienteId,
        numeral: NUMERAL_ACTA_INICIO,
        tipo: 'ADJUNTO',
        nombre,
        archivoUrl: `hiring/files/${archivo.filename}`,
        archivoNombreOriginal: archivo.originalname,
        archivoMimeType: archivo.mimetype,
        archivoTamano: archivo.size,
        hashSha256: hash,
        subidoPor: acceso.userName,
      } as Partial<Documento>),
    );
  }

  private traza(
    em: EntityManager,
    procesoId: string,
    entidadId: string,
    accion: AccionTraza,
    acceso: HiringAccess,
    detalle: Record<string, unknown>,
  ) {
    return em.save(
      em.create(Trazabilidad, {
        procesoId,
        entidadId,
        entidad: 'acta_inicio',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { Contrato, EstadoContrato } from '../../entities/contrato.entity';
import { SupervisionContrato } from '../../entities/supervision-contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { AccionTraza, Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { HiringAccess } from '../../auth/hiring-access';
import { DesignarSupervisorDto, RelevarSupervisorDto } from './dto/supervision.dto';

/** Actividad 8.2 de la matriz: la designación del supervisor. */
export const NUMERAL_SUPERVISOR = '8.2';

/**
 * Si el contrato admite que se le designe supervisor.
 *
 * La historia dice «dado un contrato legalizado»: se vigila la ejecución de un
 * contrato con sus coberturas en firme, no de uno al que todavía le faltan
 * garantías. Función pura para poder probar la regla sin base de datos.
 */
export function admiteSupervisor(estado: EstadoContrato): boolean {
  return estado === 'LEGALIZADO';
}

interface ArchivoCargado {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Designación del supervisor del contrato — actividad 8.2 (EFDS-1165).
 *
 * Mismo modelo que el comité evaluador (EFDS-1156): el acto administrativo no
 * es un adjunto más, es lo que convierte un nombre en un supervisor.
 */
@Injectable()
export class SupervisionService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------- consulta --

  async estado(procesoId: string, _acceso: HiringAccess) {
    const contrato = await this.contratoDelProceso(this.dataSource.manager, procesoId);

    if (!contrato) {
      return {
        legalizado: false,
        motivoNoLegalizado: 'el proceso todavía no tiene contrato generado',
        supervisor: null,
        historial: [] as any[],
        avisoPendiente: false,
      };
    }

    const legalizado = admiteSupervisor(contrato.estado);
    const vigente = await this.supervisorVigente(contrato.id);

    // El historial completo: quien vigiló los primeros meses respondió por
    // ellos, así que el expediente conserva a los relevados con su motivo.
    const todas = await this.dataSource.getRepository(SupervisionContrato).find({
      where: { contratoId: contrato.id },
      order: { createdAt: 'DESC' },
    });

    const acto = vigente
      ? await this.dataSource
          .getRepository(Documento)
          .findOne({ where: { id: vigente.actoDocumentoId } })
      : null;

    return {
      legalizado,
      motivoNoLegalizado: legalizado
        ? null
        : contrato.estado === 'PERFECCIONADO'
          ? 'al contrato le faltan las garantías o la ARL'
          : 'el contrato todavía no lo han firmado las dos partes',
      contrato: { numero: contrato.numero, objeto: contrato.objeto },
      puedeDesignar: legalizado && !vigente,
      supervisor: vigente
        ? {
            id: vigente.id,
            personaId: vigente.personaId,
            nombre: vigente.nombre,
            cargo: vigente.cargo,
            email: vigente.email,
            fechaDesignacion: vigente.fechaDesignacion,
            designadoPor: vigente.designadoPor,
            alertaEnviadaAt: vigente.alertaEnviadaAt,
            acto: acto
              ? { nombre: acto.archivoNombreOriginal ?? acto.nombre, url: acto.archivoUrl }
              : null,
          }
        : null,
      /**
       * La matriz pide en 8.2 que se le alerte al supervisor. El módulo no
       * envía correos todavía, así que se dice que el aviso está pendiente en
       * vez de callarlo: quien designa tiene que saber que debe comunicarlo.
       */
      avisoPendiente: !!vigente && !vigente.alertaEnviadaAt,
      historial: todas
        .filter((s) => s.estado === 'RELEVADO')
        .map((s) => ({
          nombre: s.nombre,
          cargo: s.cargo,
          fechaDesignacion: s.fechaDesignacion,
          relevadoAt: s.relevadoAt,
          motivoRelevo: s.motivoRelevo,
        })),
    };
  }

  // ---------------------------------------------------------- designación --

  async designar(
    procesoId: string,
    dto: DesignarSupervisorDto,
    acto: ArchivoCargado,
    hash: string,
    acceso: HiringAccess,
  ) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoLegalizado(em, procesoId);

      if (await this.supervisorVigente(contrato.id, em)) {
        throw new ConflictException(
          'El contrato ya tiene supervisor designado: para cambiarlo se releva al actual y se designa otro',
        );
      }

      this.validarFecha(dto.fechaDesignacion);

      const expediente = await em.findOne(Expediente, { where: { procesoId } });
      if (!expediente) throw new NotFoundException('El proceso no tiene expediente abierto');

      const doc = await this.guardarDocumento(
        em,
        expediente.id,
        `Contrato ${contrato.numero} · designación de supervisor`,
        acto,
        hash,
        acceso,
      );

      const supervision = await em.save(
        em.create(SupervisionContrato, {
          contratoId: contrato.id,
          actoDocumentoId: doc.id,
          fechaDesignacion: dto.fechaDesignacion,
          personaId: dto.personaId,
          nombre: dto.nombre,
          cargo: dto.cargo ?? null,
          email: dto.email ?? null,
          designadoPor: acceso.userName,
          estado: 'VIGENTE' as const,
        } as Partial<SupervisionContrato>),
      );

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, supervision.id, 'DESIGNAR', acceso, {
        actividad: NUMERAL_SUPERVISOR,
        contrato: contrato.numero,
        supervisor: dto.nombre,
        fechaDesignacion: dto.fechaDesignacion,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Releva al supervisor vigente.
   *
   * No se borra: quien vigiló hasta hoy respondió por ese periodo, y el
   * expediente conserva los dos actos con el motivo del cambio.
   */
  async relevar(procesoId: string, dto: RelevarSupervisorDto, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoLegalizado(em, procesoId);
      const vigente = await this.supervisorVigente(contrato.id, em);
      if (!vigente) throw new NotFoundException('El contrato no tiene supervisor designado');

      vigente.estado = 'RELEVADO';
      vigente.relevadoAt = new Date();
      vigente.relevadoPor = acceso.userName;
      vigente.motivoRelevo = dto.motivo;
      await em.save(vigente);

      await this.marcarActividad(em, procesoId, contrato.id, acceso);

      await this.traza(em, procesoId, vigente.id, 'REVOCAR', acceso, {
        actividad: NUMERAL_SUPERVISOR,
        contrato: contrato.numero,
        supervisor: vigente.nombre,
        motivo: dto.motivo,
      });
    });

    return this.estado(procesoId, acceso);
  }

  /**
   * Deja constancia de que se le avisó al supervisor.
   *
   * La matriz lo pide en 8.2 y el módulo no envía correos todavía, así que el
   * aviso lo hace una persona y aquí se registra cuándo. Cuando exista
   * notificaciones, el envío marcará esta misma columna.
   */
  async registrarAviso(procesoId: string, acceso: HiringAccess) {
    await this.dataSource.transaction(async (em) => {
      const contrato = await this.exigirContratoLegalizado(em, procesoId);
      const vigente = await this.supervisorVigente(contrato.id, em);
      if (!vigente) throw new NotFoundException('El contrato no tiene supervisor designado');

      if (vigente.alertaEnviadaAt) {
        throw new ConflictException('Ya quedó constancia de que se le avisó al supervisor');
      }

      vigente.alertaEnviadaAt = new Date();
      await em.save(vigente);

      await this.traza(em, procesoId, vigente.id, 'ADJUNTAR', acceso, {
        actividad: NUMERAL_SUPERVISOR,
        supervisor: vigente.nombre,
        aviso: 'comunicado',
      });
    });

    return this.estado(procesoId, acceso);
  }

  // ----------------------------------------------- lo que consumen otras --

  /**
   * El supervisor vigente del contrato, o nulo si no hay.
   *
   * Lo consultará la etapa 9 (EFDS-1167 y EFDS-1168) para saber quién puede
   * suscribir el acta de inicio y cargar los informes de seguimiento.
   */
  supervisorVigente(contratoId: string, em?: EntityManager) {
    const manager = em ?? this.dataSource.manager;
    return manager
      .getRepository(SupervisionContrato)
      .findOne({ where: { contratoId, estado: 'VIGENTE' } });
  }

  // ----------------------------------------------------------- auxiliares --

  /** El acto ya se firmó; no se designa hacia el futuro. */
  private validarFecha(fecha: string) {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    if (fecha > hoy) {
      throw new BadRequestException(
        'La fecha de designación no puede ser posterior a hoy: es la del acto ya firmado',
      );
    }
  }

  /**
   * La actividad se cumple cuando hay supervisor vigente.
   *
   * Al relevar vuelve a quedar en curso: el contrato se queda sin quien lo
   * vigile hasta que se designe otro, y el riel tiene que decirlo.
   */
  private async marcarActividad(
    em: EntityManager,
    procesoId: string,
    contratoId: string,
    acceso: HiringAccess,
  ) {
    const aprobado = !!(await this.supervisorVigente(contratoId, em));
    const estado = aprobado ? 'APROBADO' : 'BORRADOR';

    const actividad = await em.getRepository(ProcesoActividad).findOne({
      where: { procesoId, numeral: NUMERAL_SUPERVISOR },
    });

    if (!actividad) {
      await em.save(
        em.create(ProcesoActividad, {
          procesoId,
          numeral: NUMERAL_SUPERVISOR,
          estado: estado as any,
          datos: {},
          ...(aprobado ? { revisadoPor: acceso.userName, revisadoAt: new Date() } : {}),
        }),
      );
      return;
    }

    actividad.estado = estado as any;
    actividad.revisadoPor = aprobado ? acceso.userName : null;
    actividad.revisadoAt = aprobado ? new Date() : null;
    await em.save(actividad);
  }

  private async contratoDelProceso(em: EntityManager, procesoId: string, bloquear = false) {
    const proceso = await em.getRepository(Proceso).findOne({ where: { id: procesoId } });
    if (!proceso) throw new NotFoundException('El proceso no existe');

    const consulta = em
      .getRepository(Contrato)
      .createQueryBuilder('c')
      .where('c.proceso_id = :procesoId', { procesoId })
      .andWhere("c.estado <> 'RECHAZADO'");

    // Dentro de la transacción se bloquea la fila: dos designaciones
    // simultáneas leerían ambas «no hay supervisor» y el índice parcial
    // rechazaría la segunda con un error de llave, no de negocio.
    if (bloquear) consulta.setLock('pessimistic_write');

    return consulta.getOne();
  }

  private async exigirContratoLegalizado(em: EntityManager, procesoId: string) {
    const contrato = await this.contratoDelProceso(em, procesoId, true);
    if (!contrato) throw new NotFoundException('El proceso no tiene contrato generado');

    if (!admiteSupervisor(contrato.estado)) {
      throw new ConflictException(
        'El contrato todavía no está legalizado: el supervisor se designa sobre un contrato con sus coberturas en firme',
      );
    }

    return contrato;
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
        numeral: NUMERAL_SUPERVISOR,
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
        entidad: 'supervision_contrato',
        accion,
        detalle,
        usuarioNombre: acceso.userName,
        usuarioId: acceso.userId,
      } as Partial<Trazabilidad>),
    );
  }
}

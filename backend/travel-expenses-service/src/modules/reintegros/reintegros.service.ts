import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  EstadoReintegro,
  OrigenReintegro,
  ReintegroComisionEntity,
} from '../../entities/reintegro-comision.entity';
import { SolicitudComisionEntity } from '../../entities/solicitud-comision.entity';
import { SolicitudHistorialEstadoEntity } from '../../entities/solicitud-historial-estado.entity';
import { EstadoSolicitud } from '../../entities/estado-solicitud.enum';
import { RegistrarReintegroDto } from '../../dto/registrar-reintegro.dto';
import { fechaHoraColombia } from '../../common/dias-habiles.util';

/** Evento emitido al cerrar una legalización en la que el viaje fue menor a lo pagado. */
export const EVENTO_REINTEGRO_REQUERIDO = 'commission.reintegro_required';

export interface EventoReintegroRequerido {
  solicitudId: string;
  valorPagado: number;
  valorReintegro: number;
  diasComision?: number | null;
  diasReales?: number | null;
}

const MODALIDAD_AVANCE = 'AVANCE';

/**
 * RF-PAG-004 — Gestión de reintegros de comisiones pagadas por avance cuando el
 * comisionado no viajó o viajó menos días (Etapa 8).
 */
@Injectable()
export class ReintegrosService {
  private readonly logger = new Logger(ReintegrosService.name);

  constructor(
    @InjectRepository(ReintegroComisionEntity)
    private readonly reintegroRepo: Repository<ReintegroComisionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Lista los reintegros (pendientes y registrados) con los datos de la comisión.
   * Antes de consultar incorpora las comisiones pagadas que se cancelaron sin viajar.
   */
  async listarReintegros(estado?: string) {
    await this.generarReintegrosDeComisionesNoRealizadas();

    const query = this.reintegroRepo
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.solicitud', 's')
      .leftJoinAndSelect('s.comisionado', 'c')
      .orderBy('r.creadoEn', 'DESC');

    if (estado) {
      query.where('r.estado = :estado', { estado });
    }

    const reintegros = await query.getMany();
    return reintegros.map((r) => this.aRespuesta(r));
  }

  /**
   * Comisión no realizada: la comisión pagada por avance se canceló con recursos
   * pendientes de reintegro. Se reintegra la totalidad de lo pagado (0 días ejecutados).
   */
  async generarReintegrosDeComisionesNoRealizadas(): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO travel_expenses.reintegros_comision
         (solicitud_id, origen, valor_pagado, valor_a_reintegrar, dias_comision, dias_ejecutados)
       SELECT s.id, $1, s.valor_pagado, s.valor_pagado, s.dias_comision, 0
         FROM travel_expenses.solicitudes_comision s
        WHERE s.estado_solicitud = $2
          AND s.pendiente_reintegro = true
          AND s.modalidad_pago = $3
          AND COALESCE(s.valor_pagado, 0) > 0
       ON CONFLICT (solicitud_id, origen) DO NOTHING`,
      [OrigenReintegro.COMISION_NO_REALIZADA, EstadoSolicitud.CANCELADA, MODALIDAD_AVANCE],
    );
  }

  /**
   * Viaje menor: al cerrar la legalización con menos días de los pagados se deja el
   * reintegro pendiente por el valor calculado según los días efectivamente ejecutados.
   */
  @OnEvent(EVENTO_REINTEGRO_REQUERIDO)
  async alRequerirReintegro(evento: EventoReintegroRequerido): Promise<void> {
    const valorAReintegrar = Number(evento?.valorReintegro ?? 0);
    if (!evento?.solicitudId || !(valorAReintegrar > 0)) {
      return;
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.query(
          `INSERT INTO travel_expenses.reintegros_comision
             (solicitud_id, origen, valor_pagado, valor_a_reintegrar, dias_comision, dias_ejecutados)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (solicitud_id, origen) DO NOTHING`,
          [
            evento.solicitudId,
            OrigenReintegro.VIAJE_MENOR,
            Number(evento.valorPagado ?? 0),
            valorAReintegrar,
            evento.diasComision ?? null,
            evento.diasReales ?? null,
          ],
        );
        await manager.update(
          SolicitudComisionEntity,
          { id: evento.solicitudId },
          { pendienteReintegro: true },
        );
      });
    } catch (err: any) {
      this.logger.error(
        `[reintegros] No se pudo dejar pendiente el reintegro de la solicitud ${evento.solicitudId}: ${err?.message}`,
      );
    }
  }

  /**
   * Registra el reintegro (valor, fecha y soporte de consignación), libera el
   * pendiente de la comisión y deja la trazabilidad.
   */
  async registrarReintegro(
    reintegroId: string,
    usuarioId: string,
    dto: RegistrarReintegroDto,
  ) {
    const fechaReintegro = String(dto.fechaReintegro).slice(0, 10);
    if (fechaReintegro > fechaHoraColombia().ymd) {
      throw new BadRequestException(
        'La fecha del reintegro no puede ser posterior a la fecha actual.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const reintegro = await manager
        .getRepository(ReintegroComisionEntity)
        .createQueryBuilder('r')
        .setLock('pessimistic_write')
        .where('r.id = :id', { id: reintegroId })
        .getOne();

      if (!reintegro) {
        throw new NotFoundException('Reintegro no encontrado.');
      }

      if (reintegro.estado !== EstadoReintegro.PENDIENTE) {
        throw new BadRequestException('El reintegro ya fue registrado.');
      }

      const valorAReintegrar = Number(reintegro.valorAReintegrar);
      const valorReintegrado = Number(dto.valorReintegrado);
      if (Math.round(valorReintegrado * 100) !== Math.round(valorAReintegrar * 100)) {
        throw new BadRequestException(
          `El valor reintegrado debe ser igual al valor a reintegrar (${valorAReintegrar}).`,
        );
      }

      reintegro.estado = EstadoReintegro.REGISTRADO;
      reintegro.valorReintegrado = valorReintegrado;
      reintegro.fechaReintegro = fechaReintegro;
      reintegro.soportePath = dto.soportePath.trim();
      reintegro.observaciones = dto.observaciones?.trim() || null;
      reintegro.registradoPorId = usuarioId;
      reintegro.fechaRegistro = new Date();
      const guardado = await manager.save(ReintegroComisionEntity, reintegro);

      const solicitud = await manager.findOne(SolicitudComisionEntity, {
        where: { id: reintegro.solicitudId },
        relations: ['comisionado'],
      });
      if (!solicitud) {
        throw new NotFoundException('Solicitud de comisión no encontrada.');
      }

      // Los recursos quedan liberados cuando no hay más reintegros pendientes.
      const pendientes = await manager.count(ReintegroComisionEntity, {
        where: {
          solicitudId: reintegro.solicitudId,
          estado: EstadoReintegro.PENDIENTE,
        },
      });
      if (pendientes === 0 && solicitud.pendienteReintegro) {
        await manager.update(
          SolicitudComisionEntity,
          { id: solicitud.id },
          { pendienteReintegro: false },
        );
      }

      await manager.save(
        SolicitudHistorialEstadoEntity,
        manager.create(SolicitudHistorialEstadoEntity, {
          solicitudId: solicitud.id,
          estadoAnterior: solicitud.estadoSolicitud,
          estadoNuevo: solicitud.estadoSolicitud,
          usuarioId,
          comentarios: `Reintegro registrado por ${valorReintegrado} (consignación del ${fechaReintegro}).`.slice(
            0,
            255,
          ),
        }),
      );

      this.logger.log(
        `[RF-PAG-004] Reintegro de ${solicitud.consecutivoUnico} registrado por ${valorReintegrado}.`,
      );

      guardado.solicitud = solicitud;
      return this.aRespuesta(guardado);
    });
  }

  private aRespuesta(r: ReintegroComisionEntity) {
    const s = r.solicitud;
    const c = s?.comisionado;
    return {
      id: r.id,
      solicitudId: r.solicitudId,
      consecutivoUnico: s?.consecutivoUnico ?? null,
      comisionado: c
        ? {
            numeroDocumento: c.numeroDocumento,
            nombre: [c.primerNombre, c.segundoNombre, c.primerApellido, c.segundoApellido]
              .filter(Boolean)
              .join(' '),
          }
        : null,
      destinoCiudad: s?.destinoCiudad ?? null,
      fechaInicio: s?.fechaInicio ?? null,
      fechaFin: s?.fechaFin ?? null,
      origen: r.origen,
      estado: r.estado,
      valorPagado: Number(r.valorPagado),
      valorAReintegrar: Number(r.valorAReintegrar),
      diasComision: r.diasComision != null ? Number(r.diasComision) : null,
      diasEjecutados: r.diasEjecutados != null ? Number(r.diasEjecutados) : null,
      valorReintegrado: r.valorReintegrado != null ? Number(r.valorReintegrado) : null,
      fechaReintegro: r.fechaReintegro,
      soportePath: r.soportePath,
      observaciones: r.observaciones,
      fechaRegistro: r.fechaRegistro,
    };
  }
}

import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource, EntityManager } from 'typeorm';
import { EstadoSolicitud } from '../../entities/estado-solicitud.enum';
import { SolicitudHistorialEstadoEntity } from '../../entities/solicitud-historial-estado.entity';
import { cargarFestivosAuth } from '../../common/dias-habiles.util';
import { NotificationClientService } from '../../common/notification-client.service';
import { ConfigLegalizacionEntity, ESTADOS_DISPARADOR } from './entities/config-legalizacion.entity';
import { LegalizacionComisionEntity } from './entities/legalizacion-comision.entity';
import { calcularPlazo, fechaColombia } from './plazo-legalizacion.util';

/** Usuario de la trazabilidad cuando la acción no la dispara una persona. */
export const USUARIO_SISTEMA = '00000000-0000-0000-0000-000000000000';

/**
 * Orden del flujo a partir del cual una solicitud puede tener legalización.
 * PENDIENTE_LEGALIZACION va al final: una solicitud en ese estado sin
 * legalización es una anomalía que el barrido repara.
 */
const ORDEN_FLUJO: string[] = [...ESTADOS_DISPARADOR, EstadoSolicitud.PENDIENTE_LEGALIZACION];

export function alcanzoDisparador(estado: string, disparador: string): boolean {
  const iEstado = ORDEN_FLUJO.indexOf(estado);
  const iDisparador = ORDEN_FLUJO.indexOf(disparador);
  return iEstado >= 0 && iDisparador >= 0 && iEstado >= iDisparador;
}

export type AccionDisparo =
  | 'SIN_SOLICITUD'
  | 'SIN_CONFIGURACION'
  | 'NO_APLICA'
  | 'YA_EXISTE'
  | 'ABIERTA';

export interface ResultadoDisparo {
  accion: AccionDisparo;
  solicitudId: string;
  legalizacionId?: string;
  transicionada: boolean;
}

interface FilaSolicitud {
  id: string;
  consecutivo_unico: string;
  estado_solicitud: string;
  modalidad_pago: string;
  fecha_fin_ymd: string;
  creado_por_usuario_id: string;
  comisionado_email: string | null;
}

/**
 * EFDS-1309 — Abre la legalización y lleva la comisión de PAGADA a
 * PENDIENTE_LEGALIZACION.
 *
 * No modifica el flujo de la Etapa 8: escucha el evento que el servicio de
 * viáticos ya emite al cambiar de estado financiero ('commission.disbursement_ready',
 * con estadoNuevo COMPROMETIDA / OBLIGADA / PAGADA) y decide según
 * config_legalizacion de la modalidad de pago. Cambiar el disparador es un
 * UPDATE en esa tabla, no un cambio de código.
 *
 * El barrido periódico (LegalizacionCron) llama a `evaluar` sobre las
 * solicitudes que deberían tener legalización y no la tienen: cubre eventos
 * perdidos (reinicio, error) y cambios de configuración posteriores al pago.
 */
@Injectable()
export class LegalizacionDisparadorService {
  private readonly logger = new Logger(LegalizacionDisparadorService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Optional() private readonly notificationClient?: NotificationClientService,
  ) {}

  /**
   * El evento se emite dentro de la transacción de quien cambia el estado, antes
   * de su commit. `evaluar` bloquea la fila con FOR UPDATE, que espera ese commit
   * y lee el estado ya confirmado: si la transacción se revierte, no se abre nada.
   */
  @OnEvent('commission.disbursement_ready', { async: true })
  async alCambiarEstadoFinanciero(evento: {
    solicitudId: string;
    estadoNuevo?: string;
    usuarioId?: string;
  }): Promise<void> {
    if (!evento?.solicitudId) return;
    try {
      const r = await this.evaluar(evento.solicitudId, evento.usuarioId);
      if (r.accion === 'ABIERTA' || r.transicionada) {
        this.logger.log(
          `[EFDS-1309] ${r.solicitudId}: legalización ${r.accion === 'ABIERTA' ? 'abierta' : 'existente'}` +
            `${r.transicionada ? ', solicitud en PENDIENTE_LEGALIZACION' : ''} (evento ${evento.estadoNuevo ?? '—'}).`,
        );
      }
    } catch (err: any) {
      // El barrido reintenta: un fallo aquí no debe afectar a quien emitió el evento.
      this.logger.error(
        `[EFDS-1309] No se pudo evaluar la legalización de ${evento.solicitudId}: ${err?.message}`,
        err?.stack,
      );
    }
  }

  async evaluar(solicitudId: string, usuarioId?: string): Promise<ResultadoDisparo> {
    const festivos = await cargarFestivosAuth(this.dataSource);

    const resultado = await this.dataSource.transaction(async (m) => {
      const filas: FilaSolicitud[] = await m.query(
        `SELECT s.id, s.consecutivo_unico, s.estado_solicitud, s.modalidad_pago,
                to_char(s.fecha_fin, 'YYYY-MM-DD') AS fecha_fin_ymd,
                s.creado_por_usuario_id, c.email AS comisionado_email
           FROM travel_expenses.solicitudes_comision s
           LEFT JOIN travel_expenses.comisionados c ON c.id = s.comisionado_id
          WHERE s.id = $1
          FOR UPDATE OF s`,
        [solicitudId],
      );
      const sol = filas[0];
      if (!sol) return { r: { accion: 'SIN_SOLICITUD', solicitudId, transicionada: false } as ResultadoDisparo };

      const config = await m.getRepository(ConfigLegalizacionEntity).findOne({
        where: { modalidadPago: sol.modalidad_pago as any, activo: true },
      });
      if (!config) {
        return { r: { accion: 'SIN_CONFIGURACION', solicitudId, transicionada: false } as ResultadoDisparo };
      }
      if (!alcanzoDisparador(sol.estado_solicitud, config.estadoDisparador)) {
        return { r: { accion: 'NO_APLICA', solicitudId, transicionada: false } as ResultadoDisparo };
      }

      const repo = m.getRepository(LegalizacionComisionEntity);
      let legalizacion = await repo.findOne({ where: { solicitudId } });
      const abierta = !legalizacion;

      if (!legalizacion) {
        const ahora = new Date();
        const plazo = calcularPlazo({
          fechaFinComisionYmd: sol.fecha_fin_ymd,
          fechaDisparo: ahora,
          plazoDiasHabiles: config.plazoDiasHabiles,
          horaCorte: config.horaCorte,
          festivos,
        });
        if (plazo.calendarioIncompleto) {
          this.logger.warn(
            `[EFDS-1309] ${sol.consecutivo_unico}: el plazo cruza un año sin festivos cargados en auth.festivos_colombia; la fecha límite puede adelantarse.`,
          );
        }
        legalizacion = await repo.save(
          repo.create({
            solicitudId,
            modalidadPago: sol.modalidad_pago,
            estadoDisparador: config.estadoDisparador,
            fechaDisparo: ahora,
            fechaBasePlazo: plazo.fechaBasePlazo,
            plazoDiasHabiles: config.plazoDiasHabiles,
            horaCorte: config.horaCorte,
            fechaLimite: plazo.fechaLimite,
            calendarioIncompleto: plazo.calendarioIncompleto,
          }),
        );
      }

      const transicionada = await this.transicionarAPendiente(m, sol, legalizacion, usuarioId);

      return {
        r: {
          accion: abierta ? 'ABIERTA' : 'YA_EXISTE',
          solicitudId,
          legalizacionId: legalizacion.id,
          transicionada,
        } as ResultadoDisparo,
        sol,
        legalizacion,
        abierta,
      };
    });

    if ('abierta' in resultado && resultado.abierta) {
      await this.notificarApertura(resultado.sol!, resultado.legalizacion!);
    }
    return resultado.r;
  }

  /** Solo desde PAGADA, y con la condición en el propio UPDATE. */
  private async transicionarAPendiente(
    m: EntityManager,
    sol: FilaSolicitud,
    leg: LegalizacionComisionEntity,
    usuarioId?: string,
  ): Promise<boolean> {
    if (sol.estado_solicitud !== EstadoSolicitud.PAGADA) return false;

    const res = await m.query(
      `UPDATE travel_expenses.solicitudes_comision
          SET estado_solicitud = $2, actualizado_en = now()
        WHERE id = $1 AND estado_solicitud = $3`,
      [sol.id, EstadoSolicitud.PENDIENTE_LEGALIZACION, EstadoSolicitud.PAGADA],
    );
    const filasAfectadas = Array.isArray(res) ? Number(res[1] ?? 0) : Number((res as any)?.rowCount ?? 0);
    if (filasAfectadas !== 1) return false;

    const vence = `${fechaColombia(leg.fechaLimite)} ${leg.horaCorte}`;
    await m.getRepository(SolicitudHistorialEstadoEntity).save({
      solicitudId: sol.id,
      estadoAnterior: EstadoSolicitud.PAGADA,
      estadoNuevo: EstadoSolicitud.PENDIENTE_LEGALIZACION,
      usuarioId: usuarioId || USUARIO_SISTEMA,
      comentarios:
        `[EFDS-1309] Legalización abierta. Plazo: ${leg.plazoDiasHabiles} días hábiles; vence ${vence} (hora Colombia).`.slice(
          0,
          255,
        ),
    });
    return true;
  }

  /**
   * Solicitudes que deberían tener legalización y no la tienen, o que siguen en
   * PAGADA con la legalización ya abierta. Mismo criterio que el canario.
   */
  async barrer(opciones: { limite?: number; soloSolicitudes?: string[] } = {}): Promise<ResultadoDisparo[]> {
    const { limite = 200, soloSolicitudes } = opciones;
    const pendientes: Array<{ id: string }> = await this.dataSource.query(
      `SELECT s.id
         FROM travel_expenses.solicitudes_comision s
         JOIN travel_expenses.config_legalizacion c
           ON c.modalidad_pago = s.modalidad_pago AND c.activo
         LEFT JOIN travel_expenses.legalizaciones_comision l ON l.solicitud_id = s.id
        WHERE ((l.id IS NULL
                AND array_position($1::text[], s.estado_solicitud::text)
                    >= array_position($1::text[], c.estado_disparador::text))
               OR (l.id IS NOT NULL AND s.estado_solicitud = $2))
          AND ($4::uuid[] IS NULL OR s.id = ANY($4::uuid[]))
        ORDER BY s.actualizado_en
        LIMIT $3`,
      [ORDEN_FLUJO, EstadoSolicitud.PAGADA, limite, soloSolicitudes ?? null],
    );

    const resultados: ResultadoDisparo[] = [];
    for (const { id } of pendientes) {
      try {
        resultados.push(await this.evaluar(id));
      } catch (err: any) {
        this.logger.error(`[EFDS-1309] Barrido: falló ${id}: ${err?.message}`);
      }
    }
    return resultados;
  }

  private async notificarApertura(
    sol: FilaSolicitud,
    leg: LegalizacionComisionEntity,
  ): Promise<void> {
    if (!this.notificationClient) return;
    const vence = `${fechaColombia(leg.fechaLimite)} a las ${leg.horaCorte}`;
    const mensaje =
      `La comisión ${sol.consecutivo_unico} quedó pendiente de legalización. ` +
      `Tiene ${leg.plazoDiasHabiles} días hábiles para cargar los soportes: vence el ${vence} (hora Colombia).`;

    try {
      if (sol.creado_por_usuario_id && sol.creado_por_usuario_id !== USUARIO_SISTEMA) {
        await this.notificationClient.send({
          id_usuario_destinatario: sol.creado_por_usuario_id,
          tipo_notificacion: 'VIATICOS_LEGALIZACION_ABIERTA',
          titulo: `Legalización pendiente: ${sol.consecutivo_unico}`,
          mensaje,
          descripcion_corta: `Vence ${vence}`,
          icono: 'Receipt',
          color: '#d97706',
          prioridad: 'Alta',
          categoria: 'VIATICOS',
          tiene_accion: true,
          texto_boton_accion: 'Cargar soportes',
          url_accion: '/viaticos',
          datos_adicionales: { solicitudId: sol.id, legalizacionId: leg.id },
        });
      }
      if (sol.comisionado_email) {
        await this.notificationClient.sendEmail({
          to: sol.comisionado_email,
          subject: `Legalización pendiente de la comisión ${sol.consecutivo_unico}`,
          text: mensaje,
        });
      }
    } catch (err: any) {
      this.logger.warn(`[EFDS-1309] No se pudo notificar la apertura de ${sol.consecutivo_unico}: ${err?.message}`);
    }
  }
}

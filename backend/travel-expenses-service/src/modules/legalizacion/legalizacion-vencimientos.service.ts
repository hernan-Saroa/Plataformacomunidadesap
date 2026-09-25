import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { cargarFestivosAuth } from '../../common/dias-habiles.util';
import { NotificationClientService } from '../../common/notification-client.service';
import { calcularSemaforo, fechaColombia } from './plazo-legalizacion.util';
import { USUARIO_SISTEMA } from './legalizacion-disparador.service';

export interface ResultadoAvisos {
  revisadas: number;
  porVencer: number;
  vencidas: number;
  notificadas: number;
}

/**
 * EFDS-1309 — Aviso de legalizaciones por vencer y vencidas.
 *
 * Cada aviso sale una sola vez por legalización: la marca
 * (notificado_por_vencer_en / notificado_vencido_en) se pone en el mismo UPDATE
 * condicional que la reclama, así dos procesos concurrentes no avisan dos veces.
 */
@Injectable()
export class LegalizacionVencimientosService {
  private readonly logger = new Logger(LegalizacionVencimientosService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Optional() private readonly notificationClient?: NotificationClientService,
  ) {}

  async avisar(ahora = new Date()): Promise<ResultadoAvisos> {
    const festivos = await cargarFestivosAuth(this.dataSource);
    const abiertas: Array<{
      id: string;
      fecha_limite: Date;
      hora_corte: string;
      notificado_por_vencer_en: Date | null;
      notificado_vencido_en: Date | null;
      dias_aviso: number;
      consecutivo_unico: string;
      creado_por_usuario_id: string;
      solicitud_id: string;
    }> = await this.dataSource.query(
      `SELECT l.id, l.fecha_limite, l.hora_corte, l.notificado_por_vencer_en, l.notificado_vencido_en,
              COALESCE(c.dias_aviso_por_vencer, 2) AS dias_aviso,
              s.consecutivo_unico, s.creado_por_usuario_id, s.id AS solicitud_id
         FROM travel_expenses.legalizaciones_comision l
         JOIN travel_expenses.solicitudes_comision s ON s.id = l.solicitud_id
         LEFT JOIN travel_expenses.config_legalizacion c ON c.modalidad_pago = l.modalidad_pago
        WHERE l.fecha_envio IS NULL`,
    );

    const r: ResultadoAvisos = { revisadas: abiertas.length, porVencer: 0, vencidas: 0, notificadas: 0 };

    for (const a of abiertas) {
      const semaforo = calcularSemaforo(
        { fechaLimite: new Date(a.fecha_limite), fechaEnvio: null },
        ahora,
        Number(a.dias_aviso),
        festivos,
      );
      if (semaforo !== 'VENCIDA' && semaforo !== 'POR_VENCER') continue;
      if (semaforo === 'VENCIDA') r.vencidas++;
      else r.porVencer++;

      const columna = semaforo === 'VENCIDA' ? 'notificado_vencido_en' : 'notificado_por_vencer_en';
      const reclamada = await this.dataSource.query(
        `UPDATE travel_expenses.legalizaciones_comision
            SET ${columna} = $2
          WHERE id = $1 AND ${columna} IS NULL AND fecha_envio IS NULL`,
        [a.id, ahora],
      );
      const filas = Array.isArray(reclamada) ? Number(reclamada[1] ?? 0) : 0;
      if (filas !== 1) continue;

      await this.notificar(a, semaforo);
      r.notificadas++;
    }

    this.logger.log(
      `[EFDS-1309] Vencimientos: ${r.revisadas} abiertas, ${r.porVencer} por vencer, ${r.vencidas} vencidas, ${r.notificadas} avisos nuevos.`,
    );
    return r;
  }

  private async notificar(
    a: { consecutivo_unico: string; creado_por_usuario_id: string; solicitud_id: string; fecha_limite: Date; hora_corte: string },
    semaforo: 'VENCIDA' | 'POR_VENCER',
  ): Promise<void> {
    if (!this.notificationClient) return;
    if (!a.creado_por_usuario_id || a.creado_por_usuario_id === USUARIO_SISTEMA) return;
    const vence = `${fechaColombia(new Date(a.fecha_limite))} a las ${a.hora_corte}`;
    const vencida = semaforo === 'VENCIDA';
    try {
      await this.notificationClient.send({
        id_usuario_destinatario: a.creado_por_usuario_id,
        tipo_notificacion: vencida ? 'VIATICOS_LEGALIZACION_VENCIDA' : 'VIATICOS_LEGALIZACION_POR_VENCER',
        titulo: vencida
          ? `Legalización vencida: ${a.consecutivo_unico}`
          : `Legalización por vencer: ${a.consecutivo_unico}`,
        mensaje: vencida
          ? `El plazo para legalizar la comisión ${a.consecutivo_unico} venció el ${vence} (hora Colombia). Cargue los soportes cuanto antes.`
          : `El plazo para legalizar la comisión ${a.consecutivo_unico} vence el ${vence} (hora Colombia).`,
        icono: 'Receipt',
        color: vencida ? '#dc2626' : '#d97706',
        prioridad: vencida ? 'Crítica' : 'Alta',
        categoria: 'VIATICOS',
        tiene_accion: true,
        texto_boton_accion: 'Cargar soportes',
        url_accion: '/viaticos',
        datos_adicionales: { solicitudId: a.solicitud_id },
      });
    } catch (err: any) {
      this.logger.warn(`[EFDS-1309] No se pudo avisar ${semaforo} de ${a.consecutivo_unico}: ${err?.message}`);
    }
  }
}

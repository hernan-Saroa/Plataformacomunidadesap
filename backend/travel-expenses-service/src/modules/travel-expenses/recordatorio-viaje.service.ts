import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import {
  NotificationClientService,
  buildTravelExpenseEmailHtml,
} from '../../common/notification-client.service';
import { EstadoSolicitud } from '../../entities/estado-solicitud.enum';
import { fechaHoraColombia } from '../../common/dias-habiles.util';

/** Comisiones vigentes que efectivamente van a viajar. */
const ESTADOS_RECORDATORIO_VIAJE = [
  EstadoSolicitud.AUTORIZADA,
  EstadoSolicitud.EN_PRESUPUESTO,
  EstadoSolicitud.COMPROMETIDA,
  EstadoSolicitud.OBLIGADA,
  EstadoSolicitud.PAGADA,
];

const DIAS_ANTES_DEL_VIAJE = 2;

/**
 * RF-SIS-002 — Recordatorio D-2: dos días antes del inicio de la comisión se
 * avisa al Enlace (plataforma y correo) y al comisionado (correo).
 */
@Injectable()
export class RecordatorioViajeService {
  private readonly logger = new Logger(RecordatorioViajeService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationClient: NotificationClientService,
  ) {}

  @Cron('0 7 * * *', { name: 'viaticos-recordatorio-viaje-d2', timeZone: 'America/Bogota' })
  async ejecutarRecordatorios(): Promise<void> {
    try {
      await this.enviarRecordatoriosViaje();
    } catch (err: any) {
      this.logger.error(`[RF-SIS-002] Recordatorios D-2 fallaron: ${err?.message}`, err?.stack);
    }
  }

  /**
   * Envía el recordatorio a las comisiones que inician en DIAS_ANTES_DEL_VIAJE días
   * (fecha Colombia). Cada comisión se marca antes de avisar, para no repetir el
   * recordatorio si el proceso corre más de una vez.
   */
  async enviarRecordatoriosViaje(instante: Date = new Date()): Promise<number> {
    const hoy = fechaHoraColombia(instante).ymd;
    const fechaViaje = new Date(`${hoy}T00:00:00Z`);
    fechaViaje.setUTCDate(fechaViaje.getUTCDate() + DIAS_ANTES_DEL_VIAJE);
    const fechaViajeYmd = fechaViaje.toISOString().slice(0, 10);

    const candidatas: Array<{ id: string }> = await this.dataSource.query(
      `SELECT s.id
         FROM travel_expenses.solicitudes_comision s
        WHERE s.fecha_inicio::date = $1::date
          AND s.estado_solicitud = ANY($2::text[])
          AND NOT (COALESCE(s.campos_adicionales, '{}'::jsonb) ? 'recordatorioViajeEnviadoEn')`,
      [fechaViajeYmd, ESTADOS_RECORDATORIO_VIAJE],
    );

    let enviados = 0;
    for (const { id } of candidatas) {
      const marcadas: any[] = await this.dataSource.query(
        `UPDATE travel_expenses.solicitudes_comision s
            SET campos_adicionales = jsonb_set(COALESCE(s.campos_adicionales, '{}'::jsonb),
                                               '{recordatorioViajeEnviadoEn}', to_jsonb(now()::text))
          WHERE s.id = $1
            AND NOT (COALESCE(s.campos_adicionales, '{}'::jsonb) ? 'recordatorioViajeEnviadoEn')
        RETURNING s.id, s.consecutivo_unico, s.creado_por_usuario_id, s.destino_ciudad,
                  s.fecha_inicio, s.fecha_fin,
                  (SELECT c.email FROM travel_expenses.comisionados c WHERE c.id = s.comisionado_id) AS email_comisionado,
                  (SELECT TRIM(CONCAT_WS(' ', c.primer_nombre, c.primer_apellido))
                     FROM travel_expenses.comisionados c WHERE c.id = s.comisionado_id) AS nombre_comisionado`,
        [id],
      );
      // En PostgreSQL, un UPDATE ... RETURNING devuelve [filas, cantidad].
      const filas = Array.isArray(marcadas?.[0]) ? marcadas[0] : marcadas;
      const comision = filas?.[0];
      if (!comision?.id) continue;

      await this.avisar(comision, fechaViajeYmd);
      enviados++;
    }

    this.logger.log(`[RF-SIS-002] Recordatorios D-2 (${fechaViajeYmd}): ${enviados} enviados.`);
    return enviados;
  }

  private async avisar(
    comision: {
      id: string;
      consecutivo_unico: string;
      creado_por_usuario_id: string | null;
      destino_ciudad: string | null;
      fecha_inicio: Date;
      fecha_fin: Date;
      email_comisionado: string | null;
      nombre_comisionado: string | null;
    },
    fechaViajeYmd: string,
  ): Promise<void> {
    const consecutivo = comision.consecutivo_unico || comision.id;
    const fechaFin = comision.fecha_fin ? new Date(comision.fecha_fin).toISOString().slice(0, 10) : '';
    const fechas = fechaFin ? `${fechaViajeYmd} al ${fechaFin}` : fechaViajeYmd;
    const destino = comision.destino_ciudad || '';
    const mensaje = `La comisión ${consecutivo}${destino ? ` a ${destino}` : ''} inicia el ${fechaViajeYmd} (en ${DIAS_ANTES_DEL_VIAJE} días).`;

    const email = {
      subject: `[Viáticos ESAP] Recordatorio: la comisión ${consecutivo} inicia en ${DIAS_ANTES_DEL_VIAJE} días`,
      html: buildTravelExpenseEmailHtml({
        tituloHeader: 'ESAP — Recordatorio de Comisión de Servicios',
        subtituloHeader: `Expediente: ${consecutivo}`,
        mensajePrincipal: `Le recordamos que la comisión de servicios <strong>${consecutivo}</strong> inicia en ${DIAS_ANTES_DEL_VIAJE} días.`,
        consecutivo,
        comisionadoNombre: comision.nombre_comisionado || undefined,
        destino,
        fechas,
        tipoNovedad: 'INFO',
        textoBoton: 'Ver en la plataforma',
      }),
      text: mensaje,
    };

    if (comision.creado_por_usuario_id) {
      await this.notificationClient
        .notifyUser(
          comision.creado_por_usuario_id,
          {
            tipo_notificacion: 'VIATICOS_RECORDATORIO_VIAJE',
            titulo: `Recordatorio de viaje: ${consecutivo}`,
            mensaje,
            descripcion_corta: `Inicia el ${fechaViajeYmd} · ${consecutivo}`,
            icono: 'Plane',
            color: '#003DA5',
            prioridad: 'Media' as const,
            categoria: 'VIATICOS',
            tiene_accion: true,
            texto_boton_accion: 'Ver comisión',
            url_accion: '/viaticos',
            datos_adicionales: { solicitudId: comision.id, consecutivoUnico: consecutivo },
          },
          email,
        )
        .catch((err) =>
          this.logger.warn(`[RF-SIS-002] No se pudo avisar al enlace de ${consecutivo}: ${err?.message}`),
        );
    }

    if (comision.email_comisionado && comision.email_comisionado.includes('@')) {
      await this.notificationClient
        .sendEmail({ to: comision.email_comisionado, subject: email.subject, html: email.html, text: email.text })
        .catch((err) =>
          this.logger.warn(`[RF-SIS-002] No se pudo avisar al comisionado de ${consecutivo}: ${err?.message}`),
        );
    }
  }
}

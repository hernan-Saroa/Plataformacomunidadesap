import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { BancoDocentesService } from './banco-docentes.service';

/** Cada cuánto se revisan los periodos de prueba cumplidos (la alerta nunca se repite: la clave es estable). */
const REVISION_MS = 6 * 60 * 60 * 1000;

/** `2026-11-15` → `15/11/2026` para el texto del aviso. */
export function fechaLegible(iso: string): string {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

/** UUID estable por docente + fecha de cumplimiento + destinatario: el aviso se entrega una sola vez. */
export function claveAlertaPeriodoPrueba(docenteId: string, cumplimiento: string, usuarioId: string): string {
  const hex = createHash('sha1').update(`rund-periodo-prueba:${docenteId}:${cumplimiento}:${usuarioId}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/**
 * HU 2424 / RN-03 — Al cumplirse el año de prueba avisa (campana de notificaciones) a los usuarios con el rol
 * responsable del GGP. El aviso no depende de que alguien abra el Banco de Docentes.
 */
@Injectable()
export class RundPeriodoPruebaAlertasService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private busy = false;
  private readonly logger = new Logger(RundPeriodoPruebaAlertasService.name);

  constructor(private readonly db: DataSource, private readonly banco: BancoDocentesService) {}

  onModuleInit() {
    if (process.env.RUND_PERIODO_PRUEBA_ALERTAS === 'false') return;
    this.timer = setInterval(() => void this.emitir(), REVISION_MS);
    this.timer.unref();
    const first = setTimeout(() => void this.emitir(), 15_000);
    first.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private baseUrl(): string {
    return (process.env.NOTIFICATIONS_SERVICE_URL || process.env.NOTIFICATION_SERVICE_URL
      || ((process.env.NODE_ENV || 'development') === 'production' ? 'http://notifications-service:3009' : 'http://localhost:3009')).replace(/\/$/, '');
  }

  /** Devuelve cuántos avisos nuevos se entregaron. */
  async emitir(): Promise<number> {
    if (this.busy) return 0;
    this.busy = true;
    let entregados = 0;
    try {
      const { items } = await this.banco.getAlertasPeriodoPrueba();
      if (!items.length) return 0;
      const destinatarios: Array<{ id_user: string }> = await this.db.query(
        `SELECT DISTINCT u.id_user
         FROM auth."user" u
         INNER JOIN auth.user_roles ur ON ur.id_user = u.id_user AND COALESCE(ur.is_active, true) = true
         INNER JOIN auth.role r ON r.id = ur.id_rol AND COALESCE(r.is_active, true) = true
         WHERE COALESCE(u.is_active, true) = true AND UPPER(r.code) = 'GESTION_PROFESORAL'`,
      );
      for (const docente of items) {
        if (!docente.cumplimiento) continue;
        for (const user of destinatarios) {
          const response = await fetch(`${this.baseUrl()}/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10_000),
            redirect: 'error',
            body: JSON.stringify({
              clave_idempotencia: claveAlertaPeriodoPrueba(docente.docente_id, docente.cumplimiento, user.id_user),
              id_usuario_destinatario: user.id_user,
              tipo_notificacion: 'rund_periodo_prueba_cumplido',
              titulo: 'Periodo de prueba cumplido: pendiente de decisión del comité',
              mensaje: `${docente.nombre_completo} cumplió el año de periodo de prueba el ${fechaLegible(docente.cumplimiento)}. Registre la decisión del Comité Docente en el RUND.`,
              categoria: 'RUND', modulo: 'pta', prioridad: 'Alta', icono: 'AlertTriangle', color: 'orange',
              tiene_accion: true, texto_boton_accion: 'Ver pendientes',
              url_accion: '/?module=banco-docentes-pta&rundPeriodoPrueba=PENDIENTE',
              datos_adicionales: { rundDocenteId: docente.docente_id, cumplimiento: docente.cumplimiento },
              enviar_email: false,
            }),
          });
          // 409 = ese aviso ya se entregó antes (clave idempotente).
          if (response.ok) entregados += 1;
          else if (response.status !== 409) throw new Error(`NOTIFICACIONES_${response.status}`);
        }
      }
    } catch (error: any) {
      this.logger.warn(`Alerta de periodo de prueba pendiente; se reintentará en la próxima revisión (${error?.message || error}).`);
    } finally {
      this.busy = false;
    }
    return entregados;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { COMPONENT_PERMISSION, PTA_APPROVE_ALL } from '../auth/pta-permissions.constants';

/** Usuario destinatario resuelto desde el esquema auth. */
export interface NotifUser {
  idUser: string; // auth.user.id_user — el id que usa la campana del frontend
  email: string | null;
  nombre: string | null;
}

/** Etiquetas legibles por componente para los textos de notificación. */
const COMPONENT_LABELS: Record<string, string> = {
  academica: 'Docencia',
  complementarias: 'Actividades Complementarias (incl. Académico-Administrativas)',
  investigacion: 'Investigación',
  ext_capacitacion: 'Extensión — Capacitación',
  ext_procesos: 'Extensión — Procesos de Selección',
  ext_fortalecimiento: 'Extensión — Fortalecimiento',
  ext_gobierno: 'Extensión — Alto Gobierno',
  ext_secciones: 'Extensión — Secciones y Actividades',
  // Legacy (fusionado en complementarias) — se conserva solo para notificaciones históricas.
  academicas_admin: 'Actividades Académico-Administrativas',
};

/**
 * Notificaciones del módulo PTA. Encapsula:
 *  - Búsqueda de usuarios por permiso de aprobación (auth.role_permissions).
 *  - Envío de notificaciones in-app (notifications-service: POST /notifications[/bulk]).
 *  - Envío de correo (notifications-service: POST /api/v1/emails/send).
 *
 * Todas las operaciones de red son "best-effort": nunca lanzan, para no bloquear
 * el flujo de aprobación si el notifications-service está caído.
 */
@Injectable()
export class PtaNotificationsService {
  private readonly logger = new Logger(PtaNotificationsService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  componentLabel(componente: string): string {
    return COMPONENT_LABELS[componente] || componente;
  }

  private resolveBaseUrl(): string {
    const direct = process.env.NOTIFICATIONS_SERVICE_URL || process.env.NOTIFICATION_SERVICE_URL;
    if (direct) return direct.replace(/\/$/, '');
    if ((process.env.NODE_ENV || 'development') !== 'production') return 'http://localhost:3009';
    return 'http://notifications-service:3009';
  }

  private resolvePublicAppUrl(): string {
    const direct = process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL;
    return (direct || 'http://localhost:3000').replace(/\/$/, '');
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Resolución de destinatarios (esquema auth) ────────────────────────────

  /**
   * Usuarios (id_user, email, nombre) cuyos roles activos tienen CUALQUIERA de los
   * permisos indicados. Usado para notificar a los aprobadores de un componente
   * (su permiso pta.approve.<componente> + el integral pta.approve.all).
   */
  async getUsersByPermission(codes: string[]): Promise<NotifUser[]> {
    const list = Array.from(new Set((codes || []).filter(Boolean)));
    if (list.length === 0) return [];
    try {
      const rows: Array<{ id_user: string; email: string | null; nombre: string | null }> =
        await this.dataSource.query(
          `SELECT DISTINCT u.id_user::text AS id_user,
                  COALESCE(p.dir_email, u.username) AS email,
                  p.nom_largo AS nombre
             FROM auth."user" u
             JOIN auth.user_roles ur       ON ur.id_user = u.id_user AND COALESCE(ur.is_active, true) = true
             JOIN auth.role_permissions rp ON rp.id_rol  = ur.id_rol AND COALESCE(rp.is_active, true) = true
             JOIN auth.permission perm     ON perm.id_permission = rp.id_permission AND COALESCE(perm.is_active, true) = true
             LEFT JOIN auth.personas p     ON p.id_person = u.id_person
            WHERE perm.code = ANY($1::text[])
              AND COALESCE(u.is_active, true) = true`,
          [list],
        );
      return rows.map((r) => ({ idUser: r.id_user, email: r.email || null, nombre: r.nombre || null }));
    } catch (error: any) {
      this.logger.warn(`getUsersByPermission falló para [${list.join(', ')}]: ${error?.message}`);
      return [];
    }
  }

  /**
   * Resuelve un id de profesor a los datos del usuario (id_user + email + nombre).
   * Acepta cualquiera de: el id de la entidad academic_work_plan."Docente" (que es
   * lo que guarda PTA.docenteId), el id_person de auth.personas, o el id_user.
   */
  async resolveUser(idMaybe: string): Promise<NotifUser | null> {
    const key = String(idMaybe || '').trim();
    if (!key) return null;
    try {
      const rows: Array<{ id_user: string; email: string | null; nombre: string | null }> =
        await this.dataSource.query(
          `SELECT u.id_user::text AS id_user,
                  COALESCE(p.dir_email, u.username) AS email,
                  p.nom_largo AS nombre
             FROM auth."user" u
             JOIN auth.personas p ON p.id_person = u.id_person
            WHERE p.id_person::text = $1
               OR u.id_user::text = $1
               OR p.id_person = (
                    SELECT d."personaId" FROM academic_work_plan."Docente" d
                     WHERE d.id::text = $1 LIMIT 1
                  )
            LIMIT 1`,
          [key],
        );
      if (!rows || rows.length === 0) return null;
      const r = rows[0];
      return { idUser: r.id_user, email: r.email || null, nombre: r.nombre || null };
    } catch (error: any) {
      this.logger.warn(`resolveUser falló para ${key}: ${error?.message}`);
      return null;
    }
  }

  // ── Transporte (best-effort, no lanza) ────────────────────────────────────

  private async postJson(path: string, payload: any): Promise<boolean> {
    try {
      const res = await fetch(`${this.resolveBaseUrl()}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        this.logger.warn(`notifications-service ${path} respondió ${res.status}`);
        return false;
      }
      return true;
    } catch (error: any) {
      this.logger.warn(`No se pudo conectar a notifications-service (${path}): ${error?.message}`);
      return false;
    }
  }

  private async createInAppBulk(dtos: any[]): Promise<void> {
    if (!dtos.length) return;
    await this.postJson('/notifications/bulk', { notifications: dtos });
  }

  private async createInApp(dto: any): Promise<void> {
    await this.postJson('/notifications', dto);
  }

  private async sendEmail(to: string, subject: string, text: string, html: string): Promise<void> {
    if (!to) return;
    await this.postJson('/api/v1/emails/send', { to, subject, text, html });
  }

  // ── Casos de negocio ──────────────────────────────────────────────────────

  /**
   * Notifica a los usuarios con permiso de aprobación de cada componente pendiente
   * que un PTA requiere su revisión (bandeja in-app + correo). Agrupa por usuario
   * para no enviar duplicados a quien pueda aprobar varios componentes (p.ej. el
   * aprobador integral pta.approve.all).
   */
  async notifyApproversPtaEnRevision(opts: {
    ptaId: string;
    docenteNombre?: string | null;
    periodo?: string | null;
    componentes: string[];
  }): Promise<{ notificados: number }> {
    const componentes = Array.from(new Set((opts.componentes || []).filter(Boolean)));
    if (componentes.length === 0) return { notificados: 0 };

    // Mapa idUser -> { user, componentes que puede aprobar }
    const porUsuario = new Map<string, { user: NotifUser; componentes: string[] }>();
    for (const comp of componentes) {
      const permiso = COMPONENT_PERMISSION[comp as keyof typeof COMPONENT_PERMISSION];
      if (!permiso) continue;
      const users = await this.getUsersByPermission([permiso, PTA_APPROVE_ALL]);
      for (const u of users) {
        const entry = porUsuario.get(u.idUser) || { user: u, componentes: [] };
        if (!entry.componentes.includes(comp)) entry.componentes.push(comp);
        porUsuario.set(u.idUser, entry);
      }
    }

    if (porUsuario.size === 0) {
      this.logger.log(`PTA ${opts.ptaId}: no hay aprobadores con permiso para [${componentes.join(', ')}]`);
      return { notificados: 0 };
    }

    // url_accion apunta a una ruta reconocida por NotificationsPanelV2
    // (tryHandlePtaNotificationInApp) para abrir el detalle del PTA in-app, sin
    // recargar la página. El ptaId también va en la ruta (además de
    // datos_adicionales) siguiendo el mismo patrón que usan Legal/Control Interno.
    const url = `/pta?ptaId=${opts.ptaId}`;
    const linkAbsoluto = `${this.resolvePublicAppUrl()}/?view=backoffice`;
    const docente = opts.docenteNombre || 'un docente';
    const periodoTxt = opts.periodo ? ` (${opts.periodo})` : '';
    const dtos: any[] = [];

    for (const { user, componentes: comps } of porUsuario.values()) {
      const labels = comps.map((c) => this.componentLabel(c)).join(', ');
      const titulo = 'Nuevo PTA pendiente de tu aprobación';
      const mensaje = `El PTA de ${docente}${periodoTxt} requiere tu revisión en: ${labels}.`;

      dtos.push({
        id_usuario_destinatario: user.idUser,
        tipo_notificacion: 'pta_pendiente_aprobacion',
        titulo,
        mensaje,
        categoria: 'PTA',
        prioridad: 'Alta',
        icono: 'clipboard-check',
        color: '#2563EB',
        tiene_accion: true,
        texto_boton_accion: 'Revisar PTA',
        url_accion: url,
        datos_adicionales: { ptaId: opts.ptaId, componentes: comps, periodo: opts.periodo ?? null },
      });

      if (user.email) {
        const html = `
          <p>Hola ${this.escapeHtml(user.nombre || '')},</p>
          <p>El PTA de <strong>${this.escapeHtml(docente)}</strong>${this.escapeHtml(periodoTxt)} requiere tu revisión en: <strong>${this.escapeHtml(labels)}</strong>.</p>
          <p><a href="${linkAbsoluto}">Abrir la plataforma para revisar</a></p>
        `;
        // fire-and-forget: no esperamos el correo para no serializar N envíos.
        void this.sendEmail(user.email, titulo, mensaje, html);
      }
    }

    await this.createInAppBulk(dtos);
    this.logger.log(`PTA ${opts.ptaId}: notificados ${dtos.length} aprobador(es) para [${componentes.join(', ')}]`);
    return { notificados: dtos.length };
  }

  /**
   * Notifica al profesor (creador del PTA) que su PTA fue enviado a aprobación.
   * Confirmación de envío (bandeja in-app + correo) para que el docente sepa que
   * su plan salió de Borrador y está en manos de los aprobadores. Best-effort.
   */
  async notifyProfesorPtaEnviadoAprobacion(opts: {
    ptaId: string;
    docenteId: string | null | undefined;
    periodo?: string | null;
    componentes?: string[];
  }): Promise<boolean> {
    if (!opts.docenteId) return false;
    const prof = await this.resolveUser(opts.docenteId);
    if (!prof) {
      this.logger.warn(
        `PTA ${opts.ptaId}: no se resolvió el profesor (${opts.docenteId}) para notificar el envío a aprobación`,
      );
      return false;
    }

    const periodoTxt = opts.periodo ? ` (${opts.periodo})` : '';
    const comps = Array.from(new Set((opts.componentes || []).filter(Boolean)));
    const labels = comps.map((c) => this.componentLabel(c)).join(', ');
    const titulo = 'Tu PTA fue enviado a aprobación';
    const mensaje = `Tu PTA${periodoTxt} fue enviado correctamente y está pendiente de la revisión de los aprobadores.`;
    // 'pta' hace que el portal abra el módulo "Mi PTA" del docente in-app
    // (ver PortalTransaccional: mapa navbarNavigateTo -> {type:'pta'}).
    const url = 'pta';

    await this.createInApp({
      id_usuario_destinatario: prof.idUser,
      tipo_notificacion: 'pta_enviado_aprobacion',
      titulo,
      mensaje,
      categoria: 'PTA',
      prioridad: 'Media',
      icono: 'paper-plane',
      color: '#2563EB',
      tiene_accion: true,
      texto_boton_accion: 'Ver mi PTA',
      url_accion: url,
      datos_adicionales: { ptaId: opts.ptaId, componentes: comps, periodo: opts.periodo ?? null },
    });

    if (prof.email) {
      const linkAbsoluto = `${this.resolvePublicAppUrl()}/?view=portal`;
      const componentesHtml = labels
        ? `<p>Componentes enviados a revisión: <strong>${this.escapeHtml(labels)}</strong>.</p>`
        : '';
      const html = `
        <p>Hola ${this.escapeHtml(prof.nombre || '')},</p>
        <p>${this.escapeHtml(mensaje)}</p>
        ${componentesHtml}
        <p>Te avisaremos a medida que cada componente sea aprobado o devuelto.</p>
        <p><a href="${linkAbsoluto}">Ver mi PTA</a></p>
      `;
      void this.sendEmail(prof.email, titulo, mensaje, html);
    }

    this.logger.log(
      `PTA ${opts.ptaId}: profesor ${prof.idUser} notificado del envío a aprobación${prof.email ? ' (in-app + correo)' : ' (solo in-app: sin email)'}`,
    );
    return true;
  }

  /**
   * Notifica al profesor (creador del PTA) que uno de sus componentes fue aprobado.
   * Texto: "Esta componente ha sido aprobada por [Nombre del aprobador]".
   */
  async notifyProfesorComponenteAprobado(opts: {
    ptaId: string;
    docenteId: string | null | undefined;
    componente: string;
    aprobadorNombre?: string | null;
  }): Promise<boolean> {
    if (!opts.docenteId) return false;
    const prof = await this.resolveUser(opts.docenteId);
    if (!prof) {
      this.logger.warn(`PTA ${opts.ptaId}: no se resolvió el profesor (${opts.docenteId}) para notificar aprobación`);
      return false;
    }

    const compLabel = this.componentLabel(opts.componente);
    const aprobador = opts.aprobadorNombre || 'un aprobador';
    const titulo = `Componente aprobado: ${compLabel}`;
    const mensaje = `Esta componente ha sido aprobada por ${aprobador}`;
    // PortalNotificationBell resuelve el "section" a navegar quitando el slash
    // inicial de url_accion. 'pta' hace que el portal abra el módulo "Mi PTA" del
    // docente in-app (ver PortalTransaccional: mapa navbarNavigateTo -> {type:'pta'}).
    const url = 'pta';

    await this.createInApp({
      id_usuario_destinatario: prof.idUser,
      tipo_notificacion: 'pta_componente_aprobado',
      titulo,
      mensaje,
      descripcion_corta: compLabel,
      categoria: 'PTA',
      prioridad: 'Media',
      icono: 'check-circle',
      color: '#16A34A',
      tiene_accion: true,
      texto_boton_accion: 'Ver mi PTA',
      url_accion: url,
      datos_adicionales: { ptaId: opts.ptaId, componente: opts.componente, aprobador },
    });

    if (prof.email) {
      const linkAbsoluto = `${this.resolvePublicAppUrl()}/?view=portal`;
      const html = `
        <p>Hola ${this.escapeHtml(prof.nombre || '')},</p>
        <p>El componente <strong>${this.escapeHtml(compLabel)}</strong> de tu PTA ha sido aprobado.</p>
        <p>${this.escapeHtml(mensaje)}.</p>
        <p><a href="${linkAbsoluto}">Ver mi PTA</a></p>
      `;
      void this.sendEmail(prof.email, titulo, `${compLabel}: ${mensaje}.`, html);
    }

    this.logger.log(`PTA ${opts.ptaId}: profesor ${prof.idUser} notificado de aprobación de "${opts.componente}"`);
    return true;
  }
}

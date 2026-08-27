import { Injectable, Logger } from '@nestjs/common';
import { NotificationClientService } from './notification-client.service';

const ROLE_JEFE = 'JEFE_GESTION_LEGAL';
const ROLE_RESUELVE = 'RESUELVE_GESTION_LEGAL';

export type LegalModuleKey =
  | 'DEFENSA_JUDICIAL'
  | 'JUZGAMIENTO_DISCIPLINARIO'
  | 'ASESORIA_JURIDICA'
  | 'ORGANOS_CONTROL'
  | 'PROCESOS_COACTIVOS'
  | 'GESTION_RIESGOS'
  | 'TERMINOS_INFORMES';


/**
 * `vista` corresponde al estado interno `VistaDisponible` del MFE de gestión legal
 * (apps/mfe-gestion-legal/src/components/core/GestionLegalFull.tsx). El frontend lee
 * el querystring `?modulo=<vista>&radicado=<...>` y posiciona la vista al cargar.
 */
const MODULE_META: Record<LegalModuleKey, { label: string; vista: string; icon: string; color: string; categoria: string }> = {
  DEFENSA_JUDICIAL: {
    label: 'Defensa Judicial',
    vista: 'defensa-judicial',
    icon: 'Scale',
    color: '#1D4ED8',
    categoria: 'gestion-legal',
  },
  JUZGAMIENTO_DISCIPLINARIO: {
    label: 'Juzgamiento Disciplinario',
    vista: 'juzgamiento',
    icon: 'Gavel',
    color: '#7C3AED',
    categoria: 'gestion-legal',
  },
  ASESORIA_JURIDICA: {
    label: 'Asesoría Jurídica',
    vista: 'asesoria',
    icon: 'BookOpen',
    color: '#0E7490',
    categoria: 'gestion-legal',
  },
  ORGANOS_CONTROL: {
    label: 'Órganos de Control',
    vista: 'organos-control',
    icon: 'Building2',
    color: '#2563EB',
    categoria: 'gestion-legal',
  },
  PROCESOS_COACTIVOS: {
    label: 'Procesos Coactivos',
    vista: 'procesos-coactivos',
    icon: 'DollarSign',
    color: '#F59E0B',
    categoria: 'gestion-legal',
  },
  GESTION_RIESGOS: {
    label: 'Gestión de Riesgos',
    vista: 'riesgos',
    icon: 'AlertTriangle',
    color: '#DC2626',
    categoria: 'gestion-legal',
  },
  TERMINOS_INFORMES: {
    label: 'Términos e Informes',
    vista: 'terminos',
    icon: 'Clock',
    color: '#0891B2',
    categoria: 'gestion-legal',
  },
};

/**
 * Construye una URL RELATIVA con querystring `?modulo=<vista>&radicado=<...>`.
 * El frontend (NotificationsPanelV2) la abre con `window.location.href`, así que el
 * browser la resuelve contra el origin actual y funciona igual en dev/qa/pre/prod.
 */
function buildUrl(modulo: LegalModuleKey, referencia?: string): string {
  const params = new URLSearchParams({ modulo: MODULE_META[modulo].vista });
  if (referencia) params.set('radicado', referencia);
  return `/gestion-legal?${params.toString()}`;
}

/**
 * Cuerpo HTML del correo de alerta/recordatorio de vencimiento de un término.
 */
function buildTerminoVencimientoEmailHtml(nombreActuacion: string, radicado: string | null, textoAnticipacion: string, url: string): string {
  const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}${url}`;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #0891B2; border-bottom: 2px solid #0891B2; padding-bottom: 10px;">Vencimiento de Término</h2>
      <p>Estimado(a) funcionario(a),</p>
      <p>El término <strong>${radicado ? `${radicado} — ` : ''}${nombreActuacion}</strong> ${textoAnticipacion}.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${link}"
           style="background-color: #0891B2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Ver Término
        </a>
      </div>
      <p style="font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; padding-top: 10px; margin-top: 30px;">
        Este es un correo automático de la Plataforma de Gestión Legal ESAP. Por favor no responda a este mensaje.
      </p>
    </div>
  `;
}

/** Escapa caracteres HTML especiales en texto de usuario (nombreActuacion, radicado, periodicidad) antes de interpolarlo en el correo. */
function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Cuerpo HTML del correo que avisa al responsable recién asignado (o reasignado) a un
 * término/informe, con las fechas clave y, si aplica, la periodicidad configurada.
 */
function buildTerminoAsignacionEmailHtml(params: {
  nombreActuacion: string;
  radicado: string | null;
  fechaBase: Date;
  fechaVencimiento: Date;
  periodicidadTexto?: string;
  esReasignacion?: boolean;
  url: string;
}): string {
  const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}${params.url}`;
  const fmt = (d: Date) => new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  const accion = params.esReasignacion ? 'reasignado(a)' : 'asignado(a)';
  const nombreActuacion = escapeHtml(params.nombreActuacion);
  const radicado = params.radicado ? escapeHtml(params.radicado) : null;
  const periodicidadTexto = params.periodicidadTexto ? escapeHtml(params.periodicidadTexto) : null;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #0891B2; border-bottom: 2px solid #0891B2; padding-bottom: 10px;">Nuevo Término/Informe Asignado</h2>
      <p>Estimado(a) funcionario(a),</p>
      <p>Ha sido ${accion} como responsable del término <strong>${radicado ? `${radicado} — ` : ''}${nombreActuacion}</strong>.</p>
      <ul style="line-height: 1.8;">
        <li><strong>Fecha de inicio:</strong> ${fmt(params.fechaBase)}</li>
        <li><strong>Fecha de vencimiento:</strong> ${fmt(params.fechaVencimiento)}</li>
        ${periodicidadTexto ? `<li><strong>Periodicidad:</strong> ${periodicidadTexto}</li>` : ''}
      </ul>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${link}"
           style="background-color: #0891B2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Ver Término
        </a>
      </div>
      <p style="font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; padding-top: 10px; margin-top: 30px;">
        Este es un correo automático de la Plataforma de Gestión Legal ESAP. Por favor no responda a este mensaje.
      </p>
    </div>
  `;
}

/**
 * Cuerpo HTML del correo que avisa al aprobador de la nueva etapa que hay una firma pendiente.
 */
function buildEtapaPendienteEmailHtml(etapaNombre: string, radicado: string, moduloLabel: string, url: string): string {
  const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}${url}`;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #003DA5; border-bottom: 2px solid #003DA5; padding-bottom: 10px;">Firma / Aprobación Requerida</h2>
      <p>Estimado(a) funcionario(a),</p>
      <p>El proceso <strong>${radicado}</strong> en <strong>${moduloLabel}</strong> avanzó a la etapa
      <strong>${etapaNombre}</strong>, la cual requiere su firma o aprobación para continuar.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${link}"
           style="background-color: #003DA5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Ir al Expediente
        </a>
      </div>
      <p style="font-size: 12px; color: #777; border-top: 1px solid #e0e0e0; padding-top: 10px; margin-top: 30px;">
        Este es un correo automático de la Plataforma de Gestión Legal ESAP. Por favor no responda a este mensaje.
      </p>
    </div>
  `;
}

@Injectable()
export class LegalNotificationsService {
  private readonly logger = new Logger(LegalNotificationsService.name);

  constructor(private readonly notificationClient: NotificationClientService) {}

  /**
   * Notifica al Jefe de Gestión Legal que se creó un proceso en el módulo.
   */
  async notifyProcesoCreado(params: {
    modulo: LegalModuleKey;
    radicado: string;
    procesoId: string;
    creadoPor: string;
  }): Promise<void> {
    const meta = MODULE_META[params.modulo];
    const url = buildUrl(params.modulo, params.radicado);
    this.logger.log(`[NOTIFY] Proceso creado — modulo=${params.modulo} radicado=${params.radicado} creadoPor=${params.creadoPor}`);

    const dto = {
      tipo_notificacion: 'PROCESO_CREADO',
      titulo: `Nuevo proceso en ${meta.label}`,
      mensaje: `${params.creadoPor} creó el proceso ${params.radicado} en ${meta.label}.`,
      descripcion_corta: `${params.radicado} creado por ${params.creadoPor}`,
      icono: meta.icon,
      color: meta.color,
      prioridad: 'Media' as const,
      categoria: meta.categoria,
      tiene_accion: true,
      texto_boton_accion: 'Ver proceso',
      url_accion: url,
      datos_adicionales: {
        modulo: params.modulo,
        procesoId: params.procesoId,
        radicado: params.radicado,
        creadoPor: params.creadoPor,
      },
    };

    try {
      await this.notificationClient.notifyByRoles([ROLE_JEFE, ROLE_RESUELVE], dto);
    } catch (err: any) {
      this.logger.warn(`No se pudo notificar creación de proceso ${params.radicado}: ${err?.message}`);
    }
  }

  /**
   * Notifica al Jefe de Gestión Legal que se subió un documento a un proceso.
   */
  async notifyDocumentoSubido(params: {
    modulo: LegalModuleKey;
    radicado: string;
    procesoId: string;
    nombreDocumento: string;
    subidoPor: string;
  }): Promise<void> {
    const meta = MODULE_META[params.modulo];
    const url = buildUrl(params.modulo, params.radicado);
    this.logger.log(`[NOTIFY] Documento subido — modulo=${params.modulo} radicado=${params.radicado} doc="${params.nombreDocumento}" subidoPor=${params.subidoPor}`);

    try {
      await this.notificationClient.notifyByRole(ROLE_JEFE, {
        tipo_notificacion: 'DOCUMENTO_SUBIDO',
        titulo: `Documento subido en ${meta.label}`,
        mensaje: `${params.subidoPor} subió el documento "${params.nombreDocumento}" al proceso ${params.radicado}.`,
        descripcion_corta: `Nuevo documento en ${params.radicado}`,
        icono: 'FileUp',
        color: meta.color,
        prioridad: 'Media',
        categoria: meta.categoria,
        tiene_accion: true,
        texto_boton_accion: 'Ver proceso',
        url_accion: url,
        datos_adicionales: {
          modulo: params.modulo,
          procesoId: params.procesoId,
          radicado: params.radicado,
          nombreDocumento: params.nombreDocumento,
          subidoPor: params.subidoPor,
        },
      });
    } catch (err: any) {
      this.logger.warn(`No se pudo notificar documento subido en ${params.radicado}: ${err?.message}`);
    }
  }

  /**
   * Notifica al abogado (Resuelve) que se le asignó o reasignó un proceso.
   */
  async notifyProfesionalAsignado(params: {
    modulo: LegalModuleKey;
    radicado: string;
    procesoId: string;
    abogadoId: string;
    asignadoPor: string;
    esReasignacion?: boolean;
  }): Promise<void> {
    const meta = MODULE_META[params.modulo];
    const url = buildUrl(params.modulo, params.radicado);
    const accion = params.esReasignacion ? 'reasignado' : 'asignado';
    this.logger.log(`[NOTIFY] Profesional ${accion} — modulo=${params.modulo} radicado=${params.radicado} abogadoId=${params.abogadoId}`);

    try {
      // Notificar al abogado específico (resuelve id_user desde BD)
      await this.notificationClient.notifyUserById(params.abogadoId, {
        tipo_notificacion: params.esReasignacion ? 'PROCESO_REASIGNADO' : 'PROCESO_ASIGNADO',
        titulo: `Proceso ${accion} en ${meta.label}`,
        mensaje: `Se te ${accion} el proceso ${params.radicado} en ${meta.label}${params.asignadoPor !== params.abogadoId ? ` por ${params.asignadoPor}` : ''}.`,
        descripcion_corta: `Proceso ${params.radicado} ${accion}`,
        icono: params.esReasignacion ? 'RefreshCw' : 'Briefcase',
        color: meta.color,
        prioridad: 'Alta',
        categoria: meta.categoria,
        tiene_accion: true,
        texto_boton_accion: 'Ver proceso',
        url_accion: url,
        datos_adicionales: {
          modulo: params.modulo,
          procesoId: params.procesoId,
          radicado: params.radicado,
          asignadoPor: params.asignadoPor,
          esReasignacion: params.esReasignacion ?? false,
        },
      });

      // Notificar al Jefe de Gestión Legal
      await this.notificationClient.notifyByRole(ROLE_JEFE, {
        tipo_notificacion: params.esReasignacion ? 'PROCESO_REASIGNADO' : 'PROCESO_ASIGNADO',
        titulo: `Proceso ${accion} en ${meta.label}`,
        mensaje: `El proceso ${params.radicado} fue ${accion} a un abogado${params.asignadoPor ? ` por ${params.asignadoPor}` : ''}.`,
        descripcion_corta: `${params.radicado} ${accion}`,
        icono: params.esReasignacion ? 'RefreshCw' : 'Briefcase',
        color: meta.color,
        prioridad: 'Media',
        categoria: meta.categoria,
        tiene_accion: true,
        texto_boton_accion: 'Ver proceso',
        url_accion: url,
        datos_adicionales: {
          modulo: params.modulo,
          procesoId: params.procesoId,
          radicado: params.radicado,
          asignadoPor: params.asignadoPor,
          esReasignacion: params.esReasignacion ?? false,
        },
      });
    } catch (err: any) {
      this.logger.warn(`No se pudo notificar asignación de proceso ${params.radicado} al abogado ${params.abogadoId}: ${err?.message}`);
    }
  }

  /**
   * Notifica el avance del expediente a una NUEVA etapa (típicamente tras firmar/aprobar la
   * actuación de la etapa anterior). Avisa:
   *   1. Al abogado del proceso (informativo: su proceso avanzó de fase).
   *   2. Al rol o usuario configurado como aprobador de la NUEVA etapa — quien debe firmar/
   *      revisar en la siguiente fase — por plataforma y, adicionalmente, por correo.
   * El énfasis es la notificación por plataforma; el correo es complementario.
   */
  async notifyEtapaAvanzada(params: {
    modulo: LegalModuleKey;
    radicado: string;
    procesoId: string;
    etapaNombre: string;
    abogadoId?: string;
    aprobacionTipo?: 'ninguno' | 'rol' | 'usuario';
    aprobacionRol?: string;
    aprobacionUsuario?: string;
  }): Promise<void> {
    const meta = MODULE_META[params.modulo];
    const url = buildUrl(params.modulo, params.radicado);
    this.logger.log(`[NOTIFY] Etapa avanzada — modulo=${params.modulo} radicado=${params.radicado} etapa="${params.etapaNombre}"`);

    try {
      // 1) Informar al abogado del proceso que avanzó de etapa
      if (params.abogadoId) {
        await this.notificationClient.notifyUserById(params.abogadoId, {
          tipo_notificacion: 'EXPEDIENTE_ETAPA_AVANZADA',
          titulo: `Proceso avanzó a la etapa ${params.etapaNombre}`,
          mensaje: `El proceso ${params.radicado} pasó a la etapa "${params.etapaNombre}" en ${meta.label}.`,
          descripcion_corta: `${params.radicado} → ${params.etapaNombre}`,
          icono: 'ArrowRight',
          color: meta.color,
          prioridad: 'Media',
          categoria: meta.categoria,
          tiene_accion: true,
          texto_boton_accion: 'Ver proceso',
          url_accion: url,
          datos_adicionales: {
            modulo: params.modulo,
            procesoId: params.procesoId,
            radicado: params.radicado,
            etapa: params.etapaNombre,
          },
        });
      }

      // 2) Notificar al aprobador (rol/usuario) de la NUEVA etapa: tiene una firma pendiente
      const tipo = params.aprobacionTipo;
      if (!tipo || tipo === 'ninguno') return;

      const dto = {
        tipo_notificacion: 'EXPEDIENTE_ETAPA_PENDIENTE_FIRMA',
        titulo: `Pendiente de firma en la etapa ${params.etapaNombre}`,
        mensaje: `El proceso ${params.radicado} entró a la etapa "${params.etapaNombre}" en ${meta.label} y requiere su firma/aprobación.`,
        descripcion_corta: `Firma requerida en ${params.radicado}`,
        icono: 'FileCheck',
        color: '#F59E0B',
        prioridad: 'Alta' as const,
        categoria: meta.categoria,
        tiene_accion: true,
        texto_boton_accion: 'Ver expediente',
        url_accion: url,
        datos_adicionales: {
          modulo: params.modulo,
          procesoId: params.procesoId,
          radicado: params.radicado,
          etapa: params.etapaNombre,
        },
      };

      const emailSubject = `Pendiente de firma — etapa ${params.etapaNombre} — Radicado ${params.radicado}`;
      const emailHtml = buildEtapaPendienteEmailHtml(params.etapaNombre, params.radicado, meta.label, url);

      if (tipo === 'rol' && params.aprobacionRol) {
        await this.notificationClient.notifyByRole(params.aprobacionRol, dto);
        const details = await this.notificationClient.getUsersDetailsByRole(params.aprobacionRol);
        for (const d of details) {
          if (d.email) await this.notificationClient.sendEmail(d.email, emailSubject, emailHtml);
        }
      } else if (tipo === 'usuario' && params.aprobacionUsuario) {
        await this.notificationClient.notifyUserById(params.aprobacionUsuario, dto);
        const detail = await this.notificationClient.getUserDetailsById(params.aprobacionUsuario);
        if (detail?.email) await this.notificationClient.sendEmail(detail.email, emailSubject, emailHtml);
      }
    } catch (err: any) {
      this.logger.warn(`No se pudo notificar avance de etapa del proceso ${params.radicado}: ${err?.message}`);
    }
  }

  /**
   * Notifica al abogado (Resuelve) que se agregó una observación/nota a su proceso.
   */
  async notifyObservacionAgregada(params: {
    radicado: string;
    procesoId: string;
    abogadoId: string;
    autorNombre: string;
    moduloVista?: string;
  }): Promise<void> {
    const url = params.moduloVista
      ? `/gestion-legal?modulo=${encodeURIComponent(params.moduloVista)}&radicado=${encodeURIComponent(params.radicado)}`
      : `/gestion-legal?radicado=${encodeURIComponent(params.radicado)}`;
    this.logger.log(`[NOTIFY] Observación agregada — radicado=${params.radicado} abogadoId=${params.abogadoId} autor=${params.autorNombre}`);

    try {
      await this.notificationClient.notifyUserById(params.abogadoId, {
        tipo_notificacion: 'OBSERVACION_PROCESO',
        titulo: 'Nueva observación en tu proceso',
        mensaje: `${params.autorNombre} realizó una observación en el proceso ${params.radicado}.`,
        descripcion_corta: `Observación en ${params.radicado}`,
        icono: 'MessageSquare',
        color: '#F59E0B',
        prioridad: 'Media',
        categoria: 'gestion-legal',
        tiene_accion: true,
        texto_boton_accion: 'Ver proceso',
        url_accion: url,
        datos_adicionales: {
          procesoId: params.procesoId,
          radicado: params.radicado,
          autorNombre: params.autorNombre,
        },
      });
    } catch (err: any) {
      this.logger.warn(`No se pudo notificar observación en proceso ${params.radicado} al abogado ${params.abogadoId}: ${err?.message}`);
    }
  }

  /**
   * Notifica al Jefe de Gestión Legal que se anexó un proceso a otro.
   * Solo aplica a Defensa Judicial y Juzgamiento Disciplinario.
   */
  async notifyProcesoAnexado(params: {
    modulo: 'DEFENSA_JUDICIAL' | 'JUZGAMIENTO_DISCIPLINARIO';
    radicadoAnexado: string;
    radicadoPrincipal: string;
    procesoPrincipalId: string;
    anexadoPor: string;
  }): Promise<void> {
    const meta = MODULE_META[params.modulo];
    const url = buildUrl(params.modulo, params.radicadoPrincipal);
    this.logger.log(`[NOTIFY] Proceso anexado — modulo=${params.modulo} ${params.radicadoAnexado} -> ${params.radicadoPrincipal} anexadoPor=${params.anexadoPor}`);

    try {
      await this.notificationClient.notifyByRole(ROLE_JEFE, {
        tipo_notificacion: 'PROCESO_ANEXADO',
        titulo: `Proceso anexado en ${meta.label}`,
        mensaje: `${params.anexadoPor} anexó el proceso ${params.radicadoAnexado} al expediente ${params.radicadoPrincipal}.`,
        descripcion_corta: `${params.radicadoAnexado} → ${params.radicadoPrincipal}`,
        icono: 'Link',
        color: meta.color,
        prioridad: 'Media',
        categoria: meta.categoria,
        tiene_accion: true,
        texto_boton_accion: 'Ver proceso principal',
        url_accion: url,
        datos_adicionales: {
          modulo: params.modulo,
          radicadoAnexado: params.radicadoAnexado,
          radicadoPrincipal: params.radicadoPrincipal,
          procesoPrincipalId: params.procesoPrincipalId,
          anexadoPor: params.anexadoPor,
        },
      });
    } catch (err: any) {
      this.logger.warn(`No se pudo notificar anexo de proceso ${params.radicadoAnexado}: ${err?.message}`);
    }
  }

  /**
   * Notifica al abogado del proceso principal y al del proceso anexado sobre el evento de anexado.
   */
  async notifyProfesionalesProcesoAnexado(params: {
    modulo: 'DEFENSA_JUDICIAL' | 'JUZGAMIENTO_DISCIPLINARIO';
    radicadoAnexado: string;
    radicadoPrincipal: string;
    procesoPrincipalId: string;
    procesoAnexadoId: string;
    anexadoPor: string;
    abogadoPrincipalId?: string;
    abogadoAnexadoId?: string;
  }): Promise<void> {
    const meta = MODULE_META[params.modulo];
    const urlPrincipal = buildUrl(params.modulo, params.radicadoPrincipal);
    const urlAnexado = buildUrl(params.modulo, params.radicadoPrincipal);

    const promises: Promise<void>[] = [];

    if (params.abogadoPrincipalId) {
      promises.push(this.notificationClient.notifyUserById(params.abogadoPrincipalId, {
        tipo_notificacion: 'PROCESO_ANEXADO',
        titulo: 'Proceso anexado a tu expediente',
        mensaje: `El proceso ${params.radicadoAnexado} fue anexado a tu expediente ${params.radicadoPrincipal} por ${params.anexadoPor}.`,
        descripcion_corta: `${params.radicadoAnexado} → ${params.radicadoPrincipal}`,
        icono: 'Link',
        color: meta.color,
        prioridad: 'Media' as const,
        categoria: meta.categoria,
        tiene_accion: true,
        texto_boton_accion: 'Ver expediente',
        url_accion: urlPrincipal,
        datos_adicionales: {
          modulo: params.modulo,
          radicadoAnexado: params.radicadoAnexado,
          radicadoPrincipal: params.radicadoPrincipal,
          procesoPrincipalId: params.procesoPrincipalId,
          anexadoPor: params.anexadoPor,
        },
      }));
    }

    if (params.abogadoAnexadoId && params.abogadoAnexadoId !== params.abogadoPrincipalId) {
      promises.push(this.notificationClient.notifyUserById(params.abogadoAnexadoId, {
        tipo_notificacion: 'PROCESO_ANEXADO',
        titulo: 'Tu proceso fue anexado a un expediente',
        mensaje: `Tu proceso ${params.radicadoAnexado} fue anexado al expediente ${params.radicadoPrincipal} por ${params.anexadoPor}.`,
        descripcion_corta: `${params.radicadoAnexado} → ${params.radicadoPrincipal}`,
        icono: 'Link',
        color: meta.color,
        prioridad: 'Media' as const,
        categoria: meta.categoria,
        tiene_accion: true,
        texto_boton_accion: 'Ver expediente principal',
        url_accion: urlAnexado,
        datos_adicionales: {
          modulo: params.modulo,
          radicadoAnexado: params.radicadoAnexado,
          radicadoPrincipal: params.radicadoPrincipal,
          procesoPrincipalId: params.procesoPrincipalId,
          anexadoPor: params.anexadoPor,
        },
      }));
    }

    if (promises.length > 0) {
      try {
        await Promise.all(promises);
      } catch (err: any) {
        this.logger.warn(`No se pudo notificar a abogados sobre anexo ${params.radicadoAnexado} → ${params.radicadoPrincipal}: ${err?.message}`);
      }
    }
  }

  /**
   * Notifica al responsable asignado de un riesgo.
   */
  async notifyRiesgoAsignado(params: {
    radicado?: string;
    riesgoId: string;
    codigo: string;
    nombreRiesgo: string;
    abogadoId: string;
    asignadoPor: string;
    esReasignacion?: boolean;
  }): Promise<void> {
    const meta = MODULE_META['GESTION_RIESGOS'];
    const url = buildUrl('GESTION_RIESGOS');
    const accion = params.esReasignacion ? 'reasignado' : 'asignado';
    this.logger.log(`[NOTIFY] Riesgo ${accion} — codigo=${params.codigo} abogadoId=${params.abogadoId}`);

    try {
      await this.notificationClient.notifyUserById(params.abogadoId, {
        tipo_notificacion: params.esReasignacion ? 'RIESGO_REASIGNADO' : 'RIESGO_ASIGNADO',
        titulo: `Riesgo ${accion} en ${meta.label}`,
        mensaje: `Se te ha ${accion} el riesgo ${params.codigo} (${params.nombreRiesgo}) en ${meta.label}${params.asignadoPor !== params.abogadoId ? ` por ${params.asignadoPor}` : ''}.`,
        descripcion_corta: `Riesgo ${params.codigo} ${accion}`,
        icono: meta.icon,
        color: meta.color,
        prioridad: 'Alta',
        categoria: meta.categoria,
        tiene_accion: true,
        texto_boton_accion: 'Ver riesgo',
        url_accion: url,
        datos_adicionales: {
          modulo: 'GESTION_RIESGOS',
          riesgoId: params.riesgoId,
          codigo: params.codigo,
          asignadoPor: params.asignadoPor,
          esReasignacion: params.esReasignacion ?? false,
        },
      });

      // Notificar al Jefe de Gestión Legal
      await this.notificationClient.notifyByRole(ROLE_JEFE, {
        tipo_notificacion: params.esReasignacion ? 'RIESGO_REASIGNADO' : 'RIESGO_ASIGNADO',
        titulo: `Riesgo ${accion} en ${meta.label}`,
        mensaje: `El riesgo ${params.codigo} (${params.nombreRiesgo}) fue ${accion} a un responsable${params.asignadoPor ? ` por ${params.asignadoPor}` : ''}.`,
        descripcion_corta: `Riesgo ${params.codigo} ${accion}`,
        icono: meta.icon,
        color: meta.color,
        prioridad: 'Media',
        categoria: meta.categoria,
        tiene_accion: true,
        texto_boton_accion: 'Ver riesgo',
        url_accion: url,
        datos_adicionales: {
          modulo: 'GESTION_RIESGOS',
          riesgoId: params.riesgoId,
          codigo: params.codigo,
          asignadoPor: params.asignadoPor,
          esReasignacion: params.esReasignacion ?? false,
        },
      });
    } catch (err: any) {
      this.logger.warn(`No se pudo notificar asignación del riesgo ${params.codigo} al abogado ${params.abogadoId}: ${err?.message}`);
    }
  }

  /**
   * Notifica cuando un riesgo entra en zona crítica (ALTO o EXTREMO).
   */
  async notifyRiesgoZonaCritica(params: {
    riesgoId: string;
    codigo: string;
    nombreRiesgo: string;
    zonaResidual: string;
    abogadoId: string;
    modificadoPor: string;
  }): Promise<void> {
    const meta = MODULE_META['GESTION_RIESGOS'];
    const url = buildUrl('GESTION_RIESGOS');
    const esExtremo = params.zonaResidual === 'EXTREMO';
    const nivelAlerta = esExtremo ? 'Crítica' : 'Alta';

    this.logger.log(`[NOTIFY] Riesgo Zona Crítica — codigo=${params.codigo} zona=${params.zonaResidual}`);

    const basePayload = {
      tipo_notificacion: 'RIESGO_ZONA_CRITICA',
      titulo: `Alerta ${nivelAlerta}: Riesgo en zona ${params.zonaResidual}`,
      mensaje: `El riesgo ${params.codigo} (${params.nombreRiesgo}) ha pasado a la zona residual ${params.zonaResidual}. Por favor revisar medidas urgentes.`,
      descripcion_corta: `Riesgo ${params.codigo} en Zona ${params.zonaResidual}`,
      icono: esExtremo ? 'AlertTriangle' : meta.icon,
      color: esExtremo ? 'text-red-600' : 'text-orange-500',
      prioridad: 'Alta' as any,
      categoria: meta.categoria,
      tiene_accion: true,
      texto_boton_accion: 'Ver riesgo',
      url_accion: url,
      datos_adicionales: {
        modulo: 'GESTION_RIESGOS',
        riesgoId: params.riesgoId,
        codigo: params.codigo,
        zonaResidual: params.zonaResidual,
        modificadoPor: params.modificadoPor
      },
    };

    try {
      // Notificar al responsable
      if (params.abogadoId) {
        await this.notificationClient.notifyUserById(params.abogadoId, basePayload);
      }
      // Notificar a jefatura
      await this.notificationClient.notifyByRole(ROLE_JEFE, basePayload);
    } catch (err: any) {
      this.logger.warn(`No se pudo notificar cambio de zona del riesgo ${params.codigo}: ${err?.message}`);
    }
  }

  /**
   * Notifica cuando se modifica la provisión contable de un riesgo.
   */
  async notifyRiesgoProvisionModificada(params: {
    riesgoId: string;
    codigo: string;
    nombreRiesgo: string;
    provisionAnterior: number;
    provisionNueva: number;
    abogadoId: string;
    modificadoPor: string;
  }): Promise<void> {
    const meta = MODULE_META['GESTION_RIESGOS'];
    const url = buildUrl('GESTION_RIESGOS');
    this.logger.log(`[NOTIFY] Riesgo Provisión — codigo=${params.codigo}`);

    const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' });
    const cambio = params.provisionNueva > params.provisionAnterior ? 'aumentado' : 'disminuido';

    const basePayload = {
      tipo_notificacion: 'RIESGO_PROVISION',
      titulo: `Provisión Contable Modificada`,
      mensaje: `La provisión contable del riesgo ${params.codigo} (${params.nombreRiesgo}) ha ${cambio} a ${formatter.format(params.provisionNueva)}.`,
      descripcion_corta: `Provisión Riesgo ${params.codigo} Modificada`,
      icono: 'DollarSign',
      color: 'text-emerald-600',
      prioridad: 'Media' as any,
      categoria: meta.categoria,
      tiene_accion: true,
      texto_boton_accion: 'Ver riesgo',
      url_accion: url,
      datos_adicionales: {
        modulo: 'GESTION_RIESGOS',
        riesgoId: params.riesgoId,
        codigo: params.codigo,
        provisionNueva: params.provisionNueva,
        modificadoPor: params.modificadoPor
      },
    };

    try {
      if (params.abogadoId) {
        await this.notificationClient.notifyUserById(params.abogadoId, basePayload);
      }
      await this.notificationClient.notifyByRole(ROLE_JEFE, basePayload);
    } catch (err: any) {
      this.logger.warn(`No se pudo notificar modificación de provisión del riesgo ${params.codigo}: ${err?.message}`);
    }
  }

  /**
   * Notifica al responsable de un término/informe que fue asignado o reasignado, incluyendo
   * fecha de inicio, fecha de vencimiento y periodicidad (si el término forma parte de una
   * programación recurrente). Se dispara una única vez por asignación/reasignación — las
   * alertas de vencimiento periódicas (una por cada ocurrencia futura ya creada) las cubre
   * por separado `notifyTerminoProximoAVencer` vía el scheduler de alertas.
   */
  async notifyResponsableAsignadoTermino(params: {
    terminoId: string;
    responsableId: string;
    nombreActuacion: string;
    numeroRadicado?: string | null;
    fechaBase: Date;
    fechaVencimiento: Date;
    periodicidadTexto?: string;
    esReasignacion?: boolean;
  }): Promise<void> {
    const meta = MODULE_META.TERMINOS_INFORMES;
    const url = buildUrl('TERMINOS_INFORMES', params.numeroRadicado || undefined);
    const accion = params.esReasignacion ? 'reasignado' : 'asignado';
    this.logger.log(`[NOTIFY] Responsable ${accion} a término — id=${params.terminoId} radicado=${params.numeroRadicado || 'N/A'} responsableId=${params.responsableId}`);

    const dto = {
      tipo_notificacion: params.esReasignacion ? 'TERMINO_REASIGNADO' : 'TERMINO_ASIGNADO',
      titulo: `Término ${accion} en ${meta.label}`,
      mensaje: `Se te ${accion} el término "${params.nombreActuacion}"${params.numeroRadicado ? ` (${params.numeroRadicado})` : ''}.`,
      descripcion_corta: `${params.numeroRadicado || params.nombreActuacion} — ${accion}`,
      icono: meta.icon,
      color: meta.color,
      prioridad: 'Alta' as const,
      categoria: meta.categoria,
      tiene_accion: true,
      texto_boton_accion: 'Ver término',
      url_accion: url,
      datos_adicionales: {
        modulo: 'TERMINOS_INFORMES',
        terminoId: params.terminoId,
        numeroRadicado: params.numeroRadicado,
        fechaBase: params.fechaBase,
        fechaVencimiento: params.fechaVencimiento,
        periodicidadTexto: params.periodicidadTexto,
        esReasignacion: params.esReasignacion ?? false,
      },
    };

    try {
      await this.notificationClient.notifyUserById(params.responsableId, dto);
      const detail = await this.notificationClient.getUserDetailsById(params.responsableId);
      if (detail?.email) {
        const emailSubject = `Término ${accion} — ${params.numeroRadicado || params.nombreActuacion}`;
        const emailHtml = buildTerminoAsignacionEmailHtml({
          nombreActuacion: params.nombreActuacion,
          radicado: params.numeroRadicado ?? null,
          fechaBase: params.fechaBase,
          fechaVencimiento: params.fechaVencimiento,
          periodicidadTexto: params.periodicidadTexto,
          esReasignacion: params.esReasignacion,
          url,
        });
        await this.notificationClient.sendEmail(detail.email, emailSubject, emailHtml);
      }
    } catch (err: any) {
      this.logger.warn(`No se pudo notificar asignación de responsable del término ${params.terminoId}: ${err?.message}`);
    }
  }

  /**
   * Notifica al responsable de un término/informe que su vencimiento está próximo
   * (alerta automática por regla global, por anticipación personalizada del término,
   * o recordatorio programado manualmente por el usuario).
   */
  async notifyTerminoProximoAVencer(params: {
    terminoId: string;
    responsableId?: string | null;
    nombreActuacion: string;
    numeroRadicado?: string | null;
    horasRestantes: number;
    origen: 'automatica' | 'personalizada' | 'manual';
  }): Promise<void> {
    const meta = MODULE_META.TERMINOS_INFORMES;
    const url = buildUrl('TERMINOS_INFORMES', params.numeroRadicado || undefined);
    const diasRestantes = Math.round(params.horasRestantes / 24);
    const textoTiempo = params.horasRestantes < 48
      ? `${Math.max(0, Math.round(params.horasRestantes))} hora(s)`
      : `${diasRestantes} día(s)`;
    const textoAnticipacion = params.horasRestantes >= 0
      ? `vence en aproximadamente ${textoTiempo}`
      : `venció hace ${Math.abs(diasRestantes)} día(s)`;

    const titulos: Record<typeof params.origen, string> = {
      automatica: 'Alerta de vencimiento de término',
      personalizada: 'Alerta personalizada de vencimiento',
      manual: 'Recordatorio programado de vencimiento',
    };

    this.logger.log(
      `[NOTIFY] Vencimiento de término (${params.origen}) — id=${params.terminoId} radicado=${params.numeroRadicado || 'N/A'} horasRestantes=${params.horasRestantes}`,
    );

    if (!params.responsableId) {
      this.logger.warn(`Término ${params.terminoId} sin responsableId asignado — no se pudo notificar`);
      return;
    }

    const dto = {
      tipo_notificacion: 'TERMINO_PROXIMO_A_VENCER',
      titulo: titulos[params.origen],
      mensaje: `El término "${params.nombreActuacion}"${params.numeroRadicado ? ` (${params.numeroRadicado})` : ''} ${textoAnticipacion}.`,
      descripcion_corta: `${params.numeroRadicado || params.nombreActuacion} — ${textoAnticipacion}`,
      icono: meta.icon,
      color: params.horasRestantes < 0 ? '#DC2626' : meta.color,
      prioridad: (params.horasRestantes < 24 ? 'Alta' : 'Media') as 'Alta' | 'Media',
      categoria: meta.categoria,
      tiene_accion: true,
      texto_boton_accion: 'Ver término',
      url_accion: url,
      datos_adicionales: {
        modulo: 'TERMINOS_INFORMES',
        terminoId: params.terminoId,
        numeroRadicado: params.numeroRadicado,
        horasRestantes: params.horasRestantes,
        origen: params.origen,
      },
    };

    try {
      await this.notificationClient.notifyUserById(params.responsableId, dto);
      const detail = await this.notificationClient.getUserDetailsById(params.responsableId);
      if (detail?.email) {
        const emailSubject = `${titulos[params.origen]} — ${params.numeroRadicado || params.nombreActuacion}`;
        const emailHtml = buildTerminoVencimientoEmailHtml(params.nombreActuacion, params.numeroRadicado ?? null, textoAnticipacion, url);
        await this.notificationClient.sendEmail(detail.email, emailSubject, emailHtml);
      }
    } catch (err: any) {
      this.logger.warn(`No se pudo notificar vencimiento del término ${params.terminoId}: ${err?.message}`);
    }
  }
}

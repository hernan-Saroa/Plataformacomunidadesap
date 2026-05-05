import { Injectable, Logger } from '@nestjs/common';
import { NotificationClientService } from './notification-client.service';

const ROLE_JEFE = 'JEFE_GESTION_LEGAL';

export type LegalModuleKey =
  | 'DEFENSA_JUDICIAL'
  | 'JUZGAMIENTO_DISCIPLINARIO'
  | 'ASESORIA_JURIDICA'
  | 'ORGANOS_CONTROL'
  | 'PROCESOS_COACTIVOS';

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

    try {
      await this.notificationClient.notifyByRole(ROLE_JEFE, {
        tipo_notificacion: 'PROCESO_CREADO',
        titulo: `Nuevo proceso en ${meta.label}`,
        mensaje: `${params.creadoPor} creó el proceso ${params.radicado} en ${meta.label}.`,
        descripcion_corta: `${params.radicado} creado por ${params.creadoPor}`,
        icono: meta.icon,
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
          creadoPor: params.creadoPor,
        },
      });
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
}

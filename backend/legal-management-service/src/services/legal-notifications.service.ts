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
  | 'GESTION_RIESGOS';


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
}

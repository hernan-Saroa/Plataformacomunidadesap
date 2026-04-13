/**
 * Hook reutilizable para crear notificaciones automáticamente
 * 
 * Este hook proporciona funciones para crear notificaciones cuando ocurren
 * eventos específicos en el sistema de Control Interno.
 */

import { useCallback } from 'react';
import { controlInternoApi } from '../services/api';
import { useAuth } from '../../../../hooks/useAuth';
import { getServiceUrl, API_MODE } from '../../../../config/environment';

// URL base para el servicio de Control Interno
const CONTROL_INTERNO_BASE_URL = getServiceUrl('control-institucional');
const SERVICE_PREFIX = API_MODE === 'gateway' ? '/control-institucional/api/v1' : '';

// Re-exportar tipos del backend para uso en el frontend
export enum TipoNotificacionEnum {
  ANUNCIO_AUDITORIA = 'anuncio_auditoria',
  RECORDATORIO_PLAZO = 'recordatorio_plazo',
  ALERTA_VENCIMIENTO = 'alerta_vencimiento',
  HALLAZGO_IDENTIFICADO = 'hallazgo_identificado',
  SOLICITUD_EVIDENCIA = 'solicitud_evidencia',
  RECEPCION_DOCUMENTO = 'recepcion_documento',
  APROBACION_PLAN = 'aprobacion_plan',
  RECHAZO_PLAN = 'rechazo_plan',
  CONTROVERSIA_HALLAZGO = 'controversia_hallazgo',
  VALIDACION_EVIDENCIA = 'validacion_evidencia',
  SOLICITUD_AMPLIACION_PLAZO = 'solicitud_ampliacion_plazo',
  AMPLIACION_PLAZO_APROBADA = 'ampliacion_plazo_aprobada',
  AMPLIACION_PLAZO_RECHAZADA = 'ampliacion_plazo_rechazada',
  OTRO = 'otro',
}

export enum CanalNotificacionEnum {
  EMAIL = 'email',
  SISTEMA = 'sistema',
  AMBOS = 'ambos',
}

export enum PrioridadNotificacionEnum {
  BAJA = 'baja',
  NORMAL = 'normal',
  ALTA = 'alta',
  CRITICA = 'critica',
}

interface CrearNotificacionParams {
  usuarioId: string;
  tipoNotificacion: TipoNotificacionEnum | string;
  titulo: string;
  mensaje: string;
  canal?: CanalNotificacionEnum | string;
  prioridad?: PrioridadNotificacionEnum | string;
  metadata?: {
    auditoriaId?: string;
    hallazgoId?: string;
    planMejoramientoId?: string;
    documentoId?: string;
    fechaVencimiento?: string;
    diasAnticipacion?: number;
    [key: string]: any;
  };
  accionUrl?: string;
}

export function useCrearNotificacion() {
  const { user } = useAuth();

  /**
   * Función base para crear una notificación
   */
  const crearNotificacion = useCallback(async (params: CrearNotificacionParams) => {
    try {
      // Asegurar que usuarioId sea string
      const usuarioIdString = String(params.usuarioId);
      
      // PETICIÓN DIRECTA SIN PASAR POR EL API WRAPPER
      const token = localStorage.getItem('esap_auth_token');
      const url = `${CONTROL_INTERNO_BASE_URL}${SERVICE_PREFIX}/notificaciones`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          usuarioId: usuarioIdString,
          tipoNotificacion: params.tipoNotificacion,
          titulo: params.titulo,
          mensaje: params.mensaje,
          canal: params.canal || CanalNotificacionEnum.SISTEMA,
          prioridad: params.prioridad || PrioridadNotificacionEnum.NORMAL,
          metadata: params.metadata,
          accionUrl: params.accionUrl,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [NOTIFICACION] Error HTTP:', response.status, errorText);
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const data = await response.json();

      return { success: true, data };
    } catch (error) {
      console.error('❌ [NOTIFICACION] Excepción al crear notificación:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }, []);

  /**
   * Crear notificación cuando se crea una auditoría
   */
  const notificarAuditoriaCreada = useCallback(async (
    auditoriaId: string,
    codigoAuditoria: string,
    nombreAuditoria: string,
    usuarioIdDestinatario: string,
    fechaInicio?: string
  ) => {
    // Asegurar que usuarioIdDestinatario sea string
    const usuarioIdString = String(usuarioIdDestinatario);
    
    return crearNotificacion({
      usuarioId: usuarioIdString,
      tipoNotificacion: TipoNotificacionEnum.ANUNCIO_AUDITORIA,
      titulo: 'Nueva Auditoría Programada',
      mensaje: `Se ha programado la auditoría ${codigoAuditoria} - ${nombreAuditoria}${fechaInicio ? ` para el ${new Date(fechaInicio).toLocaleDateString('es-ES')}` : ''}.`,
      prioridad: PrioridadNotificacionEnum.NORMAL,
      canal: CanalNotificacionEnum.SISTEMA,
      metadata: {
        auditoriaId,
        fechaInicio,
      },
      accionUrl: `/control-interno/auditorias/${auditoriaId}`,
    });
  }, [crearNotificacion]);

  /**
   * Crear notificación cuando se crea un plan anual
   */
  const notificarPlanAnualCreado = useCallback(async (
    planAnualId: string,
    año: number,
    usuarioIdDestinatario: string
  ) => {
    return crearNotificacion({
      usuarioId: usuarioIdDestinatario,
      tipoNotificacion: TipoNotificacionEnum.OTRO,
      titulo: 'Plan Anual Creado',
      mensaje: `Se ha creado el Plan Anual ${año}. Puedes revisar las actividades programadas.`,
      prioridad: PrioridadNotificacionEnum.NORMAL,
      canal: CanalNotificacionEnum.SISTEMA,
      metadata: {
        planAnualId,
        año,
      },
      accionUrl: `/control-interno/plan-anual/${año}`,
    });
  }, [crearNotificacion]);

  /**
   * Crear notificación cuando cambia el estado de una auditoría
   */
  const notificarCambioEstadoAuditoria = useCallback(async (
    auditoriaId: string,
    codigoAuditoria: string,
    estadoAnterior: string,
    estadoNuevo: string,
    usuarioIdDestinatario: string,
    comentarios?: string
  ) => {
    const mensajeEstado: Record<string, string> = {
      'en_planeacion': 'en planeación',
      'en_ejecucion': 'en ejecución',
      'en_revision': 'en revisión',
      'aprobada': 'aprobada',
      'rechazada': 'rechazada',
      'finalizada': 'finalizada',
      'archivada': 'archivada',
    };

    const tipoNotificacion = estadoNuevo === 'aprobada' 
      ? TipoNotificacionEnum.APROBACION_PLAN
      : estadoNuevo === 'rechazada'
      ? TipoNotificacionEnum.RECHAZO_PLAN
      : TipoNotificacionEnum.OTRO;

    const prioridad = estadoNuevo === 'rechazada' || estadoNuevo === 'aprobada'
      ? PrioridadNotificacionEnum.ALTA
      : PrioridadNotificacionEnum.NORMAL;

    return crearNotificacion({
      usuarioId: usuarioIdDestinatario,
      tipoNotificacion,
      titulo: `Auditoría ${codigoAuditoria} - Cambio de Estado`,
      mensaje: `La auditoría ${codigoAuditoria} ha cambiado de estado de "${mensajeEstado[estadoAnterior] || estadoAnterior}" a "${mensajeEstado[estadoNuevo] || estadoNuevo}".${comentarios ? ` ${comentarios}` : ''}`,
      prioridad,
      canal: CanalNotificacionEnum.SISTEMA,
      metadata: {
        auditoriaId,
        estadoAnterior,
        estadoNuevo,
      },
      accionUrl: `/control-interno/auditorias/${auditoriaId}`,
    });
  }, [crearNotificacion]);

  /**
   * Crear notificación cuando se edita una auditoría
   */
  const notificarAuditoriaEditada = useCallback(async (
    auditoriaId: string,
    codigoAuditoria: string,
    usuarioIdDestinatario: string,
    cambios?: string[]
  ) => {
    const cambiosTexto = cambios && cambios.length > 0 
      ? ` Cambios: ${cambios.join(', ')}.`
      : '';

    return crearNotificacion({
      usuarioId: usuarioIdDestinatario,
      tipoNotificacion: TipoNotificacionEnum.OTRO,
      titulo: `Auditoría ${codigoAuditoria} Editada`,
      mensaje: `La auditoría ${codigoAuditoria} ha sido modificada.${cambiosTexto}`,
      prioridad: PrioridadNotificacionEnum.NORMAL,
      canal: CanalNotificacionEnum.SISTEMA,
      metadata: {
        auditoriaId,
        cambios,
      },
      accionUrl: `/control-interno/auditorias/${auditoriaId}`,
    });
  }, [crearNotificacion]);

  /**
   * Crear notificación cuando se crea un plan de mejoramiento
   */
  const notificarPlanMejoramientoCreado = useCallback(async (
    planId: string,
    codigoPlan: string,
    auditoriaId: string,
    codigoAuditoria: string,
    usuarioIdDestinatario: string
  ) => {
    return crearNotificacion({
      usuarioId: usuarioIdDestinatario,
      tipoNotificacion: TipoNotificacionEnum.APROBACION_PLAN,
      titulo: 'Plan de Mejoramiento Pendiente',
      mensaje: `El Plan de Mejoramiento ${codigoPlan} para la auditoría ${codigoAuditoria} debe ser presentado y revisado.`,
      prioridad: PrioridadNotificacionEnum.ALTA,
      canal: CanalNotificacionEnum.SISTEMA,
      metadata: {
        planMejoramientoId: planId,
        auditoriaId,
      },
      accionUrl: `/control-interno/planes-mejoramiento/${planId}`,
    });
  }, [crearNotificacion]);

  /**
   * Crear notificación cuando se aprueba una auditoría
   */
  const notificarAuditoriaAprobada = useCallback(async (
    auditoriaId: string,
    codigoAuditoria: string,
    usuarioIdDestinatario: string,
    aprobadoPor?: string,
    comentarios?: string
  ) => {
    return crearNotificacion({
      usuarioId: usuarioIdDestinatario,
      tipoNotificacion: TipoNotificacionEnum.APROBACION_PLAN,
      titulo: 'Auditoría Aprobada',
      mensaje: `La auditoría ${codigoAuditoria} ha sido aprobada${aprobadoPor ? ` por ${aprobadoPor}` : ''}.${comentarios ? ` ${comentarios}` : ''}`,
      prioridad: PrioridadNotificacionEnum.ALTA,
      canal: CanalNotificacionEnum.AMBOS,
      metadata: {
        auditoriaId,
        aprobadoPor,
      },
      accionUrl: `/control-interno/auditorias/${auditoriaId}`,
    });
  }, [crearNotificacion]);

  /**
   * Crear notificación cuando se rechaza una auditoría
   */
  const notificarAuditoriaRechazada = useCallback(async (
    auditoriaId: string,
    codigoAuditoria: string,
    usuarioIdDestinatario: string,
    motivoRechazo: string,
    rechazadoPor?: string
  ) => {
    return crearNotificacion({
      usuarioId: usuarioIdDestinatario,
      tipoNotificacion: TipoNotificacionEnum.RECHAZO_PLAN,
      titulo: 'Auditoría Rechazada',
      mensaje: `La auditoría ${codigoAuditoria} ha sido rechazada${rechazadoPor ? ` por ${rechazadoPor}` : ''}. Motivo: ${motivoRechazo}`,
      prioridad: PrioridadNotificacionEnum.ALTA,
      canal: CanalNotificacionEnum.AMBOS,
      metadata: {
        auditoriaId,
        motivoRechazo,
        rechazadoPor,
      },
      accionUrl: `/control-interno/auditorias/${auditoriaId}`,
    });
  }, [crearNotificacion]);

  /**
   * Crear notificación cuando se exporta algo
   */
  const notificarExportacion = useCallback(async (
    tipoExportacion: string,
    nombreArchivo: string,
    usuarioIdDestinatario: string,
    urlDescarga?: string
  ) => {
    return crearNotificacion({
      usuarioId: usuarioIdDestinatario,
      tipoNotificacion: TipoNotificacionEnum.OTRO,
      titulo: 'Exportación Completada',
      mensaje: `Se ha exportado ${tipoExportacion}: ${nombreArchivo}. El archivo está listo para descargar.`,
      prioridad: PrioridadNotificacionEnum.BAJA,
      canal: CanalNotificacionEnum.SISTEMA,
      metadata: {
        tipoExportacion,
        nombreArchivo,
        urlDescarga,
      },
      accionUrl: urlDescarga,
    });
  }, [crearNotificacion]);

  /**
   * Crear notificación cuando se sube un documento en una auditoría
   */
  const notificarDocumentoSubidoAuditoria = useCallback(async (
    documentoId: string,
    nombreDocumento: string,
    auditoriaId: string,
    codigoAuditoria: string,
    usuarioIdDestinatario: string
  ) => {
    return crearNotificacion({
      usuarioId: usuarioIdDestinatario,
      tipoNotificacion: TipoNotificacionEnum.RECEPCION_DOCUMENTO,
      titulo: 'Documento Cargado',
      mensaje: `El documento "${nombreDocumento}" ha sido cargado en la auditoría ${codigoAuditoria}.`,
      prioridad: PrioridadNotificacionEnum.NORMAL,
      canal: CanalNotificacionEnum.SISTEMA,
      metadata: {
        documentoId,
        auditoriaId,
        nombreDocumento,
      },
      accionUrl: `/control-interno/auditorias/${auditoriaId}`,
    });
  }, [crearNotificacion]);

  /**
   * Crear notificación cuando se sube un documento en un plan de mejoramiento
   */
  const notificarDocumentoSubidoPlanMejoramiento = useCallback(async (
    documentoId: string,
    nombreDocumento: string,
    planId: string,
    codigoPlan: string,
    usuarioIdDestinatario: string
  ) => {
    return crearNotificacion({
      usuarioId: usuarioIdDestinatario,
      tipoNotificacion: TipoNotificacionEnum.RECEPCION_DOCUMENTO,
      titulo: 'Documento Cargado',
      mensaje: `El documento "${nombreDocumento}" ha sido cargado en el Plan de Mejoramiento ${codigoPlan}.`,
      prioridad: PrioridadNotificacionEnum.NORMAL,
      canal: CanalNotificacionEnum.SISTEMA,
      metadata: {
        documentoId,
        planMejoramientoId: planId,
        nombreDocumento,
      },
      accionUrl: `/control-interno/planes-mejoramiento/${planId}`,
    });
  }, [crearNotificacion]);

  /**
   * Crear notificación cuando se genera un informe
   */
  const notificarInformeGenerado = useCallback(async (
    informeId: string,
    nombreInforme: string,
    periodo: string,
    usuarioIdDestinatario: string,
    urlInforme?: string
  ) => {
    return crearNotificacion({
      usuarioId: usuarioIdDestinatario,
      tipoNotificacion: TipoNotificacionEnum.OTRO,
      titulo: 'Informe Generado',
      mensaje: `Se ha generado el informe "${nombreInforme}" para el período ${periodo}. El informe está listo para revisión.`,
      prioridad: PrioridadNotificacionEnum.NORMAL,
      canal: CanalNotificacionEnum.SISTEMA,
      metadata: {
        informeId,
        periodo,
        nombreInforme,
      },
      accionUrl: urlInforme || `/control-interno/informes/${informeId}`,
    });
  }, [crearNotificacion]);

  /**
   * Crear notificación cuando se aprueba un informe
   */
  const notificarInformeAprobado = useCallback(async (
    informeId: string,
    nombreInforme: string,
    usuarioIdDestinatario: string,
    aprobadoPor?: string
  ) => {
    return crearNotificacion({
      usuarioId: usuarioIdDestinatario,
      tipoNotificacion: TipoNotificacionEnum.APROBACION_PLAN,
      titulo: 'Informe Aprobado',
      mensaje: `El Informe "${nombreInforme}" ha sido aprobado${aprobadoPor ? ` por ${aprobadoPor}` : ''}.`,
      prioridad: PrioridadNotificacionEnum.ALTA,
      canal: CanalNotificacionEnum.AMBOS,
      metadata: {
        informeId,
        aprobadoPor,
      },
      accionUrl: `/control-interno/informes/${informeId}`,
    });
  }, [crearNotificacion]);

  /**
   * Crear notificación cuando se rechaza un informe
   */
  const notificarInformeRechazado = useCallback(async (
    informeId: string,
    nombreInforme: string,
    motivoRechazo: string,
    usuarioIdDestinatario: string,
    rechazadoPor?: string
  ) => {
    return crearNotificacion({
      usuarioId: usuarioIdDestinatario,
      tipoNotificacion: TipoNotificacionEnum.RECHAZO_PLAN,
      titulo: 'Informe Rechazado',
      mensaje: `El Informe "${nombreInforme}" ha sido rechazado${rechazadoPor ? ` por ${rechazadoPor}` : ''}. Motivo: ${motivoRechazo}`,
      prioridad: PrioridadNotificacionEnum.ALTA,
      canal: CanalNotificacionEnum.AMBOS,
      metadata: {
        informeId,
        motivoRechazo,
        rechazadoPor,
      },
      accionUrl: `/control-interno/informes/${informeId}`,
    });
  }, [crearNotificacion]);

  /**
   * Crear notificación cuando se valida una evidencia (aceptada o rechazada)
   */
  const notificarValidacionEvidencia = useCallback(async (
    evidenciaId: string,
    nombreEvidencia: string,
    estadoValidacion: 'aceptado' | 'rechazado' | 'con_observaciones',
    motivo?: string,
    usuarioIdDestinatario?: string
  ) => {
    if (!usuarioIdDestinatario) return { success: false, error: 'Usuario destinatario requerido' };

    const esRechazada = estadoValidacion === 'rechazado';
    const tieneObservaciones = estadoValidacion === 'con_observaciones';

    return crearNotificacion({
      usuarioId: usuarioIdDestinatario,
      tipoNotificacion: TipoNotificacionEnum.VALIDACION_EVIDENCIA,
      titulo: esRechazada ? 'Evidencia Rechazada' : tieneObservaciones ? 'Evidencia con Observaciones' : 'Evidencia Aceptada',
      mensaje: esRechazada
        ? `La evidencia "${nombreEvidencia}" ha sido rechazada.${motivo ? ` Motivo: ${motivo}` : ''}`
        : tieneObservaciones
        ? `La evidencia "${nombreEvidencia}" tiene observaciones.${motivo ? ` ${motivo}` : ''}`
        : `La evidencia "${nombreEvidencia}" ha sido aceptada.`,
      prioridad: esRechazada ? PrioridadNotificacionEnum.ALTA : PrioridadNotificacionEnum.NORMAL,
      canal: CanalNotificacionEnum.SISTEMA,
      metadata: {
        documentoId: evidenciaId,
        estadoValidacion,
        motivo,
      },
      accionUrl: `/control-interno/evidencias/${evidenciaId}`,
    });
  }, [crearNotificacion]);

  return {
    crearNotificacion,
    notificarAuditoriaCreada,
    notificarPlanAnualCreado,
    notificarCambioEstadoAuditoria,
    notificarAuditoriaEditada,
    notificarPlanMejoramientoCreado,
    notificarAuditoriaAprobada,
    notificarAuditoriaRechazada,
    notificarExportacion,
    notificarDocumentoSubidoAuditoria,
    notificarDocumentoSubidoPlanMejoramiento,
    notificarInformeGenerado,
    notificarInformeAprobado,
    notificarInformeRechazado,
    notificarValidacionEvidencia,
  };
}

export default useCrearNotificacion;

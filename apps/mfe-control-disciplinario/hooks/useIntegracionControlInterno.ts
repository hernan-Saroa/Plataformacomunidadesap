/**
 * HOOK DE INTEGRACIÓN - CONTROL INTERNO
 * Fase 2: Facilita el uso de los servicios centralizados
 */

import { useAuditoria, type AuditoriaGlobal } from '../context/AuditoriaGlobalContext';
import { GestionDocumentalService, type ConfiguracionDocumento } from '../services/GestionDocumentalService';
import {
  notificarAnuncioAuditoria,
  notificarRecordatorioPlazo,
  notificarVencimientoCritico,
  notificarHallazgoIdentificado,
  notificarSolicitudEvidencia,
  notificarConfirmacionRecepcion,
  notificarAprobacionPlan,
  notificarRechazoPlan,
  notificarInformePreliminar
} from '../services/NotificacionesService';
import { toast } from 'sonner';

/**
 * Hook personalizado que integra:
 * - Contexto Global de Auditoría
 * - Servicio de Gestión Documental
 * - Servicio de Notificaciones
 */
export function useIntegracionControlInterno() {
  // Contexto global de auditorías
  const auditoriaContext = useAuditoria();

  /**
   * Programar auditoría con notificación automática
   */
  const programarAuditoriaConNotificacion = async (datosAuditoria: any) => {
    try {
      // 1. Crear en contexto global
      const auditoriaCreada = await auditoriaContext.crearAuditoria({
        codigo: datosAuditoria.codigo,
        nombre: datosAuditoria.nombre,
        tipo: datosAuditoria.tipo || 'Gestión',
        estado: 'Programada',
        proceso: {
          id: datosAuditoria.procesoId,
          codigo: datosAuditoria.codigoProceso || '',
          nombre: datosAuditoria.procesoAuditable,
          responsable: datosAuditoria.responsableProceso || '',
          emailResponsable: datosAuditoria.emailResponsable || '',
          direccion: datosAuditoria.direccion || '',
          categoriaRiesgo: datosAuditoria.nivelRiesgo
        },
        equipoAuditor: datosAuditoria.equipoAuditor || [],
        auditorLider: {
          id: datosAuditoria.auditorLiderId || `auditor-${Date.now()}`,
          nombre: datosAuditoria.auditorLider,
          rol: 'Auditor Líder',
          email: datosAuditoria.emailAuditor || '',
          telefono: datosAuditoria.telefonoAuditor
        },
        cronograma: {
          fechaInicio: datosAuditoria.fechas?.planeacion?.inicio || '',
          fechaFin: datosAuditoria.fechas?.comunicacion?.fin || '',
          duracionDias: datosAuditoria.duracionTotal || 0,
          hitos: []
        },
        objetivos: [],
        alcance: datosAuditoria.alcance || '',
        criterios: [],
        riesgosIdentificados: [],
        nivelesRiesgo: {
          inherente: datosAuditoria.nivelRiesgo || 'Medio',
          residual: 'Bajo'
        },
        documentos: [],
        creadoPor: datosAuditoria.creadoPor || 'Sistema',
        observaciones: datosAuditoria.observaciones || '',
        notas: [],
        programaAnualId: datosAuditoria.programaAnualId
      });

      // 2. Notificar anuncio de auditoría
      if (datosAuditoria.notificar !== false && datosAuditoria.responsableProceso && datosAuditoria.emailResponsable) {
        await notificarAnuncioAuditoria({
          codigoAuditoria: auditoriaCreada.codigo,
          nombreAuditoria: auditoriaCreada.nombre,
          procesoAuditado: auditoriaCreada.proceso.nombre,
          responsable: auditoriaCreada.proceso.responsable,
          email: auditoriaCreada.proceso.emailResponsable,
          fechaInicio: auditoriaCreada.cronograma.fechaInicio,
          auditorLider: auditoriaCreada.auditorLider.nombre
        });

        toast.success('Auditoría programada y notificada', {
          description: `Se notificó a ${auditoriaCreada.proceso.responsable}`
        });
      } else {
        toast.success('Auditoría programada exitosamente');
      }

      return auditoriaCreada;
    } catch (error) {
      console.error('Error al programar auditoría:', error);
      toast.error('Error al programar auditoría');
      throw error;
    }
  };

  /**
   * Guardar documento con integración completa
   */
  const guardarDocumento = async (config: ConfiguracionDocumento) => {
    try {
      const resultado = await GestionDocumentalService.guardarDocumento(config);

      if (resultado.exito) {
        toast.success('Documento guardado', {
          description: `${config.nombre} guardado y sincronizado`
        });
        
        // Si hay auditoría asociada, vincularla
        if (config.auditoriaId && resultado.documento) {
          await auditoriaContext.agregarDocumento(config.auditoriaId, {
            id: resultado.documento.id,
            nombre: resultado.documento.nombre,
            tipo: resultado.documento.tipo,
            fechaCreacion: resultado.documento.fechaCreacion,
            creadoPor: resultado.documento.creadoPor,
            url: resultado.documento.url,
            carpetaId: resultado.documento.carpetaId
          });
        }

        return resultado;
      } else {
        toast.error('Error al guardar documento', {
          description: resultado.error
        });
        return resultado;
      }
    } catch (error) {
      console.error('Error al guardar documento:', error);
      toast.error('Error al guardar documento');
      throw error;
    }
  };

  /**
   * Registrar hallazgo con notificación
   */
  const registrarHallazgo = async (hallazgoData: {
    codigoHallazgo: string;
    tipo: string;
    gravedad: string;
    proceso: string;
    responsable: string;
    email: string;
    auditoriaId: string;
  }) => {
    try {
      // Vincular hallazgo con auditoría
      await auditoriaContext.vincularHallazgo(hallazgoData.auditoriaId, hallazgoData.codigoHallazgo);

      // Notificar hallazgo
      await notificarHallazgoIdentificado(hallazgoData);

      toast.success('Hallazgo registrado y notificado', {
        description: `Se notificó a ${hallazgoData.responsable}`
      });
    } catch (error) {
      console.error('Error al registrar hallazgo:', error);
      toast.error('Error al registrar hallazgo');
      throw error;
    }
  };

  /**
   * Aprobar plan de mejoramiento con notificación
   */
  const aprobarPlan = async (planData: {
    planId: string;
    codigoPlan: string;
    responsable: string;
    email: string;
    aprobadoPor: string;
    fechaAprobacion: string;
    auditoriaId?: string;
  }) => {
    try {
      // Vincular plan con auditoría si aplica
      if (planData.auditoriaId) {
        await auditoriaContext.vincularPlan(planData.auditoriaId, planData.planId);
      }

      // Notificar aprobación
      await notificarAprobacionPlan(planData);

      toast.success('Plan aprobado y notificado', {
        description: `Se notificó a ${planData.responsable}`
      });
    } catch (error) {
      console.error('Error al aprobar plan:', error);
      toast.error('Error al aprobar plan');
      throw error;
    }
  };

  /**
   * Rechazar plan de mejoramiento con notificación
   */
  const rechazarPlan = async (planData: {
    planId: string;
    codigoPlan: string;
    responsable: string;
    email: string;
    rechazadoPor: string;
    observaciones: string;
  }) => {
    try {
      // Notificar rechazo
      await notificarRechazoPlan(planData);

      toast.success('Plan rechazado y notificado', {
        description: `Se notificó a ${planData.responsable}`
      });
    } catch (error) {
      console.error('Error al rechazar plan:', error);
      toast.error('Error al rechazar plan');
      throw error;
    }
  };

  /**
   * Recordatorio de plazo (usado en RF012 y RF013)
   */
  const enviarRecordatorioPlazo = async (config: {
    titulo: string;
    mensaje: string;
    elementoId: string;
    codigoElemento: string;
    fechaVencimiento: string;
    diasRestantes: number;
    responsable: string;
    email: string;
    origenModulo: string;
    accionesPendientes?: number;
  }) => {
    try {
      await notificarRecordatorioPlazo(config);
      console.log(`📧 Recordatorio enviado: ${config.titulo}`);
    } catch (error) {
      console.error('Error al enviar recordatorio:', error);
    }
  };

  /**
   * Vencimiento crítico (usado en RF013)
   */
  const enviarVencimientoCritico = async (config: {
    titulo: string;
    mensaje: string;
    elementoId: string;
    codigoElemento: string;
    diasVencido: number;
    responsable: string;
    email: string;
    telefono?: string;
    origenModulo: string;
  }) => {
    try {
      await notificarVencimientoCritico(config);
      toast.error('Vencimiento crítico notificado', {
        description: config.titulo
      });
    } catch (error) {
      console.error('Error al enviar vencimiento crítico:', error);
    }
  };

  /**
   * Solicitud de evidencia (usado en RF012)
   */
  const solicitarEvidencia = async (config: {
    planId: string;
    codigoPlan: string;
    accionId: string;
    descripcionAccion: string;
    plazo: string;
    responsable: string;
    email: string;
  }) => {
    try {
      await notificarSolicitudEvidencia(config);
      toast.info('Solicitud de evidencia enviada', {
        description: `Se notificó a ${config.responsable}`
      });
    } catch (error) {
      console.error('Error al solicitar evidencia:', error);
    }
  };

  /**
   * Informe preliminar listo (usado en RF007)
   */
  const notificarInformePreliminarListo = async (config: {
    auditoriaId: string;
    codigoAuditoria: string;
    responsable: string;
    email: string;
    fechaLimiteRespuesta: string;
  }) => {
    try {
      await notificarInformePreliminar(config);
      toast.success('Informe preliminar notificado', {
        description: `Se notificó a ${config.responsable}`
      });
    } catch (error) {
      console.error('Error al notificar informe preliminar:', error);
    }
  };

  return {
    // Contexto de auditoría
    ...auditoriaContext,
    
    // Métodos integrados
    programarAuditoriaConNotificacion,
    guardarDocumento,
    registrarHallazgo,
    aprobarPlan,
    rechazarPlan,
    enviarRecordatorioPlazo,
    enviarVencimientoCritico,
    solicitarEvidencia,
    notificarInformePreliminarListo,
    
    // Servicios directos (para casos especiales)
    servicios: {
      documentos: GestionDocumentalService,
      notificaciones: {
        notificarAnuncioAuditoria,
        notificarRecordatorioPlazo,
        notificarVencimientoCritico,
        notificarHallazgoIdentificado,
        notificarSolicitudEvidencia,
        notificarConfirmacionRecepcion,
        notificarAprobacionPlan,
        notificarRechazoPlan,
        notificarInformePreliminar
      }
    }
  };
}

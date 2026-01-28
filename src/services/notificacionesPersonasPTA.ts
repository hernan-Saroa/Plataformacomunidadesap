/**
 * SERVICIO: Notificaciones PTA con Integración de Personas
 * 
 * Sistema de notificaciones que envía alertas a usuarios reales del
 * módulo de Personas por email y notificaciones en sistema.
 * 
 * Versión: 1.0.0
 * Fecha: 2026-01-03
 */

import { personasPTAIntegrationService } from './personasPTAIntegrationService';
import type { DocentePTA } from '../types/integracion-personas-pta';
import { USUARIOS_EJEMPLO } from '../data/mockUsersWithSedes';

// ============================================================================
// TIPOS
// ============================================================================

type TipoNotificacion =
  | 'pta_creado'
  | 'pta_enviado_aprobacion'
  | 'pta_aprobado_nivel_1'
  | 'pta_aprobado_nivel_2'
  | 'pta_aprobado_nivel_3'
  | 'pta_completamente_aprobado'
  | 'pta_rechazado'
  | 'pta_en_firme'
  | 'pta_modificacion_solicitada'
  | 'situacion_registrada'
  | 'situacion_sincronizada'
  | 'recordatorio_fecha_limite'
  | 'recordatorio_pta_incompleto';

interface DatosNotificacion {
  tipo: TipoNotificacion;
  personId: string;
  ptaId?: string;
  datos: {
    nombreDocente?: string;
    periodo?: string;
    radicado?: string;
    nivelAprobacion?: number;
    aprobadorNombre?: string;
    motivoRechazo?: string;
    fechaLimite?: string;
    situacionTipo?: string;
    observaciones?: string;
    [key: string]: any;
  };
}

interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  destinatarioId: string;
  destinatarioEmail: string;
  destinatarioNombre: string;
  asunto: string;
  mensaje: string;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  canal: 'email' | 'sistema' | 'ambos';
  estado: 'pendiente' | 'enviada' | 'fallida' | 'leida';
  fechaCreacion: string;
  fechaEnvio?: string;
  fechaLectura?: string;
  metadata: Record<string, any>;
}

interface ResultadoEnvio {
  exito: boolean;
  notificacionId: string;
  canalEmail?: { enviado: boolean; error?: string };
  canalSistema?: { enviado: boolean; error?: string };
  error?: string;
}

// ============================================================================
// PLANTILLAS DE NOTIFICACIONES
// ============================================================================

const PLANTILLAS: Record<TipoNotificacion, {
  asunto: string;
  mensaje: (datos: any) => string;
  prioridad: Notificacion['prioridad'];
  canal: Notificacion['canal'];
}> = {
  pta_creado: {
    asunto: 'PTA Creado Exitosamente',
    mensaje: (d) => `Hola ${d.nombreDocente},\n\nTu Plan de Trabajo Académico para el período ${d.periodo} ha sido creado exitosamente.\n\nRecuerda completar todas las actividades antes de la fecha límite: ${d.fechaLimite}.\n\nSaludos,\nSistema ESAP`,
    prioridad: 'media',
    canal: 'ambos'
  },

  pta_enviado_aprobacion: {
    asunto: 'PTA Enviado a Aprobación',
    mensaje: (d) => `Hola ${d.nombreDocente},\n\nTu PTA para el período ${d.periodo} ha sido enviado a aprobación.\n\nRadicado: ${d.radicado}\n\nRecibirás una notificación cuando sea revisado por el Coordinador de Núcleo.\n\nSaludos,\nSistema ESAP`,
    prioridad: 'alta',
    canal: 'ambos'
  },

  pta_aprobado_nivel_1: {
    asunto: '✅ PTA Aprobado - Nivel 1 (Coordinador de Núcleo)',
    mensaje: (d) => `¡Felicitaciones ${d.nombreDocente}!\n\nTu PTA ha sido APROBADO por ${d.aprobadorNombre} (Coordinador de Núcleo).\n\nAhora será revisado por el Director Territorial.\n\nRadicado: ${d.radicado}\n\nSaludos,\nSistema ESAP`,
    prioridad: 'alta',
    canal: 'ambos'
  },

  pta_aprobado_nivel_2: {
    asunto: '✅ PTA Aprobado - Nivel 2 (Director Territorial)',
    mensaje: (d) => `¡Felicitaciones ${d.nombreDocente}!\n\nTu PTA ha sido APROBADO por ${d.aprobadorNombre} (Director Territorial).\n\nAhora será revisado por el Subdirector Académico Nacional.\n\nRadicado: ${d.radicado}\n\nSaludos,\nSistema ESAP`,
    prioridad: 'alta',
    canal: 'ambos'
  },

  pta_aprobado_nivel_3: {
    asunto: '✅ PTA Aprobado - Nivel 3 (Subdirector Académico)',
    mensaje: (d) => `¡Felicitaciones ${d.nombreDocente}!\n\nTu PTA ha sido APROBADO por ${d.aprobadorNombre} (Subdirector Académico Nacional).\n\nTu PTA está completamente aprobado y será oficializado.\n\nRadicado: ${d.radicado}\n\nSaludos,\nSistema ESAP`,
    prioridad: 'urgente',
    canal: 'ambos'
  },

  pta_completamente_aprobado: {
    asunto: '🎉 PTA Completamente Aprobado',
    mensaje: (d) => `¡Felicitaciones ${d.nombreDocente}!\n\nTu Plan de Trabajo Académico para el período ${d.periodo} ha sido COMPLETAMENTE APROBADO.\n\nRadicado: ${d.radicado}\n\nYa puedes comenzar a ejecutar las actividades planificadas.\n\nSaludos,\nSistema ESAP`,
    prioridad: 'urgente',
    canal: 'ambos'
  },

  pta_rechazado: {
    asunto: '❌ PTA Rechazado - Requiere Ajustes',
    mensaje: (d) => `Hola ${d.nombreDocente},\n\nTu PTA ha sido RECHAZADO por ${d.aprobadorNombre}.\n\nMotivo: ${d.motivoRechazo}\n\nPor favor, realiza los ajustes solicitados y envía nuevamente tu PTA.\n\nRadicado: ${d.radicado}\n\nSaludos,\nSistema ESAP`,
    prioridad: 'urgente',
    canal: 'ambos'
  },

  pta_en_firme: {
    asunto: '🔒 PTA Oficializado EN FIRME',
    mensaje: (d) => `Hola ${d.nombreDocente},\n\nTu PTA para el período ${d.periodo} ha sido oficializado y se encuentra EN FIRME.\n\nRadicado: ${d.radicado}\n\nYa no se pueden realizar modificaciones sin autorización especial.\n\nSaludos,\nSistema ESAP`,
    prioridad: 'alta',
    canal: 'ambos'
  },

  pta_modificacion_solicitada: {
    asunto: '📝 Solicitud de Modificación de PTA EN FIRME',
    mensaje: (d) => `Hola ${d.nombreDocente},\n\nSe ha registrado tu solicitud de modificación del PTA EN FIRME.\n\nMotivo: ${d.observaciones}\n\nTu solicitud será revisada por el comité correspondiente.\n\nRadicado: ${d.radicado}\n\nSaludos,\nSistema ESAP`,
    prioridad: 'alta',
    canal: 'ambos'
  },

  situacion_registrada: {
    asunto: 'Situación Administrativa Registrada',
    mensaje: (d) => `Hola ${d.nombreDocente},\n\nSe ha registrado una nueva situación administrativa:\n\nTipo: ${d.situacionTipo}\nFecha Inicio: ${d.fechaInicio}\nFecha Fin: ${d.fechaFin}\n\nEsta situación afectará tu PTA automáticamente.\n\nSaludos,\nSistema ESAP`,
    prioridad: 'alta',
    canal: 'ambos'
  },

  situacion_sincronizada: {
    asunto: 'Situación Sincronizada con Sistema de Personas',
    mensaje: (d) => `Hola ${d.nombreDocente},\n\nLa situación administrativa "${d.situacionTipo}" ha sido sincronizada exitosamente con el módulo de Personas.\n\nLos ajustes en tu PTA se han aplicado automáticamente.\n\nSaludos,\nSistema ESAP`,
    prioridad: 'media',
    canal: 'sistema'
  },

  recordatorio_fecha_limite: {
    asunto: '⏰ Recordatorio: Fecha Límite PTA',
    mensaje: (d) => `Hola ${d.nombreDocente},\n\nTe recordamos que la fecha límite para enviar tu PTA del período ${d.periodo} es:\n\n${d.fechaLimite}\n\n${d.diasRestantes} días restantes.\n\nPor favor, completa y envía tu PTA antes de la fecha límite.\n\nSaludos,\nSistema ESAP`,
    prioridad: 'alta',
    canal: 'ambos'
  },

  recordatorio_pta_incompleto: {
    asunto: '⚠️ Recordatorio: PTA Incompleto',
    mensaje: (d) => `Hola ${d.nombreDocente},\n\nTu PTA del período ${d.periodo} está incompleto.\n\nProgreso: ${d.porcentajeCompletado}%\nHoras restantes: ${d.horasRestantes}\n\nRecuerda completarlo antes de la fecha límite: ${d.fechaLimite}\n\nSaludos,\nSistema ESAP`,
    prioridad: 'media',
    canal: 'sistema'
  }
};

// ============================================================================
// CLASE DEL SERVICIO
// ============================================================================

class NotificacionesPersonasPTAService {
  // Almacén de notificaciones (en producción sería BD)
  private notificaciones = new Map<string, Notificacion>();

  // Cola de notificaciones pendientes
  private colaPendientes: Notificacion[] = [];

  // ==========================================================================
  // ENVÍO DE NOTIFICACIONES
  // ==========================================================================

  /**
   * Enviar notificación a un usuario
   */
  async enviarNotificacion(datos: DatosNotificacion): Promise<ResultadoEnvio> {
    try {
      console.log(`[NotificacionesPersonasPTA] Enviando notificación:`, datos.tipo);

      // 1. Obtener información del destinatario
      const docente = personasPTAIntegrationService.buscarDocente({ personId: datos.personId });
      
      if (!docente) {
        throw new Error('No se encontró información del destinatario');
      }

      // 2. Crear notificación
      const notificacion = this.crearNotificacion(datos, docente);

      // 3. Guardar notificación
      this.notificaciones.set(notificacion.id, notificacion);

      // 4. Enviar según canal
      const resultado: ResultadoEnvio = {
        exito: true,
        notificacionId: notificacion.id
      };

      if (notificacion.canal === 'email' || notificacion.canal === 'ambos') {
        resultado.canalEmail = await this.enviarEmail(notificacion);
      }

      if (notificacion.canal === 'sistema' || notificacion.canal === 'ambos') {
        resultado.canalSistema = await this.enviarNotificacionSistema(notificacion);
      }

      // 5. Actualizar estado
      if (resultado.canalEmail?.enviado || resultado.canalSistema?.enviado) {
        notificacion.estado = 'enviada';
        notificacion.fechaEnvio = new Date().toISOString();
      } else {
        notificacion.estado = 'fallida';
      }

      // 6. Registrar en auditoría
      this.registrarAuditoria('enviar', datos.personId, {
        notificacionId: notificacion.id,
        tipo: datos.tipo,
        resultado
      });

      console.log(`[NotificacionesPersonasPTA] Notificación enviada:`, resultado);
      return resultado;
    } catch (error: any) {
      console.error(`[NotificacionesPersonasPTA] Error al enviar notificación:`, error);
      return {
        exito: false,
        notificacionId: '',
        error: error.message || 'Error desconocido'
      };
    }
  }

  /**
   * Enviar notificación a múltiples usuarios
   */
  async enviarNotificacionMasiva(
    personIds: string[],
    tipo: TipoNotificacion,
    datosComunes: DatosNotificacion['datos']
  ): Promise<ResultadoEnvio[]> {
    console.log(`[NotificacionesPersonasPTA] Envío masivo a ${personIds.length} usuarios`);

    const resultados: ResultadoEnvio[] = [];

    for (const personId of personIds) {
      const resultado = await this.enviarNotificacion({
        tipo,
        personId,
        datos: datosComunes
      });
      resultados.push(resultado);
    }

    return resultados;
  }

  // ==========================================================================
  // NOTIFICACIONES ESPECÍFICAS
  // ==========================================================================

  /**
   * Notificar aprobación de PTA
   */
  async notificarAprobacion(
    personId: string,
    ptaId: string,
    nivel: 1 | 2 | 3,
    aprobadorNombre: string,
    radicado: string
  ): Promise<ResultadoEnvio> {
    const docente = personasPTAIntegrationService.buscarDocente({ personId });
    
    const tipoMap = {
      1: 'pta_aprobado_nivel_1' as const,
      2: 'pta_aprobado_nivel_2' as const,
      3: 'pta_aprobado_nivel_3' as const
    };

    return this.enviarNotificacion({
      tipo: tipoMap[nivel],
      personId,
      ptaId,
      datos: {
        nombreDocente: docente?.nombreCompleto || 'Docente',
        radicado,
        aprobadorNombre,
        nivelAprobacion: nivel
      }
    });
  }

  /**
   * Notificar rechazo de PTA
   */
  async notificarRechazo(
    personId: string,
    ptaId: string,
    aprobadorNombre: string,
    motivoRechazo: string,
    radicado: string
  ): Promise<ResultadoEnvio> {
    const docente = personasPTAIntegrationService.buscarDocente({ personId });

    return this.enviarNotificacion({
      tipo: 'pta_rechazado',
      personId,
      ptaId,
      datos: {
        nombreDocente: docente?.nombreCompleto || 'Docente',
        radicado,
        aprobadorNombre,
        motivoRechazo
      }
    });
  }

  /**
   * Notificar PTA completamente aprobado
   */
  async notificarAprobacionCompleta(
    personId: string,
    ptaId: string,
    periodo: string,
    radicado: string
  ): Promise<ResultadoEnvio> {
    const docente = personasPTAIntegrationService.buscarDocente({ personId });

    // Enviar múltiples notificaciones
    await this.enviarNotificacion({
      tipo: 'pta_completamente_aprobado',
      personId,
      ptaId,
      datos: {
        nombreDocente: docente?.nombreCompleto || 'Docente',
        periodo,
        radicado
      }
    });

    // También enviar notificación de EN FIRME
    return this.enviarNotificacion({
      tipo: 'pta_en_firme',
      personId,
      ptaId,
      datos: {
        nombreDocente: docente?.nombreCompleto || 'Docente',
        periodo,
        radicado
      }
    });
  }

  /**
   * Notificar situación administrativa
   */
  async notificarSituacion(
    personId: string,
    situacionTipo: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<ResultadoEnvio> {
    const docente = personasPTAIntegrationService.buscarDocente({ personId });

    return this.enviarNotificacion({
      tipo: 'situacion_registrada',
      personId,
      datos: {
        nombreDocente: docente?.nombreCompleto || 'Docente',
        situacionTipo,
        fechaInicio,
        fechaFin
      }
    });
  }

  /**
   * Enviar recordatorios de fecha límite
   */
  async enviarRecordatoriosFechaLimite(fechaLimite: string): Promise<void> {
    console.log(`[NotificacionesPersonasPTA] Enviando recordatorios de fecha límite`);

    // Obtener todos los docentes con PTAs incompletos
    const docentes = personasPTAIntegrationService.obtenerTodosLosDocentes();

    // Calcular días restantes
    const hoy = new Date();
    const limite = new Date(fechaLimite);
    const diasRestantes = Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    // Enviar recordatorio si faltan 7, 3 o 1 días
    if ([7, 3, 1].includes(diasRestantes)) {
      for (const docente of docentes) {
        await this.enviarNotificacion({
          tipo: 'recordatorio_fecha_limite',
          personId: docente.personId,
          datos: {
            nombreDocente: docente.nombreCompleto,
            periodo: '2025-1', // TODO: Obtener período actual
            fechaLimite,
            diasRestantes
          }
        });
      }
    }
  }

  // ==========================================================================
  // GESTIÓN DE CANALES
  // ==========================================================================

  /**
   * Enviar email
   */
  private async enviarEmail(notificacion: Notificacion): Promise<{ enviado: boolean; error?: string }> {
    try {
      console.log(`[NotificacionesPersonasPTA] Enviando email a:`, notificacion.destinatarioEmail);
      
      // TODO: En producción, integrar con servicio de email (SendGrid, AWS SES, etc.)
      // Por ahora solo simulamos
      
      console.log(`[Email] To: ${notificacion.destinatarioEmail}`);
      console.log(`[Email] Subject: ${notificacion.asunto}`);
      console.log(`[Email] Body:\n${notificacion.mensaje}`);

      return { enviado: true };
    } catch (error: any) {
      console.error(`[NotificacionesPersonasPTA] Error al enviar email:`, error);
      return { enviado: false, error: error.message };
    }
  }

  /**
   * Enviar notificación al sistema
   */
  private async enviarNotificacionSistema(notificacion: Notificacion): Promise<{ enviado: boolean; error?: string }> {
    try {
      console.log(`[NotificacionesPersonasPTA] Creando notificación en sistema para:`, notificacion.destinatarioId);
      
      // TODO: En producción, guardar en BD de notificaciones del sistema
      // y emitir evento via WebSocket para notificación en tiempo real
      
      return { enviado: true };
    } catch (error: any) {
      console.error(`[NotificacionesPersonasPTA] Error al crear notificación en sistema:`, error);
      return { enviado: false, error: error.message };
    }
  }

  // ==========================================================================
  // UTILIDADES
  // ==========================================================================

  /**
   * Crear notificación
   */
  private crearNotificacion(
    datos: DatosNotificacion,
    docente: DocentePTA
  ): Notificacion {
    const plantilla = PLANTILLAS[datos.tipo];
    
    const datosCompletos = {
      nombreDocente: docente.nombreCompleto,
      ...datos.datos
    };

    return {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tipo: datos.tipo,
      destinatarioId: datos.personId,
      destinatarioEmail: docente.email,
      destinatarioNombre: docente.nombreCompleto,
      asunto: plantilla.asunto,
      mensaje: plantilla.mensaje(datosCompletos),
      prioridad: plantilla.prioridad,
      canal: plantilla.canal,
      estado: 'pendiente',
      fechaCreacion: new Date().toISOString(),
      metadata: {
        ptaId: datos.ptaId,
        ...datos.datos
      }
    };
  }

  /**
   * Obtener notificaciones de un usuario
   */
  obtenerNotificacionesUsuario(personId: string): Notificacion[] {
    const notificaciones: Notificacion[] = [];

    this.notificaciones.forEach(notif => {
      if (notif.destinatarioId === personId) {
        notificaciones.push(notif);
      }
    });

    // Ordenar por fecha (más recientes primero)
    return notificaciones.sort((a, b) => 
      new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
    );
  }

  /**
   * Marcar notificación como leída
   */
  marcarComoLeida(notificacionId: string): void {
    const notificacion = this.notificaciones.get(notificacionId);
    
    if (notificacion) {
      notificacion.estado = 'leida';
      notificacion.fechaLectura = new Date().toISOString();
    }
  }

  /**
   * Obtener estadísticas de notificaciones
   */
  obtenerEstadisticas(): {
    total: number;
    pendientes: number;
    enviadas: number;
    fallidas: number;
    leidas: number;
  } {
    let pendientes = 0;
    let enviadas = 0;
    let fallidas = 0;
    let leidas = 0;

    this.notificaciones.forEach(notif => {
      switch (notif.estado) {
        case 'pendiente': pendientes++; break;
        case 'enviada': enviadas++; break;
        case 'fallida': fallidas++; break;
        case 'leida': leidas++; break;
      }
    });

    return {
      total: this.notificaciones.size,
      pendientes,
      enviadas,
      fallidas,
      leidas
    };
  }

  /**
   * Registrar en auditoría
   */
  private registrarAuditoria(
    operacion: string,
    personId: string,
    datos: any
  ): void {
    console.log(`[Auditoría] notificaciones_pta:${operacion}`, {
      personId,
      fecha: new Date().toISOString(),
      datos
    });
  }
}

// ============================================================================
// INSTANCIA SINGLETON
// ============================================================================

export const notificacionesPersonasPTAService = new NotificacionesPersonasPTAService();

// ============================================================================
// EXPORTACIONES
// ============================================================================

export default notificacionesPersonasPTAService;
export type {
  TipoNotificacion,
  DatosNotificacion,
  Notificacion,
  ResultadoEnvio
};
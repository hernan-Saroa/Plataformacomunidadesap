/**
 * SERVICIO DE NOTIFICACIONES - ESAP
 * 
 * Gestiona todas las notificaciones del sistema PTA:
 * - Notificaciones en tiempo real (in-app)
 * - Emails automáticos
 * - Persistencia de notificaciones
 * - Marcado de leído/no leído
 */

// ============================================================================
// TIPOS
// ============================================================================

export type TipoNotificacion = 
  | 'pta-enviado'           // Docente envía PTA a aprobación
  | 'pta-aprobado-nivel1'   // Nivel 1 aprueba
  | 'pta-aprobado-nivel2'   // Nivel 2 aprueba
  | 'pta-aprobado-nivel3'   // Nivel 3 aprueba (final)
  | 'pta-rechazado'         // Cualquier nivel rechaza
  | 'pta-pendiente'         // Recordatorio de PTA pendiente
  | 'pta-urgente'           // PTA lleva >5 días sin revisar
  | 'comentario-nuevo';     // Nuevo comentario en PTA

export type PrioridadNotificacion = 'baja' | 'media' | 'alta' | 'urgente';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  prioridad: PrioridadNotificacion;
  
  // Metadatos
  ptaId?: string;
  docenteNombre?: string;
  aprobadorNombre?: string;
  nivel?: number;
  observaciones?: string;
  
  // Control
  leida: boolean;
  fechaCreacion: string;
  
  // Destinatarios
  destinatarioId: string; // Cédula del usuario
  destinatarioEmail: string;
  
  // Acciones
  accion?: {
    tipo: 'ver-pta' | 'editar-pta' | 'aprobar-pta';
    ptaId: string;
  };
}

// ============================================================================
// SERVICIO DE NOTIFICACIONES
// ============================================================================

class NotificationService {
  private notificaciones: Notificacion[] = [];
  private listeners: Array<(notificaciones: Notificacion[]) => void> = [];

  /**
   * Suscribirse a cambios en notificaciones
   */
  subscribe(callback: (notificaciones: Notificacion[]) => void) {
    this.listeners.push(callback);
    
    // Enviar estado inicial
    callback(this.getNotificaciones());
    
    // Retornar función de unsuscribe
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notificar a todos los listeners
   */
  private notificar() {
    this.listeners.forEach(listener => listener(this.getNotificaciones()));
  }

  /**
   * Obtener todas las notificaciones del usuario actual
   */
  getNotificaciones(usuarioId?: string): Notificacion[] {
    if (usuarioId) {
      return this.notificaciones
        .filter(n => n.destinatarioId === usuarioId)
        .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
    }
    return this.notificaciones
      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
  }

  /**
   * Obtener notificaciones no leídas
   */
  getNoLeidas(usuarioId?: string): Notificacion[] {
    return this.getNotificaciones(usuarioId).filter(n => !n.leida);
  }

  /**
   * Contar notificaciones no leídas
   */
  getContadorNoLeidas(usuarioId?: string): number {
    return this.getNoLeidas(usuarioId).length;
  }

  /**
   * Marcar notificación como leída
   */
  marcarComoLeida(notificacionId: string) {
    const notificacion = this.notificaciones.find(n => n.id === notificacionId);
    if (notificacion) {
      notificacion.leida = true;
      this.notificar();
      
      // TODO: Persistir en backend
      console.log('📧 Notificación marcada como leída:', notificacionId);
    }
  }

  /**
   * Marcar todas como leídas
   */
  marcarTodasComoLeidas(usuarioId: string) {
    this.notificaciones
      .filter(n => n.destinatarioId === usuarioId && !n.leida)
      .forEach(n => n.leida = true);
    
    this.notificar();
    
    // TODO: Persistir en backend
    console.log('📧 Todas las notificaciones marcadas como leídas');
  }

  /**
   * Eliminar notificación
   */
  eliminarNotificacion(notificacionId: string) {
    this.notificaciones = this.notificaciones.filter(n => n.id !== notificacionId);
    this.notificar();
    
    // TODO: Eliminar del backend
    console.log('🗑️ Notificación eliminada:', notificacionId);
  }

  // ============================================================================
  // CREACIÓN DE NOTIFICACIONES POR EVENTO
  // ============================================================================

  /**
   * Docente envía PTA a aprobación
   */
  notificarPTAEnviado(params: {
    ptaId: string;
    docenteNombre: string;
    docenteEmail: string;
    docenteCedula: string;
    coordinadorNombre: string;
    coordinadorEmail: string;
    coordinadorCedula: string;
    periodoAcademico: string;
  }) {
    const { ptaId, docenteNombre, docenteEmail, docenteCedula, coordinadorNombre, coordinadorEmail, coordinadorCedula, periodoAcademico } = params;

    // Notificación para el DOCENTE (confirmación)
    const notifDocente: Notificacion = {
      id: `notif-${Date.now()}-1`,
      tipo: 'pta-enviado',
      titulo: 'PTA Enviado a Aprobación',
      mensaje: `Tu Plan de Trabajo Académico para el período ${periodoAcademico} ha sido enviado exitosamente a revisión.`,
      prioridad: 'media',
      ptaId,
      docenteNombre,
      destinatarioId: docenteCedula,
      destinatarioEmail: docenteEmail,
      leida: false,
      fechaCreacion: new Date().toISOString(),
      accion: {
        tipo: 'ver-pta',
        ptaId
      }
    };

    // Notificación para el COORDINADOR (nuevo PTA pendiente)
    const notifCoordinador: Notificacion = {
      id: `notif-${Date.now()}-2`,
      tipo: 'pta-pendiente',
      titulo: 'Nuevo PTA para Revisar',
      mensaje: `${docenteNombre} ha enviado su PTA del período ${periodoAcademico} para tu revisión.`,
      prioridad: 'alta',
      ptaId,
      docenteNombre,
      nivel: 1,
      destinatarioId: coordinadorCedula,
      destinatarioEmail: coordinadorEmail,
      leida: false,
      fechaCreacion: new Date().toISOString(),
      accion: {
        tipo: 'aprobar-pta',
        ptaId
      }
    };

    this.notificaciones.push(notifDocente, notifCoordinador);
    this.notificar();

    // Enviar emails
    emailService.enviarPTAEnviado({
      docenteNombre,
      docenteEmail,
      coordinadorNombre,
      coordinadorEmail,
      periodoAcademico,
      ptaId
    });

    console.log('📧 Notificaciones enviadas: PTA enviado a aprobación');
  }

  /**
   * Aprobador aprueba PTA (cualquier nivel)
   */
  notificarPTAAprobado(params: {
    ptaId: string;
    docenteNombre: string;
    docenteEmail: string;
    docenteCedula: string;
    aprobadorNombre: string;
    aprobadorEmail: string;
    nivel: 1 | 2 | 3;
    observaciones?: string;
    periodoAcademico: string;
    siguienteAprobador?: {
      nombre: string;
      email: string;
      cedula: string;
    };
  }) {
    const { 
      ptaId, 
      docenteNombre, 
      docenteEmail, 
      docenteCedula,
      aprobadorNombre, 
      aprobadorEmail,
      nivel, 
      observaciones, 
      periodoAcademico,
      siguienteAprobador 
    } = params;

    const esFinal = nivel === 3;
    const nivelLabel = { 1: 'Coordinador', 2: 'Director', 3: 'Subdirector Académico' }[nivel];
    const tipoNotif = `pta-aprobado-nivel${nivel}` as TipoNotificacion;

    // Notificación para el DOCENTE
    const notifDocente: Notificacion = {
      id: `notif-${Date.now()}-1`,
      tipo: tipoNotif,
      titulo: esFinal ? '¡PTA Aprobado Completamente!' : `PTA Aprobado - Nivel ${nivel}`,
      mensaje: esFinal
        ? `¡Felicitaciones! Tu PTA del período ${periodoAcademico} ha sido aprobado por ${aprobadorNombre} (${nivelLabel}). Ya puedes comenzar tus actividades.`
        : `Tu PTA del período ${periodoAcademico} ha sido aprobado por ${aprobadorNombre} (${nivelLabel}) y avanza al siguiente nivel.`,
      prioridad: esFinal ? 'alta' : 'media',
      ptaId,
      aprobadorNombre,
      nivel,
      observaciones,
      destinatarioId: docenteCedula,
      destinatarioEmail: docenteEmail,
      leida: false,
      fechaCreacion: new Date().toISOString(),
      accion: {
        tipo: 'ver-pta',
        ptaId
      }
    };

    this.notificaciones.push(notifDocente);

    // Si NO es final, notificar al siguiente aprobador
    if (!esFinal && siguienteAprobador) {
      const siguienteNivelLabel = { 2: 'Director', 3: 'Subdirector Académico' }[nivel + 1] as string;
      
      const notifSiguienteAprobador: Notificacion = {
        id: `notif-${Date.now()}-2`,
        tipo: 'pta-pendiente',
        titulo: `Nuevo PTA para Revisar - Nivel ${nivel + 1}`,
        mensaje: `El PTA de ${docenteNombre} (período ${periodoAcademico}) fue aprobado por ${nivelLabel} y requiere tu revisión.`,
        prioridad: 'alta',
        ptaId,
        docenteNombre,
        nivel: nivel + 1,
        destinatarioId: siguienteAprobador.cedula,
        destinatarioEmail: siguienteAprobador.email,
        leida: false,
        fechaCreacion: new Date().toISOString(),
        accion: {
          tipo: 'aprobar-pta',
          ptaId
        }
      };

      this.notificaciones.push(notifSiguienteAprobador);

      // Email al siguiente aprobador
      emailService.enviarPTAPendienteAprobacion({
        aprobadorNombre: siguienteAprobador.nombre,
        aprobadorEmail: siguienteAprobador.email,
        docenteNombre,
        periodoAcademico,
        nivel: nivel + 1,
        ptaId
      });
    }

    this.notificar();

    // Email al docente
    emailService.enviarPTAAprobado({
      docenteNombre,
      docenteEmail,
      aprobadorNombre,
      aprobadorCargo: nivelLabel,
      periodoAcademico,
      observaciones,
      esFinal,
      ptaId
    });

    console.log(`📧 Notificaciones enviadas: PTA aprobado - Nivel ${nivel}`);
  }

  /**
   * Aprobador rechaza PTA
   */
  notificarPTARechazado(params: {
    ptaId: string;
    docenteNombre: string;
    docenteEmail: string;
    docenteCedula: string;
    aprobadorNombre: string;
    aprobadorEmail: string;
    nivel: 1 | 2 | 3;
    observaciones: string;
    periodoAcademico: string;
  }) {
    const { 
      ptaId, 
      docenteNombre, 
      docenteEmail,
      docenteCedula,
      aprobadorNombre, 
      nivel, 
      observaciones, 
      periodoAcademico 
    } = params;

    const nivelLabel = { 1: 'Coordinador', 2: 'Director', 3: 'Subdirector Académico' }[nivel];

    // Notificación para el DOCENTE
    const notifDocente: Notificacion = {
      id: `notif-${Date.now()}-1`,
      tipo: 'pta-rechazado',
      titulo: 'PTA Rechazado - Requiere Ajustes',
      mensaje: `Tu PTA del período ${periodoAcademico} fue rechazado por ${aprobadorNombre} (${nivelLabel}). Revisa las observaciones y realiza los ajustes necesarios.`,
      prioridad: 'urgente',
      ptaId,
      aprobadorNombre,
      nivel,
      observaciones,
      destinatarioId: docenteCedula,
      destinatarioEmail: docenteEmail,
      leida: false,
      fechaCreacion: new Date().toISOString(),
      accion: {
        tipo: 'editar-pta',
        ptaId
      }
    };

    this.notificaciones.push(notifDocente);
    this.notificar();

    // Email al docente
    emailService.enviarPTARechazado({
      docenteNombre,
      docenteEmail,
      aprobadorNombre,
      aprobadorCargo: nivelLabel,
      periodoAcademico,
      observaciones,
      ptaId
    });

    console.log('📧 Notificaciones enviadas: PTA rechazado');
  }

  /**
   * Recordatorio de PTA urgente (>5 días sin revisar)
   */
  notificarPTAUrgente(params: {
    ptaId: string;
    docenteNombre: string;
    aprobadorNombre: string;
    aprobadorEmail: string;
    aprobadorCedula: string;
    nivel: 1 | 2 | 3;
    diasPendiente: number;
    periodoAcademico: string;
  }) {
    const { 
      ptaId, 
      docenteNombre, 
      aprobadorNombre,
      aprobadorEmail,
      aprobadorCedula,
      nivel, 
      diasPendiente, 
      periodoAcademico 
    } = params;

    const notif: Notificacion = {
      id: `notif-${Date.now()}-1`,
      tipo: 'pta-urgente',
      titulo: '⚠️ PTA Urgente - Requiere Atención',
      mensaje: `El PTA de ${docenteNombre} (período ${periodoAcademico}) lleva ${diasPendiente} días pendiente de revisión.`,
      prioridad: 'urgente',
      ptaId,
      docenteNombre,
      nivel,
      destinatarioId: aprobadorCedula,
      destinatarioEmail: aprobadorEmail,
      leida: false,
      fechaCreacion: new Date().toISOString(),
      accion: {
        tipo: 'aprobar-pta',
        ptaId
      }
    };

    this.notificaciones.push(notif);
    this.notificar();

    // Email de recordatorio
    emailService.enviarRecordatorioPTAUrgente({
      aprobadorNombre,
      aprobadorEmail,
      docenteNombre,
      periodoAcademico,
      diasPendiente,
      ptaId
    });

    console.log('📧 Notificación enviada: PTA urgente');
  }

  /**
   * Inicializar con notificaciones mock (para desarrollo)
   */
  inicializarMock(usuarioCedula: string, usuarioEmail: string, esDocente: boolean = true) {
    const ahora = new Date();
    const hace2h = new Date(ahora.getTime() - 2 * 60 * 60 * 1000);
    const ayer = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);

    if (esDocente) {
      // Notificaciones para docente
      this.notificaciones = [
        {
          id: 'notif-mock-1',
          tipo: 'pta-aprobado-nivel1',
          titulo: 'PTA Aprobado - Nivel 1',
          mensaje: 'Tu PTA del período 2025-1 ha sido aprobado por Coord. Ricardo Gómez y avanza al siguiente nivel.',
          prioridad: 'alta',
          ptaId: 'pta-001',
          aprobadorNombre: 'Coord. Ricardo Gómez',
          nivel: 1,
          destinatarioId: usuarioCedula,
          destinatarioEmail: usuarioEmail,
          leida: false,
          fechaCreacion: hace2h.toISOString(),
          accion: { tipo: 'ver-pta', ptaId: 'pta-001' }
        },
        {
          id: 'notif-mock-2',
          tipo: 'pta-enviado',
          titulo: 'PTA Enviado a Aprobación',
          mensaje: 'Tu Plan de Trabajo Académico para el período 2025-1 ha sido enviado exitosamente a revisión.',
          prioridad: 'media',
          ptaId: 'pta-002',
          destinatarioId: usuarioCedula,
          destinatarioEmail: usuarioEmail,
          leida: true,
          fechaCreacion: ayer.toISOString(),
          accion: { tipo: 'ver-pta', ptaId: 'pta-002' }
        }
      ];
    } else {
      // Notificaciones para aprobador
      this.notificaciones = [
        {
          id: 'notif-mock-3',
          tipo: 'pta-pendiente',
          titulo: 'Nuevo PTA para Revisar',
          mensaje: 'Dr. Carlos Méndez ha enviado su PTA del período 2025-1 para tu revisión.',
          prioridad: 'alta',
          ptaId: 'pta-001',
          docenteNombre: 'Dr. Carlos Méndez',
          nivel: 1,
          destinatarioId: usuarioCedula,
          destinatarioEmail: usuarioEmail,
          leida: false,
          fechaCreacion: hace2h.toISOString(),
          accion: { tipo: 'aprobar-pta', ptaId: 'pta-001' }
        },
        {
          id: 'notif-mock-4',
          tipo: 'pta-urgente',
          titulo: '⚠️ PTA Urgente - Requiere Atención',
          mensaje: 'El PTA de Dra. María Rodríguez (período 2025-1) lleva 6 días pendiente de revisión.',
          prioridad: 'urgente',
          ptaId: 'pta-002',
          docenteNombre: 'Dra. María Rodríguez',
          nivel: 2,
          destinatarioId: usuarioCedula,
          destinatarioEmail: usuarioEmail,
          leida: false,
          fechaCreacion: ahora.toISOString(),
          accion: { tipo: 'aprobar-pta', ptaId: 'pta-002' }
        }
      ];
    }

    this.notificar();
  }
}

// ============================================================================
// SERVICIO DE EMAILS (MOCK - Preparado para integración real)
// ============================================================================

class EmailService {
  /**
   * Email: Docente envía PTA
   */
  enviarPTAEnviado(params: {
    docenteNombre: string;
    docenteEmail: string;
    coordinadorNombre: string;
    coordinadorEmail: string;
    periodoAcademico: string;
    ptaId: string;
  }) {
    const { docenteNombre, docenteEmail, coordinadorNombre, coordinadorEmail, periodoAcademico, ptaId } = params;

    // Email al docente (confirmación)
    const emailDocente = {
      to: docenteEmail,
      subject: `PTA ${periodoAcademico} - Enviado a Aprobación`,
      body: `
        Estimado/a ${docenteNombre},
        
        Tu Plan de Trabajo Académico para el período ${periodoAcademico} ha sido enviado exitosamente 
        al proceso de aprobación.
        
        Estado actual: En Revisión - Nivel 1 (Coordinador de Programa)
        Aprobador: ${coordinadorNombre}
        
        Recibirás una notificación cuando tu PTA sea revisado.
        
        Saludos,
        Sistema de Gestión Académica - ESAP
      `
    };

    // Email al coordinador (nuevo PTA pendiente)
    const emailCoordinador = {
      to: coordinadorEmail,
      subject: `Nuevo PTA para Revisar - ${docenteNombre}`,
      body: `
        Estimado/a ${coordinadorNombre},
        
        ${docenteNombre} ha enviado su Plan de Trabajo Académico para el período ${periodoAcademico} 
        y requiere tu revisión.
        
        Por favor, ingresa al sistema para revisar y aprobar/rechazar el PTA.
        
        [Ver PTA en el Sistema] (ID: ${ptaId})
        
        Saludos,
        Sistema de Gestión Académica - ESAP
      `
    };

    // TODO: Integrar con servicio de email real (SendGrid, AWS SES, etc.)
    console.log('📧 Email enviado (MOCK):', emailDocente);
    console.log('📧 Email enviado (MOCK):', emailCoordinador);
  }

  /**
   * Email: PTA aprobado
   */
  enviarPTAAprobado(params: {
    docenteNombre: string;
    docenteEmail: string;
    aprobadorNombre: string;
    aprobadorCargo: string;
    periodoAcademico: string;
    observaciones?: string;
    esFinal: boolean;
    ptaId: string;
  }) {
    const { docenteNombre, docenteEmail, aprobadorNombre, aprobadorCargo, periodoAcademico, observaciones, esFinal, ptaId } = params;

    const email = {
      to: docenteEmail,
      subject: esFinal 
        ? `¡PTA ${periodoAcademico} Aprobado Completamente!` 
        : `PTA ${periodoAcademico} - Aprobado por ${aprobadorCargo}`,
      body: `
        Estimado/a ${docenteNombre},
        
        ${esFinal 
          ? '¡Felicitaciones! Tu Plan de Trabajo Académico ha sido aprobado completamente.' 
          : `Tu Plan de Trabajo Académico ha sido aprobado por ${aprobadorNombre} (${aprobadorCargo}).`
        }
        
        Período académico: ${periodoAcademico}
        Aprobado por: ${aprobadorNombre} (${aprobadorCargo})
        Fecha: ${new Date().toLocaleDateString('es-ES')}
        
        ${observaciones ? `Observaciones:\n${observaciones}\n\n` : ''}
        
        ${esFinal 
          ? 'Ya puedes comenzar con las actividades programadas en tu PTA.' 
          : 'Tu PTA avanzará al siguiente nivel de aprobación.'
        }
        
        [Ver PTA en el Sistema] (ID: ${ptaId})
        
        Saludos,
        Sistema de Gestión Académica - ESAP
      `
    };

    console.log('📧 Email enviado (MOCK):', email);
  }

  /**
   * Email: PTA rechazado
   */
  enviarPTARechazado(params: {
    docenteNombre: string;
    docenteEmail: string;
    aprobadorNombre: string;
    aprobadorCargo: string;
    periodoAcademico: string;
    observaciones: string;
    ptaId: string;
  }) {
    const { docenteNombre, docenteEmail, aprobadorNombre, aprobadorCargo, periodoAcademico, observaciones, ptaId } = params;

    const email = {
      to: docenteEmail,
      subject: `PTA ${periodoAcademico} - Requiere Ajustes`,
      body: `
        Estimado/a ${docenteNombre},
        
        Tu Plan de Trabajo Académico para el período ${periodoAcademico} ha sido revisado por 
        ${aprobadorNombre} (${aprobadorCargo}) y requiere ajustes antes de su aprobación.
        
        OBSERVACIONES:
        ${observaciones}
        
        Por favor, realiza los ajustes necesarios y vuelve a enviar tu PTA.
        
        [Editar PTA en el Sistema] (ID: ${ptaId})
        
        Si tienes dudas, contacta directamente a ${aprobadorNombre}.
        
        Saludos,
        Sistema de Gestión Académica - ESAP
      `
    };

    console.log('📧 Email enviado (MOCK):', email);
  }

  /**
   * Email: PTA pendiente para aprobador
   */
  enviarPTAPendienteAprobacion(params: {
    aprobadorNombre: string;
    aprobadorEmail: string;
    docenteNombre: string;
    periodoAcademico: string;
    nivel: number;
    ptaId: string;
  }) {
    const { aprobadorNombre, aprobadorEmail, docenteNombre, periodoAcademico, nivel, ptaId } = params;

    const email = {
      to: aprobadorEmail,
      subject: `Nuevo PTA para Revisar - Nivel ${nivel}`,
      body: `
        Estimado/a ${aprobadorNombre},
        
        El Plan de Trabajo Académico de ${docenteNombre} para el período ${periodoAcademico} 
        ha sido aprobado en el nivel anterior y ahora requiere tu revisión (Nivel ${nivel}).
        
        Por favor, ingresa al sistema para revisar el PTA y tomar una decisión.
        
        [Ver PTA en el Sistema] (ID: ${ptaId})
        
        Saludos,
        Sistema de Gestión Académica - ESAP
      `
    };

    console.log('📧 Email enviado (MOCK):', email);
  }

  /**
   * Email: Recordatorio PTA urgente
   */
  enviarRecordatorioPTAUrgente(params: {
    aprobadorNombre: string;
    aprobadorEmail: string;
    docenteNombre: string;
    periodoAcademico: string;
    diasPendiente: number;
    ptaId: string;
  }) {
    const { aprobadorNombre, aprobadorEmail, docenteNombre, periodoAcademico, diasPendiente, ptaId } = params;

    const email = {
      to: aprobadorEmail,
      subject: `⚠️ URGENTE: PTA Pendiente de Revisión (${diasPendiente} días)`,
      body: `
        Estimado/a ${aprobadorNombre},
        
        RECORDATORIO URGENTE:
        
        El Plan de Trabajo Académico de ${docenteNombre} para el período ${periodoAcademico} 
        lleva ${diasPendiente} días pendiente de tu revisión.
        
        Es importante que revises y tomes una decisión a la brevedad para no retrasar 
        el inicio de las actividades académicas.
        
        [Ver PTA en el Sistema] (ID: ${ptaId})
        
        Saludos,
        Sistema de Gestión Académica - ESAP
      `
    };

    console.log('📧 Email enviado (MOCK):', email);
  }
}

// ============================================================================
// EXPORTAR INSTANCIAS SINGLETON
// ============================================================================

export const notificationService = new NotificationService();
export const emailService = new EmailService();

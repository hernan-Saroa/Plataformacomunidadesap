/**
 * SERVICIO DE NOTIFICACIONES
 * Integración Fase 1 - Centralización con RF015
 * Control Interno de Gestión - ESAP
 */

// ============ TIPOS (importados de RF015) ============

export type TipoNotificacion =
  | 'Anuncio de Auditoría'
  | 'Recordatorio de Plazo'
  | 'Vencimiento Crítico'
  | 'Hallazgo Identificado'
  | 'Solicitud de Evidencia'
  | 'Confirmación de Recepción'
  | 'Aprobación de Plan'
  | 'Rechazo de Plan'
  | 'Información General'
  | 'Alerta del Sistema';

export type PrioridadNotificacion = 'Baja' | 'Media' | 'Alta' | 'Crítica';

export type CanalNotificacion = 'Sistema' | 'Email' | 'SMS';

interface Accion {
  id: string;
  label: string;
  url?: string;
  callback?: () => void;
}

interface ConfiguracionNotificacion {
  tipo: TipoNotificacion;
  prioridad: PrioridadNotificacion;
  titulo: string;
  mensaje: string;
  
  // Origen
  origenModulo: string;
  origenId?: string;
  
  // Destinatario
  destinatario?: string;
  destinatarioEmail?: string;
  destinatarioTelefono?: string;
  
  // Fechas
  fechaVencimiento?: string;
  
  // Canales
  canales?: CanalNotificacion[];
  
  // Metadata
  creadoPor?: string;
  acciones?: Accion[];
  datos?: any;
}

// ============ SERVICIO ============

class NotificacionesServiceClass {
  /**
   * Crear notificación
   * MÉTODO PRINCIPAL - Todos los módulos deben usar este método
   */
  async crear(config: ConfiguracionNotificacion): Promise<string> {
    try {
      const notificacion = {
        id: `not-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tipo: config.tipo,
        prioridad: config.prioridad,
        titulo: config.titulo,
        mensaje: config.mensaje,
        
        origenModulo: config.origenModulo,
        origenId: config.origenId,
        
        destinatario: config.destinatario || 'Usuario General',
        destinatarioEmail: config.destinatarioEmail || '',
        
        fechaCreacion: new Date().toISOString().split('T')[0],
        horaCreacion: new Date().toTimeString().split(' ')[0].substring(0, 5),
        fechaVencimiento: config.fechaVencimiento,
        
        estado: 'No Leída',
        
        canales: config.canales || this.determinarCanales(config.prioridad),
        enviadoPorEmail: config.canales?.includes('Email') || false,
        enviadoPorSMS: config.canales?.includes('SMS') || false,
        
        creadoPor: config.creadoPor || 'Sistema Automático',
        acciones: config.acciones,
        datos: config.datos,
        
        agrupable: this.esAgrupable(config.tipo),
        grupoId: this.obtenerGrupoId(config.tipo)
      };
      
      // Guardar notificación
      await this.guardarNotificacion(notificacion);
      
      // Enviar por canales configurados
      await this.enviarPorCanales(notificacion);
      
      return notificacion.id;
      
    } catch (error) {
      console.error('Error al crear notificación:', error);
      throw error;
    }
  }
  
  // ============ MÉTODOS ESPECÍFICOS POR TIPO ============
  
  /**
   * Anuncio de Auditoría
   * Se dispara cuando se programa una nueva auditoría (RF003)
   */
  async notificarAnuncioAuditoria(config: {
    codigoAuditoria: string;
    nombreAuditoria: string;
    procesoAuditado: string;
    responsable: string;
    email: string;
    fechaInicio: string;
    auditorLider: string;
  }): Promise<string> {
    return await this.crear({
      tipo: 'Anuncio de Auditoría',
      prioridad: 'Alta',
      titulo: `Nueva Auditoría: ${config.nombreAuditoria}`,
      mensaje: `Se ha programado una auditoría a su proceso "${config.procesoAuditado}". El memorando de asignación ha sido enviado oficialmente. Por favor, prepare la documentación solicitada.`,
      origenModulo: 'Programa Anual de Auditorías',
      origenId: config.codigoAuditoria,
      destinatario: config.responsable,
      destinatarioEmail: config.email,
      fechaVencimiento: config.fechaInicio,
      canales: ['Sistema', 'Email'],
      acciones: [
        {
          id: 'ver-memorando',
          label: 'Ver Memorando',
          url: `/memorando/${config.codigoAuditoria}`
        },
        {
          id: 'ver-cronograma',
          label: 'Ver Cronograma',
          url: `/cronograma/${config.codigoAuditoria}`
        }
      ],
      datos: {
        codigoAuditoria: config.codigoAuditoria,
        fechaInicio: config.fechaInicio,
        auditorLider: config.auditorLider,
        proceso: config.procesoAuditado
      }
    });
  }
  
  /**
   * Recordatorio de Plazo (7 días antes)
   * Se dispara automáticamente para planes de mejoramiento e informes
   */
  async notificarRecordatorioPlazo(config: {
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
  }): Promise<string> {
    return await this.crear({
      tipo: 'Recordatorio de Plazo',
      prioridad: 'Media',
      titulo: config.titulo,
      mensaje: config.mensaje,
      origenModulo: config.origenModulo,
      origenId: config.elementoId,
      destinatario: config.responsable,
      destinatarioEmail: config.email,
      fechaVencimiento: config.fechaVencimiento,
      canales: ['Sistema', 'Email'],
      acciones: [
        {
          id: 'ver-detalle',
          label: 'Ver Detalle',
          url: `/${config.origenModulo.toLowerCase().replace(/\s+/g, '-')}/${config.elementoId}`
        }
      ],
      datos: {
        codigo: config.codigoElemento,
        diasRestantes: config.diasRestantes,
        accionesPendientes: config.accionesPendientes
      }
    });
  }
  
  /**
   * Vencimiento Crítico
   * Se dispara cuando una fecha crítica ya venció
   */
  async notificarVencimientoCritico(config: {
    titulo: string;
    mensaje: string;
    elementoId: string;
    codigoElemento: string;
    diasVencido: number;
    responsable: string;
    email: string;
    telefono?: string;
    origenModulo: string;
  }): Promise<string> {
    return await this.crear({
      tipo: 'Vencimiento Crítico',
      prioridad: 'Crítica',
      titulo: config.titulo,
      mensaje: config.mensaje,
      origenModulo: config.origenModulo,
      origenId: config.elementoId,
      destinatario: config.responsable,
      destinatarioEmail: config.email,
      destinatarioTelefono: config.telefono,
      canales: ['Sistema', 'Email', 'SMS'],
      acciones: [
        {
          id: 'accion-inmediata',
          label: 'Tomar Acción Inmediata',
          url: `/${config.origenModulo.toLowerCase().replace(/\s+/g, '-')}/${config.elementoId}`
        }
      ],
      datos: {
        codigo: config.codigoElemento,
        diasVencido: config.diasVencido
      }
    });
  }
  
  /**
   * Hallazgo Identificado
   * Se dispara cuando se registra un hallazgo (RF010)
   */
  async notificarHallazgoIdentificado(config: {
    codigoHallazgo: string;
    tipo: string;
    gravedad: string;
    proceso: string;
    responsable: string;
    email: string;
    auditoriaId: string;
  }): Promise<string> {
    return await this.crear({
      tipo: 'Hallazgo Identificado',
      prioridad: 'Alta',
      titulo: 'Hallazgo identificado en su proceso',
      mensaje: `Se identificó un hallazgo de tipo "${config.tipo}" en la auditoría de ${config.proceso}. Puede consultar el detalle en el sistema.`,
      origenModulo: 'Gestión de Hallazgos',
      origenId: config.codigoHallazgo,
      destinatario: config.responsable,
      destinatarioEmail: config.email,
      canales: ['Sistema', 'Email'],
      acciones: [
        {
          id: 'ver-hallazgo',
          label: 'Ver Hallazgo',
          url: `/hallazgos/${config.codigoHallazgo}`
        },
        {
          id: 'formular-plan',
          label: 'Formular Plan de Mejoramiento',
          url: `/planes-mejoramiento/nuevo?hallazgo=${config.codigoHallazgo}`
        }
      ],
      datos: {
        codigoHallazgo: config.codigoHallazgo,
        gravedad: config.gravedad,
        proceso: config.proceso,
        tipo: config.tipo
      }
    });
  }
  
  /**
   * Solicitud de Evidencia
   * Se dispara cuando se requiere evidencia en un plan (RF012)
   */
  async notificarSolicitudEvidencia(config: {
    planId: string;
    codigoPlan: string;
    accionId: string;
    descripcionAccion: string;
    plazo: string;
    responsable: string;
    email: string;
  }): Promise<string> {
    return await this.crear({
      tipo: 'Solicitud de Evidencia',
      prioridad: 'Media',
      titulo: 'Solicitud de evidencia para acción correctiva',
      mensaje: `Se requiere que cargue la evidencia de cumplimiento para la acción "${config.descripcionAccion}" del plan ${config.codigoPlan}.`,
      origenModulo: 'Seguimiento de Planes de Mejoramiento',
      origenId: config.accionId,
      destinatario: config.responsable,
      destinatarioEmail: config.email,
      fechaVencimiento: config.plazo,
      canales: ['Sistema', 'Email'],
      acciones: [
        {
          id: 'cargar-evidencia',
          label: 'Cargar Evidencia',
          url: `/seguimiento-planes/${config.planId}/accion/${config.accionId}`
        }
      ],
      datos: {
        codigoPlan: config.codigoPlan,
        accionId: config.accionId,
        plazo: config.plazo
      }
    });
  }
  
  /**
   * Confirmación de Recepción
   * Se dispara cuando se recibe un documento (RF014)
   */
  async notificarConfirmacionRecepcion(config: {
    titulo?: string;
    mensaje: string;
    origenModulo: string;
    origenId: string;
    destinatario?: string;
    email?: string;
    datos?: any;
  }): Promise<string> {
    return await this.crear({
      tipo: 'Confirmación de Recepción',
      prioridad: 'Baja',
      titulo: config.titulo || 'Documento recibido correctamente',
      mensaje: config.mensaje,
      origenModulo: config.origenModulo,
      origenId: config.origenId,
      destinatario: config.destinatario,
      destinatarioEmail: config.email,
      canales: ['Sistema', 'Email'],
      datos: config.datos
    });
  }
  
  /**
   * Aprobación de Plan
   * Se dispara cuando se aprueba un plan de mejoramiento (RF011)
   */
  async notificarAprobacionPlan(config: {
    planId: string;
    codigoPlan: string;
    responsable: string;
    email: string;
    aprobadoPor: string;
    fechaAprobacion: string;
  }): Promise<string> {
    return await this.crear({
      tipo: 'Aprobación de Plan',
      prioridad: 'Media',
      titulo: '✓ Plan de Mejoramiento Aprobado',
      mensaje: `El plan de mejoramiento ${config.codigoPlan} ha sido aprobado por la Oficina de Control Interno. Puede iniciar la ejecución de las acciones correctivas.`,
      origenModulo: 'Planes de Mejoramiento',
      origenId: config.planId,
      destinatario: config.responsable,
      destinatarioEmail: config.email,
      canales: ['Sistema', 'Email'],
      acciones: [
        {
          id: 'ver-plan',
          label: 'Ver Plan Aprobado',
          url: `/planes-mejoramiento/${config.planId}`
        }
      ],
      datos: {
        codigoPlan: config.codigoPlan,
        aprobadoPor: config.aprobadoPor,
        fechaAprobacion: config.fechaAprobacion
      }
    });
  }
  
  /**
   * Rechazo de Plan
   * Se dispara cuando se rechaza un plan de mejoramiento (RF011)
   */
  async notificarRechazoPlan(config: {
    planId: string;
    codigoPlan: string;
    responsable: string;
    email: string;
    rechazadoPor: string;
    observaciones: string;
  }): Promise<string> {
    return await this.crear({
      tipo: 'Rechazo de Plan',
      prioridad: 'Alta',
      titulo: '✗ Plan de Mejoramiento Rechazado',
      mensaje: `El plan de mejoramiento ${config.codigoPlan} ha sido rechazado. Motivo: "${config.observaciones}". Por favor, revise los comentarios y presente una nueva versión.`,
      origenModulo: 'Planes de Mejoramiento',
      origenId: config.planId,
      destinatario: config.responsable,
      destinatarioEmail: config.email,
      canales: ['Sistema', 'Email'],
      acciones: [
        {
          id: 'ver-observaciones',
          label: 'Ver Observaciones',
          url: `/planes-mejoramiento/${config.planId}/observaciones`
        },
        {
          id: 'editar-plan',
          label: 'Editar Plan',
          url: `/planes-mejoramiento/${config.planId}/editar`
        }
      ],
      datos: {
        codigoPlan: config.codigoPlan,
        rechazadoPor: config.rechazadoPor,
        observaciones: config.observaciones
      }
    });
  }
  
  /**
   * Informe Preliminar Listo
   * Se dispara cuando se genera informe preliminar (RF007)
   */
  async notificarInformePreliminar(config: {
    auditoriaId: string;
    codigoAuditoria: string;
    responsable: string;
    email: string;
    fechaLimiteRespuesta: string;
  }): Promise<string> {
    return await this.crear({
      tipo: 'Información General',
      prioridad: 'Alta',
      titulo: 'Informe Preliminar de Auditoría Disponible',
      mensaje: `El informe preliminar de la auditoría ${config.codigoAuditoria} está disponible para su revisión. Tiene hasta el ${config.fechaLimiteRespuesta} para presentar observaciones.`,
      origenModulo: 'Etapa de Comunicación',
      origenId: config.auditoriaId,
      destinatario: config.responsable,
      destinatarioEmail: config.email,
      fechaVencimiento: config.fechaLimiteRespuesta,
      canales: ['Sistema', 'Email'],
      acciones: [
        {
          id: 'ver-informe',
          label: 'Ver Informe Preliminar',
          url: `/comunicacion/${config.auditoriaId}/informe-preliminar`
        },
        {
          id: 'presentar-controversia',
          label: 'Presentar Controversia',
          url: `/comunicacion/${config.auditoriaId}/controversia`
        }
      ],
      datos: {
        codigoAuditoria: config.codigoAuditoria,
        fechaLimiteRespuesta: config.fechaLimiteRespuesta
      }
    });
  }
  
  // ============ MÉTODOS AUXILIARES ============
  
  private determinarCanales(prioridad: PrioridadNotificacion): CanalNotificacion[] {
    switch (prioridad) {
      case 'Crítica':
        return ['Sistema', 'Email', 'SMS'];
      case 'Alta':
      case 'Media':
        return ['Sistema', 'Email'];
      case 'Baja':
      default:
        return ['Sistema'];
    }
  }
  
  private esAgrupable(tipo: TipoNotificacion): boolean {
    const tiposAgrupables: TipoNotificacion[] = [
      'Recordatorio de Plazo',
      'Solicitud de Evidencia',
      'Confirmación de Recepción',
      'Información General'
    ];
    return tiposAgrupables.includes(tipo);
  }
  
  private obtenerGrupoId(tipo: TipoNotificacion): string | undefined {
    const grupos: Record<string, string> = {
      'Recordatorio de Plazo': 'recordatorios-planes',
      'Solicitud de Evidencia': 'solicitudes-evidencia',
      'Confirmación de Recepción': 'confirmaciones-recepcion',
      'Información General': 'info-sistema'
    };
    return grupos[tipo];
  }
  
  private async guardarNotificacion(notificacion: any): Promise<void> {
    // Guardar en localStorage (en producción sería base de datos)
    const notificaciones = JSON.parse(localStorage.getItem('notificaciones') || '[]');
    notificaciones.unshift(notificacion); // Agregar al inicio
    localStorage.setItem('notificaciones', JSON.stringify(notificaciones));
  }
  
  private async enviarPorCanales(notificacion: any): Promise<void> {
    // Simular envío por diferentes canales
    if (notificacion.enviadoPorEmail) {
      await this.enviarEmail(notificacion);
    }
    if (notificacion.enviadoPorSMS) {
      await this.enviarSMS(notificacion);
    }
  }
  
  private async enviarEmail(notificacion: any): Promise<void> {
    console.log(`📧 Email enviado a ${notificacion.destinatarioEmail}: ${notificacion.titulo}`);
    // Aquí iría la integración con servicio de email
  }
  
  private async enviarSMS(notificacion: any): Promise<void> {
    console.log(`📱 SMS enviado a ${notificacion.destinatarioTelefono}: ${notificacion.titulo}`);
    // Aquí iría la integración con servicio de SMS
  }
  
  // ============ MÉTODOS PÚBLICOS ADICIONALES ============
  
  /**
   * Obtener todas las notificaciones
   */
  async obtenerNotificaciones(): Promise<any[]> {
    return JSON.parse(localStorage.getItem('notificaciones') || '[]');
  }
  
  /**
   * Marcar como leída
   */
  async marcarComoLeida(id: string): Promise<void> {
    const notificaciones = await this.obtenerNotificaciones();
    const index = notificaciones.findIndex(n => n.id === id);
    if (index !== -1) {
      notificaciones[index].estado = 'Leída';
      notificaciones[index].fechaLectura = new Date().toISOString();
      localStorage.setItem('notificaciones', JSON.stringify(notificaciones));
    }
  }
}

// Exportar instancia única (Singleton)
export const NotificacionesService = new NotificacionesServiceClass();

// ============ EXPORTS NOMBRADOS ============

export const {
  notificarAnuncioAuditoria,
  notificarRecordatorioPlazo,
  notificarVencimientoCritico,
  notificarHallazgoIdentificado,
  notificarSolicitudEvidencia,
  notificarConfirmacionRecepcion,
  notificarAprobacionPlan,
  notificarRechazoPlan,
  notificarInformePreliminar
} = NotificacionesService;

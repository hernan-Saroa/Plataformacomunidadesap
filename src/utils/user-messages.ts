/**
 * Mensajes en lenguaje humano para feedback de usuarios
 * Reemplaza mensajes técnicos con explicaciones claras y acciones sugeridas
 */

export const userMessages = {
  // ==================== USUARIOS ====================
  users: {
    created: (name: string) => ({
      title: '¡Usuario creado correctamente!',
      description: `${name} ahora puede acceder con su email`,
      icon: '✓'
    }),
    
    updated: (name: string) => ({
      title: 'Usuario actualizado',
      description: `Los cambios de ${name} se guardaron correctamente`,
      icon: '✓'
    }),
    
    deleted: (name: string) => ({
      title: 'Usuario eliminado',
      description: `${name} ha sido eliminado del sistema`,
      icon: '✓',
      action: {
        label: 'Deshacer',
        duration: 10000 // 10 segundos para deshacer
      }
    }),
    
    deactivated: (name: string) => ({
      title: 'Usuario desactivado',
      description: `${name} ya no puede acceder al sistema. Puedes reactivarlo cuando quieras`,
      icon: '⚠️'
    }),
    
    reactivated: (name: string) => ({
      title: 'Usuario reactivado',
      description: `${name} puede acceder nuevamente al sistema`,
      icon: '✓'
    }),
    
    emailTaken: (email: string, userId?: string) => ({
      title: 'Email ya registrado',
      description: `El email ${email} ya está en uso. ¿Quieres ver el usuario existente?`,
      icon: '⚠️',
      action: userId ? {
        label: 'Ver usuario existente',
        onClick: () => window.location.href = `/users/${userId}`
      } : undefined
    }),
    
    documentTaken: (document: string, userId?: string) => ({
      title: 'Documento ya registrado',
      description: `El documento ${document} ya existe en el sistema`,
      icon: '⚠️',
      action: userId ? {
        label: 'Ver usuario',
        onClick: () => window.location.href = `/users/${userId}`
      } : undefined
    }),
    
    importSuccess: (count: number) => ({
      title: `¡${count} usuarios importados!`,
      description: `Se importaron correctamente ${count} usuarios desde el archivo`,
      icon: '✓'
    }),
    
    importError: (errors: string[]) => ({
      title: 'Algunos usuarios no se pudieron importar',
      description: `${errors.length} usuarios tuvieron errores. Revisa el archivo y vuelve a intentar`,
      icon: '⚠️'
    }),
    
    rolesUpdated: (name: string, roles: string[]) => ({
      title: 'Roles actualizados',
      description: `${name} ahora tiene los roles: ${roles.join(', ')}`,
      icon: '✓'
    }),
    
    validation: {
      emailInvalid: 'Email inválido. Usa el formato: usuario@esap.edu.co',
      emailRequired: 'El email es obligatorio',
      phoneInvalid: 'Teléfono debe tener 10 dígitos. Ejemplo: 3001234567',
      documentInvalid: 'Documento debe tener entre 6 y 12 dígitos',
      documentRequired: 'El documento de identidad es obligatorio',
      nameRequired: 'El nombre completo es obligatorio',
      requiredFields: 'Por favor completa todos los campos obligatorios (marcados con *)',
      atLeastOneRole: 'Debes asignar al menos un rol al usuario'
    }
  },

  // ==================== GRADUADOS ====================
  graduates: {
    certificateGenerated: (name: string) => ({
      title: '¡Certificado generado!',
      description: `El certificado de ${name} está listo para descargar`,
      icon: '✓',
      action: {
        label: 'Descargar ahora'
      }
    }),
    
    certificateSent: (name: string, email: string) => ({
      title: 'Certificado enviado por email',
      description: `El certificado de ${name} se envió a ${email}`,
      icon: '✓'
    }),
    
    verified: (name: string) => ({
      title: 'Graduado verificado',
      description: `${name} ha sido marcado como verificado`,
      icon: '✓'
    }),
    
    documentUploaded: (documentType: string) => ({
      title: 'Documento cargado',
      description: `${documentType} se agregó correctamente a la carpeta digital`,
      icon: '✓'
    }),
    
    notFound: () => ({
      title: 'Graduado no encontrado',
      description: 'Verifica el documento o nombre e intenta nuevamente',
      icon: '❌'
    })
  },

  // ==================== ROLES Y PERMISOS ====================
  roles: {
    created: (roleName: string) => ({
      title: 'Rol creado exitosamente',
      description: `El rol "${roleName}" está listo para asignarse a usuarios`,
      icon: '✓'
    }),
    
    updated: (roleName: string) => ({
      title: 'Rol actualizado',
      description: `Los permisos de "${roleName}" se guardaron correctamente`,
      icon: '✓'
    }),
    
    deleted: (roleName: string) => ({
      title: 'Rol eliminado',
      description: `El rol "${roleName}" fue eliminado del sistema`,
      icon: '✓'
    }),
    
    cannotDelete: (roleName: string, userCount: number) => ({
      title: 'No se puede eliminar el rol',
      description: `"${roleName}" está asignado a ${userCount} usuario(s). Primero reasigna esos usuarios a otro rol`,
      icon: '⚠️'
    }),
    
    qrGenerated: (roleName: string) => ({
      title: 'Código QR generado',
      description: `QR para "${roleName}" listo. Compártelo con nuevos usuarios`,
      icon: '✓'
    }),
    
    validation: {
      nameRequired: 'El nombre del rol es obligatorio',
      nameTaken: 'Ya existe un rol con ese nombre',
      atLeastOnePermission: 'Debes seleccionar al menos un permiso'
    }
  },

  // ==================== REPORTES ====================
  reports: {
    generated: (reportName: string) => ({
      title: '¡Reporte generado!',
      description: `"${reportName}" está listo para descargar`,
      icon: '✓',
      action: {
        label: 'Descargar'
      }
    }),
    
    scheduled: (reportName: string, frequency: string) => ({
      title: 'Reporte programado',
      description: `Recibirás "${reportName}" ${frequency} por email`,
      icon: '✓'
    }),
    
    scheduleCancelled: (reportName: string) => ({
      title: 'Programación cancelada',
      description: `Ya no recibirás "${reportName}" automáticamente`,
      icon: '✓'
    }),
    
    noData: () => ({
      title: 'Sin datos para el reporte',
      description: 'No hay información disponible con los filtros seleccionados. Intenta ajustar las fechas o filtros',
      icon: '⚠️'
    }),
    
    exportError: () => ({
      title: 'Error al generar reporte',
      description: 'Hubo un problema generando el archivo. Intenta nuevamente en unos momentos',
      icon: '❌'
    })
  },

  // ==================== AUDITORÍA ====================
  audit: {
    eventDetails: (action: string, user: string) => ({
      title: 'Detalle del evento',
      description: `${user} realizó la acción: ${action}`,
      icon: 'ℹ️'
    }),
    
    noEvents: () => ({
      title: 'Sin eventos de auditoría',
      description: 'No hay eventos registrados en el rango de fechas seleccionado',
      icon: 'ℹ️'
    })
  },

  // ==================== ENROLAMIENTO ====================
  enrollment: {
    approved: (name: string) => ({
      title: 'Solicitud aprobada',
      description: `${name} ahora puede acceder al sistema`,
      icon: '✓'
    }),
    
    rejected: (name: string) => ({
      title: 'Solicitud rechazada',
      description: `Se notificó a ${name} sobre el rechazo`,
      icon: '✓'
    }),
    
    pending: () => ({
      title: 'Solicitud marcada como pendiente',
      description: 'Puedes revisarla más tarde',
      icon: 'ℹ️'
    }),
    
    bulkApproved: (count: number) => ({
      title: `${count} solicitudes aprobadas`,
      description: `Se aprobaron correctamente ${count} solicitudes de enrolamiento`,
      icon: '✓'
    })
  },

  // ==================== ASPIRANTES ====================
  aspirants: {
    created: (name: string) => ({
      title: 'Aspirante registrado',
      description: `${name} fue agregado como aspirante`,
      icon: '✓'
    }),
    
    enrolled: (name: string, program: string) => ({
      title: 'Aspirante matriculado',
      description: `${name} fue matriculado en ${program}`,
      icon: '✓'
    }),
    
    rejected: (name: string) => ({
      title: 'Aspirante rechazado',
      description: `Se notificó a ${name} sobre la decisión`,
      icon: '✓'
    })
  },

  // ==================== COMUNIDAD ====================
  community: {
    postCreated: () => ({
      title: 'Publicación creada',
      description: 'Tu publicación es visible para toda la comunidad',
      icon: '✓'
    }),
    
    eventCreated: (title: string) => ({
      title: 'Evento creado',
      description: `"${title}" fue publicado en el calendario`,
      icon: '✓'
    }),
    
    announcementCreated: (title: string) => ({
      title: 'Anuncio publicado',
      description: `"${title}" es visible para todos los usuarios`,
      icon: '✓'
    }),
    
    deleted: () => ({
      title: 'Eliminado correctamente',
      description: 'El contenido fue removido de la comunidad',
      icon: '✓'
    })
  },

  // ==================== ERRORES GENÉRICOS ====================
  errors: {
    network: () => ({
      title: 'Error de conexión',
      description: 'Verifica tu conexión a internet y vuelve a intentar',
      icon: '❌'
    }),
    
    server: () => ({
      title: 'Error del servidor',
      description: 'Hubo un problema en nuestros servidores. Intenta nuevamente en unos minutos',
      icon: '❌'
    }),
    
    unauthorized: () => ({
      title: 'Sin autorización',
      description: 'No tienes permisos para realizar esta acción. Contacta a tu administrador',
      icon: '🔒'
    }),
    
    notFound: () => ({
      title: 'No encontrado',
      description: 'El recurso que buscas no existe o fue eliminado',
      icon: '❌'
    }),
    
    validation: () => ({
      title: 'Datos incorrectos',
      description: 'Revisa los campos marcados en rojo y corrige los errores',
      icon: '⚠️'
    }),
    
    timeout: () => ({
      title: 'Tiempo de espera agotado',
      description: 'La operación tardó demasiado. Intenta nuevamente',
      icon: '⏱️'
    })
  },

  // ==================== ÉXITOS GENÉRICOS ====================
  success: {
    saved: () => ({
      title: 'Cambios guardados',
      description: 'Toda la información se guardó correctamente',
      icon: '✓'
    }),
    
    deleted: () => ({
      title: 'Eliminado correctamente',
      description: 'La información fue removida del sistema',
      icon: '✓'
    }),
    
    uploaded: () => ({
      title: 'Archivo cargado',
      description: 'El archivo se subió correctamente',
      icon: '✓'
    }),
    
    copied: () => ({
      title: 'Copiado al portapapeles',
      description: 'La información fue copiada',
      icon: '✓'
    }),
    
    sent: () => ({
      title: 'Enviado correctamente',
      description: 'La información fue enviada exitosamente',
      icon: '✓'
    })
  }
};

/**
 * Helper para construir mensajes de toast con el formato correcto
 */
export function buildToastMessage(
  messageObj: { title: string; description: string; icon?: string; action?: any }
) {
  return {
    title: messageObj.title,
    description: messageObj.description,
    ...(messageObj.action && { action: messageObj.action })
  };
}

/**
 * Helper para obtener mensajes de validación
 */
export function getValidationMessage(field: string, type: 'required' | 'invalid' | 'taken'): string {
  const messages: Record<string, Record<string, string>> = {
    email: {
      required: userMessages.users.validation.emailRequired,
      invalid: userMessages.users.validation.emailInvalid,
      taken: 'Este email ya está registrado'
    },
    document: {
      required: userMessages.users.validation.documentRequired,
      invalid: userMessages.users.validation.documentInvalid,
      taken: 'Este documento ya está registrado'
    },
    phone: {
      invalid: userMessages.users.validation.phoneInvalid,
      required: 'El teléfono es obligatorio',
      taken: ''
    },
    name: {
      required: userMessages.users.validation.nameRequired,
      invalid: 'Nombre inválido',
      taken: ''
    }
  };

  return messages[field]?.[type] || `${field} es inválido`;
}

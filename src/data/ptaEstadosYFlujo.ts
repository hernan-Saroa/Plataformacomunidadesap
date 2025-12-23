/**
 * ESTADOS Y FLUJO DE APROBACIÓN DEL PTA
 * 
 * Según Documento Maestro Integrado v3.0 - Sección 11
 * Estados oficiales y flujo de aprobación de 3 niveles
 * 
 * Fecha: 23 de diciembre de 2024
 */

// ============================================================================
// ESTADOS OFICIALES DEL PTA
// ============================================================================

export type EstadoPTA =
  | 'CONSTRUCCION'
  | 'EN_APROBACION'
  | 'DEVUELTO'
  | 'APROBADO'
  | 'EN_FIRME';

export interface ConfiguracionEstadoPTA {
  id: EstadoPTA;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  descripcion: string;
  accionesPermitidas: string[];
  icon: string;
}

export const ESTADOS_PTA: Record<EstadoPTA, ConfiguracionEstadoPTA> = {
  CONSTRUCCION: {
    id: 'CONSTRUCCION',
    label: 'En Construcción',
    color: '#3B82F6',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    descripcion: 'PTA editable por el docente',
    accionesPermitidas: ['editar', 'guardar', 'enviar_a_aprobacion'],
    icon: '🔵'
  },
  EN_APROBACION: {
    id: 'EN_APROBACION',
    label: 'En Aprobación',
    color: '#F59E0B',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    descripcion: 'Pendiente de revisión por niveles 1-3',
    accionesPermitidas: ['ver'],
    icon: '🟡'
  },
  DEVUELTO: {
    id: 'DEVUELTO',
    label: 'Devuelto',
    color: '#EF4444',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    descripcion: 'Rechazado con observaciones',
    accionesPermitidas: ['ver_observaciones', 'editar', 'reenviar'],
    icon: '🔴'
  },
  APROBADO: {
    id: 'APROBADO',
    label: 'Aprobado',
    color: '#10B981',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    descripcion: 'Aprobado por los 3 niveles',
    accionesPermitidas: ['ver', 'descargar_pdf'],
    icon: '🟢'
  },
  EN_FIRME: {
    id: 'EN_FIRME',
    label: 'En Firme',
    color: '#8B5CF6',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    descripcion: 'Bloqueado para ejecución',
    accionesPermitidas: ['ver', 'cargar_evidencias', 'consultar_cumplimiento'],
    icon: '🟣'
  }
};

// ============================================================================
// NIVELES DE APROBACIÓN
// ============================================================================

export type NivelAprobacion = 1 | 2 | 3;

export interface ResponsableAprobacion {
  nivel: NivelAprobacion;
  cargo: string;
  descripcion: string;
  responsabilidad: string;
}

export const NIVELES_APROBACION: ResponsableAprobacion[] = [
  {
    nivel: 1,
    cargo: 'Coordinador Académico Territorial / Responsable de Programa',
    descripcion: 'Primer nivel de aprobación',
    responsabilidad: 'Valida coherencia de actividades con asignación académica y núcleo temático'
  },
  {
    nivel: 2,
    cargo: 'Director Territorial / Decano (Jefe Inmediato)',
    descripcion: 'Segundo nivel de aprobación',
    responsabilidad: 'Aprueba como jefe inmediato, verifica lineamientos institucionales'
  },
  {
    nivel: 3,
    cargo: 'Subdirección Nacional Académica',
    descripcion: 'Aprobación final',
    responsabilidad: 'Aprobación final, paso a "En Firme"'
  }
];

// ============================================================================
// ACCIONES DE APROBACIÓN
// ============================================================================

export type AccionAprobacion = 'APROBAR' | 'DEVOLVER';

export interface DecisionAprobacion {
  accion: AccionAprobacion;
  nivel: NivelAprobacion;
  aprobadorId: string;
  aprobadorNombre: string;
  aprobadorCargo: string;
  observaciones: string; // Obligatorio si accion === 'DEVOLVER'
  fecha: string;
}

// ============================================================================
// HISTORIAL DE APROBACIONES
// ============================================================================

export interface HistorialAprobacionPTA {
  id: string;
  ptaId: string;
  nivel: NivelAprobacion;
  aprobadorId: string;
  aprobadorNombre: string;
  aprobadorCargo: string;
  accion: AccionAprobacion;
  observaciones?: string;
  fecha: string;
  estadoAnterior: EstadoPTA;
  estadoNuevo: EstadoPTA;
}

// ============================================================================
// VALIDACIONES DE FLUJO
// ============================================================================

/**
 * Valida si un PTA puede ser enviado a aprobación
 */
export function puedeSeguirFlujo(
  estadoActual: EstadoPTA,
  accion: 'enviar' | 'aprobar' | 'devolver' | 'pasar_a_firme'
): boolean {
  switch (accion) {
    case 'enviar':
      return estadoActual === 'CONSTRUCCION';
    
    case 'aprobar':
      return estadoActual === 'EN_APROBACION' || estadoActual === 'DEVUELTO';
    
    case 'devolver':
      return estadoActual === 'EN_APROBACION';
    
    case 'pasar_a_firme':
      return estadoActual === 'APROBADO';
    
    default:
      return false;
  }
}

/**
 * Obtiene el siguiente estado según la acción
 */
export function obtenerSiguienteEstado(
  estadoActual: EstadoPTA,
  accion: AccionAprobacion,
  nivelActual: NivelAprobacion
): EstadoPTA {
  if (accion === 'DEVOLVER') {
    return 'DEVUELTO';
  }
  
  if (accion === 'APROBAR') {
    if (nivelActual === 3) {
      return 'APROBADO'; // Después puede pasar a EN_FIRME manualmente
    }
    return 'EN_APROBACION'; // Sigue en aprobación para siguiente nivel
  }
  
  return estadoActual;
}

/**
 * Valida si las observaciones son obligatorias
 */
export function requiereObservaciones(accion: AccionAprobacion): boolean {
  return accion === 'DEVOLVER';
}

// ============================================================================
// NOTIFICACIONES SEGÚN FLUJO
// ============================================================================

export interface NotificacionFlujo {
  tipo: 'email' | 'in_app';
  destinatario: 'docente' | 'aprobador_nivel_1' | 'aprobador_nivel_2' | 'aprobador_nivel_3';
  asunto: string;
  mensaje: string;
}

export function obtenerNotificaciones(
  accion: AccionAprobacion,
  nivel: NivelAprobacion,
  docenteNombre: string,
  ptaCodigo: string
): NotificacionFlujo[] {
  const notificaciones: NotificacionFlujo[] = [];
  
  if (accion === 'APROBAR') {
    if (nivel === 1) {
      // Notificar a Nivel 2
      notificaciones.push({
        tipo: 'email',
        destinatario: 'aprobador_nivel_2',
        asunto: `PTA ${ptaCodigo} - Aprobado Nivel 1`,
        mensaje: `El PTA del docente ${docenteNombre} ha sido aprobado en Nivel 1 y requiere su revisión.`
      });
    } else if (nivel === 2) {
      // Notificar a Nivel 3
      notificaciones.push({
        tipo: 'email',
        destinatario: 'aprobador_nivel_3',
        asunto: `PTA ${ptaCodigo} - Aprobado Nivel 2`,
        mensaje: `El PTA del docente ${docenteNombre} ha sido aprobado en Nivel 2 y requiere aprobación final.`
      });
    } else if (nivel === 3) {
      // Notificar al docente
      notificaciones.push({
        tipo: 'email',
        destinatario: 'docente',
        asunto: `PTA ${ptaCodigo} - APROBADO`,
        mensaje: `Su PTA ha sido aprobado por los 3 niveles de aprobación. Pronto pasará a estado "En Firme".`
      });
    }
  }
  
  if (accion === 'DEVOLVER') {
    // Notificar al docente
    notificaciones.push({
      tipo: 'email',
      destinatario: 'docente',
      asunto: `PTA ${ptaCodigo} - Devuelto con Observaciones`,
      mensaje: `Su PTA ha sido devuelto en Nivel ${nivel} con observaciones. Por favor revise y realice los ajustes necesarios.`
    });
  }
  
  return notificaciones;
}

// ============================================================================
// REGLAS DE NEGOCIO
// ============================================================================

export interface ReglaValidacionPTA {
  id: string;
  descripcion: string;
  validacion: (pta: any) => { valido: boolean; mensaje?: string };
  bloqueante: boolean; // Si es true, bloquea el envío a aprobación
}

export const REGLAS_VALIDACION_PTA: ReglaValidacionPTA[] = [
  {
    id: 'RN-003',
    descripcion: 'Todo docente TC/MT debe tener mínimo 1 asignatura de 3 créditos',
    validacion: (pta: any) => {
      const tieneAsignaturaValida = pta.componente_docencia?.actividades?.some(
        (act: any) => act.creditos >= 3
      );
      return {
        valido: tieneAsignaturaValida || false,
        mensaje: 'Debe registrar al menos una asignatura de 3 créditos o más'
      };
    },
    bloqueante: true
  },
  {
    id: 'RN-006',
    descripcion: 'Docentes ocasionales/visitantes/especiales: mín 50% en Docencia',
    validacion: (pta: any) => {
      if (['ocasional', 'visitante', 'especial'].includes(pta.tipo_vinculacion?.toLowerCase())) {
        const porcentajeDocencia = pta.componente_docencia?.porcentaje || 0;
        return {
          valido: porcentajeDocencia >= 50,
          mensaje: 'Debe asignar mínimo 50% del PTA a Docencia'
        };
      }
      return { valido: true };
    },
    bloqueante: true
  },
  {
    id: 'RN-007',
    descripcion: 'Investigación: máximo 50% del PTA',
    validacion: (pta: any) => {
      const porcentajeInvestigacion = pta.componente_investigacion?.porcentaje || 0;
      return {
        valido: porcentajeInvestigacion <= 50,
        mensaje: 'El componente de Investigación no puede superar el 50% del PTA'
      };
    },
    bloqueante: true
  },
  {
    id: 'RN-008',
    descripcion: 'Extensión Académica: máximo 25% del PTA',
    validacion: (pta: any) => {
      const porcentajeExtension = pta.componente_extension?.porcentaje || 0;
      return {
        valido: porcentajeExtension <= 25,
        mensaje: 'El componente de Extensión no puede superar el 25% del PTA'
      };
    },
    bloqueante: true
  },
  {
    id: 'RN-009',
    descripcion: 'Actividades Complementarias: máximo 25% del PTA',
    validacion: (pta: any) => {
      const porcentajeComplementarias = pta.componente_complementarias?.porcentaje || 0;
      return {
        valido: porcentajeComplementarias <= 25,
        mensaje: 'Las Actividades Complementarias no pueden superar el 25% del PTA'
      };
    },
    bloqueante: true
  },
  {
    id: 'TOTAL-HORAS',
    descripcion: 'El total de horas debe coincidir con las horas programables',
    validacion: (pta: any) => {
      const horasProgramables = pta.horas_programables || 800;
      const horasAsignadas = 
        (pta.componente_docencia?.horas || 0) +
        (pta.componente_investigacion?.horas || 0) +
        (pta.componente_extension?.horas || 0) +
        (pta.componente_complementarias?.horas || 0) +
        (pta.componente_administrativas?.horas || 0);
      
      const diferencia = Math.abs(horasAsignadas - horasProgramables);
      
      return {
        valido: diferencia === 0,
        mensaje: `Total de horas asignadas (${horasAsignadas}h) debe ser igual a horas programables (${horasProgramables}h)`
      };
    },
    bloqueante: true
  }
];

/**
 * Valida un PTA contra todas las reglas de negocio
 */
export function validarPTA(pta: any): {
  valido: boolean;
  errores: string[];
  advertencias: string[];
} {
  const errores: string[] = [];
  const advertencias: string[] = [];
  
  for (const regla of REGLAS_VALIDACION_PTA) {
    const resultado = regla.validacion(pta);
    
    if (!resultado.valido) {
      if (regla.bloqueante) {
        errores.push(`[${regla.id}] ${resultado.mensaje || regla.descripcion}`);
      } else {
        advertencias.push(`[${regla.id}] ${resultado.mensaje || regla.descripcion}`);
      }
    }
  }
  
  return {
    valido: errores.length === 0,
    errores,
    advertencias
  };
}

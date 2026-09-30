/**
 * Sistema de Situaciones Administrativas Docentes - ESAP PTA
 * Implementa REQ-MOD-PTA-004 punto 6: Gestión de Situaciones Administrativas
 * 
 * Gestiona años sabáticos, comisiones, licencias, permisos, etc.
 */

export type TipoSituacionAdministrativa =
  | 'ANO_SABATICO'
  | 'COMISION_ESTUDIOS'
  | 'COMISION_SERVICIOS'
  | 'LICENCIA_REMUNERADA'
  | 'LICENCIA_NO_REMUNERADA'
  | 'PERMISO_PERSONAL'
  | 'INCAPACIDAD_MEDICA'
  | 'VACACIONES'
  | 'COMISION_INVESTIGACION'
  | 'OTRA';

export type EstadoSituacion =
  | 'SOLICITADA'
  | 'EN_REVISION'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'ACTIVA'
  | 'FINALIZADA'
  | 'CANCELADA';

export type ImpactoDisponibilidad =
  | 'TOTAL' // 100% no disponible
  | 'PARCIAL' // Disponibilidad reducida
  | 'NINGUNO'; // No afecta disponibilidad

export interface SituacionAdministrativa {
  id: string;
  docenteId: string;
  docenteNombre: string;
  docenteEmail: string;
  territorialId: string;
  territorialNombre: string;
  
  // Tipo y descripción
  tipo: TipoSituacionAdministrativa;
  descripcion: string;
  motivoDetallado?: string;
  
  // Fechas
  fechaSolicitud: Date;
  fechaInicio: Date;
  fechaFin: Date;
  duracionDias: number;
  
  // Impacto
  impactoDisponibilidad: ImpactoDisponibilidad;
  porcentajeDisponibilidad: number; // 0-100%
  afectaDocencia: boolean;
  afectaInvestigacion: boolean;
  afectaExtension: boolean;
  afectaAdministrativo: boolean;
  
  // Estado y aprobación
  estado: EstadoSituacion;
  aprobadoPor?: string;
  fechaAprobacion?: Date;
  observacionesAprobacion?: string;
  
  // Documentación
  documentosSoporte: string[]; // URLs o IDs de documentos
  resolucionNumero?: string;
  resolucionFecha?: Date;
  
  // Seguimiento
  alertaGenerada: boolean;
  notificacionesEnviadas: string[]; // IDs de notificaciones
  
  // Metadata
  creadoPor: string;
  fechaCreacion: Date;
  modificadoPor?: string;
  fechaModificacion?: Date;
  
  // Historial
  historialCambios: HistorialCambioSituacion[];
}

export interface HistorialCambioSituacion {
  fecha: Date;
  usuario: string;
  accion: string;
  estadoAnterior?: EstadoSituacion;
  estadoNuevo?: EstadoSituacion;
  observaciones?: string;
}

export interface AlertaSituacionAdministrativa {
  id: string;
  situacionId: string;
  docenteId: string;
  docenteNombre: string;
  tipo: TipoSituacionAdministrativa;
  mensaje: string;
  nivelUrgencia: 'ALTA' | 'MEDIA' | 'BAJA';
  fechaGeneracion: Date;
  destinatarios: string[]; // IDs de usuarios a notificar
  leida: boolean;
  fechaLectura?: Date;
}

export interface ConfiguracionAlertasSituaciones {
  // Días de anticipación para enviar alertas
  diasAnticipacionInicio: number; // Default: 30 días antes
  diasAnticipacionFin: number; // Default: 15 días antes
  
  // Notificar a
  notificarCoordinadores: boolean;
  notificarDirectores: boolean;
  notificarSubdireccion: boolean;
  notificarTalentoHumano: boolean;
  
  // Configuración por tipo
  tiposConAlertaAutomatica: TipoSituacionAdministrativa[];
}

export interface ReporteSituacionesTalentoHumano {
  id: string;
  periodoAcademico: string;
  fechaGeneracion: Date;
  situaciones: SituacionAdministrativa[];
  resumenPorTipo: {
    tipo: TipoSituacionAdministrativa;
    cantidad: number;
    docentesAfectados: string[];
  }[];
  resumenPorTerritorial: {
    territorialId: string;
    territorialNombre: string;
    cantidad: number;
    docentesAfectados: string[];
  }[];
  observaciones?: string;
  generadoPor: string;
}

// Configuración por defecto
export const CONFIGURACION_ALERTAS_DEFAULT: ConfiguracionAlertasSituaciones = {
  diasAnticipacionInicio: 30,
  diasAnticipacionFin: 15,
  notificarCoordinadores: true,
  notificarDirectores: true,
  notificarSubdireccion: false,
  notificarTalentoHumano: true,
  tiposConAlertaAutomatica: [
    'ANO_SABATICO',
    'COMISION_ESTUDIOS',
    'COMISION_SERVICIOS',
    'LICENCIA_NO_REMUNERADA',
    'INCAPACIDAD_MEDICA',
  ],
};

// Labels para UI
export const LABELS_TIPO_SITUACION: Record<TipoSituacionAdministrativa, string> = {
  ANO_SABATICO: 'Año Sabático',
  COMISION_ESTUDIOS: 'Comisión de Estudios',
  COMISION_SERVICIOS: 'Comisión de Servicios',
  LICENCIA_REMUNERADA: 'Licencia Remunerada',
  LICENCIA_NO_REMUNERADA: 'Licencia No Remunerada',
  PERMISO_PERSONAL: 'Permiso Personal',
  INCAPACIDAD_MEDICA: 'Incapacidad Médica',
  VACACIONES: 'Vacaciones',
  COMISION_INVESTIGACION: 'Comisión de Investigación',
  OTRA: 'Otra',
};

export const LABELS_ESTADO_SITUACION: Record<EstadoSituacion, string> = {
  SOLICITADA: 'Solicitada',
  EN_REVISION: 'En Revisión',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  ACTIVA: 'Activa',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
};

export const COLORES_ESTADO_SITUACION: Record<EstadoSituacion, string> = {
  SOLICITADA: 'blue',
  EN_REVISION: 'yellow',
  APROBADA: 'green',
  RECHAZADA: 'red',
  ACTIVA: 'purple',
  FINALIZADA: 'gray',
  CANCELADA: 'gray',
};

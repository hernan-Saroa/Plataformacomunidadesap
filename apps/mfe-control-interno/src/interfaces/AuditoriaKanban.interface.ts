export type EstadoAuditoria =
  | 'Programa Anual'
  | 'Planeación'
  | 'Ejecución'
  | 'Comunicación'
  | 'Seguimiento'
  | 'Finalizada'
  | 'Plan Anual';

export type RiesgoAuditoria = 'Alto' | 'Medio' | 'Bajo';
export type SemaforoColor = 'verde' | 'amarillo' | 'rojo';
export type TipoAuditoria = string; // Ahora es dinámico y soporta cualquier string
export type Prioridad = 'crítica' | 'alta' | 'media' | 'baja';

export interface Persona {
  nombre: string;
  cargo: string;
  iniciales: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA';
  numeroIdentificacion: string;
}

export interface ObjetivoAuditoria {
  id: string;
  descripcion: string;
}

export interface CriterioAuditoria {
  id: string;
  criterio: string;
}

export interface AuditorDisponible {
  id: string;
  nombre: string;
  cargo: string;
  email: string;
  iniciales?: string;
}

export interface AuditoriaKanban {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  estado: EstadoAuditoria;
  riesgo: RiesgoAuditoria;
  semaforo: SemaforoColor;
  territorial: string;
  auditorLider: Persona;
  auditorAsignado: Persona;
  // ✅ CRONOGRAMA DE 3 ETAPAS
  // Etapa 1: Planeación
  fechaInicio: string;           // = fechaInicioPlaneacion
  fechaFinPlaneacion?: string;   // Fin de Planeación
  // Etapa 2: Ejecución
  fechaInicioEjecucion?: string; // Inicio de Ejecución
  fechaFinEjecucion?: string;    // Fin de Ejecución
  // Etapa 3: Comunicación
  fechaInicioComunicacion?: string; // Inicio de Comunicación
  fechaFin: string;              // = fechaFinComunicacion (fin de auditoría)
  progreso: number;
  hallazgos: number;
  diasRestantes: number;
  porcentajeTiempo: number;
  ultimaActuacion: string;
  objetivos: ObjetivoAuditoria[];
  calificacionRiesgo: string;
  documentos: number;
  informes: number;
  tareas: number;
  tipo: TipoAuditoria;
  prioridad: Prioridad;
  areaObjetivo: string;
  permiteCambiarObjetivos: boolean;
  equipoAuditores: string[];
  territorialInfo?: {
    nombre: string;
    ciudad: string;
    departamento: string;
  };
  especial?: {
    tipoMotivo: string;
    solicitante: string;
    justificacion: string;
  };
  actividadesCompletas?: boolean;
  actividadesPendientes?: number;
  // Criterios de auditoría
  criterios?: CriterioAuditoria[];
  // ID del auditor líder asignado
  auditorLiderId?: string | number;
  // ✅ Responsable del Área Auditada (viene del backend)
  responsableAreaNombre?: string;
  responsableAreaCargo?: string;
  responsableAreaEmail?: string;
  // Vigencia asociada
  planAnualAño?: number;
  vigencia?: number;
  presupuestoEstimado?: string | number;
  documentoCierre?: string;
  planAnualVigencia?: number;
  planAnualId?: string;
  programaAnualMetadata?: any;
}
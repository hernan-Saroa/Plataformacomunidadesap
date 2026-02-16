/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TIPOS - PLAN ANUAL DE AUDITORÍA (5 ROLES - DECRETO 648/2017)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Tipos TypeScript que coinciden exactamente con las entidades del backend:
 * - PlanAnual5Roles
 * - RolPlanAnual5
 * - ActividadPlanAnual5
 * 
 * Referencia: backend/internal-institutional-control-service/src/esap/plan-anual-5-roles/entities/
 */

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS Y TIPOS BASE
// ═══════════════════════════════════════════════════════════════════════════

export type EstadoPlan = 'borrador' | 'en-revision' | 'aprobado' | 'en-ejecucion' | 'completado';
export type EstadoActividad = 'pendiente' | 'en-progreso' | 'completada' | 'retrasada';
export type PrioridadActividad = 'Alta' | 'Media' | 'Baja';

// Números de rol según Decreto 648/2017
export type NumeroRol = 1 | 2 | 3 | 4 | 5;

// ═══════════════════════════════════════════════════════════════════════════
// ENTIDAD: ACTIVIDAD DEL PLAN ANUAL
// ═══════════════════════════════════════════════════════════════════════════

export interface Actividad {
  id: string;
  rolId: string;
  planId: string;
  nombre: string;
  descripcion?: string;
  responsable: string;
  fecha_inicio: string; // ISO date string
  fecha_fin: string;    // ISO date string
  estado: EstadoActividad;
  porcentaje_avance: number;
  observaciones?: string;
  prioridad: PrioridadActividad;
  createdAt?: string;
  updatedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTIDAD: ROL DEL PLAN ANUAL (5 ROLES DECRETO 648)
// ═══════════════════════════════════════════════════════════════════════════

export interface Rol {
  id: string;
  planId: string;
  rol_numero: NumeroRol;
  nombre: string;
  descripcion: string;
  color: string;
  porcentaje_cumplimiento: number;
  total_actividades: number;
  actividades: Actividad[];
  createdAt?: string;
  updatedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTIDAD: PLAN ANUAL DE AUDITORÍA
// ═══════════════════════════════════════════════════════════════════════════

export interface PlanAnual {
  id: string;
  año: number;
  fecha_creacion: string;
  responsable: string;
  estado: EstadoPlan;
  porcentaje_cumplimiento_general: number;
  total_actividades: number;
  actividades_completadas: number;
  actividades_en_progreso: number;
  roles: Rol[];
  createdAt?: string;
  updatedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DTOs PARA CREAR/ACTUALIZAR
// ═══════════════════════════════════════════════════════════════════════════

export interface CreatePlanAnualDto {
  año: number;
  responsable: string;
}

export interface UpdatePlanAnualDto {
  estado?: EstadoPlan;
  responsable?: string;
}

export interface CreateActividadDto {
  nombre: string;
  descripcion?: string;
  responsable: string;
  fecha_inicio: string;
  fecha_fin: string;
  prioridad?: PrioridadActividad;
  observaciones?: string;
}

export interface UpdateActividadDto {
  nombre?: string;
  descripcion?: string;
  responsable?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: EstadoActividad;
  porcentaje_avance?: number;
  prioridad?: PrioridadActividad;
  observaciones?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS DE RESPUESTA API
// ═══════════════════════════════════════════════════════════════════════════

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDITOR (Para asignación de responsables)
// ═══════════════════════════════════════════════════════════════════════════

export interface Auditor {
  id: string;
  nombre: string;
  apellido?: string;
  cargo: string;
  email: string;
  activo?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTADÍSTICAS DEL PLAN
// ═══════════════════════════════════════════════════════════════════════════

export interface EstadisticasPlan {
  totalActividades: number;
  actividadesCompletadas: number;
  actividadesEnProgreso: number;
  actividadesPendientes: number;
  actividadesRetrasadas: number;
  porcentajeCumplimiento: number;
  porcentajesPorRol: {
    rol: number;
    nombre: string;
    porcentaje: number;
  }[];
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTROS
// ═══════════════════════════════════════════════════════════════════════════

export interface FiltrosPlanAnual {
  año?: number;
  estado?: EstadoPlan;
}

export interface FiltrosActividad {
  rolId?: string;
  estado?: EstadoActividad;
  responsable?: string;
  prioridad?: PrioridadActividad;
}

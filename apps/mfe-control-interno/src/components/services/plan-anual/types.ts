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
  responsables?: { id: string; nombre: string; cargo: string; email: string }[];
  fecha_corte?: string;
  fecha_inicio: string; // ISO date string
  fecha_fin: string;    // ISO date string
  estado: EstadoActividad;
  porcentaje_avance: number;
  observaciones?: string;
  prioridad: PrioridadActividad;
  activo?: boolean; // Soft delete
  // Campos extendidos (migración 129)
  control?: string;
  evaluacion?: string;
  seguimiento?: string;
  requiereVerificacionDirector?: boolean;
  requiere_verificacion_director?: boolean; // snake_case desde backend
  verificadaPorDirector?: boolean;
  verificada_por_director?: boolean; // snake_case desde backend
  fechaVerificacion?: string;
  fecha_verificacion?: string; // snake_case desde backend
  observacionesDirector?: string;
  observaciones_director?: string; // snake_case desde backend
  configuracionEvidencias?: ConfiguracionEvidencias;
  configuracion_evidencias?: ConfiguracionEvidencias; // snake_case desde backend
  adjuntos?: AdjuntoActividad[];
  bitacoraObservaciones?: any[];
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
  /** Responsable principal del rol (independiente de las actividades). */
  responsable?: string;
  responsable_id?: string;
  responsables?: Array<{ id: string; nombre: string; cargo?: string; email?: string }>;
  actividades: Actividad[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateRolPlanAnualDto {
  responsable?: string;
  responsable_id?: string;
  responsables?: Array<{ id: string; nombre: string; cargo?: string; email?: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTIDAD: PLAN ANUAL DE AUDITORÍA
// ═══════════════════════════════════════════════════════════════════════════

export interface PlanAnual {
  id: string;
  año: number;
  fecha_creacion: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  responsable: string;
  responsable_id?: string;
  estado: EstadoPlan;
  porcentaje_cumplimiento_general: number;
  total_actividades: number;
  actividades_completadas: number;
  actividades_en_progreso: number;
  equipoAprobacion?: Auditor[];
  ordenAprobacion?: 'secuencial' | 'paralelo';
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
  responsable_id?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: EstadoPlan;
  equipo_aprobacion?: Auditor[];
  orden_aprobacion?: string;
}

export interface UpdatePlanAnualDto {
  estado?: EstadoPlan;
  responsable?: string;
  responsable_id?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  equipo_aprobacion?: Auditor[];
  orden_aprobacion?: string;
}

export interface CreateActividadDto {
  nombre: string;
  descripcion?: string;
  responsable: string;
  responsables?: { id: string; nombre: string; cargo: string; email: string }[];
  fecha_corte?: string;
  fecha_inicio: string;
  fecha_fin: string;
  prioridad?: PrioridadActividad;
  observaciones?: string;
  // Campos nuevos migración 129
  control?: string;
  evaluacion?: string;
  seguimiento?: string;
  requiereVerificacionDirector?: boolean;
  configuracionEvidencias?: ConfiguracionEvidencias;
  puntos_control?: any[];
  frecuencia_puntos_control?: string;
  // ⚡ NUEVO: Entradas de seguimiento iniciales (convertidas desde tareasSeguimiento)
  entradas_seguimiento?: Array<{
    id: string;
    puntoControlId: string;
    fechaRegistro: string;
    registradoPor: string;
    usuarioId?: string;
    texto?: string;
    archivos?: Array<{ nombre: string; url: string; tipo: string; tamanio: number }>;
    tipo: 'seguimiento' | 'hallazgo' | 'cierre';
  }>;
  // Tareas de seguimiento (sub-tareas)
  tareas_seguimiento?: Array<{
    id: string;
    descripcion: string;
    completada: boolean;
    responsables?: Array<{ id: string; nombre: string; cargo?: string }>;
    fechaLimite?: string;
    fechaCompletada?: string;
    completadaPor?: string;
  }>;
}

export interface UpdateActividadDto {
  nombre?: string;
  descripcion?: string;
  responsable?: string;
  responsables?: { id: string; nombre: string; cargo: string; email: string }[];
  fecha_corte?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: EstadoActividad;
  porcentaje_avance?: number;
  prioridad?: PrioridadActividad;
  observaciones?: string;
  // Campos extendidos migración 129
  control?: string;
  evaluacion?: string;
  seguimiento?: string;
  requiereVerificacionDirector?: boolean;
  configuracionEvidencias?: ConfiguracionEvidencias;
  entradas_seguimiento?: Array<{
    id: string;
    puntoControlId: string;
    fechaRegistro: string;
    registradoPor: string;
    usuarioId?: string;
    texto?: string;
    archivos?: Array<{ nombre: string; url: string; tipo: string; tamanio: number }>;
    tipo: 'seguimiento' | 'hallazgo' | 'cierre';
  }>;
  // Tareas de seguimiento (sub-tareas)
  tareas_seguimiento?: Array<{
    id: string;
    descripcion: string;
    completada: boolean;
    responsables?: Array<{ id: string; nombre: string; cargo?: string }>;
    fechaLimite?: string;
    fechaCompletada?: string;
    completadaPor?: string;
  }>;
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
  /** true (default en listados): sin adjuntos en actividades — menor payload */
  light?: boolean;
  /** Omite caché en memoria del listado */
  skipCache?: boolean;
}

export interface FiltrosActividad {
  rolId?: string;
  estado?: EstadoActividad;
  responsable?: string;
  prioridad?: PrioridadActividad;
}

// ═══════════════════════════════════════════════════════════════════════════
// ADJUNTOS DE ACTIVIDADES
// ═══════════════════════════════════════════════════════════════════════════

export interface AdjuntoActividad {
  id: string;
  actividadId: string;
  nombre: string;
  tipo?: string;
  tamanio?: number;
  fechaCarga: string;
  cargadoPor?: string;
  cargadoPorId?: number;
  rutaArchivo?: string;
  url?: string;
  hashArchivo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAdjuntoDto {
  nombre: string;
  tipo?: string;
  tamanio?: number;
  cargadoPor?: string;
  cargadoPorId?: number;
  rutaArchivo?: string;
  url?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE EVIDENCIAS
// ═══════════════════════════════════════════════════════════════════════════

export type RequisitoEvidencia = 'OBLIGATORIO' | 'OPCIONAL' | 'NO_REQUERIDO';

export interface ConfiguracionEvidencias {
  adjuntosRequeridos: RequisitoEvidencia;
  observacionRequerida: RequisitoEvidencia;
  minimoAdjuntos?: number;
  tiposAdjuntosPermitidos?: string[];
  longitudMinimaObservacion?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// DTO ACTUALIZACIÓN EXTENDIDA DE ACTIVIDAD
// ═══════════════════════════════════════════════════════════════════════════

export interface UpdateActividadExtendidoDto extends UpdateActividadDto {
  control?: string;
  evaluacion?: string;
  seguimiento?: string;
  requiereVerificacionDirector?: boolean;
  verificadaPorDirector?: boolean;
  fechaVerificacion?: string;
  observacionesDirector?: string;
  configuracionEvidencias?: ConfiguracionEvidencias;
}

/**
 * ============================================
 * TIPOS TYPESCRIPT CENTRALIZADOS - MÓDULO OCIG
 * ============================================
 * 
 * Este archivo centraliza TODOS los tipos TypeScript del módulo
 * de Control Interno de Gestión (OCIG) para garantizar consistencia
 * en toda la aplicación.
 * 
 * Basado en:
 * - Schema Prisma (Sección 7 - OCIG_DOCUMENTO_COMPLETO.md)
 * - Requerimientos Funcionales RF001-RF020
 * 
 * FECHA: 30 Enero 2025
 * VERSIÓN: 1.0
 */

// ============================================
// ENUMS - Estados y Tipos
// ============================================

export enum PlanEstado {
  BORRADOR = 'BORRADOR',
  EN_REVISION = 'EN_REVISION',
  APROBADO = 'APROBADO',
  VIGENTE = 'VIGENTE',
  CERRADO = 'CERRADO'
}

export enum ActividadEstado {
  PENDIENTE = 'PENDIENTE',
  EN_EJECUCION = 'EN_EJECUCION',
  COMPLETADA = 'COMPLETADA',
  RETRASADA = 'RETRASADA'
}

export enum TipoAuditoria {
  SEDE_CENTRAL = 'SEDE_CENTRAL',
  TERRITORIAL = 'TERRITORIAL',
  ESPECIAL = 'ESPECIAL'
}

export enum EstadoAuditoria {
  BACKLOG = 'BACKLOG',
  PLANEACION = 'PLANEACION',
  EJECUCION = 'EJECUCION',
  COMUNICACION = 'COMUNICACION',
  CERRADO = 'CERRADO'
}

export enum RolEquipo {
  LIDER = 'LIDER',
  AUDITOR = 'AUDITOR',
  OBSERVADOR = 'OBSERVADOR'
}

export enum TipoHallazgo {
  HALLAZGO = 'HALLAZGO',
  OBSERVACION = 'OBSERVACION',
  RECOMENDACION = 'RECOMENDACION'
}

export enum TipoDocumento {
  PLAN_TRABAJO = 'PLAN_TRABAJO',
  PAPEL_TRABAJO = 'PAPEL_TRABAJO',
  EVIDENCIA = 'EVIDENCIA',
  INFORME_PRELIMINAR = 'INFORME_PRELIMINAR',
  INFORME_FINAL = 'INFORME_FINAL',
  OTRO = 'OTRO'
}

export enum EstadoPlanMejora {
  FORMULACION = 'FORMULACION',
  EN_REVISION = 'EN_REVISION',
  EN_EJECUCION = 'EN_EJECUCION',
  EN_SEGUIMIENTO = 'EN_SEGUIMIENTO',
  EVALUACION_EFECTIVIDAD = 'EVALUACION_EFECTIVIDAD',
  CERRADO = 'CERRADO'
}

export enum AccionEstado {
  PENDIENTE = 'PENDIENTE',
  EN_PROCESO = 'EN_PROCESO',
  COMPLETADA = 'COMPLETADA',
  PENDIENTE_VERIFICACION = 'PENDIENTE_VERIFICACION'
}

export enum EstadoSeguimiento {
  PENDIENTE = 'PENDIENTE',
  EN_CURSO = 'EN_CURSO',
  CERRADO = 'CERRADO'
}

export enum EstadoValidacion {
  PENDIENTE = 'PENDIENTE',
  ACEPTADA = 'ACEPTADA',
  CON_OBSERVACIONES = 'CON_OBSERVACIONES',
  RECHAZADA = 'RECHAZADA'
}

export enum Periodicidad {
  MENSUAL = 'MENSUAL',
  TRIMESTRAL = 'TRIMESTRAL',
  CUATRIMESTRAL = 'CUATRIMESTRAL',
  SEMESTRAL = 'SEMESTRAL',
  ANUAL = 'ANUAL'
}

export enum EstadoCumplimiento {
  PENDIENTE = 'PENDIENTE',
  CUMPLIDO = 'CUMPLIDO',
  CUMPLIDO_EXTEMPORANEO = 'CUMPLIDO_EXTEMPORANEO',
  NO_CUMPLIDO = 'NO_CUMPLIDO'
}

export enum Rol {
  JEFE_OCI = 'JEFE_OCI',
  AUDITOR_LIDER = 'AUDITOR_LIDER',
  AUDITOR = 'AUDITOR',
  CONTRATISTA = 'CONTRATISTA',
  AREA_AUDITADA = 'AREA_AUDITADA',
  ADMIN = 'ADMIN'
}

// ============================================
// TIPOS BASE - Usuarios y Territoriales
// ============================================

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  cedula: string;
  rol: Rol;
  cargo?: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Territorial {
  id: string;
  nombre: string;
  cobertura: string[]; // Departamentos cubiertos
}

// ============================================
// RF001-004: PLAN ANUAL DE AUDITORÍA
// ============================================

export interface RolDecreto648 {
  id: string;
  numero: number; // 1 al 5
  nombre: string;
  descripcion: string;
  articulo: string; // "Art. 2", etc.
  planAnualId: string;
  actividades: Actividad[];
}

export interface Actividad {
  id: string;
  nombre: string;
  descripcion?: string;
  estado: ActividadEstado;
  fechaInicio: Date;
  fechaFin: Date;
  porcentaje: number;
  rolId: string;
  responsableId: string;
  responsable?: Usuario;
}

export interface PlanAnual {
  id: string;
  vigencia: number; // 2025, 2026, etc.
  estado: PlanEstado;
  fechaCreacion: Date;
  fechaAprobacion?: Date;
  actaCICC?: string; // Número de acta de aprobación
  version: number;
  jefeOciId: string;
  jefeOci?: Usuario;
  roles: RolDecreto648[];
  auditorias?: Auditoria[];
}

// ============================================
// RF005-009: GESTIÓN DE AUDITORÍAS
// ============================================

export interface Auditoria {
  id: string;
  codigo: string; // AUD-2025-001
  nombre: string;
  tipo: TipoAuditoria;
  procesoAuditado: string;
  estado: EstadoAuditoria;

  // Fechas por etapa
  fechaInicioPlaneacion?: Date;
  fechaFinPlaneacion?: Date;
  fechaInicioEjecucion?: Date;
  fechaFinEjecucion?: Date;
  fechaInicioComunicacion?: Date;
  fechaFinComunicacion?: Date;

  // Relaciones
  planAnualId: string;
  planAnual?: PlanAnual;
  auditorLiderId: string;
  auditorLider?: Usuario;
  equipoAuditor: EquipoAuditor[];
  hallazgos: Hallazgo[];
  documentos: Documento[];
  planMejora?: PlanMejoramiento;

  // Territorial (opcional)
  territorialId?: string;
  territorial?: Territorial;
  esTerritorial: boolean;

  // Control de workflow
  planTrabajoAprobado?: boolean;
  informeFinal?: any;

  // Auditoría
  createdAt: Date;
  updatedAt: Date;
}

export interface EquipoAuditor {
  id: string;
  auditoriaId: string;
  usuarioId: string;
  usuario?: Usuario;
  rol: RolEquipo;
}

export interface Hallazgo {
  id: string;
  numero: number;
  tipo: TipoHallazgo;
  titulo: string;
  descripcion: string;
  criterio: string;
  causas?: string;
  auditoriaId: string;
  auditoria?: Auditoria;
  evidencias: Evidencia[];
  accionCorrectiva?: AccionCorrectiva;
  createdAt: Date;
}

export interface Evidencia {
  id: string;
  nombre: string;
  url: string;
  tipo: string; // MIME type
  tamaño: number; // bytes
  hallazgoId: string;
  createdAt: Date;
}

export interface Documento {
  id: string;
  nombre: string;
  tipo: TipoDocumento;
  url: string; // Azure Blob URL
  version: number;
  auditoriaId: string;
  subidoPorId: string;
  subidoPor?: Usuario;
  createdAt: Date;
}

// ============================================
// RF010-013: PLANES DE MEJORAMIENTO
// ============================================

export interface PlanMejoramiento {
  id: string;
  estado: EstadoPlanMejora;
  fechaSuscripcion: Date;
  auditoriaId: string;
  auditoria?: Auditoria;
  areaAuditadaId: string;
  areaAuditada?: Usuario;
  acciones: AccionCorrectiva[];
  seguimientos: SeguimientoPlanMejora[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AccionCorrectiva {
  id: string;
  descripcion: string;
  causasRaiz: string;
  accionMejora: string;
  soporteEvidencia: string; // Descripción de evidencia esperada
  cantidadProgramada: number;
  fechaInicio: Date;
  fechaFin: Date;
  tiempoEjecucionMeses: number; // Calculado: DATEDIF(inicio, fin, "M")
  estado: AccionEstado;

  // Seguimiento
  cantidadImplementada: number;
  cumplimiento: 0 | 1 | 2; // 0=Pendiente, 1=Parcial, 2=Completo

  // Efectividad (evaluación posterior)
  controlesAplicados?: boolean;
  situacionNoRepitio?: boolean;
  efectividad?: 0 | 1 | 2;
  observacionEfectividad?: string;

  // Relaciones
  planMejoraId: string;
  planMejora?: PlanMejoramiento;
  hallazgoId: string;
  hallazgo?: Hallazgo;
  responsableId: string;
  responsable?: Usuario;
  seguimientos: AccionSeguimiento[];
}

export interface SeguimientoPlanMejora {
  id: string;
  numeroSeguimiento: number; // 1, 2, 3, 4
  mesSeguimiento: string; // JULIO, OCTUBRE, ENERO, ABRIL
  fechaCorte: Date;
  fechaEntrega?: Date;
  estado: EstadoSeguimiento;
  planMejoraId: string;
  planMejora?: PlanMejoramiento;
  acciones: AccionSeguimiento[];
  createdAt: Date;
}

export interface AccionSeguimiento {
  id: string;
  cantidadImplementada: number;
  cumplimiento: 0 | 1 | 2; // Fórmula EMFO002
  observaciones?: string;
  seguimientoId: string;
  seguimiento?: SeguimientoPlanMejora;
  accionId: string;
  accion?: AccionCorrectiva;
  evidencias: EvidenciaValidada[];
}

export interface EvidenciaValidada {
  id: string;
  evidenciaOriginal: string; // URL en Azure Blob
  calificacion: EstadoValidacion;
  comentariosAuditor?: string;
  fechaValidacion?: Date;
  solicitudNuevaEvidencia: boolean;
  accionSeguimientoId: string;
  validadoPorId?: string;
  validadoPor?: Usuario;
  createdAt: Date;
}

// ============================================
// RF014-016: INFORMES DE LEY
// ============================================

export interface InformeLey {
  id: string;
  nombre: string;
  norma: string;
  periodicidad: Periodicidad;
  destinatario: string;
  descripcion?: string;
  cumplimientos: CumplimientoInforme[];
}

export interface CumplimientoInforme {
  id: string;
  vigencia: number; // Año
  periodo: string; // "ENE", "Q1", "S1", "2025"
  fechaLimite: Date;
  fechaEntrega?: Date;
  estado: EstadoCumplimiento;
  radicado?: string;
  urlPublicacion?: string;
  observaciones?: string;
  informeId: string;
  informe?: InformeLey;
  registradoPorId?: string;
  registradoPor?: Usuario;
}

// ============================================
// RF020: AUDITORÍA DE CAMBIOS (COMPLIANCE)
// ============================================

export interface AuditLog {
  id: string;
  accion: string; // "Crear Plan", "Mover Auditoria", "Validar Evidencia"
  tabla: string; // "plan_anual", "auditoria", etc.
  registroId: string;
  cambios: {
    antes?: any;
    despues?: any;
    operacion?: string;
    [key: string]: any;
  };
  usuarioId: string;
  usuario?: Usuario;
  timestamp: Date;
  planAnualId?: string;
  auditoriaId?: string;
}

// ============================================
// DTOs - Data Transfer Objects
// ============================================

export interface CreatePlanAnualDTO {
  vigencia: number;
  roles: {
    numero: number;
    nombre: string;
    descripcion: string;
    articulo: string;
    actividades: {
      nombre: string;
      descripcion?: string;
      responsableId: string;
      fechaInicio: Date;
      fechaFin: Date;
    }[];
  }[];
}

export interface UpdatePlanAnualDTO {
  estado?: PlanEstado;
  actaCICC?: string;
  roles?: Partial<RolDecreto648>[];
}

export interface CreateAuditoriaDTO {
  codigo: string;
  nombre: string;
  tipo: TipoAuditoria;
  procesoAuditado: string;
  planAnualId: string;
  auditorLiderId: string;
  equipoIds?: string[];
  esTerritorial: boolean;
  territorialId?: string;
  fechaInicioPlaneacion?: Date;
}

export interface UpdateAuditoriaDTO {
  nombre?: string;
  procesoAuditado?: string;
  estado?: EstadoAuditoria;
  fechaInicioPlaneacion?: Date;
  fechaFinPlaneacion?: Date;
  fechaInicioEjecucion?: Date;
  fechaFinEjecucion?: Date;
  fechaInicioComunicacion?: Date;
  fechaFinComunicacion?: Date;
  planTrabajoAprobado?: boolean;
}

export interface CambiarEstadoAuditoriaDTO {
  auditoriaId: string;
  estadoActual: EstadoAuditoria;
  estadoNuevo: EstadoAuditoria;
  usuarioId: string;
  validaciones?: {
    equipoAsignado?: boolean;
    planTrabajoAprobado?: boolean;
    hallazgosRegistrados?: boolean;
    informeFinal?: boolean;
  };
}

export interface CreateHallazgoDTO {
  numero: number;
  tipo: TipoHallazgo;
  titulo: string;
  descripcion: string;
  criterio: string;
  causas?: string;
  auditoriaId: string;
}

export interface CreatePlanMejoramientoDTO {
  auditoriaId: string;
  areaAuditadaId: string;
  acciones: {
    descripcion: string;
    causasRaiz: string;
    accionMejora: string;
    soporteEvidencia: string;
    cantidadProgramada: number;
    fechaInicio: Date;
    fechaFin: Date;
    responsableId: string;
    hallazgoId: string;
  }[];
}

export interface CreateSeguimientoDTO {
  planMejoraId: string;
  numeroSeguimiento: number;
  mesSeguimiento: string;
  fechaCorte: Date;
}

export interface ValidarEvidenciaDTO {
  evidenciaId: string;
  calificacion: EstadoValidacion;
  comentariosAuditor?: string;
  solicitudNuevaEvidencia: boolean;
  validadoPorId: string;
}

// ============================================
// TIPOS AUXILIARES
// ============================================

export interface IndicadorPlanAnual {
  rolId: string;
  rolNumero: number;
  rolNombre: string;
  actividadesTotal: number;
  actividadesCompletadas: number;
  actividadesEnEjecucion: number;
  actividadesRetrasadas: number;
  porcentajeCumplimiento: number;
  semaforo: 'VERDE' | 'AMARILLO' | 'ROJO';
}

export interface KPIDashboard {
  porcentajeEjecucionPAI: number;
  auditoriasPorEstado: Record<EstadoAuditoria, number>;
  planesMejoraPorCumplimiento: {
    completos: number;
    parciales: number;
    pendientes: number;
  };
  informesLey: {
    cumplidos: number;
    pendientes: number;
    proximosVencer: number;
  };
}

export interface CronogramaAuditoria {
  planeacion: {
    duracionDias: number;
    fechaInicio?: Date;
    fechaFin?: Date;
  };
  ejecucion: {
    duracionDias: number;
    fechaInicio?: Date;
    fechaFin?: Date;
  };
  comunicacion: {
    duracionDias: number;
    fechaInicio?: Date;
    fechaFin?: Date;
  };
}

export interface FiltrosAuditoria {
  estado?: EstadoAuditoria[];
  tipo?: TipoAuditoria[];
  territorial?: string;
  auditorLider?: string;
  busqueda?: string;
  añoVigencia?: number;
}

export interface FiltroPlanMejoramiento {
  estado?: EstadoPlanMejora[];
  areaAuditada?: string;
  cumplimiento?: (0 | 1 | 2)[];
  fechaDesde?: Date;
  fechaHasta?: Date;
}

export interface AlertaSeguimiento {
  id: string;
  tipo: 'RECORDATORIO' | 'VENCIMIENTO' | 'ESCALAMIENTO';
  urgencia: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  mensaje: string;
  destinatarioId: string;
  seguimientoId?: string;
  planMejoraId?: string;
  fechaCreacion: Date;
  leida: boolean;
}

// ============================================
// TIPOS PARA COMPONENTES KANBAN
// ============================================

export interface TarjetaKanbanAuditoria {
  id: string;
  codigo: string;
  nombre: string;
  auditorLider: {
    id: string;
    nombre: string;
    apellido: string;
    avatar?: string;
  };
  equipo: {
    id: string;
    nombre: string;
    apellido: string;
    avatar?: string;
  }[];
  fechaInicio?: Date;
  fechaFin?: Date;
  progreso: number;
  alertas: {
    tipo: 'vencimiento' | 'pendiente' | 'aprobacion';
    mensaje: string;
  }[];
  hallazgosCount: number;
  documentosCount: number;
  estado: EstadoAuditoria;
  esTerritorial: boolean;
}

export interface ColumnaKanban {
  id: EstadoAuditoria;
  titulo: string;
  color: string;
  tarjetas: TarjetaKanbanAuditoria[];
  limite?: number;
}

// ============================================
// TIPOS PARA REPORTES
// ============================================

export interface ReportePAI {
  vigencia: number;
  estadoPlan: PlanEstado;
  totalActividades: number;
  actividadesCompletadas: number;
  porcentajeAvance: number;
  rolesDetalle: IndicadorPlanAnual[];
  auditoriasProgramadas: number;
  auditoriasEjecutadas: number;
}

export interface ReportePlanesMejora {
  periodo: string;
  totalPlanes: number;
  planesCerrados: number;
  planesEnSeguimiento: number;
  accionesPorCumplimiento: {
    completas: number;
    parciales: number;
    pendientes: number;
  };
  porcentajeCumplimientoGeneral: number;
  semaforo: 'VERDE' | 'AMARILLO' | 'ROJO';
}

export interface DatosSIRECI {
  vigencia: number;
  entidad: string;
  nit: string;
  totalAuditorias: number;
  auditoriasPorTipo: Record<TipoAuditoria, number>;
  hallazgosDetectados: number;
  planesMejoraFormulados: number;
  accionesImplementadas: number;
}

// ============================================
// EXPORTACIÓN DE TIPOS COMUNES
// ============================================

export type {
  // Re-export para facilitar imports
  Usuario as UsuarioOCIG,
  Auditoria as AuditoriaOCIG,
  PlanAnual as PlanAnualOCIG,
  PlanMejoramiento as PlanMejoramientoOCIG,
  Hallazgo as HallazgoOCIG
};

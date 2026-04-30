/**
 * TIPOS DE DATOS - MÓDULO CONTROL INTERNO
 * Tipos TypeScript compartidos para todo el módulo
 */

// ==================== AUDITORÍAS ====================

export type EstadoAuditoria = 'programada' | 'en-planeacion' | 'en-ejecucion' | 'en-comunicacion' | 'cerrada' | 'cancelada';
export type FaseAuditoria = 'planeacion' | 'en-curso' | 'revision' | 'completada';
export type TipoAuditoria = 'Gestión' | 'Cumplimiento' | 'Desempeño' | 'Sistemas' | 'Financiera' | 'Seguimiento';
export type PrioridadAuditoria = 'Alta' | 'Media' | 'Baja';

export interface Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoAuditoria;
  fase: FaseAuditoria;
  estado: EstadoAuditoria;
  
  // Ubicación
  territorial: string;
  sede: string;
  tipoSede: 'Sede Principal' | 'Territorial';
  
  // Asignación
  auditorLider: string;
  auditorLiderId?: string;
  equipoAuditor: string[];
  equipoAuditorIds?: string[];
  
  // Alcance y objetivos
  alcance: string;
  objetivos: string;
  riesgos: string;
  criteriosAuditoria: string[];
  normativaAplicable: string[];
  
  // Fechas
  fechaInicio: string;
  fechaFin: string;
  fechaCreacion: string;
  fechaActualizacion?: string;
  
  // Fechas por etapa
  fechasEtapa?: {
    planeacion: { inicio: string; fin: string; duracionDias: number };
    ejecucion: { inicio: string; fin: string; duracionDias: number };
    comunicacion: { inicio: string; fin: string; duracionDias: number };
  };
  
  // Fechas de etapa (planas para BD)
  fechaFinPlaneacion?: string;
  fechaInicioEjecucion?: string;
  fechaFinEjecucion?: string;
  fechaInicioComunicacion?: string;
  fechaFinComunicacion?: string;
  
  // Progreso
  progreso: number;
  prioridad: PrioridadAuditoria;
  
  // Relaciones
  procesoAuditableId?: string;
  programaAnualId?: string;
  
  // Hallazgos
  hallazgos: number;
  hallazgosIds?: string[];
  
  // Documentos generados
  documentosGenerados?: {
    anuncio: boolean;
    cartaRepresentacion: boolean;
    programaIndividual: boolean;
  };
  
  // Metadata
  observaciones: string;
  creadoPor?: string;
  actualizadoPor?: string;
}

// ==================== UNIVERSO DE AUDITORÍAS ====================

export type TipoProceso = 'Misional' | 'Apoyo' | 'Estratégico' | 'Evaluación';
export type ClasificacionRiesgo = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO';
export type EstadoProcesoAuditable = 'Evaluado' | 'Pendiente' | 'En Revisión';

export interface ProcesoAuditable {
  id: string;
  nombreProceso: string;
  tipoProceso: TipoProceso;
  tipoSede: 'Sede Principal' | 'Territorial';
  territorial?: string;
  macroproceso?: string;
  unidadesAuditables?: { id: string; nombre: string; descripcion?: string }[];
  responsableProceso: string;
  responsableProcesoId?: string;
  
  // Evaluación de Impacto (1-5)
  impactoFinanciero: number;
  impactoOperacional: number;
  impactoReputacional: number;
  impactoLegal: number;
  impactoEstrategico: number;
  
  // Evaluación de Probabilidad (1-5)
  probabilidadOcurrencia: number;
  
  // Resultados calculados
  impactoTotal: number;
  nivelRiesgo: number;
  clasificacionRiesgo: ClasificacionRiesgo;
  añoPriorizacion: string;
  
  // Información adicional
  ultimaAuditoria?: string;
  observaciones: string;
  estado: EstadoProcesoAuditable;
  fechaEvaluacion: string;
  
  // Metadata
  universoAnualId?: string;
  creadoPor?: string;
  actualizadoPor?: string;
}

export interface UniversoAuditorias {
  id: string;
  añoFiscal: number;
  version: string;
  fechaCreacion: string;
  fechaActualizacion?: string;
  responsable: string;
  responsableId?: string;
  estado: 'borrador' | 'aprobado' | 'vigente';
  procesos: ProcesoAuditable[];
  procesosIds?: string[];
}

// ==================== PROGRAMA ANUAL ====================

export type EstadoAuditoriaProgramada = 'Programada' | 'En Ejecución' | 'Completada' | 'Cancelada';

export interface AuditoriaProgramada {
  id: string;
  codigo: string;
  procesoAuditable: string;
  procesoAuditableId: string;
  tipoProceso: TipoProceso;
  tipoSede: 'Sede Principal' | 'Territorial';
  territorial?: string;
  nivelRiesgo: ClasificacionRiesgo;
  añoPriorizacion: string;
  
  // Asignación
  auditorLider?: string;
  auditorLiderId?: string;
  equipoAuditor?: string[];
  equipoAuditorIds?: string[];
  
  // Programación de fechas por etapa
  fechas: {
    planeacion: { inicio: string; fin: string; duracionDias: number };
    ejecucion: { inicio: string; fin: string; duracionDias: number };
    comunicacion: { inicio: string; fin: string; duracionDias: number };
  };
  
  estado: EstadoAuditoriaProgramada;
  observaciones: string;
  
  // Metadata
  programaAnualId?: string;
  creadoPor?: string;
  actualizadoPor?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface ProgramaAnual {
  id: string;
  añoFiscal: number;
  version: string;
  fechaCreacion: string;
  fechaActualizacion?: string;
  responsable: string;
  responsableId?: string;
  estado: 'borrador' | 'aprobado' | 'vigente';
  auditorias: AuditoriaProgramada[];
  auditoriasIds?: string[];
  universoAuditoriasId?: string;
}

// ==================== HALLAZGOS ====================

export type TipoHallazgo = 'No Conformidad' | 'Observación' | 'Oportunidad de Mejora' | 'Fortaleza';
export type GravedadHallazgo = 'Baja' | 'Media' | 'Alta' | 'Crítica';
export type EstadoHallazgo = 'abierto' | 'en-analisis' | 'en-plan-mejoramiento' | 'cerrado' | 'rechazado';

export interface Hallazgo {
  id: string;
  codigo: string;
  auditoriaId: string;
  auditoriaCodigo: string;
  
  tipo: TipoHallazgo;
  gravedad: GravedadHallazgo;
  estado: EstadoHallazgo;
  
  titulo: string;
  descripcion: string;
  criterioIncumplido: string;
  evidencia: string;
  causaRaiz: string;
  impacto: string;
  recomendacion: string;
  
  fechaIdentificacion: string;
  fechaCierre?: string;
  
  responsableArea: string;
  responsableAreaId?: string;
  
  planMejoramientoId?: string;
  
  // Metadata
  creadoPor?: string;
  actualizadoPor?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

// ==================== PLANES DE MEJORAMIENTO ====================

export type EstadoAccionMejoramiento = 'programada' | 'en-ejecucion' | 'completada' | 'vencida' | 'atrasada';

export interface AccionMejoramiento {
  id: string;
  planMejoramientoId: string;
  hallazgoId: string;
  
  descripcion: string;
  responsable: string;
  responsableId?: string;
  
  fechaInicio: string;
  fechaFin: string;
  fechaCumplimiento?: string;
  
  estado: EstadoAccionMejoramiento;
  porcentajeAvance: number;
  
  evidencias: string[];
  observaciones: string;
  
  // Metadata
  creadoPor?: string;
  actualizadoPor?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface PlanMejoramiento {
  id: string;
  codigo: string;
  nombre: string;
  
  auditoriaId: string;
  auditoriaCodigo: string;
  
  hallazgosIds: string[];
  acciones: AccionMejoramiento[];
  accionesIds?: string[];
  
  responsable: string;
  responsableId?: string;
  
  fechaElaboracion: string;
  fechaAprobacion?: string;
  
  estado: 'borrador' | 'aprobado' | 'en-ejecucion' | 'cerrado';
  porcentajeAvanceGeneral: number;
  
  observaciones: string;
  
  // Metadata
  creadoPor?: string;
  actualizadoPor?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

// ==================== PLAN ANUAL (5 ROLES) ====================

export type EstadoActividad = 'pendiente' | 'en-progreso' | 'completada' | 'retrasada';
export type PrioridadActividad = 'Alta' | 'Media' | 'Baja';

export interface Actividad {
  id: string;
  rolId: number;
  nombre: string;
  descripcion: string;
  responsable: string;
  responsableId?: string;
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoActividad;
  porcentajeAvance: number;
  observaciones: string;
  prioridad: PrioridadActividad;
  
  // Metadata
  planAnualId?: string;
  creadoPor?: string;
  actualizadoPor?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  color: string;
  actividades: Actividad[];
  actividadesIds?: string[];
  porcentajeCumplimiento: number;
}

export interface PlanAnual5Roles {
  id: string;
  añoFiscal: number;
  fechaCreacion: string;
  fechaActualizacion?: string;
  responsable: string;
  responsableId?: string;
  estado: 'borrador' | 'aprobado' | 'en-ejecucion' | 'completado';
  roles: Rol[];
}

// ==================== LISTAS DE CHEQUEO ====================

export type RespuestaListaChequeo = 'cumple' | 'no-cumple' | 'no-aplica';
export type EstadoListaChequeo = 'borrador' | 'activa' | 'archivada';

export interface ItemListaChequeo {
  id: string;
  seccionId: string;
  orden: number;
  criterio: string;
  esObligatorio: boolean;
  esCritico: boolean;
  referenciaNormativa?: string;
  
  // Respuesta
  respuesta?: RespuestaListaChequeo;
  observaciones?: string;
  evidencia?: string;
  
  // Metadata
  creadoPor?: string;
  actualizadoPor?: string;
}

export interface SeccionListaChequeo {
  id: string;
  listaChequeoId: string;
  nombre: string;
  orden: number;
  items: ItemListaChequeo[];
  itemsIds?: string[];
}

export interface ListaChequeo {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  
  auditoriaId?: string;
  
  secciones: SeccionListaChequeo[];
  seccionesIds?: string[];
  
  estado: EstadoListaChequeo;
  
  // Estadísticas
  totalItems: number;
  itemsCumple: number;
  itemsNoCumple: number;
  itemsNoAplica: number;
  porcentajeCumplimiento: number;
  
  // Metadata
  creadoPor?: string;
  actualizadoPor?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

// ==================== INFORMES DE LEY ====================

export type EstadoEntregaInforme = 'pendiente' | 'en-proceso' | 'entregado' | 'vencido' | 'rechazado';
export type PeriodicidadInforme = 'mensual' | 'bimestral' | 'trimestral' | 'cuatrimestral' | 'semestral' | 'anual';

export interface EntregaInforme {
  id: string;
  informeLeyId: string;
  periodo: string;
  fechaVencimiento: string;
  fechaEntrega?: string;
  estado: EstadoEntregaInforme;
  archivoUrl?: string;
  observaciones: string;
  
  // Metadata
  creadoPor?: string;
  actualizadoPor?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface InformeLey {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  periodicidad: PeriodicidadInforme;
  descripcion: string;
  fundamentoLegal: string;
  
  responsable: string;
  responsableId?: string;
  
  diasAnticipacion: number;
  
  entregas: EntregaInforme[];
  entregasIds?: string[];
  
  activo: boolean;
  
  // Metadata
  creadoPor?: string;
  actualizadoPor?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

// ==================== RESPUESTAS API ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== FILTROS Y QUERIES ====================

export interface AuditoriaFilters {
  tipo?: TipoAuditoria;
  fase?: FaseAuditoria;
  estado?: EstadoAuditoria;
  territorial?: string;
  auditorLider?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  prioridad?: PrioridadAuditoria;
  search?: string;
}

export interface HallazgoFilters {
  tipo?: TipoHallazgo;
  gravedad?: GravedadHallazgo;
  estado?: EstadoHallazgo;
  auditoriaId?: string;
  responsableArea?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  search?: string;
}

export interface PlanMejoramientoFilters {
  estado?: 'borrador' | 'aprobado' | 'en-ejecucion' | 'cerrado';
  responsable?: string;
  auditoriaId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  search?: string;
}

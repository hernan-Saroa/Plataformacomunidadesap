/**
 * Tipos TypeScript - Módulo de Control Interno
 * 
 * Estos tipos deben coincidir exactamente con los modelos del backend
 * para garantizar type-safety en toda la aplicación
 */

// ============================================================================
// RESPUESTAS PAGINADAS
// ============================================================================

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp: string;
}

// ============================================================================
// DASHBOARD Y ESTADÍSTICAS
// ============================================================================

export interface DashboardControlInterno {
  estadisticas: {
    auditoriasEnCurso: number;
    auditoriasCompletadas: number;
    hallazgosAbiertos: number;
    hallazgosCerrados: number;
    planesMejoramientoActivos: number;
    planesMejoramientoCompletados: number;
    cumplimientoPlanAnual: number;
  };
  auditorias: {
    enCurso: AuditoriaResumen[];
    proximas: AuditoriaResumen[];
    alertas: AuditoriaAlerta[];
  };
  hallazgos: {
    recientes: HallazgoResumen[];
    criticos: HallazgoResumen[];
    porTipo: Record<string, number>;
    porEstado: Record<string, number>;
  };
  planesMejoramiento: {
    conAlertas: PlanMejoramientoAlerta[];
    vencidos: PlanMejoramientoAlerta[];
    enSeguimiento: number;
  };
  aprobacionesPendientes: AprobacionPendiente[];
}

export interface EstadisticasControlInterno {
  periodo: string;
  territorial?: string;
  metricas: {
    totalAuditorias: number;
    totalHallazgos: number;
    totalPlanesMejoramiento: number;
    tasaCumplimiento: number;
    tasaEfectividad: number;
  };
  tendencias: {
    auditoriasPorMes: Record<string, number>;
    hallazgosPorMes: Record<string, number>;
    cumplimientoPorMes: Record<string, number>;
  };
}

// ============================================================================
// PLAN ANUAL DE AUDITORÍA
// ============================================================================

export interface PlanAnualAuditoria {
  id: string;
  year: number;
  version: string;
  estado: 'borrador' | 'revision' | 'aprobado' | 'en_ejecucion' | 'completado';
  fechaCreacion: string;
  fechaAprobacion?: string;
  aprobadoPor?: string;
  auditorias: AuditoriaPlaneada[];
  observaciones?: string;
  cumplimiento: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditoriaPlaneada {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'gestion' | 'cumplimiento' | 'financiera' | 'tic' | 'desempeno';
  alcance: string;
  procesoAuditar: string;
  auditorLider: string;
  equipoAuditor: string[];
  fechaInicioPlaneada: string;
  fechaFinPlaneada: string;
  duracionDias: number;
  prioridad: 'alta' | 'media' | 'baja';
  riesgoInherente: 'alto' | 'medio' | 'bajo';
  estado: 'planeada' | 'en_curso' | 'completada' | 'cancelada';
}

export interface CreatePlanAnualRequest {
  year: number;
  version?: string;
  auditorias: Omit<AuditoriaPlaneada, 'id' | 'estado'>[];
  observaciones?: string;
}

export interface UpdatePlanAnualRequest {
  version?: string;
  auditorias?: AuditoriaPlaneada[];
  observaciones?: string;
  estado?: string;
}

// ============================================================================
// AUDITORÍAS
// ============================================================================

export interface Auditoria {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'gestion' | 'cumplimiento' | 'financiera' | 'tic' | 'desempeno';
  estado: 'planeacion' | 'ejecucion' | 'informe' | 'seguimiento' | 'cerrada';
  procesoAuditado: string;
  alcance: string;
  objetivo: string;
  auditorLider: string;
  equipoAuditor: string[];
  areaAuditada: string;
  fechaInicio: string;
  fechaFin?: string;
  fechaLimite: string;
  progreso: number;
  metodologia: 'DAFP' | 'P-E-C' | 'Decreto_648' | 'Otra';
  riesgoInherente: 'alto' | 'medio' | 'bajo';
  prioridad: 'alta' | 'media' | 'baja';
  hallazgosCount: number;
  evidenciasCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditoriaDetalle extends Auditoria {
  descripcion: string;
  normativaAplicable: string[];
  criteriosAuditoria: string[];
  tecnicasAuditoria: string[];
  cronograma: ActividadAuditoria[];
  hallazgos: Hallazgo[];
  evidencias: Evidencia[];
  observaciones?: string;
  conclusiones?: string;
  recomendaciones?: string;
}

export interface ActividadAuditoria {
  id: string;
  nombre: string;
  descripcion: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'pendiente' | 'en_progreso' | 'completada';
  progreso: number;
}

export interface Evidencia {
  id: string;
  tipo: 'documento' | 'foto' | 'video' | 'registro';
  nombre: string;
  descripcion?: string;
  archivo: string;
  url: string;
  fechaCarga: string;
  cargadoPor: string;
  tamano: number;
}

export interface AuditoriaResumen {
  id: string;
  codigo: string;
  nombre: string;
  proceso: string;
  estado: string;
  auditorLider: string;
  fechaInicio: string;
  progreso: number;
}

export interface AuditoriaAlerta {
  id: string;
  auditoria: string;
  tipo: 'vencimiento' | 'retraso' | 'sin_avance';
  mensaje: string;
  prioridad: 'alta' | 'media' | 'baja';
  diasRestantes?: number;
}

export interface CreateAuditoriaRequest {
  codigo: string;
  nombre: string;
  tipo: string;
  procesoAuditado: string;
  alcance: string;
  objetivo: string;
  auditorLider: string;
  equipoAuditor: string[];
  areaAuditada: string;
  fechaInicio: string;
  fechaLimite: string;
  metodologia: string;
  riesgoInherente: string;
  prioridad: string;
  descripcion?: string;
  normativaAplicable?: string[];
  criteriosAuditoria?: string[];
}

export interface UpdateAuditoriaRequest extends Partial<CreateAuditoriaRequest> {
  estado?: string;
  progreso?: number;
  conclusiones?: string;
  recomendaciones?: string;
}

// ============================================================================
// HALLAZGOS
// ============================================================================

export interface Hallazgo {
  id: string;
  codigo: string;
  auditoriaId: string;
  auditoriaCodigo: string;
  auditoriaNombre: string;
  titulo: string;
  tipo: 'no_conformidad_mayor' | 'no_conformidad_menor' | 'observacion' | 'oportunidad_mejora';
  clasificacion: 'administrativo' | 'operativo' | 'financiero' | 'tecnologico' | 'legal';
  estado: 'abierto' | 'en_plan_mejoramiento' | 'en_seguimiento' | 'cerrado';
  criticidad: 'critica' | 'alta' | 'media' | 'baja';
  procesoAfectado: string;
  areaResponsable: string;
  responsable: string;
  descripcion: string;
  causaRaiz?: string;
  impacto?: string;
  normativaIncumplida?: string[];
  fechaDeteccion: string;
  fechaLimiteRespuesta?: string;
  plazoImplementacion?: number;
  evidenciasCount: number;
  comentariosCount: number;
  planMejoramientoId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HallazgoDetalle extends Hallazgo {
  criterioAuditoria: string;
  condicion: string;
  riesgoAsociado: string;
  recomendaciones: string[];
  evidencias: Evidencia[];
  comentarios: ComentarioHallazgo[];
  seguimiento?: SeguimientoHallazgo[];
  planMejoramiento?: PlanMejoramiento;
}

export interface ComentarioHallazgo {
  id: string;
  hallazgoId: string;
  autor: string;
  autorNombre: string;
  contenido: string;
  tipo: 'comentario' | 'respuesta' | 'aclaracion';
  fechaCreacion: string;
}

export interface HallazgoResumen {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  criticidad: string;
  estado: string;
  areaResponsable: string;
  fechaDeteccion: string;
}

export interface CreateHallazgoRequest {
  auditoriaId: string;
  codigo: string;
  titulo: string;
  tipo: string;
  clasificacion: string;
  criticidad: string;
  procesoAfectado: string;
  areaResponsable: string;
  responsable: string;
  descripcion: string;
  criterioAuditoria: string;
  condicion: string;
  causaRaiz?: string;
  impacto?: string;
  riesgoAsociado?: string;
  normativaIncumplida?: string[];
  recomendaciones?: string[];
  fechaLimiteRespuesta?: string;
  plazoImplementacion?: number;
}

export interface UpdateHallazgoRequest extends Partial<CreateHallazgoRequest> {
  estado?: string;
}

// ============================================================================
// PLANES DE MEJORAMIENTO
// ============================================================================

export interface PlanMejoramiento {
  id: string;
  codigo: string;
  hallazgoId: string;
  hallazgoCodigo: string;
  auditoriaId: string;
  titulo: string;
  descripcion: string;
  objetivos: string[];
  areaResponsable: string;
  responsableImplementacion: string;
  estado: 'borrador' | 'revision' | 'aprobado' | 'en_ejecucion' | 'completado' | 'vencido';
  fechaCreacion: string;
  fechaAprobacion?: string;
  fechaInicioEjecucion?: string;
  fechaLimite: string;
  fechaCierre?: string;
  acciones: AccionMejora[];
  recursos: RecursoNecesario[];
  indicadores: IndicadorSeguimiento[];
  avanceGlobal: number;
  aprobadoPor?: string;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccionMejora {
  id: string;
  planMejoramientoId: string;
  numero: number;
  descripcion: string;
  tipo: 'correctiva' | 'preventiva' | 'mejora';
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'vencida';
  avance: number;
  evidencias: Evidencia[];
  observaciones?: string;
}

export interface RecursoNecesario {
  id: string;
  tipo: 'humano' | 'tecnologico' | 'financiero' | 'material';
  descripcion: string;
  cantidad?: number;
  costo?: number;
  aprobado: boolean;
}

export interface IndicadorSeguimiento {
  id: string;
  nombre: string;
  descripcion: string;
  meta: number;
  valorActual: number;
  unidadMedida: string;
  frecuenciaMedicion: string;
}

export interface PlanMejoramientoAlerta {
  id: string;
  codigo: string;
  area: string;
  auditoria: string;
  accionesVencidas: number;
  accionesTotales: number;
  responsable: string;
  diasVencido?: number;
}

export interface CreatePlanMejoramientoRequest {
  hallazgoId: string;
  codigo?: string;
  titulo: string;
  descripcion: string;
  objetivos: string[];
  areaResponsable: string;
  responsableImplementacion: string;
  fechaLimite: string;
  acciones: Omit<AccionMejora, 'id' | 'planMejoramientoId' | 'evidencias'>[];
  recursos?: Omit<RecursoNecesario, 'id'>[];
  indicadores?: Omit<IndicadorSeguimiento, 'id' | 'valorActual'>[];
}

export interface UpdatePlanMejoramientoRequest extends Partial<CreatePlanMejoramientoRequest> {
  estado?: string;
  avanceGlobal?: number;
  observaciones?: string;
}

export interface AvancePlanMejoramiento {
  planMejoramientoId: string;
  fecha: string;
  avanceGlobal: number;
  accionesCompletadas: number;
  accionesTotales: number;
  observaciones?: string;
  registradoPor: string;
}

// ============================================================================
// LISTAS DE CHEQUEO
// ============================================================================

export interface ListaChequeo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: 'cumplimiento' | 'proceso' | 'sistema' | 'procedimiento';
  categoria: string;
  version: string;
  estado: 'activa' | 'inactiva' | 'obsoleta';
  items: ItemListaChequeo[];
  aplicablePara: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItemListaChequeo {
  id: string;
  numero: number;
  pregunta: string;
  criterio: string;
  normativaReferencia?: string;
  tipoRespuesta: 'si_no' | 'cumple_no_cumple' | 'texto' | 'numerico';
  obligatorio: boolean;
  pesoCalificacion?: number;
  evidenciaRequerida: boolean;
}

export interface CreateListaChequeoRequest {
  codigo?: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  categoria: string;
  version?: string;
  items: Omit<ItemListaChequeo, 'id'>[];
  aplicablePara?: string[];
}

// ============================================================================
// UNIVERSO DE AUDITORÍAS
// ============================================================================

export interface UniversoAuditorias {
  id: string;
  year: number;
  version: string;
  procesos: ProcesoAuditable[];
  totalProcesos: number;
  procesosAuditar: number;
  cobertura: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProcesoAuditable {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: 'estrategico' | 'misional' | 'apoyo' | 'evaluacion';
  macroproceso: string;
  responsable: string;
  dependencia: string;
  evaluacionRiesgo: EvaluacionRiesgo;
  frecuenciaAuditoria: string;
  ultimaAuditoria?: string;
  proximaAuditoria?: string;
  prioridad: number;
  // ✅ Campos de evaluación DAFP para el formulario
  evaluacionInicial?: EvaluacionInicial;
  evaluacionDafp?: EvaluacionDafpCompleta;
  auditable?: boolean;
}

// ✅ Tipos para evaluación inicial (metodología Decreto 648)
export interface EvaluacionInicial {
  p1_cambiosNormativos: number;
  p2_cambiosEstructurales: number;
  p3_antecedentes: number;
  p4_criticidad: number;
  p5_presupuesto: number;
  p6_impactoReputacional: number;
  p7_interes: number;
  scoreRiesgo: number;
  nivelRiesgo: string;
  frecuenciaSugerida: string;
  horasEstimadas: number;
  fechaEvaluacion: string;
}

// ✅ Tipos para evaluación DAFP completa
export interface EvaluacionDafpCompleta {
  riesgosExtremos: number;
  riesgosAltos: number;
  riesgosModerados: number;
  riesgosBajos: number;
  totalRiesgos: number;
  requerimientoComite: boolean;
  requerimientoEntesReg: boolean;
  fechaUltimaAuditoria?: string;
  resultadoUltimaAuditoria: string;
  ponderacionRiesgo?: string;
  decisionFinal?: string;
  motivoDecision?: string;
  prioridadRegla?: number;
  observaciones?: string;
}

export interface EvaluacionRiesgo {
  procesoId: string;
  impacto: number; // 1-5
  probabilidad: number; // 1-5
  nivelRiesgo: 'critico' | 'alto' | 'medio' | 'bajo';
  valorRiesgo: number; // impacto * probabilidad
  controles: {
    preventivos: number;
    detectivos: number;
    correctivos: number;
  };
  madurezControl: 'inicial' | 'repetible' | 'definido' | 'gestionado' | 'optimizado';
  factoresRiesgo: string[];
  fechaEvaluacion: string;
  evaluadoPor: string;
}

// ============================================================================
// SEGUIMIENTO
// ============================================================================

export interface SeguimientoHallazgo {
  id: string;
  hallazgoId: string;
  fecha: string;
  estado: string;
  avance: number;
  observaciones: string;
  evidencias: Evidencia[];
  registradoPor: string;
  registradoPorNombre: string;
}

// ============================================================================
// APROBACIONES PENDIENTES
// ============================================================================

export interface AprobacionPendiente {
  id: string;
  tipo: 'plan-anual' | 'plan-mejoramiento' | 'informe-auditoria';
  titulo: string;
  solicitante: string;
  area: string;
  fechaSolicitud: string;
  diasPendientes: number;
  prioridad: 'alta' | 'media' | 'baja';
}

// ============================================================================
// REPORTES
// ============================================================================

export interface ReporteAuditoriaParams {
  auditoriaId: string;
  incluirHallazgos?: boolean;
  incluirEvidencias?: boolean;
  incluirPlanesMejoramiento?: boolean;
  formato?: 'pdf' | 'excel' | 'word';
}

export interface ReporteHallazgosParams {
  fechaInicio?: string;
  fechaFin?: string;
  tipo?: string;
  criticidad?: string;
  estado?: string;
  areaResponsable?: string;
  formato?: 'pdf' | 'excel';
}

// ============================================================================
// FILTROS
// ============================================================================

export interface FiltrosControlInterno {
  page?: number;
  pageSize?: number;
  search?: string;
  estado?: string;
  tipo?: string;
  criticidad?: string;
  fechaInicio?: string;
  fechaFin?: string;
  auditorLider?: string;
  areaResponsable?: string;
  territorial?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}
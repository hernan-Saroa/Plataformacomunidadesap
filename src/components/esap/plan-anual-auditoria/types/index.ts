/**
 * ============================================
 * INDEX - TYPES DEL MÓDULO PAI
 * ============================================
 * 
 * Exportación centralizada de todos los types
 * oficiales del Plan Anual de Auditoría
 * 
 * ÚLTIMA ACTUALIZACIÓN: 31 Enero 2026
 */

// ============================================
// PLAN ANUAL (Principal)
// ============================================
export type {
  // Estados
  EstadoPAI,
  HistorialEstado,
  
  // Personas
  PersonaOCI,
  JefeOCI,
  
  // Datos generales
  DatosGeneralesPAI,
  
  // Actividades y Roles
  ActividadPAI,
  RolPAI,
  EstadoActividadPAI,
  EstadoRolPAI,
  EvidenciaActividad,
  SeguimientoRealizado,
  
  // Validaciones
  ValidacionDecreto648,
  ValidacionError,
  ValidacionAdvertencia,
  
  // Estadísticas
  EstadisticasPAI,
  EstadisticaRol,
  
  // Modificaciones
  ModificacionPAI,
  TipoModificacion,
  CambioPAI,
  
  // Plan Anual (principal)
  PlanAnualAuditoria,
  MetadataPAI,
  
  // Filtros y búsqueda
  FiltrosPAI,
  ResultadoBusquedaPAI,
  
  // Exportación
  OpcionesExportacionPAI,
  FormatoExportacion,
  
  // Reportes
  ReportePAI,
  TipoReporte,
  
  // Helpers
  CrearPAIInput,
  ActualizarActividadInput,
  AgregarSeguimientoInput,
  ModificarPAIInput
} from './planAnual.types';

// Guards del Plan Anual
export {
  isPAIAprobado,
  isPAIModificable,
  isPAIEnEjecucion,
  isActividadCompletada,
  isActividadRetrasada,
  VALIDACION_PAI
} from './planAnual.types';

// ============================================
// UNIVERSO AUDITABLE
// ============================================
export type {
  // Clasificación
  TipoUnidadAuditable,
  CategoriaRiesgo,
  
  // Unidad Auditable
  UnidadAuditable,
  ResponsableUnidad,
  ActivosUnidad,
  
  // Auditoría histórica
  AuditoriaHistorico,
  TipoAuditoria,
  ResultadoAuditoria,
  EstadoPlanMejoramiento,
  FrecuenciaAuditoria,
  
  // Universo completo
  UniversoAuditable,
  ClasificacionUnidades,
  ClasificacionRiesgo,
  EstadisticasUniverso,
  
  // Matriz de cobertura
  MatrizCobertura,
  
  // Helpers
  CrearUnidadAuditableInput,
  ActualizarUnidadAuditableInput,
  FiltrosUnidadAuditable,
  
  // Análisis
  AnalisisUniversoAuditable
} from './universoAuditable.types';

// Guards del Universo Auditable
export {
  esUnidadCritica,
  requiereAuditoriaPronto,
  tieneHallazgosPendientes
} from './universoAuditable.types';

// ============================================
// EVALUACIÓN DE RIESGOS DAFP
// ============================================
export type {
  // Escala
  EscalaDAFP,
  
  // Criterios DAFP
  MaterialidadDAFP,
  ImpactoDAFP,
  VulnerabilidadDAFP,
  ReincidenciaDAFP,
  
  // Controles
  ControlInterno,
  IncidentePrevio,
  EvaluacionControles,
  
  // Hallazgos
  HallazgoAnterior,
  TipoHallazgo,
  SeveridadHallazgo,
  
  // Evaluación completa
  EvaluacionRiesgoDAFP,
  CategoriaRiesgoDAFP,
  RecomendacionAuditoria,
  
  // Riesgos identificados
  RiesgoIdentificado,
  TratamientoRiesgo,
  CategoriaRiesgo as CategoriaRiesgoGeneral,
  
  // Matriz de riesgos
  MatrizRiesgos,
  CoberturaRecomendada,
  
  // Helpers
  CrearEvaluacionRiesgoInput,
  
  // Reportes
  ReporteEvaluacionRiesgos
} from './riesgos.types';

// Funciones de cálculo DAFP
export {
  PONDERACIONES_DAFP,
  calcularPuntajeDAFP,
  determinarCategoriaRiesgo,
  generarRecomendacionAuditoria,
  validarEvaluacionDAFP
} from './riesgos.types';

// ============================================
// RECURSOS OCI Y AUDITORÍAS
// ============================================
export type {
  // Recursos humanos
  AuditorOCI,
  Certificacion,
  EspecializacionAuditoria,
  
  // Recursos generales
  RecursosOCI,
  DistribucionPresupuesto,
  HerramientaTecnologica,
  Sistema,
  PlanCapacitacion,
  CursoCapacitacion,
  
  // Auditorías programadas
  AuditoriaProgramada,
  TipoAuditoriaProgramada,
  CategoriaRiesgoAuditoria,
  EstadoAuditoria,
  
  // Hallazgos
  Hallazgo,
  EstadoHallazgo,
  
  // Documentos
  DocumentoAuditoria,
  TipoDocumentoAuditoria,
  
  // Cronograma
  CronogramaAnualAuditorias,
  DistribucionMensual,
  DistribucionTrimestral,
  EstadoCronograma,
  
  // Informes de ley
  InformeLey,
  PeriodicidadInforme,
  DestinatarioInforme,
  EstadoEntregaInforme,
  EstadoInforme,
  
  // Calendario
  CalendarioInformesLey,
  ProximoVencimiento,
  
  // Helpers
  CrearAuditoriaInput,
  ActualizarEstadoAuditoriaInput,
  RegistrarHallazgoInput
} from './recursos.types';

// Guards de Recursos y Auditorías
export {
  esAuditoriaRetrasada,
  esInformeVencido,
  calcularDiasParaVencimiento
} from './recursos.types';

// ============================================
// CONSTANTES OFICIALES
// ============================================
export type {
  ActividadOficial,
  RolOficial
} from '../constants/rolesDecreto648Oficial';

export {
  ROL_1_LIDERAZGO_ESTRATEGICO,
  ROL_2_ENFOQUE_PREVENCION,
  ROL_3_RELACION_ENTES_CONTROL,
  ROL_4_EVALUACION_RIESGOS,
  ROL_5_EVALUACION_SEGUIMIENTO,
  ROLES_DECRETO_648_OFICIALES,
  validarRolesCompletos,
  obtenerRolPorNumero,
  obtenerActividadPorId,
  obtenerEstadisticasRolesOficiales
} from '../constants/rolesDecreto648Oficial';

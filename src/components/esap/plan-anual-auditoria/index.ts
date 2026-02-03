/**
 * ============================================
 * INDEX - MÓDULO PAI
 * ============================================
 * 
 * Exportación centralizada del módulo completo
 * Plan Anual de Auditoría Interna (PAI)
 * 
 * USO:
 * ```typescript
 * import { PlanAnualAuditoriaModule } from '@/components/esap/plan-anual-auditoria';
 * ```
 * 
 * ÚLTIMA ACTUALIZACIÓN: 31 Enero 2026
 */

// ============================================
// MÓDULO PRINCIPAL
// ============================================
export { PlanAnualAuditoriaModule } from './PlanAnualAuditoriaModule';
export { default } from './PlanAnualAuditoriaModule';

// ============================================
// COMPONENTES
// ============================================
export { DashboardPAI } from './components/DashboardPAI';

// ============================================
// TYPES
// ============================================
export type {
  // Plan Anual
  PlanAnualAuditoria,
  EstadoPAI,
  DatosGeneralesPAI,
  ActividadPAI,
  RolPAI,
  ValidacionDecreto648,
  EstadisticasPAI,
  ModificacionPAI,
  MetadataPAI,
  FiltrosPAI,
  OpcionesExportacionPAI,
  FormatoExportacion,
  
  // Universo Auditable
  UnidadAuditable,
  UniversoAuditable,
  TipoUnidadAuditable,
  CategoriaRiesgo,
  MatrizCobertura,
  
  // Evaluación de Riesgos DAFP
  EvaluacionRiesgoDAFP,
  EscalaDAFP,
  MaterialidadDAFP,
  ImpactoDAFP,
  VulnerabilidadDAFP,
  ReincidenciaDAFP,
  CategoriaRiesgoDAFP,
  RecomendacionAuditoria,
  MatrizRiesgos,
  
  // Recursos y Auditorías
  RecursosOCI,
  AuditorOCI,
  AuditoriaProgramada,
  TipoAuditoriaProgramada,
  EstadoAuditoria,
  Hallazgo,
  CronogramaAnualAuditorias,
  InformeLey,
  CalendarioInformesLey,
  ProximoVencimiento,
  
  // Roles Decreto 648
  ActividadOficial,
  RolOficial
} from './types';

// ============================================
// CONSTANTES
// ============================================
export {
  ROLES_DECRETO_648_OFICIALES,
  ROL_1_LIDERAZGO_ESTRATEGICO,
  ROL_2_ENFOQUE_PREVENCION,
  ROL_3_RELACION_ENTES_CONTROL,
  ROL_4_EVALUACION_RIESGOS,
  ROL_5_EVALUACION_SEGUIMIENTO,
  validarRolesCompletos,
  obtenerRolPorNumero,
  obtenerActividadPorId,
  obtenerEstadisticasRolesOficiales
} from './constants/rolesDecreto648Oficial';

// ============================================
// FUNCIONES DE CÁLCULO DAFP
// ============================================
export {
  PONDERACIONES_DAFP,
  calcularPuntajeDAFP,
  determinarCategoriaRiesgo,
  generarRecomendacionAuditoria,
  validarEvaluacionDAFP
} from './types/riesgos.types';

// ============================================
// TYPE GUARDS
// ============================================
export {
  isPAIAprobado,
  isPAIModificable,
  isPAIEnEjecucion,
  isActividadCompletada,
  isActividadRetrasada,
  esUnidadCritica,
  requiereAuditoriaPronto,
  tieneHallazgosPendientes,
  esAuditoriaRetrasada,
  esInformeVencido,
  calcularDiasParaVencimiento
} from './types';

// ============================================
// METADATA DEL MÓDULO
// ============================================
export const MODULE_PAI_INFO = {
  nombre: 'Plan Anual de Auditoría Interna',
  codigo: 'PAI',
  version: '1.0.0',
  descripcion: 'Módulo independiente para gestión del Plan Anual de Auditoría Interna (PAI) cumpliendo con Decreto 648/2017 y formato oficial EMFO001',
  
  caracteristicas: [
    'Cumplimiento 100% Decreto 648/2017',
    '5 roles obligatorios y 22 actividades fijas',
    'Metodología DAFP para evaluación de riesgos',
    'Formato oficial EMFO001 PAI 2025 V.6',
    '28 informes de ley integrados',
    'Exportación a Excel/PDF/Word oficial',
    'Wizard de creación paso a paso',
    'Dashboard ejecutivo con KPIs',
    'Cronograma anual de auditorías',
    'Gestión de recursos OCI',
    'Integración con sistema de notificaciones'
  ],
  
  normatividad: [
    'Decreto 648 de 2017 - Roles y funciones OCI',
    'Ley 87 de 1993 - Sistema de Control Interno',
    'Guía DAFP - Rol de las OCI',
    'Guía DAFP - Administración del Riesgo',
    'Formato EMFO001 PAI 2025 V.6 - ESAP'
  ],
  
  autor: 'ESAP - Oficina de Control Interno',
  fechaCreacion: '2026-01-31',
  licencia: 'Uso interno ESAP'
} as const;

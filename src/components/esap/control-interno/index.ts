/**
 * CONTROL INTERNO DE GESTIÓN - Exportaciones Optimizadas
 * ✅ Solo incluye módulos que realmente existen
 */

// ⭐ MÓDULO PRINCIPAL
export { ControlInternoFull } from './ControlInternoFull';

// ⭐ COMPONENTES DE UI
export { HeaderModulOCIG } from './HeaderModuloCIG';

// ⭐ MÓDULOS PRINCIPALES
export { PlanificacionModuleRediseno } from './PlanificacionModuleRediseno';
export { PlanesMejoramientoModuleRediseno } from './PlanesMejoramientoModuleRediseno';
export { ExpedientesModulePremium } from './ExpedientesModulePremium';
export { ConfiguracionesModulePremium } from './ConfiguracionesModulePremium';

// ⭐ PLAN ANUAL
export { PlanAnualAuditoriaDefinitivo } from './PlanAnualAuditoriaDefinitivo';
export { PlanAnualRol4Integrado } from './PlanAnualRol4Integrado';
export { ProgramaAnualOCIG } from './ProgramaAnualOCIG';

// ⭐ UNIVERSO AUDITABLE
export { UniversoAuditableUnificado } from './UniversoAuditableUnificado';
export { UniversoAuditorias } from './UniversoAuditorias';

// ⭐ DASHBOARDS Y KANBAN
export { GestionAuditoriasKanbanSimple } from './GestionAuditoriasKanbanSimple';

// ⭐ FORMULARIOS Y WIZARDS
export { FormularioAuditoriaUnificado } from './FormularioAuditoriaUnificado';
export { FormularioNuevaAuditoria } from './FormularioNuevaAuditoria';
export { InicioAuditoriaWizardWorldClass } from './InicioAuditoriaWizardWorldClass';
export { WizardAuditoriaEspecial } from './WizardAuditoriaEspecial';
export { WizardAuditoriaTerritorial } from './WizardAuditoriaTerritorial';

// ⭐ EXPEDIENTES Y DETALLES
export { ExpedienteAuditoriaCompleto } from './ExpedienteAuditoriaCompleto';
export { ModalDetalleAuditoriaCompleto } from './ModalDetalleAuditoriaCompleto';

// ⭐ HALLAZGOS Y MEJORAMIENTO
export { HallazgosYMejoramientoCompleto } from './HallazgosYMejoramientoCompleto';
export { FormulacionPlanMejoramientoModule } from './FormulacionPlanMejoramientoModule';
export { SeguimientoPlanMejoramientoModule } from './SeguimientoPlanMejoramientoModule';
export { ModalDetallePlanMejoramiento } from './ModalDetallePlanMejoramiento';

// ⭐ ROLES Y PERMISOS
export { RolesYPermisosModulePremium } from './RolesYPermisosModulePremium';

// ⭐ LISTAS DE CHEQUEO
export { ListasChequeoModule } from './listas-chequeo/ListasChequeoModuleComplete';

// ⭐ AUDITORÍA DE CAMBIOS
export { AuditoriaCambiosModule } from './AuditoriaCambiosModule';

// ⭐ OTROS MÓDULOS
export { ProcesoAuditoriaModule } from './ProcesoAuditoriaModule';
export { PlaneacionAuditoriaModule } from './PlaneacionAuditoriaModule';
export { EjecucionAuditoriaModule } from './EjecucionAuditoriaModule';
export { ComunicacionAuditoriaModule } from './ComunicacionAuditoriaModule';
export { GestionDocumentalModule } from './GestionDocumentalModule';
export { NotificacionesModule } from './NotificacionesModule';
export { InformesYDocumentalCompleto } from './InformesYDocumentalCompleto';
export { CronogramaAuditoriasPremium } from './CronogramaAuditoriasPremium';

// ⭐ PORTALES
export { PortalTransaccionalUsuarioMD3 } from './PortalTransaccionalUsuarioMD3';
export { PortalUsuarioAuditado } from './PortalUsuarioAuditado';

// ⭐ CONTEXT Y HOOKS
export { ControlInternoProvider, useControlInterno } from './ControlInternoContext';
export { useAuditLog } from './hooks/useAuditLog';
export { auditLogService } from './services/auditLogService';
export type { AuditLog, TipoAccion, TipoEntidad } from './services/auditLogService';

// ⭐ COMPONENTS
export * from './components';
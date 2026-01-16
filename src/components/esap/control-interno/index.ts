/**
 * CONTROL INTERNO DE GESTIÓN - Exportaciones Optimizadas
 * Incluye módulos consolidados y componentes individuales
 */

// ⭐ MÓDULO PRINCIPAL
export { ControlInternoFull } from './ControlInternoFull';

// ⭐ COMPONENTES DE UI UNIFICADOS
export { HeaderModuloCIG } from './HeaderModuloCIG';

// ⭐ MÓDULOS CONSOLIDADOS (NUEVOS)
export { PlanificacionModule } from './PlanificacionModule';
export { PlanificacionModuleRediseno } from './PlanificacionModuleRediseno';
export { ProcesoAuditoriaModule } from './ProcesoAuditoriaModule';
export { ProcesoAuditoriaModuleRediseno } from './ProcesoAuditoriaModuleRediseno';
export { PlanesMejoramientoModule } from './PlanesMejoramientoModule';
export { SoporteModule } from './SoporteModule';
export { ModulosAvanzadosModule } from './ModulosAvanzadosModule';

// ⭐ MÓDULOS INDIVIDUALES
export { UniversoAuditorias } from './UniversoAuditorias';
export { PlanAnualModule } from './PlanAnualModule';
export { ProgramaAnualCIG } from './ProgramaAnualCIG';

// ⭐ FASES DE AUDITORÍA (RF004-009)
export { InicioAuditoriaWizard } from './InicioAuditoriaWizard';
export { PlaneacionAuditoriaModule } from './PlaneacionAuditoriaModule';
export { EjecucionAuditoriaModule } from './EjecucionAuditoriaModule';
export { ComunicacionAuditoriaModule } from './ComunicacionAuditoriaModule';

// ⭐ PLANES DE MEJORAMIENTO (RF010-011)
export { FormulacionPlanMejoramientoModule } from './FormulacionPlanMejoramientoModule';
export { SeguimientoPlanMejoramientoModule } from './SeguimientoPlanMejoramientoModule';

// ⭐ MÓDULOS DE SOPORTE (RF012-014)
export { InformesLeyModule } from './InformesLeyModule';
export { GestionDocumentalModule } from './GestionDocumentalModule';
export { NotificacionesModule } from './NotificacionesModule';
export { NotificacionesControlInternoDropdown } from './NotificacionesControlInternoDropdown';

// ⭐ MÓDULOS AVANZADOS (RF015-019)
export { RolesYPermisos } from './RolesYPermisos';
export { ReportesEjecutivosModule } from './ReportesEjecutivosModule';
export { DashboardEjecutivoCIG } from './DashboardEjecutivoCIG';
export { GestionAuditoriasTerritoriales } from './GestionAuditoriasTerritoriales';
export { WizardAuditoriaTerritorial } from './WizardAuditoriaTerritorial';
export { AuditoriasEspecialesModule } from './AuditoriasEspecialesModule';
export { AuditoriasEspecialesModuleCompleto } from './AuditoriasEspecialesModuleCompleto';
export { WizardAuditoriaEspecial } from './WizardAuditoriaEspecial';

// ⭐ AUDITORÍA DE CAMBIOS (RF020) - COMPLETADO 100% ⭐
export { AuditoriaCambiosModule } from './AuditoriaCambiosModule';
export { DemoAuditoriaCambios } from './DemoAuditoriaCambios';

// ⭐ HOOKS Y SERVICIOS - NUEVO ⭐
export { useAuditLog } from './hooks/useAuditLog';
export { auditLogService } from './services/auditLogService';
export type { AuditLog, TipoAccion, TipoEntidad } from './services/auditLogService';

// ⭐ DASHBOARDS
export { GestionAuditoriasKanbanSimple } from './GestionAuditoriasKanbanSimple';

// ⭐ CONFIGURACIÓN
export { ConfiguracionSistemaCompleto } from './ConfiguracionSistemaCompleto';
export { ConfiguracionAvanzadaCIG } from './ConfiguracionAvanzadaCIG';

// ⭐ DEMOS
export { DemoPlaneacionAuditoria } from './DemoPlaneacionAuditoria';

// ⭐ CONTEXT Y HOOKS
export { ControlInternoProvider, useControlInterno } from './ControlInternoContext';
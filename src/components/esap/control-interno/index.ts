/**
 * CONTROL INTERNO DE GESTIÓN - Exportaciones Optimizadas
 * Incluye módulos consolidados y componentes individuales
 */

// ⭐ MÓDULO PRINCIPAL
export { ControlInternoFull } from './ControlInternoFull';

// ⭐ MÓDULOS CONSOLIDADOS (NUEVOS)
export { PlanificacionModule } from './PlanificacionModule';
export { ProcesoAuditoriaModule } from './ProcesoAuditoriaModule';
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

// ⭐ MÓDULOS AVANZADOS (RF015-019)
export { RolesYPermisos } from './RolesYPermisos';
export { ReportesEjecutivosModule } from './ReportesEjecutivosModule';
export { GestionAuditoriasTerritoriales } from './GestionAuditoriasTerritoriales';
export { AuditoriasEspecialesModule } from './AuditoriasEspecialesModule';

// ⭐ DASHBOARDS
export { GestionAuditoriasKanbanSimple } from './GestionAuditoriasKanbanSimple';

// ⭐ CONFIGURACIÓN
export { ConfiguracionSistemaCompleto } from './ConfiguracionSistemaCompleto';

// ⭐ DEMOS
export { DemoPlaneacionAuditoria } from './DemoPlaneacionAuditoria';

// ⭐ CONTEXT Y HOOKS
export { ControlInternoProvider, useControlInterno } from './ControlInternoContext';
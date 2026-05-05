/**
 * MÓDULO DE GESTIÓN PROFESORAL - ESAP
 * 
 * Exportaciones centralizadas de todos los componentes del sistema PTA
 */

// Componente principal orquestador
export { GestionProfesoralApp } from './GestionProfesoralApp';

// Visualizador/Dashboard
export { VisualizadorPTAAjustes } from './VisualizadorPTAAjustes';

// Wizard de Creación PTA
export { WizardCrearPTA } from './WizardCrearPTA';

// Formularios de Actividades
export { FormularioDocencia } from './FormularioDocencia';
export type { ActividadDocencia } from './FormularioDocencia';

export { FormularioInvestigacion } from './FormularioInvestigacion';
export type { ActividadInvestigacion } from './FormularioInvestigacion';

export { FormularioExtension } from './FormularioExtension';
export type { ActividadExtension } from './FormularioExtension';

export { FormularioComplementarias } from './FormularioComplementarias';
export type { ActividadComplementaria } from './FormularioComplementarias';

export { PanelRevision } from './PanelRevision';

export { DashboardDocente } from './DashboardDocente';

export { ModalProrrateo } from './ModalProrrateo';

export { DashboardAprobador } from './DashboardAprobador';
export { ModalAprobacion } from './ModalAprobacion';
export type { AccionAprobacion } from './ModalAprobacion';
export { VistaDetallePTA } from './VistaDetallePTA';

// TODO: Exportar cuando se cree
// export { PanelRevision } from './PanelRevision';
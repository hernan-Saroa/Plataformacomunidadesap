/**
 * ═════════════════════════════════════════════════════════════════════════
 * COMPONENTES OCIG - EXPORTS
 * ═════════════════════════════════════════════════════════════════════════
 * 
 * Exportación centralizada de componentes del módulo OCIG
 * Basado en especificaciones de PROMPT_FIGMA_OCIG_COMPLETO.md
 */

// Dashboard Principal
export { DashboardOCIG } from './DashboardOCIG';
export { KPICard } from './KPICard';
export { VencimientosWidget } from './VencimientosWidget';
export type { Vencimiento } from './VencimientosWidget';
export { AccesosRapidos } from './AccesosRapidos';
export type { AccesoRapido } from './AccesosRapidos';

// Componentes del Tablero Kanban
export { AuditoriaCard } from './AuditoriaCard';
export type { AuditoriaCardData } from './AuditoriaCard';

export { KanbanColumn } from './KanbanColumn';
export { TableroKanbanOCIG } from './TableroKanbanOCIG';

// Re-export del tema
export { default as esapTheme } from '../utils/esapThemeOCIG';
export * from '../utils/esapThemeOCIG';
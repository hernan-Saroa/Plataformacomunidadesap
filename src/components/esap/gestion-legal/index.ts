/**
 * ============================================
 * EXPORTACIONES - GESTIÓN LEGAL SIGL
 * ============================================
 * 
 * Exportaciones centralizadas para acceso directo a módulos
 */

export { KanbanSIGL } from './KanbanSIGL';
export { SelectorModuloKanban } from './SelectorModuloKanban';
export { KanbanGestionLegal } from './KanbanGestionLegal';

// Exportar nuevos componentes MOD-01
export { ModuloDefensaJudicial } from './ModuloDefensaJudicial';
export { FormularioExpedienteCompleto } from './FormularioExpedienteCompleto';
export { SistemaAlertasExpedientes } from './SistemaAlertasExpedientes';
export { GestionDocumentosExpediente } from './GestionDocumentosExpediente';

// Exportar Kanbans individuales
export { KanbanDefensaJudicial } from './KanbanDefensaJudicial';
export { KanbanOrganosControl } from './KanbanOrganosControl';
export { KanbanGenerico } from './KanbanGenerico';

// Exportar configuraciones de Kanban
export {
  kanbanAsesoriaJuridica,
  kanbanJuzgamiento,
  kanbanCoactivos,
  kanbanNotificaciones,
  kanbanBuzonJuridica,
  kanbanPlanAccion,
  kanbanRiesgos,
  kanbanMejoramiento,
  kanbanTerminos,
} from './kanban-configs';

// Exportar constantes útiles
export const MODULOS_SIGL = {
  DEFENSA_JUDICIAL: 'mod-01',
  ORGANOS_CONTROL: 'mod-02',
  ASESORIA_JURIDICA: 'mod-03',
  JUZGAMIENTO_DISCIPLINARIO: 'mod-04',
  PROCESOS_COACTIVOS: 'mod-05',
  BUZON_NOTIFICACIONES: 'mod-06',
  BUZON_OFICINA_JURIDICA: 'mod-07',
  PLAN_ACCION: 'mod-08',
  RIESGOS: 'mod-09',
  PLANES_MEJORAMIENTO: 'mod-10',
  TERMINOS_INFORMES: 'mod-11',
} as const;

// Helper para acceso rápido
export type ModuloSIGL = typeof MODULOS_SIGL[keyof typeof MODULOS_SIGL];
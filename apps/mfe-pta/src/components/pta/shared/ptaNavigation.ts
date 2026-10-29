export const PTA_REPORT_VIEWS = [
  'tablero_unificado', 'centro_reportes', 'tablero', 'reporte', 'comparativo',
  'indicadores', 'directivo', 'territorial', 'mapa_territorial',
  'workflow_visualizer', 'cronograma', 'metricas_sla',
] as const;

export function canViewPTAReports(tieneVista: (vista: string) => boolean): boolean {
  return PTA_REPORT_VIEWS.some(tieneVista);
}

/** La entrada Reportes agrupa vistas con permisos propios. */
export function canAccessPTAView(vista: string, tieneVista: (vista: string) => boolean): boolean {
  return vista === 'tablero_unificado' ? canViewPTAReports(tieneVista) : tieneVista(vista);
}

export function defaultPTAView(tieneVista: (vista: string) => boolean) {
  return (['gestion', 'solicitudes_pta', 'seguimiento_docs', 'configuracion', 'banco_docentes', 'tablero_unificado'] as const)
    .find(view => canAccessPTAView(view, tieneVista)) || 'gestion';
}

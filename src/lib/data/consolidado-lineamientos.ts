/**
 * STUB: Arrays y objetos vacíos - Agregar datos reales cuando se requieran
 */
export const TODOS_LOS_LINEAMIENTOS_CONSOLIDADOS: LineamientoConsolidado[] = [];

export const ESTADISTICAS_GLOBALES: EstadisticasGlobales = {
  total: 0,
  porEstado: { completo: 0, enProgreso: 0, pendiente: 0 },
  porModelo: { MAE: 0, MGGTI: 0, PETIC: 0, MECA: 0 },
  complianceObligatorios: 0,
  progresoPromedio: 0,
  progresoMAE: 0,
  progresoMGGTI: 0,
  progresoPETIC: 0,
  progresoMECA: 0
};

/**
 * STUB: Funciones helper que retornan datos vacíos
 */
export function getAllLineamientosConsolidados(): LineamientoConsolidado[] {
  return TODOS_LOS_LINEAMIENTOS_CONSOLIDADOS;
}

export function getEstadisticasGlobales(): EstadisticasGlobales {
  return ESTADISTICAS_GLOBALES;
}

export function getLineamientosPorModelo(modelo: string): LineamientoConsolidado[] {
  return TODOS_LOS_LINEAMIENTOS_CONSOLIDADOS.filter(l => l.modelo === modelo);
}

export function getLineamientosPorEstado(estado: string): LineamientoConsolidado[] {
  return TODOS_LOS_LINEAMIENTOS_CONSOLIDADOS.filter(l => l.estado === estado);
}
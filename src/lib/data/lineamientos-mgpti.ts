/**
 * STUB: Array vacío - Agregar datos reales cuando se requieran
 */
export const LINEAMIENTOS_MGPTI: DominioMGPTI[] = [];

/**
 * Helper: Obtener todos los lineamientos MGPTI
 */
export function getAllLineamientosMGPTI(): DominioMGPTI[] {
  return LINEAMIENTOS_MGPTI;
}

/**
 * Helper: Obtener estadísticas de MGPTI
 */
export function getEstadisticasMGPTI() {
  const totalDominios = LINEAMIENTOS_MGPTI.length;
  const totalLineamientos = LINEAMIENTOS_MGPTI.reduce((acc, d) => acc + d.componentes.length, 0);
  
  return {
    totalDominios,
    totalLineamientos,
    progresoPromedio: 0,
    dominios: LINEAMIENTOS_MGPTI.map(d => ({
      nombre: d.nombre,
      totalComponentes: d.componentes.length,
      progreso: 0
    }))
  };
}

/**
 * Helper: Buscar lineamiento por código
 */
export function getLineamientoMGPTIByCodigo(codigo: string) {
  for (const dominio of LINEAMIENTOS_MGPTI) {
    const componente = dominio.componentes.find(c => c.codigo === codigo);
    if (componente) return componente;
  }
  return undefined;
}
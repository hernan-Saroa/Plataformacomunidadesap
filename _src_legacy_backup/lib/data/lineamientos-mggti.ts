/**
 * STUB: Array vacío - Agregar datos reales cuando se requieran
 */
export const LINEAMIENTOS_MGGTI: DominioMGGTI[] = [];

/**
 * Helper: Obtener todos los lineamientos MGGTI
 */
export function getAllLineamientosMGGTI(): DominioMGGTI[] {
  return LINEAMIENTOS_MGGTI;
}

/**
 * Helper: Obtener estadísticas de MGGTI
 */
export function getEstadisticasMGGTI() {
  const totalDominios = LINEAMIENTOS_MGGTI.length;
  const totalLineamientos = LINEAMIENTOS_MGGTI.reduce((acc, d) => acc + d.componentes.length, 0);
  
  return {
    totalDominios,
    totalLineamientos,
    progresoPromedio: 0,
    dominios: LINEAMIENTOS_MGGTI.map(d => ({
      nombre: d.nombre,
      totalComponentes: d.componentes.length,
      progreso: 0
    }))
  };
}

/**
 * Helper: Buscar lineamiento por código
 */
export function getLineamientoMGGTIByCodigo(codigo: string) {
  for (const dominio of LINEAMIENTOS_MGGTI) {
    const componente = dominio.componentes.find(c => c.codigo === codigo);
    if (componente) return componente;
  }
  return undefined;
}
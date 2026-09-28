/**
 * Territorial académica del PTA (donde se dictan sus asignaturas).
 * `territorial` identifica la vinculación del docente y puede ser distinta.
 */
export function getPtaAssignmentTerritorialLabel(pta: any): string {
  const territoriales = Array.isArray(pta?.territorialesAsignaturas)
    ? Array.from(new Set<string>(pta.territorialesAsignaturas
        .map((value: unknown) => String(value || '').trim())
        .filter(Boolean)))
    : [];

  const docencia = pta?.docencia_por_componente;
  const tieneClasificacionDocencia = docencia && typeof docencia === 'object'
    && ['academica_pregrado', 'academica_posgrado', 'academica_territorial']
      .some(key => Object.prototype.hasOwnProperty.call(docencia, key));

  if (tieneClasificacionDocencia) {
    const horasCentrales = (Number(docencia.academica_pregrado) || 0)
      + (Number(docencia.academica_posgrado) || 0);
    const horasTerritoriales = Number(docencia.academica_territorial) || 0;

    if (horasCentrales > 0 || horasTerritoriales > 0) {
      const ubicaciones: string[] = [];
      if (horasCentrales > 0) ubicaciones.push('Sede Central');
      if (horasTerritoriales > 0) {
        const territorialesReales = territoriales.filter(value => value.toLowerCase() !== 'sede central');
        if (territorialesReales.length > 0) {
          ubicaciones.push(...territorialesReales);
        } else {
          const vinculacion = String(pta?.territorial_nombre || pta?.territorial || '').trim();
          if (vinculacion) ubicaciones.push(vinculacion);
        }
      }
      return Array.from(new Set(ubicaciones)).join(', ');
    }
  }

  if (territoriales.length > 0) return territoriales.join(', ');
  return String(pta?.territorial_nombre || pta?.territorial || '').trim();
}

/**
 * Unidades auditables de un proceso (EFDS-2316).
 *
 * Las define Configuración en cada proceso. El Universo Auditable las lleva
 * todas y al programar la auditoría se eligen las que cubre; esas quedan en
 * `unidadesAuditables` de la auditoría y salen en la columna "Unidad Auditable"
 * del Programa Anual.
 */

/** "A; B; C" -> ['A', 'B', 'C'] */
export function parseUnidades(texto?: string | null): string[] {
  if (!texto) return [];
  return Array.from(new Set(texto.split(';').map((u) => u.trim()).filter(Boolean)));
}

/**
 * Unidades del proceso de una fila del Universo: las de Configuración; si el
 * proceso no las tiene, las que se guardaron en la fila ("Dependencia||A; B").
 */
export function unidadesDeLaEvaluacion(evaluacion: any): string[] {
  const delCatalogo = Array.isArray(evaluacion?.proceso?.unidadesAuditables)
    ? evaluacion.proceso.unidadesAuditables
        .map((u: any) => String(typeof u === 'string' ? u : u?.nombre || '').trim())
        .filter(Boolean)
    : [];
  if (delCatalogo.length > 0) return Array.from(new Set<string>(delCatalogo));

  const dependencia = String(evaluacion?.dependenciaResponsable || '');
  if (dependencia.includes('||')) return parseUnidades(dependencia.split('||')[1]);
  return parseUnidades(evaluacion?.proceso?.macroproceso);
}

/**
 * Lo que va en la columna "Unidad Auditable". Las auditorías programadas antes
 * de EFDS-2316 no tienen el dato: se toma lo que su nombre trae entre paréntesis,
 * que es donde la programación ponía la unidad.
 */
export function unidadesParaExportar(nombre?: string | null, unidades?: string[] | null): string[] {
  if (Array.isArray(unidades) && unidades.length > 0) return unidades;
  const entreParentesis = String(nombre || '').match(/\(([^)]*)\)/g) || [];
  return parseUnidades(entreParentesis.map((p) => p.slice(1, -1)).join(';'));
}

/** Título de la auditoría: "Proceso (A; B)", como lo arma la programación. */
export function tituloConUnidades(proceso: string, unidades: string[], respaldo = ''): string {
  const detalle = unidades.length > 0 ? unidades.join('; ') : respaldo;
  return detalle ? `${proceso} (${detalle})` : proceso;
}

/**
 * Territorial académica del PTA (donde se dictan sus asignaturas).
 * `territorial` identifica la vinculación del docente y puede ser distinta.
 */
export function getPtaAssignmentTerritorialLabel(pta: any): string {
  const references = [...(Array.isArray(pta?.asignaturas) ? pta.asignaturas : []), pta].map(toTerritorialReference);
  const territoriales = Array.isArray(pta?.territorialesAsignaturas)
    ? Array.from(new Set<string>(pta.territorialesAsignaturas
        .map((value: unknown) => getTerritorialDisplayName(value, references))
        .filter((value: string | null): value is string => Boolean(value))))
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
          const vinculacion = getTerritorialDisplayName(toTerritorialReference(pta), references);
          if (vinculacion) ubicaciones.push(vinculacion);
        }
      }
      return Array.from(new Set(ubicaciones)).join(', ');
    }
  }

  if (territoriales.length > 0) return territoriales.join(', ');
  return getTerritorialDisplayName(toTerritorialReference(pta), references) || '';
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function readableName(value: unknown): string | null {
  const name = text(value);
  return name && !UUID.test(name) && !/^\d+$/.test(name) ? name : null;
}

function referenceIds(value: any): string[] {
  return [value?.territorial_id, value?.territorialId, value?.territorial?.id,
    value?.id, value?.codigo, typeof value?.territorial === 'string' ? value.territorial : null]
    .map(text).filter(Boolean).map(value => value.toLowerCase());
}

function referenceName(value: any): string | null {
  return [value?.territorial_nombre, value?.territorialNombre, value?.territorial_nombre_actual,
    value?.territorial?.nombre, value?.nombre, value?.territorial]
    .map(readableName).find(Boolean) || null;
}

/** Extrae solo los datos territoriales; nombre/id de un docente o asignatura son distintos. */
export function toTerritorialReference(value: any) {
  return {
    id: value?.territorial_id || value?.territorialId || value?.territorial?.id || text(value?.territorial),
    nombre: [value?.territorial_nombre, value?.territorialNombre, value?.territorial_nombre_actual,
      value?.territorial?.nombre, value?.territorial].map(readableName).find(Boolean) || null,
  };
}

/** Resuelve etiquetas desde el catálogo del ambiente; nunca muestra UUID o códigos numéricos. */
export function getTerritorialDisplayName(value: any, references: readonly any[] = []): string | null {
  const ids = typeof value === 'object' ? referenceIds(value) : [text(value).toLowerCase()].filter(Boolean);
  for (const reference of references) {
    if (referenceIds(reference).some(id => ids.includes(id))) {
      const name = referenceName(reference);
      if (name) return name;
    }
  }
  return typeof value === 'object'
    ? referenceName(value) || [value?.territorial_id, value?.territorialId, value?.id, value?.codigo]
      .map(readableName).find(Boolean) || null
    : readableName(value);
}

/** scopeId también puede identificar una solicitud o etapa: esos valores no son territoriales. */
export function getApprovalTerritorialLabel(approval: any, pta: any, references: readonly any[] = []): string {
  const scopeIsTerritorial = !approval?.scope || approval.scope === 'territorial';
  const id = approval?.territorialId || approval?.territorial_id || (scopeIsTerritorial ? approval?.scopeId : null);
  if (id) {
    return getTerritorialDisplayName({ territorialId: id, territorialNombre: approval?.territorialNombre }, references)
      || 'Territorial no disponible';
  }
  if (approval?.aprobadorRol === 'Gestión Profesoral') return 'Sede Nacional';
  return getTerritorialDisplayName(toTerritorialReference(pta), references) || 'Territorial no disponible';
}

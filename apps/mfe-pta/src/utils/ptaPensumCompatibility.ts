export const SIN_PENSUM_KEY = '__SIN_PENSUM__';

const text = (value: unknown) => String(value ?? '').trim();
const displayText = (value: unknown) => text(value).replace(/\s+/g, ' ');
const TECHNICAL_SCHEDULE_SUFFIX = /\s*\(\s*AP\s*[_-]?\s*(?:D[IÍ]A|NOCHE)\s*\)\s*$/iu;
const normalizedText = (value: unknown) => text(value).toLocaleLowerCase('es');
const normalizedIdentity = (value: unknown) => normalizedText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const identityVariants = (value: unknown) => {
  const raw = text(value);
  const withoutTrailingQualifier = raw.replace(/\s*\([^)]*\)\s*$/, '');
  return new Set(
    [normalizedIdentity(raw), normalizedIdentity(withoutTrailingQualifier)].filter(Boolean),
  );
};

export function catalogProgramId(item: any): string {
  return text(item?.programaId ?? item?.programa_id ?? item?.programa?.id);
}

export function catalogPensumKey(item: any): string {
  return text(item?.pensumKey ?? item?.pensum) || SIN_PENSUM_KEY;
}

/** Etiqueta segura para vistas y exportaciones; nunca expone el marcador interno. */
export function formatPtaPensum(value: unknown): string {
  const pensum = text(value);
  if (!pensum) return '—';
  return pensum === SIN_PENSUM_KEY ? 'Sin pensum registrado' : pensum;
}

/**
 * Nombre de asignatura para interfaces. La plantilla nueva aporta nombre_base;
 * el reemplazo final mantiene compatibles los catálogos legacy.
 */
export function formatPtaAssignmentName(item: any): string {
  const raw = typeof item === 'object' && item !== null
    ? [
        item?.nombreBase,
        item?.nombre_base,
        item?.nombreVisible,
        item?.asignatura_nombre_base,
        item?.asignatura_nombre,
        item?.nombre,
        item?.asignatura,
      ].map(displayText).find(Boolean) || ''
    : displayText(item);
  return raw.replace(TECHNICAL_SCHEDULE_SUFFIX, '').trim() || raw;
}

export function mergeAssignmentCatalog(
  current: any[],
  incoming: any[],
  fallbackProgramId?: unknown,
) {
  const merged = new Map<string, any>();
  current.forEach(item => merged.set(text(item?.id), item));
  incoming.forEach(item => {
    const id = text(item?.id);
    if (!id) return;
    const programId = catalogProgramId(item) || text(fallbackProgramId);
    merged.set(id, {
      ...merged.get(id),
      ...item,
      programaId: programId,
      programa_id: programId,
      nucleo: item?.nucleo ?? item?.nucleoTematico ?? item?.nucleo_tematico ?? '',
    });
  });
  return [...merged.values()];
}

function assignmentNameMatches(candidate: any, variants: Set<string>) {
  if (variants.size === 0) return false;
  return [candidate?.nombre, candidate?.nombreBase, candidate?.nombre_base]
    .flatMap(identityVariants)
    .some(value => variants.has(value));
}

function uniqueMatch(candidates: any[]) {
  const unique = new Map(candidates.map(candidate => [text(candidate?.id), candidate]));
  return unique.size === 1 ? [...unique.values()][0] : null;
}

/**
 * Resuelve una referencia guardada contra el catálogo vigente. El id interno
 * puede cambiar si un catálogo fue reemplazado; por eso código y nombre son las
 * identidades estables y el id solo se acepta cuando no contradice esos datos.
 */
export function findLegacyCatalogAssignment(item: any, catalog: any[]): any | null {
  const assignmentId = text(item?.asignatura_id ?? item?.asignaturaId);
  if (!assignmentId) return null;

  const programKey = text(item?.programa_id ?? item?.programaId ?? item?.programa?.id);
  const currentPensum = text(item?.pensum);
  const programAssignments = catalog.filter(
    candidate => !programKey || catalogProgramId(candidate) === programKey,
  );
  const pensumAssignments = currentPensum
    ? programAssignments.filter(candidate => catalogPensumKey(candidate) === currentPensum)
    : programAssignments;

  const assignmentCode = normalizedIdentity(
    item?.asignatura_codigo ?? item?.codigo_asignatura ?? item?.codigo,
  );
  if (assignmentCode) {
    const byCode = (candidates: any[]) => uniqueMatch(candidates.filter(
      candidate => normalizedIdentity(candidate?.codigo) === assignmentCode,
    ));
    const match = byCode(pensumAssignments) || byCode(programAssignments);
    if (match) return match;
  }

  const nameVariants = identityVariants(
    item?.asignatura_nombre ?? item?.asignaturaNombre ?? item?.nombre,
  );
  if (nameVariants.size > 0) {
    const byName = (candidates: any[]) => uniqueMatch(candidates.filter(
      candidate => assignmentNameMatches(candidate, nameVariants),
    ));
    const match = byName(pensumAssignments) || byName(programAssignments);
    if (match) return match;
  }

  const exact = catalog.find(candidate => text(candidate?.id) === assignmentId);
  if (!exact || (programKey && catalogProgramId(exact) !== programKey)) return null;

  // Sin identidad estable guardada, el id sigue siendo el mejor dato disponible.
  if (!assignmentCode && nameVariants.size === 0) return exact;
  if (assignmentCode && normalizedIdentity(exact?.codigo) === assignmentCode) return exact;
  return assignmentNameMatches(exact, nameVariants) ? exact : null;
}

/** Devuelve una fila legacy enlazada a la asignatura vigente, sin tocar sus horas. */
export function reconcileLegacyAssignment(item: any, catalog: any[]) {
  const match = findLegacyCatalogAssignment(item, catalog);
  if (!match) return item;

  const next = {
    ...item,
    programa_id: text(item?.programa_id) || catalogProgramId(match),
    pensum: catalogPensumKey(match),
    asignatura_id: text(match?.id),
    asignatura_nombre: formatPtaAssignmentName(match) || formatPtaAssignmentName(item),
    asignatura_codigo: match?.codigo || item?.asignatura_codigo,
    nucleo_tematico: match?.nucleo ?? match?.nucleoTematico ?? item?.nucleo_tematico,
    creditos: match?.creditos ?? item?.creditos,
    semestre: match?.semestre ?? item?.semestre,
  };

  const keys = [
    'programa_id', 'pensum', 'asignatura_id', 'asignatura_nombre',
    'asignatura_codigo', 'nucleo_tematico', 'creditos', 'semestre',
  ];
  return keys.some(key => String(next[key] ?? '') !== String(item?.[key] ?? ''))
    ? next
    : item;
}

export function listPensumsForProgram(catalog: any[], programaId: unknown) {
  const programKey = text(programaId);
  const unique = new Map<string, string>();

  catalog
    .filter(item => catalogProgramId(item) === programKey)
    .forEach(item => {
      const rawPensum = text(item?.pensum);
      const key = catalogPensumKey(item);
      unique.set(key, rawPensum || 'Sin pensum registrado');
    });

  return [...unique.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

export function filterAssignmentsByPensum(
  catalog: any[],
  programaId: unknown,
  pensum: unknown,
) {
  const programKey = text(programaId);
  const pensumKey = text(pensum);
  const programAssignments = catalog.filter(
    item => catalogProgramId(item) === programKey,
  );

  // Un borrador antiguo puede tener asignatura pero aún no Pensum. Mientras se
  // reconcilia, se ofrece el programa completo y la próxima selección fija su Pensum.
  if (!pensumKey) return programAssignments;

  return programAssignments.filter(
    item => catalogPensumKey(item) === pensumKey,
  );
}

/** Recupera el Pensum de una fila PTA creada antes de que el campo existiera. */
export function inferLegacyPensum(item: any, catalog: any[]): string | null {
  const assignmentId = text(item?.asignatura_id ?? item?.asignaturaId);
  if (!assignmentId) return null;

  const currentPensum = text(item?.pensum);
  const programKey = text(item?.programa_id ?? item?.programaId ?? item?.programa?.id);
  const programAssignments = catalog.filter(
    candidate => !programKey || catalogProgramId(candidate) === programKey,
  );

  const match = findLegacyCatalogAssignment(item, catalog);

  if (match) return catalogPensumKey(match);

  // Conserva un valor previo únicamente si sigue siendo una opción válida
  // para el programa. Esto evita dejar el selector en un valor inexistente.
  if (
    currentPensum
    && programAssignments.some(candidate => catalogPensumKey(candidate) === currentPensum)
  ) {
    return currentPensum;
  }

  const uniqueProgramPensums = [...new Set(programAssignments.map(catalogPensumKey))];
  return uniqueProgramPensums.length === 1 ? uniqueProgramPensums[0] : null;
}

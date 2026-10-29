function timestamp(value: unknown): number {
  return value instanceof Date ? value.getTime() : typeof value === 'string' ? Date.parse(value) : NaN;
}

/** Si falla el resumen auxiliar, la fila guardada aún acredita la decisión.
 * Conservamos la versión conocida y avanzamos solo con fechas del servidor. */
export function getPtaDecisionReference(current: any, row: any) {
  const candidates = [current?.flujo_actualizado_en, row?.updatedAt, row?.updated_at,
    row?.fechaRevision, row?.fechaAprobacion];
  const latest = candidates.reduce((known, value) => Number.isFinite(timestamp(value))
    && (!Number.isFinite(timestamp(known)) || timestamp(value) > timestamp(known)) ? value : known, null);
  return {
    ...(current?.version != null ? { version: current.version } : {}),
    ...(latest != null ? { flujo_actualizado_en: latest } : {}),
  };
}

/** La versión cambia al reabrir; la fecha del historial cambia también al decidir
 * un componente sin que cambie el estado global ni la versión del PTA. */
export function isOlderPtaWorkflow(incoming: any, current: any): boolean {
  if (!incoming || !current || incoming.id !== current.id) return false;
  if (incoming.version != null && current.version != null) {
    const next = Number(incoming.version), previous = Number(current.version);
    if (Number.isFinite(next) && Number.isFinite(previous) && next !== previous) return next < previous;
  }
  const previous = timestamp(current.flujo_actualizado_en);
  const next = timestamp(incoming.flujo_actualizado_en);
  // Una respuesta sin la referencia de flujo tampoco acredita ser posterior a
  // una confirmación que sí la incluye. No usamos la hora del navegador.
  return Number.isFinite(previous) && (!Number.isFinite(next) || next < previous);
}

const rowKey = (row: any) => JSON.stringify([
  row.componente, row.subseccion || 'general',
  row.territorialId ?? row.territorial_id ?? '', row.nivel || '',
]);

/** Los endpoints auxiliares aportan nombres/comentarios; el DTO del flujo aporta
 * los estados de la misma consulta que actualiza la lista y sus contadores. */
export function mergePtaDecisionRows(rows: any[], snapshot: any[] = [], previous: any[] = []) {
  const confirmed = new Map(snapshot.map(row => [rowKey(row), row]));
  const old = new Map(previous.map(row => [rowKey(row), row]));
  const merged = rows.map(row => {
    const key = rowKey(row);
    const status = confirmed.get(key);
    if (!status) return row;
    confirmed.delete(key);
    const known = old.get(key);
    const base = row.estado !== status.estado && known?.estado === status.estado ? { ...row, ...known } : row;
    return { ...base, ...status,
      ...('estado_visual' in base ? { estado_visual: status.estado_visual || status.estado } : {}) };
  });
  return [...merged, ...confirmed.values()];
}

export function mergePtaTerritorialRows(rows: any[], snapshot: any[] = [], previous: any[] = []) {
  const component = (row: any) => ({ ...row, componente: 'academica_territorial' });
  return mergePtaDecisionRows(rows.map(component), snapshot.filter(row =>
    row.componente === 'academica_territorial' && (row.territorialId || row.territorial_id)), previous.map(component));
}

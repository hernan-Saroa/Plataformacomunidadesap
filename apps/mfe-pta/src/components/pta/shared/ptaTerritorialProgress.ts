type Pair = { territorialId: string; nivel: string };
const key = (row: any) => `${row.territorialId ?? row.territorial_id}:${row.nivel}`;

/** Proyecta únicamente los pares concedidos por el servidor, sin ampliar permisos. */
export function scopedTerritorialProgress(rows: any[], personal: any[], pairs: Pair[], fallback: any) {
  return pairs.map(pair => {
    const live = rows.find(row => key(row) === key(pair));
    const confirmed = personal.find(row => key(row) === key(pair));
    return { ...fallback, ...confirmed, ...live, ...pair, estado: live?.estado || confirmed?.estado || fallback?.estado || 'pendiente' };
  });
}

export function territorialProgressStatus(rows: any[], resolved: 'revisado' | 'aprobado', fallback = 'pendiente') {
  if (!rows.length) return fallback;
  if (rows.some(row => row.estado === 'devuelto')) return 'devuelto';
  return rows.every(row => row.estado === resolved) ? resolved : 'pendiente';
}

/** Aplica la confirmación de una decisión antes de las lecturas auxiliares. */
export function mergeTerritorialProgress(rows: any[], confirmed: any[]) {
  const merged = new Map(rows.map(row => [key(row), row]));
  for (const row of confirmed) {
    const territorialId = row.territorialId ?? row.territorial_id;
    if (!territorialId || !row.nivel) continue;
    merged.set(key(row), { ...merged.get(key(row)), ...row, territorialId });
  }
  return [...merged.values()];
}

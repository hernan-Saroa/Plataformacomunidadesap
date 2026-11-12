/** HU 1365 (NF002): una línea legible por cada campo modificado de una entrada del historial. */
export interface RundAuditCambioView { campo: string; anterior: string | null; nuevo: string | null }

const MAX_VALUE = 120;

export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '(vacío)';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > MAX_VALUE ? `${text.slice(0, MAX_VALUE)}…` : text;
}

/** Devuelve solo cambios bien formados; las entradas anteriores sin detalle quedan sin líneas. */
export function auditCambiosOf(entry: { cambios?: unknown }): RundAuditCambioView[] {
  if (!Array.isArray(entry?.cambios)) return [];
  return entry.cambios.filter((c): c is RundAuditCambioView => !!c && typeof (c as any).campo === 'string' && (c as any).campo.length > 0);
}

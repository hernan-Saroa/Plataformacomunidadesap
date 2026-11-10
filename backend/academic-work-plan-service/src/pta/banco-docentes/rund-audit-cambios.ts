/**
 * NF002 — Cada entrada del log de auditoría debe exponer campo modificado, valor anterior y valor nuevo.
 * Las ediciones con varios campos guardan el detalle en `metadata.cambios`; las de un solo campo,
 * además, en `dato_previo`/`dato_nuevo`. Estas funciones lo normalizan sin tocar lo ya registrado.
 */
export interface RundAuditCambio {
  campo: string;
  anterior: string | null;
  nuevo: string | null;
}

function asText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** Valores previo/nuevo para las columnas dedicadas cuando el cambio afecta un único campo. */
export function singleFieldAuditValues(
  changes: Record<string, { anterior: unknown; nuevo: unknown }>,
): { datoPrevio?: string; datoNuevo?: string } {
  const keys = Object.keys(changes);
  if (keys.length !== 1) return {};
  const change = changes[keys[0]];
  return { datoPrevio: asText(change.anterior) ?? undefined, datoNuevo: asText(change.nuevo) ?? undefined };
}

/** Lista uniforme de cambios por campo de una entrada del log (registros nuevos y anteriores). */
export function auditCambios(log: {
  campoAfectado?: string | null;
  datoPrevio?: string | null;
  datoNuevo?: string | null;
  metadata?: Record<string, any> | null;
}): RundAuditCambio[] {
  const detail = log.metadata?.cambios;
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    return Object.entries(detail as Record<string, { anterior?: unknown; nuevo?: unknown }>).map(([campo, change]) => ({
      campo,
      anterior: asText(change?.anterior),
      nuevo: asText(change?.nuevo),
    }));
  }
  const campo = String(log.campoAfectado || '').trim();
  if (campo && !campo.includes(',') && (log.datoPrevio != null || log.datoNuevo != null)) {
    return [{ campo, anterior: log.datoPrevio ?? null, nuevo: log.datoNuevo ?? null }];
  }
  return [];
}

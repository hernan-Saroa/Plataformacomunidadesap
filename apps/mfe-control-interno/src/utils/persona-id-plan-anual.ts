/** UUID en formato estándar (cualquier versión, p. ej. seeds a0000001-…). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esUuidPersona(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v.trim());
}

export type ReferenciaPersonaPlan = {
  id?: string;
  idTercero?: string;
  idPerson?: string;
  configId?: string;
};

/**
 * id_person de auth.personas para responsable_id del plan anual.
 * No usar el UUID de configuracion_profesionales_ocig (configId).
 */
export function idPersonaParaPlanAnual(
  ref?: ReferenciaPersonaPlan | null,
): string | undefined {
  if (!ref) return undefined;
  const configId = String(ref.configId ?? '').trim();
  const candidatos = [
    ref.idPerson,
    ref.idTercero,
    ref.id,
  ]
    .map((x) => String(x ?? '').trim())
    .filter(Boolean);

  for (const c of candidatos) {
    if (!esUuidPersona(c)) continue;
    if (configId && c === configId) continue;
    return c;
  }
  return undefined;
}

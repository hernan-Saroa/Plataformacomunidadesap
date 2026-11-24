/**
 * Editar un perfil (canal MODAL, con soporte y justificación) puede dejar Observaciones vacío.
 * La carga masiva y la autogestión siguen conservando el valor existente cuando el campo viene en blanco,
 * y ningún otro campo se borra por enviar un valor nulo.
 */
export function clearsObservaciones(
  rawPayload: Record<string, any> | null | undefined,
  normalizedObservaciones: string | null | undefined,
  hasExistingProfile: boolean,
): boolean {
  return hasExistingProfile
    && rawPayload?.canal_origen === 'MODAL'
    && Object.prototype.hasOwnProperty.call(rawPayload, 'observaciones')
    && !String(rawPayload.observaciones ?? '').trim()
    && normalizedObservaciones == null;
}

/** Un valor nulo solo cuenta como cambio cuando vacía Observaciones de forma explícita. */
export function countsAsFieldChange(field: string, nextValue: unknown, changed: boolean, clearsObs: boolean): boolean {
  if (nextValue === undefined || !changed) return false;
  return nextValue !== null || (field === 'observaciones' && clearsObs);
}

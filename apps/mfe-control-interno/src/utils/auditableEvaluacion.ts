/**
 * Priorización auditable (columna Aud. del Universo).
 * Calculado desde ciclo DAFP; override opcional en tabla.
 */

export function calcularAuditableDesdeCiclo(
  ciclo?: string | null,
  priorizacionAnos?: number[] | null
): boolean {
  if (priorizacionAnos && Array.isArray(priorizacionAnos) && priorizacionAnos.length > 0) {
    return priorizacionAnos.includes(1);
  }
  const c = (ciclo || '').trim().toLowerCase();
  if (!c || c === 'no auditar') return false;
  return c === 'cada año' || c === 'todos los años';
}

export function resolverAuditableEfectivo(
  calculado: boolean,
  manual?: boolean | null
): boolean {
  if (manual === true || manual === false) return manual;
  return calculado;
}

/**
 * Si el proceso se puede elegir al programar una auditoría (Asociar a Proceso).
 * Manda el switch "Aud." del Universo cuando se cambió a mano: en NO no aparece
 * aunque sea Extremo. En automático aparece si su criticidad es Extremo o si se
 * audita el primer año. Antes la lista mostraba todos los procesos evaluados.
 */
export function evaluacionProgramable(ev: {
  auditableManual?: boolean | null;
  auditableCalculado?: boolean | null;
  nivelCriticidadDafp?: string | null;
  cicloRotacionDafp?: string | null;
  priorizacionAnos?: number[] | null;
}): boolean {
  if (ev.auditableManual === true || ev.auditableManual === false) return ev.auditableManual;
  const criticidad = (ev.nivelCriticidadDafp || '').trim().toLowerCase();
  if (criticidad === 'extremo' || criticidad.startsWith('crític') || criticidad.startsWith('critic')) return true;
  return ev.auditableCalculado ?? calcularAuditableDesdeCiclo(ev.cicloRotacionDafp, ev.priorizacionAnos);
}

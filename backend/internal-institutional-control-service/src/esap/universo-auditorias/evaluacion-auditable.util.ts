/** Priorización auditable según ciclo DAFP (misma regla que el frontend). */
export function calcularAuditableDesdeCiclo(ciclo?: string | null): boolean {
  const c = (ciclo || '').trim().toLowerCase();
  if (!c || c === 'no auditar') return false;
  return true;
}

export function resolverAuditableEfectivo(
  calculado: boolean,
  manual?: boolean | null,
): boolean {
  if (manual === true || manual === false) return manual;
  return calculado;
}

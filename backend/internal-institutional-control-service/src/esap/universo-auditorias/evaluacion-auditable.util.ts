/** Priorización auditable según ciclo DAFP (misma regla que el frontend). */
export function calcularAuditableDesdeCiclo(
  ciclo?: string | null,
  priorizacionAnos?: number[] | null,
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
  manual?: boolean | null,
): boolean {
  if (manual === true || manual === false) return manual;
  return calculado;
}

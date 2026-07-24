/**
 * Porcentaje semántico de cumplimiento de la bolsa PTA.
 *
 * Evita que un valor incompleto (por ejemplo, 797h de 800h = 99.625%)
 * se redondee visualmente a 100%. También conserva las sobrecargas por encima
 * de 100% para que sigan siendo detectables. Se trunca a dos decimales cuando
 * falta carga, de modo que 99.625% se expresa como 99.62% y nunca como 100%.
 */
export function getPtaCompletionPercentage(
  programmedHours: unknown,
  requiredHours: unknown,
): number {
  const programmed = Math.max(0, Number(programmedHours) || 0);
  const required = Math.max(0, Number(requiredHours) || 0);

  if (required <= 0) return 0;
  if (programmed === required) return 100;

  const rawPercentage = (programmed / required) * 100;
  if (programmed < required) {
    return Math.min(99.99, Math.max(0, Math.floor(rawPercentage * 100) / 100));
  }

  return Math.max(100.01, Math.ceil(rawPercentage * 100) / 100);
}

const PTA_PERCENTAGE_FORMATTER = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPtaPercentage(percentage: unknown): string {
  return PTA_PERCENTAGE_FORMATTER.format(Number(percentage) || 0);
}

export function formatPtaCompletionPercentage(
  programmedHours: unknown,
  requiredHours: unknown,
): string {
  return formatPtaPercentage(
    getPtaCompletionPercentage(programmedHours, requiredHours),
  );
}

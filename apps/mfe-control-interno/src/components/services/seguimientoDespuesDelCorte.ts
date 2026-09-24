/**
 * El seguimiento de un corte nunca va antes del corte (EFDS-2142): el corte de diciembre
 * se revisa en enero del año siguiente. Cuando una fecha se lleva al año de la vigencia y
 * queda antes de su corte, pasa al año siguiente.
 */
export function seguimientoDespuesDelCorte(seguimiento: string, corte: string | undefined | null): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/;
  const s = seguimiento?.match(iso);
  if (!s || !corte || !iso.test(corte)) return seguimiento;
  if (seguimiento.slice(0, 10) >= corte.slice(0, 10)) return seguimiento;

  const año = parseInt(s[1], 10) + 1;
  const mes = parseInt(s[2], 10);
  const dia = Math.min(parseInt(s[3], 10), new Date(año, mes, 0).getDate());
  return `${año}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/**
 * EFDS-1310 — Reintegro por viaje más corto, con las fechas reales del
 * GF-FO-032 V2 y las tarifas de la liquidación que se pagó.
 *
 * Misma regla que la liquidación (GF-FO-023, liquidation.service.ts): cada
 * noche pernoctada vale la tarifa con pernocta, y el día de regreso (o el único
 * día, si no hubo pernocta) vale la tarifa sin pernocta. Se usan las tarifas
 * guardadas en la solicitud al liquidarla, no las vigentes hoy.
 *
 * Solo el viaje más corto genera reintegro. Uno más largo no genera un pago
 * mayor: eso se tramita aparte.
 */

export interface LiquidacionPagada {
  diasPernoctados: number | null;
  tarifaDiaPernoctado: number | null;
  tarifaDiaNoPernoctado: number | null;
  totalPernoctados: number | null;
  totalNoPernoctados: number | null;
  valorPagado: number | null;
}

export interface ViajeReal {
  /** Días calendario de la comisión real, comparable con dias_comision. */
  diasReales: number;
  nochesPlaneadas: number | null;
  nochesReales: number;
  viaticosPlaneados: number | null;
  viaticosReales: number | null;
  /** null = no se puede calcular (liquidación sin tarifas registradas). */
  reintegroViajeCorto: number | null;
}

const DIA_MS = 24 * 60 * 60 * 1000;

function diasEntre(desdeYmd: string, hastaYmd: string): number {
  return Math.round((Date.parse(`${hastaYmd}T00:00:00Z`) - Date.parse(`${desdeYmd}T00:00:00Z`)) / DIA_MS);
}

const numero = (v: number | string | null | undefined): number | null =>
  v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);

export function calcularViajeReal(
  fechaInicioRealYmd: string,
  fechaFinRealYmd: string,
  liq: LiquidacionPagada,
): ViajeReal {
  const nochesReales = Math.max(0, diasEntre(fechaInicioRealYmd, fechaFinRealYmd));
  const diasReales = nochesReales + 1;

  const nochesPlaneadas = numero(liq.diasPernoctados);
  const tarifaP = numero(liq.tarifaDiaPernoctado);
  const tarifaNP = numero(liq.tarifaDiaNoPernoctado);
  const totalP = numero(liq.totalPernoctados);
  const totalNP = numero(liq.totalNoPernoctados);

  // Una liquidación real siempre tiene tarifa sin pernocta positiva. En ceros (los
  // valores por omisión de la migración 448) no hay liquidación: no se sabe, no es 0.
  if (
    nochesPlaneadas === null || tarifaP === null || tarifaNP === null || totalP === null || totalNP === null ||
    tarifaNP <= 0 || (nochesPlaneadas > 0 && tarifaP <= 0)
  ) {
    return { diasReales, nochesPlaneadas, nochesReales, viaticosPlaneados: null, viaticosReales: null, reintegroViajeCorto: null };
  }

  const viaticosPlaneados = totalP + totalNP;
  const viaticosReales = nochesReales * tarifaP + tarifaNP;
  let reintegro = nochesReales < nochesPlaneadas ? Math.max(0, viaticosPlaneados - viaticosReales) : 0;
  const pagado = numero(liq.valorPagado);
  if (pagado !== null) reintegro = Math.min(reintegro, pagado);

  return {
    diasReales,
    nochesPlaneadas,
    nochesReales,
    viaticosPlaneados,
    viaticosReales,
    reintegroViajeCorto: Math.round(reintegro * 100) / 100,
  };
}

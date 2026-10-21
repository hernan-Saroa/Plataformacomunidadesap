import { calcularViajeReal, LiquidacionPagada } from '../viaje-real.util';

// Liquidación del 14 al 18: 4 noches a 335.520 y el regreso a 167.760.
const LIQ: LiquidacionPagada = {
  diasPernoctados: 4,
  tarifaDiaPernoctado: 335_520,
  tarifaDiaNoPernoctado: 167_760,
  totalPernoctados: 4 * 335_520,
  totalNoPernoctados: 167_760,
  valorPagado: 2_000_000,
};

describe('EFDS-1310 — reintegro por viaje más corto (fechas reales del GF-FO-032)', () => {
  it('viaje completo: sin reintegro', () => {
    expect(calcularViajeReal('2026-09-14', '2026-09-18', LIQ)).toMatchObject({
      diasReales: 5, nochesReales: 4, nochesPlaneadas: 4, reintegroViajeCorto: 0,
    });
  });

  it('regresó un día antes: reintegra una noche con pernocta', () => {
    const r = calcularViajeReal('2026-09-14', '2026-09-17', LIQ);
    expect(r).toMatchObject({ diasReales: 4, nochesReales: 3 });
    expect(r.viaticosPlaneados).toBe(1_509_840);
    expect(r.viaticosReales).toBe(3 * 335_520 + 167_760);
    expect(r.reintegroViajeCorto).toBe(335_520);
  });

  it('empezó un día tarde y regresó un día antes: dos noches', () => {
    expect(calcularViajeReal('2026-09-15', '2026-09-17', LIQ).reintegroViajeCorto).toBe(2 * 335_520);
  });

  it('se quedó un solo día: solo reconoce el día sin pernocta', () => {
    const r = calcularViajeReal('2026-09-14', '2026-09-14', LIQ);
    expect(r).toMatchObject({ diasReales: 1, nochesReales: 0 });
    expect(r.reintegroViajeCorto).toBe(4 * 335_520);
  });

  it('un viaje más largo no genera reintegro negativo ni mayor pago', () => {
    expect(calcularViajeReal('2026-09-13', '2026-09-19', LIQ).reintegroViajeCorto).toBe(0);
  });

  it('comisión planeada sin pernocta que se cumplió igual: sin reintegro', () => {
    const sinPernocta = { ...LIQ, diasPernoctados: 0, totalPernoctados: 0 };
    expect(calcularViajeReal('2026-09-01', '2026-09-01', sinPernocta).reintegroViajeCorto).toBe(0);
  });

  it('nunca reintegra más de lo pagado', () => {
    expect(calcularViajeReal('2026-09-14', '2026-09-14', { ...LIQ, valorPagado: 100_000 }).reintegroViajeCorto).toBe(100_000);
  });

  it('sin tarifas en la liquidación no se puede calcular: null, no cero', () => {
    const r = calcularViajeReal('2026-09-14', '2026-09-17', { ...LIQ, tarifaDiaPernoctado: null });
    expect(r.reintegroViajeCorto).toBeNull();
    expect(r.diasReales).toBe(4);
  });

  it('liquidación en ceros (valores por omisión de la 448): tampoco se puede calcular', () => {
    const ceros = { diasPernoctados: 0, tarifaDiaPernoctado: 0, tarifaDiaNoPernoctado: 0, totalPernoctados: 0, totalNoPernoctados: 0, valorPagado: 500_000 };
    expect(calcularViajeReal('2026-09-14', '2026-09-15', ceros).reintegroViajeCorto).toBeNull();
  });

  it('acepta los numéricos como texto, como los devuelve PostgreSQL', () => {
    const texto = {
      diasPernoctados: '4.00', tarifaDiaPernoctado: '335520.00', tarifaDiaNoPernoctado: '167760.00',
      totalPernoctados: '1342080.00', totalNoPernoctados: '167760.00', valorPagado: '2000000.00',
    } as unknown as LiquidacionPagada;
    expect(calcularViajeReal('2026-09-14', '2026-09-17', texto).reintegroViajeCorto).toBe(335_520);
  });
});

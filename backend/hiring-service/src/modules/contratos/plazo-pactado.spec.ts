import { diasDelPlazo, leerPlazoPactado, plazoEnPalabras, ultimoDiaDelPlazo } from './plazo-pactado';

/** El plazo de la 8.1 en días, meses, años o fecha cierta (sesión de QA del 04/11, EFDS-1162). */
describe('plazo pactado del contrato', () => {
  it('acepta un número con su unidad', () => {
    expect(leerPlazoPactado({ plazoUnidad: 'MESES', plazoCantidad: 6 })).toEqual({
      plazo: { unidad: 'MESES', cantidad: 6, fechaFin: null, dias: null },
    });
  });

  it('en días ya sabe cuántos son', () => {
    expect(leerPlazoPactado({ plazoUnidad: 'DIAS', plazoCantidad: 90 })).toEqual({
      plazo: { unidad: 'DIAS', cantidad: 90, fechaFin: null, dias: 90 },
    });
  });

  it('acepta una fecha cierta', () => {
    expect(leerPlazoPactado({ plazoFechaFin: '2026-12-31' })).toEqual({
      plazo: { unidad: null, cantidad: null, fechaFin: '2026-12-31', dias: null },
    });
  });

  it('no deja pactar las dos formas a la vez', () => {
    expect(leerPlazoPactado({ plazoUnidad: 'DIAS', plazoCantidad: 3, plazoFechaFin: '2026-12-31' })).toHaveProperty(
      'error',
    );
  });

  it('pide número y unidad juntos', () => {
    expect(leerPlazoPactado({ plazoUnidad: 'MESES' })).toHaveProperty('error');
  });

  it('sigue aceptando la forma de antes, solo días', () => {
    expect(leerPlazoPactado({ plazoDias: 30 })).toEqual({
      plazo: { unidad: 'DIAS', cantidad: 30, fechaFin: null, dias: 30 },
    });
  });

  it('cuenta el día de inicio dentro del plazo', () => {
    expect(ultimoDiaDelPlazo('2026-03-01', { unidad: 'DIAS', cantidad: 30, fechaFin: null })).toBe('2026-03-30');
    expect(ultimoDiaDelPlazo('2026-03-15', { unidad: 'MESES', cantidad: 6, fechaFin: null })).toBe('2026-09-14');
    expect(ultimoDiaDelPlazo('2026-01-31', { unidad: 'MESES', cantidad: 1, fechaFin: null })).toBe('2026-02-28');
    expect(ultimoDiaDelPlazo('2026-02-01', { unidad: 'ANIOS', cantidad: 1, fechaFin: null })).toBe('2027-01-31');
  });

  it('convierte a días desde el acta de inicio', () => {
    expect(diasDelPlazo('2026-11-01', { unidad: null, cantidad: null, fechaFin: '2026-12-31' })).toBe(61);
    expect(diasDelPlazo('2026-03-15', { unidad: 'MESES', cantidad: 6, fechaFin: null })).toBe(184);
    // Una fecha cierta anterior al inicio no da un plazo negativo.
    expect(diasDelPlazo('2027-01-10', { unidad: null, cantidad: null, fechaFin: '2026-12-31' })).toBeNull();
  });

  it('se lee como se pactó', () => {
    expect(plazoEnPalabras({ unidad: 'MESES', cantidad: 6, fechaFin: null })).toBe('6 meses');
    expect(plazoEnPalabras({ unidad: 'ANIOS', cantidad: 1, fechaFin: null })).toBe('1 año');
    expect(plazoEnPalabras({ unidad: null, cantidad: null, fechaFin: '2026-12-31' })).toBe('hasta el 2026-12-31');
  });
});

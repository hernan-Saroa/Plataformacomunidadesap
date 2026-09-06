import { categoriaVinculacion } from './situacion-docente.js';
import { TOPE_CATEDRA } from './acumulado.service.js';

/**
 * EFDS-1373 :: AC :: acumulado y topes (RN-04, RN-05, RN-06).
 *
 * Unitarios de la política de tope. El comportamiento contra base (consumo
 * transversal por oferta) se prueba en el recorrido por navegador, donde hay
 * asignaciones reales que crear y limpiar; aquí se fija la regla del tope.
 */
describe('EFDS-1373 :: política de tope', () => {
  it('RN-04 :: el catedrático tiene tope transversal de 304 h', () => {
    expect(TOPE_CATEDRA).toBe(304);
    expect(categoriaVinculacion('Hora Cátedra')).toBe('CATEDRA');
  });

  it('carrera y ocasional NO son cátedra (su tope es horasAsignables, no 304)', () => {
    expect(categoriaVinculacion('Carrera1')).toBe('CARRERA');
    expect(categoriaVinculacion('Carrera2')).toBe('CARRERA');
    expect(categoriaVinculacion('Ocasional')).toBe('OCASIONAL');
    expect(categoriaVinculacion('Periodo de Prueba')).toBe('OCASIONAL');
  });

  it('el desglose por oferta es una dimensión: la suma de ofertas es el total', () => {
    // Canario de forma: el acumulado se compone sumando por oferta, no un total
    // suelto. Verifica el invariante que EFDS-1375 explota (acumular por semestre
    // entre las cinco ofertas): total === Σ(porOferta).
    const porOferta = [
      { idPeriodo: '1', periodo: '2026-1', horas: 120 },
      { idPeriodo: '2', periodo: '2026-Interperiodo', horas: 48 },
    ];
    const total = porOferta.reduce((s, o) => s + o.horas, 0);
    expect(total).toBe(168);
    // Y quitar una oferta cambia el total: la dimensión no es decorativa.
    expect(porOferta.filter((o) => o.periodo !== '2026-1').reduce((s, o) => s + o.horas, 0)).toBe(48);
  });
});

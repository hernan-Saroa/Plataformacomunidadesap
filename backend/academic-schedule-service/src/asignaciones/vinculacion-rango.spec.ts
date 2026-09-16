import { periodoDentroDeVinculacion } from './reglas-asignacion.js';

/**
 * EFDS-1376 :: AC-02 :: rango de vinculación (RN-10).
 *
 * ⚠️ NO se reimplementa la validación: el AC-04 de 1372 y el AC-02 de 1376 son la
 * MISMA regla. Va una sola vez, en `periodoDentroDeVinculacion` (1372). Aquí se
 * verifica que 1376 la reutiliza y que el caso de "indefinido" no se trata como
 * fecha faltante — son 104 de 263 docentes.
 */
describe('EFDS-1376 :: RN-10 :: rango de vinculación (reutiliza 1372)', () => {
  const grupo = { fechaInicio: '2026-02-01', fechaFin: '2026-06-15' };

  it('AC-02 :: el grupo cabe dentro de la vinculación ⇒ cumple', () => {
    const r = periodoDentroDeVinculacion(grupo, { vinculacionDesde: '2025-01-01', vinculacionHasta: '2026-12-31' });
    expect(r.cumple).toBe(true);
  });

  it('AC-02 :: el grupo termina después del fin de vinculación ⇒ no cumple, con motivo', () => {
    const r = periodoDentroDeVinculacion(grupo, { vinculacionDesde: '2025-01-01', vinculacionHasta: '2026-03-01' });
    expect(r.cumple).toBe(false);
    expect(r.motivo).toContain('2026-03-01');
  });

  it('AC-02 :: vinculación "hasta" INDEFINIDA (null) ⇒ cumple, no es fecha faltante', () => {
    // El inverso del error: null es indefinida, no dato faltante. Tratarlo como
    // faltante rechazaría a 104 de 263 docentes.
    const r = periodoDentroDeVinculacion(grupo, { vinculacionDesde: '2025-01-01', vinculacionHasta: null });
    expect(r.cumple).toBe(true);
  });

  it('AC-02 :: el grupo empieza antes del inicio de vinculación ⇒ no cumple', () => {
    const r = periodoDentroDeVinculacion(grupo, { vinculacionDesde: '2026-03-01', vinculacionHasta: null });
    expect(r.cumple).toBe(false);
  });
});

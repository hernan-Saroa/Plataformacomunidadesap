import { categoriaVinculacion, factorVinculacion } from './factor-vinculacion';

/**
 * EFDS-1373 :: AC :: RN-03 — factor de vinculación.
 */
describe('EFDS-1373 :: RN-03 :: factor de vinculación', () => {
  it('cátedra de PREGRADO ⇒ ×1', () => {
    expect(factorVinculacion('Hora Cátedra', true)).toEqual({ factor: 1, categoria: 'CATEDRA' });
    expect(factorVinculacion('Catedra', true).factor).toBe(1);
  });

  it('cátedra en POSGRADO ⇒ ×3 (la ×1 es solo pregrado)', () => {
    expect(factorVinculacion('Hora Cátedra', false).factor).toBe(3);
  });

  it('carrera y ocasional ⇒ ×3 en cualquier nivel', () => {
    expect(factorVinculacion('Carrera1', true).factor).toBe(3);
    expect(factorVinculacion('Carrera2', true).factor).toBe(3);
    expect(factorVinculacion('Ocasional', true).factor).toBe(3);
  });

  it('vinculación no reconocida ⇒ ×3 (conservador para el tope)', () => {
    expect(factorVinculacion('Especial', true).factor).toBe(3);
    expect(factorVinculacion(null, true).factor).toBe(3);
    expect(factorVinculacion('Visitante', true).factor).toBe(3);
  });

  it('categoriaVinculacion normaliza tildes y variantes', () => {
    expect(categoriaVinculacion('Hora Cátedra')).toBe('CATEDRA');
    expect(categoriaVinculacion('CARRERA2')).toBe('CARRERA');
    expect(categoriaVinculacion('Periodo de Prueba')).toBe('OCASIONAL');
  });
});

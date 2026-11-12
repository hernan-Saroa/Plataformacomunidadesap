import { clearsObservaciones, countsAsFieldChange } from './rund-campo-vacio';

describe('vaciar Observaciones al editar un perfil (HU 1365)', () => {
  it.each([null, '', '   '])('la edición MODAL con %p vacía el campo', (value) => {
    expect(clearsObservaciones({ canal_origen: 'MODAL', observaciones: value }, null, true)).toBe(true);
  });

  it('no vacía si el campo no viene en la solicitud', () => {
    expect(clearsObservaciones({ canal_origen: 'MODAL' }, null, true)).toBe(false);
  });

  it('no vacía si trae texto o si el normalizador generó observaciones propias', () => {
    expect(clearsObservaciones({ canal_origen: 'MODAL', observaciones: 'nota' }, 'nota', true)).toBe(false);
    expect(clearsObservaciones({ canal_origen: 'MODAL', observaciones: '' }, 'generada', true)).toBe(false);
  });

  it.each(['MASIVO', 'AUTOGESTION', undefined])('la carga por %p conserva el valor existente', (canal) => {
    expect(clearsObservaciones({ canal_origen: canal, observaciones: null }, null, true)).toBe(false);
  });

  it('un perfil nuevo no tiene nada que vaciar', () => {
    expect(clearsObservaciones({ canal_origen: 'MODAL', observaciones: null }, null, false)).toBe(false);
  });

  it('cuenta como cambio el vaciado explícito de Observaciones', () => {
    expect(countsAsFieldChange('observaciones', null, true, true)).toBe(true);
  });

  it('un nulo en cualquier otro campo, o sin vaciado explícito, sigue sin contar', () => {
    expect(countsAsFieldChange('observaciones', null, true, false)).toBe(false);
    expect(countsAsFieldChange('dedicacion', null, true, true)).toBe(false);
    expect(countsAsFieldChange('correoAlternativo', null, true, true)).toBe(false);
  });

  it('los valores con contenido cuentan solo si cambiaron, y undefined nunca', () => {
    expect(countsAsFieldChange('dedicacion', 'TC', true, false)).toBe(true);
    expect(countsAsFieldChange('dedicacion', 'TC', false, false)).toBe(false);
    expect(countsAsFieldChange('observaciones', undefined, true, true)).toBe(false);
    expect(countsAsFieldChange('observaciones', null, false, true)).toBe(false);
  });
});

import { esVacio } from './estudio-previo.service';

/**
 * El criterio 2 del HU depende por completo de esta función: si decide mal qué
 * campo está vacío, el sistema bloquea envíos correctos o deja pasar
 * incompletos. Los casos límite son el 0 y el false, que son valores
 * diligenciados aunque JavaScript los trate como falsy.
 */
describe('esVacio', () => {
  describe('campos numéricos', () => {
    it('trata el 0 como diligenciado', () => {
      // Un plazo de 0 días o un valor de 0 pesos son datos, no ausencias.
      expect(esVacio('numero', 0)).toBe(false);
      expect(esVacio('moneda', 0)).toBe(false);
    });

    it('trata los números negativos como diligenciados', () => {
      // Que el valor sea inválido es otra validación; aquí solo importa si hay dato.
      expect(esVacio('numero', -5)).toBe(false);
    });

    it('rechaza NaN', () => {
      // parseFloat('abc') llega como NaN y no es un valor utilizable.
      expect(esVacio('numero', Number.NaN)).toBe(true);
      expect(esVacio('moneda', Number.NaN)).toBe(true);
    });

    it('rechaza un número enviado como texto', () => {
      // El front debe convertir; si llega '100' el dato no es confiable.
      expect(esVacio('numero', '100')).toBe(true);
    });

    it('rechaza null y undefined', () => {
      expect(esVacio('numero', null)).toBe(true);
      expect(esVacio('moneda', undefined)).toBe(true);
    });
  });

  describe('campos de texto', () => {
    it('acepta texto con contenido', () => {
      expect(esVacio('texto', 'Adquisición de equipos')).toBe(false);
      expect(esVacio('texto_largo', 'Justificación de la necesidad')).toBe(false);
    });

    it('rechaza la cadena vacía', () => {
      expect(esVacio('texto', '')).toBe(true);
    });

    it('rechaza una cadena de solo espacios', () => {
      // Sin esto, dar a la barra espaciadora pasaría por diligenciar el campo.
      expect(esVacio('texto', '   ')).toBe(true);
      expect(esVacio('texto_largo', '\n\t  ')).toBe(true);
    });

    it('acepta texto con espacios alrededor', () => {
      expect(esVacio('texto', '  dato  ')).toBe(false);
    });

    it('rechaza null y undefined', () => {
      expect(esVacio('texto', null)).toBe(true);
      expect(esVacio('texto', undefined)).toBe(true);
    });
  });

  describe('campos de selección', () => {
    it('acepta una opción elegida', () => {
      expect(esVacio('seleccion', 'MINIMA_CUANTIA')).toBe(false);
    });

    it('rechaza la opción vacía del placeholder', () => {
      // El <option value=""> de "Selecciona…" no es una elección.
      expect(esVacio('seleccion', '')).toBe(true);
    });

    it('rechaza un arreglo vacío en selección múltiple', () => {
      expect(esVacio('seleccion', [])).toBe(true);
    });

    it('acepta un arreglo con al menos una opción', () => {
      expect(esVacio('seleccion', ['A'])).toBe(false);
      expect(esVacio('seleccion', ['A', 'B'])).toBe(false);
    });
  });

  it('rechaza un objeto en cualquier tipo', () => {
    // Un objeto suelto en `datos` es un error de cliente, no un valor.
    expect(esVacio('texto', {})).toBe(true);
    expect(esVacio('numero', {})).toBe(true);
  });
});

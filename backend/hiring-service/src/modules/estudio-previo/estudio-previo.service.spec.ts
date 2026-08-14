import { esFaltante, esVacio, jsonCanonico } from './estudio-previo.service';

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

/**
 * El snapshot que se guarda al enviar lleva un hash SHA-256 de su contenido:
 * es lo que le da valor probatorio al expediente, porque permite detectar si
 * el documento registrado se alteró después.
 *
 * Ese hash se calcula sobre este JSON. Si el mismo contenido produjera dos
 * cadenas distintas —por ejemplo al reordenarse las claves entre un guardado y
 * otro— el hash cambiaría sin que nadie hubiera modificado nada, y el
 * mecanismo entero dejaría de significar algo.
 */
describe('jsonCanonico', () => {
  it('da el mismo resultado con las claves en otro orden', () => {
    const a = { objeto: 'Equipos', valor: 100, area: 'TI' };
    const b = { area: 'TI', valor: 100, objeto: 'Equipos' };

    expect(jsonCanonico(a)).toBe(jsonCanonico(b));
  });

  it('ordena las claves alfabéticamente', () => {
    expect(jsonCanonico({ z: 1, a: 2 })).toBe('{"a":2,"z":1}');
  });

  it('ordena también las claves anidadas', () => {
    // Los datos del formulario llegan agrupados, así que el desorden puede
    // estar en cualquier nivel.
    const a = { datos: { z: 1, a: 2 } };
    const b = { datos: { a: 2, z: 1 } };

    expect(jsonCanonico(a)).toBe(jsonCanonico(b));
  });

  it('respeta el orden de los arreglos', () => {
    // A diferencia de las claves, el orden de un arreglo es información: dos
    // listas de supervisores en distinto orden no son el mismo dato.
    expect(jsonCanonico(['a', 'b'])).not.toBe(jsonCanonico(['b', 'a']));
  });

  it('distingue el 0 de la cadena vacía y del null', () => {
    // Tres formas de "sin valor" que deben producir hashes distintos.
    expect(jsonCanonico({ v: 0 })).not.toBe(jsonCanonico({ v: '' }));
    expect(jsonCanonico({ v: 0 })).not.toBe(jsonCanonico({ v: null }));
  });

  it('conserva null', () => {
    expect(jsonCanonico({ v: null })).toBe('{"v":null}');
  });

  it('serializa un formulario vacío de forma estable', () => {
    expect(jsonCanonico({})).toBe('{}');
  });

  it('detecta un cambio de valor', () => {
    // Lo contrario de los casos anteriores: si el contenido cambia, el hash
    // tiene que cambiar. Es lo que hace verificable el expediente.
    expect(jsonCanonico({ valor: 100 })).not.toBe(jsonCanonico({ valor: 200 }));
  });
});

/**
 * Decide qué campos bloquean el envío del estudio previo. Desde EFDS-1147 el
 * valor estimado se pide al crear el proceso y su campo del formulario quedó en
 * solo lectura: si siguiera contando como faltante, su valor nunca estaría en
 * el JSON de la actividad y ningún estudio previo podría enviarse jamás.
 */
describe('esFaltante', () => {
  const valorEstimado = {
    codigo: 'valor_estimado',
    tipo: 'moneda' as const,
    obligatorio: true,
    soloLectura: true,
  };

  it('no exige un campo de solo lectura ausente del formulario', () => {
    expect(esFaltante(valorEstimado, {})).toBe(false);
    expect(esFaltante(valorEstimado, { objeto: 'Compra de equipos' })).toBe(false);
  });

  it('tampoco lo exige cuando el backend lo inyecta desde el proceso', () => {
    // El GET devuelve el valor dentro de `datos` para que el front lo muestre.
    expect(esFaltante(valorEstimado, { valor_estimado: 45000000 })).toBe(false);
  });

  it('sigue exigiendo los obligatorios editables que están vacíos', () => {
    const objeto = { codigo: 'objeto', tipo: 'texto_largo' as const, obligatorio: true, soloLectura: false };
    expect(esFaltante(objeto, {})).toBe(true);
    expect(esFaltante(objeto, { objeto: '   ' })).toBe(true);
    expect(esFaltante(objeto, { objeto: 'Compra de equipos' })).toBe(false);
  });

  it('no exige los campos opcionales', () => {
    const ayuda = { codigo: 'observaciones', tipo: 'texto' as const, obligatorio: false, soloLectura: false };
    expect(esFaltante(ayuda, {})).toBe(false);
  });

  it('tolera una actividad sin datos', () => {
    const objeto = { codigo: 'objeto', tipo: 'texto' as const, obligatorio: true, soloLectura: false };
    expect(esFaltante(objeto, null)).toBe(true);
    expect(esFaltante(objeto, undefined)).toBe(true);
    // El de solo lectura no se cae ni siquiera sin datos.
    expect(esFaltante(valorEstimado, null)).toBe(false);
  });
});

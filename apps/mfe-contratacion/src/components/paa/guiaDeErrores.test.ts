import { describe, it, expect } from 'vitest';

import { agruparErrores, rangosDeFilas, tipoDeError } from './guiaDeErrores';

const h = (fila: number | null, columna: string | null, mensaje: string, valor: string | null = null) => ({ fila, columna, valor, mensaje });

describe('guía de errores del PAA', () => {
  it('reconoce los errores típicos de un Excel exportado de SECOP', () => {
    expect(tipoDeError(h(5, 'Descripción', 'La descripción no empieza por el código de la línea. Se espera «LINEA 12 - …».')).clave).toBe('prefijo');
    expect(tipoDeError(h(5, 'C', 'Se espera el nombre de un mes.')).clave).toBe('mes');
    expect(tipoDeError(h(5, 'F', 'Se espera «Días», «Meses» o «Años».')).clave).toBe('intervalo');
    expect(tipoDeError(h(5, 'K', 'Se espera «Sí» o «No».')).clave).toBe('si-no');
    expect(tipoDeError(h(5, 'G', 'La modalidad no corresponde a ninguna del catálogo. Si es un nombre nuevo…')).clave).toBe('modalidad');
    expect(tipoDeError(h(4, 'Descripción', 'El código LINEA 1 ya está en la fila 3. Con dos líneas…')).clave).toBe('codigo-repetido');
    expect(tipoDeError(h(2, 'Valor', 'Falta la columna «Valor total estimado» (se espera en la I).')).clave).toBe('columnas');
    expect(tipoDeError(h(3, null, 'Territorial Meta (META) está inactiva: actívala en Regiones…')).clave).toBe('region-inactiva');
  });

  it('un mensaje que no conoce sigue apareciendo, con su propio texto y sin consejo', () => {
    const t = tipoDeError(h(5, 'X', 'Algo nuevo que dice el lector.'));
    expect(t.titulo).toBe('Algo nuevo que dice el lector.');
    expect(t.comoSeCorrige).toBe('');
  });

  it('agrupa por tipo, del más frecuente al menos, con sus columnas y filas', () => {
    const grupos = agruparErrores([
      h(6, 'C', 'Se espera el nombre de un mes.'),
      h(5, 'C', 'Se espera el nombre de un mes.'),
      h(5, 'D', 'Se espera el nombre de un mes.'),
      h(5, 'K', 'Se espera «Sí» o «No».'),
    ]);
    expect(grupos.map((g) => g.tipo.clave)).toEqual(['mes', 'si-no']);
    expect(grupos[0].hallazgos).toHaveLength(3);
    expect(grupos[0].columnas).toEqual(['C', 'D']);
    expect(grupos[0].filas).toEqual([5, 6]);
  });

  it('resume las filas en tramos', () => {
    expect(rangosDeFilas([5, 6, 7, 9])).toBe('5 a 7, 9');
    expect(rangosDeFilas([1, 3, 5, 7, 9, 11, 13, 15], 3)).toBe('1, 3, 5 y 5 tramos más');
    expect(rangosDeFilas([])).toBe('');
  });
});

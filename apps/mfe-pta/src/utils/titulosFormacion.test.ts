import { describe, expect, it } from 'vitest';
import {
  armarTitulosAdicionales, limpiarTitulos, nivelTituloDeFila, titulosAdicionalesDe, titulosAdicionalesDeCampos, todosLosTitulos,
} from './titulosFormacion';

describe('RUND-003 · títulos por nivel de formación', () => {
  it('reconoce la fila del catálogo de cada nivel, con o sin tildes', () => {
    expect(nivelTituloDeFila('Pregrado')).toBe('pregrado');
    expect(nivelTituloDeFila('Especialización')).toBe('especializacion');
    expect(nivelTituloDeFila('Maestria')).toBe('maestria');
    expect(nivelTituloDeFila('Posdoctorado')).toBe('posDoctorado');
    expect(nivelTituloDeFila('Título del exterior')).toBeNull();
    expect(nivelTituloDeFila('Bachiller')).toBeNull();
  });

  it('limpia repetidos y el título precargado', () => {
    expect(limpiarTitulos(['Abogado', 'ABOGADO', ' ', 'Economista'], 'economista')).toEqual(['Abogado']);
  });

  it('lee los adicionales de registros anteriores sin romperse', () => {
    expect(titulosAdicionalesDe(undefined, 'pregrado')).toEqual([]);
    expect(titulosAdicionalesDe({ pregrado: ['Abogado'] }, 'pregrado')).toEqual(['Abogado']);
    expect(titulosAdicionalesDeCampos([{ campo: 'TITULOS_ADICIONALES', valor: { maestria: ['Magíster'] } }], 'maestria')).toEqual(['Magíster']);
    expect(titulosAdicionalesDeCampos(undefined, 'maestria')).toEqual([]);
  });

  it('arma el envío solo con niveles que tienen títulos y sin repetir el precargado', () => {
    expect(armarTitulosAdicionales(
      { pregrado: ['Economista', 'Abogado', ''], maestria: [''] },
      { pregrado: 'Economista', maestria: 'Magíster' },
    )).toEqual({ pregrado: ['Abogado'] });
  });

  it('el reporte incluye todos los títulos, el precargado primero', () => {
    expect(todosLosTitulos('Economista', ['Abogado', 'Politólogo'])).toBe('Economista; Abogado; Politólogo');
    expect(todosLosTitulos(null, ['Abogado'])).toBe('Abogado');
  });
});

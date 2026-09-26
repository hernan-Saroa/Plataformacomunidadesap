import { aplicaAlProceso, obligatoriosPendientes } from './requisitos';

describe('aplicaAlProceso', () => {
  const todos = { modalidades: [], tipologias: [] };

  it('sin alcance declarado aplica a cualquier proceso, incluso sin modalidad', () => {
    expect(aplicaAlProceso(todos, null, null)).toBe(true);
    expect(aplicaAlProceso(todos, 'MINIMA_CUANTIA', 'Suministro')).toBe(true);
  });

  it('con modalidades exige que el proceso esté en ellas', () => {
    const directa = { modalidades: ['CONTRATACION_DIRECTA'], tipologias: [] };
    expect(aplicaAlProceso(directa, 'CONTRATACION_DIRECTA', null)).toBe(true);
    expect(aplicaAlProceso(directa, 'LICITACION_PUBLICA', null)).toBe(false);
    expect(aplicaAlProceso(directa, null, null)).toBe(false);
  });

  it('con tipologías no aplica hasta que el área elige una de ellas', () => {
    const idoneidad = {
      modalidades: ['CONTRATACION_DIRECTA'],
      tipologias: ['Prestación de servicios profesionales y de apoyo a la gestión'],
    };
    expect(aplicaAlProceso(idoneidad, 'CONTRATACION_DIRECTA', null)).toBe(false);
    expect(aplicaAlProceso(idoneidad, 'CONTRATACION_DIRECTA', 'Arrendamiento')).toBe(false);
    expect(
      aplicaAlProceso(
        idoneidad,
        'CONTRATACION_DIRECTA',
        'Prestación de servicios profesionales y de apoyo a la gestión',
      ),
    ).toBe(true);
  });
});

describe('obligatoriosPendientes', () => {
  const lista = [
    { codigo: 'MEMORANDO', obligatorio: true },
    { codigo: 'LISTA', obligatorio: true },
    { codigo: 'ANEXO', obligatorio: false },
  ];

  it('devuelve los obligatorios sin entregar y nunca los opcionales', () => {
    expect(obligatoriosPendientes(lista, ['LISTA']).map((r) => r.codigo)).toEqual(['MEMORANDO']);
    expect(obligatoriosPendientes(lista, ['MEMORANDO', 'LISTA'])).toEqual([]);
  });

  it('una lista vacía no deja nada pendiente', () => {
    expect(obligatoriosPendientes([], [])).toEqual([]);
  });
});

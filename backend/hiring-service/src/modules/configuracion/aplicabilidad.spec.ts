import { EntityManager } from 'typeorm';

import { NUMERAL_SOBRE_ECONOMICO, excluidasPorElProceso } from './aplicabilidad';

/** Un EntityManager que solo sabe devolver la 3.1 con estos datos. */
const conEstudioPrevio = (datos: Record<string, unknown> | null) =>
  ({
    getRepository: () => ({
      findOne: async () => (datos === null ? null : { datos }),
    }),
  }) as unknown as EntityManager;

describe('excluidasPorElProceso · lo que el proceso no recorre por lo que es', () => {
  it('la licitación de obra pública abre el sobre en audiencia', async () => {
    const excluidas = await excluidasPorElProceso(
      conEstudioPrevio({ tipologia_contractual: 'Obra pública' }),
      'p-1',
    );
    expect(excluidas.has(NUMERAL_SOBRE_ECONOMICO)).toBe(false);
  });

  it('otra tipología no la abre, y el motivo la nombra', async () => {
    const excluidas = await excluidasPorElProceso(
      conEstudioPrevio({ tipologia_contractual: 'Suministro' }),
      'p-1',
    );
    expect(excluidas.get(NUMERAL_SOBRE_ECONOMICO)).toMatch(/«Suministro»/);
  });

  it('sin tipología elegida tampoco: abrir el sobre en audiencia es la excepción', async () => {
    expect((await excluidasPorElProceso(conEstudioPrevio({}), 'p-1')).has('7.1.1')).toBe(true);
    expect((await excluidasPorElProceso(conEstudioPrevio(null), 'p-1')).has('7.1.1')).toBe(true);
  });
});

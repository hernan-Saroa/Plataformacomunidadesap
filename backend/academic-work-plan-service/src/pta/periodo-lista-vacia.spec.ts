import { PeriodoAcademicoController } from './periodo-academico.controller';

/**
 * Consultar no escribe: con la base sin periodos, la lista sale vacía y no se
 * siembra nada (antes se creaba un «2025-2» en curso al consultar).
 */
describe('GET /periodos-academicos con la base sin periodos', () => {
  const armar = (filas: any[]) => {
    const repo: any = {
      find: jest.fn().mockResolvedValue(filas),
      create: jest.fn((x: any) => x),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    return { repo, controlador: new PeriodoAcademicoController(repo, {} as any, {} as any) };
  };

  it('devuelve la lista vacía y no escribe en la base', async () => {
    const { repo, controlador } = armar([]);
    await expect(controlador.list()).resolves.toEqual([]);
    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('con periodos, los devuelve tal cual (el principal antes del extraordinario) y tampoco escribe', async () => {
    const extra = { codigo: '2027-INT', estado: 'en_curso', extraordinario: true };
    const principal = { codigo: '2027-2', estado: 'en_curso', extraordinario: false };
    const { repo, controlador } = armar([extra, principal]);
    await expect(controlador.list()).resolves.toEqual([principal, extra]);
    expect(repo.save).not.toHaveBeenCalled();
  });
});

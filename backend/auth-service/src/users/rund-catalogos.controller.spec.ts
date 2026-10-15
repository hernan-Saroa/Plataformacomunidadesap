import { RundCatalogosController, RundCatalogosService } from './rund-catalogos.controller';

describe('Catálogo interno de seccionales Auth', () => {
  it('el banco recibe ID, nombre y código en orden de nombre sin filtros históricos', async () => {
    const items = [{ id: '9007199254740993', nombre: 'Histórica', codigo: '001' }, { id: '2', nombre: 'Otra', codigo: null }];
    const query = jest.fn().mockResolvedValue(items);
    const controller = new RundCatalogosController(new RundCatalogosService({ query } as any));
    await expect(controller.territorialesBanco()).resolves.toEqual({ items, total: 2 });
    expect(query.mock.calls[0][0]).toContain('cod_seccional AS codigo');
    expect(query.mock.calls[0][0]).toContain('ORDER BY nom_seccional ASC');
    expect(query.mock.calls[0][0]).not.toMatch(/WHERE|academic_work_plan|rund\./);
  });

  it('el banco distingue catálogo vacío de error de la fuente', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const service = new RundCatalogosService({ query } as any);
    await expect(service.territorialesBanco()).resolves.toEqual({ items: [], total: 0 });
    query.mockRejectedValue(new Error('fuente no disponible'));
    await expect(service.territorialesBanco()).rejects.toThrow('fuente no disponible');
  });
  it('devuelve únicamente ID textual y nombre, sin filtrar históricos o cambiar bigint', async () => {
    const items = [{ id: '9007199254740993', nombre: 'Histórica' }, { id: '2', nombre: 'Histórica' }];
    const query = jest.fn().mockResolvedValue(items);
    const controller = new RundCatalogosController(new RundCatalogosService({ query } as any));
    await expect(controller.seccionales()).resolves.toEqual({ items, total: 2 });
    expect(query.mock.calls[0][0]).toContain('id_seccional::text');
    expect(query.mock.calls[0][0]).not.toMatch(/WHERE|academic_work_plan|rund\./);
  });

  it('distingue catálogo vacío de fallo de la fuente', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const service = new RundCatalogosService({ query } as any);
    await expect(service.seccionales()).resolves.toEqual({ items: [], total: 0 });
    query.mockRejectedValue(new Error('base no disponible'));
    await expect(service.seccionales()).rejects.toThrow('base no disponible');
  });
});

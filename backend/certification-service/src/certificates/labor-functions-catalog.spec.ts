import { LaborFunctionsService } from './labor-functions.service';
import { LaborFunctionsController } from './labor-functions.controller';

describe('Local labor-function catalog (no aggregate employee queries)', () => {
  const profile = {
    id: 'profile', combined_code: '202812', position_code: '2028', grade_code: '12',
    position_name: 'Profesional', department_name: 'Dirección', internal_group: null,
    is_active: true, functions: [{ ordinal: 2, description: 'Dos' }, { ordinal: 1, description: 'Uno' }],
  };
  function fixture(profiles: any[] = [profile], enabled = true) {
    const requests = { find: jest.fn(() => { throw new Error('Must not read employee table'); }) };
    const oracle = {
      isEnabled: jest.fn(() => enabled),
      findSuggestedRequestsByPositionCodes: jest.fn(() => { throw new Error('Must not query Oracle'); }),
      findSuggestedRequestsBySearch: jest.fn(() => { throw new Error('Must not search Oracle'); }),
    };
    const profilesRepo = { find: jest.fn().mockResolvedValue(profiles), findOne: jest.fn().mockResolvedValue(profiles[0]) };
    const service = new LaborFunctionsService(profilesRepo as any, {} as any, requests as any, {} as any, oracle as any);
    return { service, profilesRepo, requests, oracle };
  }

  it.each([true, false])('lists, searches, selects and reads profiles without touching employees (Oracle=%s)', async enabled => {
    const { service, requests, oracle } = fixture([profile], enabled);
    const list = await service.list({ search: 'direccion' });
    expect(list.total).toBe(1);
    expect(list.stats).toEqual({ profiles: 1, functions: 2 });
    expect(list.items[0]).not.toHaveProperty('association_count');
    expect(list.items[0].functions.map(f => f.description)).toEqual(['Uno', 'Dos']);
    expect((await service.listAllForSelection()).total).toBe(1);
    expect((await service.findOne('profile')).function_count).toBe(2);
    expect(requests.find).not.toHaveBeenCalled();
    Object.values(oracle).forEach(fn => expect(fn).not.toHaveBeenCalled());
  });

  it('does not cap the catalog at 10,000 rows or lose the last page', async () => {
    const profiles = Array.from({ length: 10025 }, (_, n) => ({ ...profile, id: `p${n}` }));
    const { service, oracle, requests } = fixture(profiles);
    const list = await service.list({ page: 101, limit: 100 });
    expect(list.total).toBe(10025);
    expect(list.items).toHaveLength(25);
    expect(list.stats.functions).toBe(20050);
    expect(list.items[24].id).toBe('p10024');
    expect(requests.find).not.toHaveBeenCalled();
    expect(oracle.isEnabled).not.toHaveBeenCalled();
  });

  it('reports local database errors rather than claiming the catalog is empty', async () => {
    const { service, profilesRepo } = fixture();
    profilesRepo.find.mockRejectedValue(new Error('PG unavailable'));
    await expect(service.list()).rejects.toThrow('PG unavailable');
  });

  it('no longer exposes the expensive associations operation', () => {
    expect((LaborFunctionsService.prototype as any).listAssociations).toBeUndefined();
    expect((LaborFunctionsController.prototype as any).listAssociations).toBeUndefined();
  });

  it('keeps the catalog permission check', async () => {
    const { service } = fixture();
    // Consultar el catalogo exige el permiso de lectura (o el de gestion, que
    // lo incluye): sin ninguno de los dos no se llega al servicio.
    const permissions = {
      assertRequestAnyPermission: jest.fn().mockRejectedValue(new Error('denied')),
      assertRequestPermission: jest.fn().mockRejectedValue(new Error('denied')),
    };
    const controller = new LaborFunctionsController(service, permissions as any, {} as any);
    const list = jest.spyOn(service, 'list');
    await expect(controller.list({})).rejects.toThrow('denied');
    expect(permissions.assertRequestAnyPermission).toHaveBeenCalledWith(
      {},
      [
        'certificados-laborales.functions.view',
        'certificados-laborales.functions.manage',
      ],
      expect.any(String),
    );
    expect(list).not.toHaveBeenCalled();
  });
});

import { resolveRundRequestPermissions } from './rund-effective-permissions';

describe('Permisos efectivos RUND por propietario Auth', () => {
  it('normaliza roles firmados, deduplica y descarta permisos del JWT/body y códigos ajenos al catálogo', async () => {
    const identities = { permisosRoles: jest.fn().mockResolvedValue(['rund.view', '*', 'otro.admin', 'rund.view']) };
    const request = { user: { roles: [' lector ', { code: 'LECTOR' }, { code: 'otro' }] , permissions: ['rund.admin'] },
      body: { roles: ['SUPER_ADMIN'], permissions: ['rund.admin'] }, rundPermissions: new Set(['rund.admin']) };
    expect(await resolveRundRequestPermissions(identities as any, request)).toEqual(new Set(['rund.view']));
    expect(identities.permisosRoles).toHaveBeenCalledWith(['LECTOR', 'OTRO']);
  });
  it('sin roles no consulta Auth ni toma permisos declarados', async () => {
    const identities = { permisosRoles: jest.fn() };
    expect(await resolveRundRequestPermissions(identities as any, { user: { roles: [], permissions: ['*'] } })).toEqual(new Set());
    expect(identities.permisosRoles).not.toHaveBeenCalled();
  });
  it('comparte la promesa de una solicitud entre consumidores concurrentes y refresca en otra solicitud', async () => {
    const identities = { permisosRoles: jest.fn().mockResolvedValue(['rund.view']) }, user = { roles: ['LECTOR'] }, request = { user };
    const first = resolveRundRequestPermissions(identities as any, request);
    expect(resolveRundRequestPermissions(identities as any, request)).toBe(first);
    expect(await first).toEqual(new Set(['rund.view'])); expect(identities.permisosRoles).toHaveBeenCalledTimes(1);
    identities.permisosRoles.mockResolvedValue([]);
    expect(await resolveRundRequestPermissions(identities as any, { user })).toEqual(new Set());
    expect(identities.permisosRoles).toHaveBeenCalledTimes(2);
  });
  it('no reintenta ni amplía permisos tras falla en la misma solicitud y recupera en la siguiente', async () => {
    const identities = { permisosRoles: jest.fn().mockRejectedValue(new Error('privado')) }, user = { roles: ['LECTOR'] }, request = { user };
    expect(await resolveRundRequestPermissions(identities as any, request)).toEqual(new Set());
    identities.permisosRoles.mockResolvedValue(['rund.view']);
    expect(await resolveRundRequestPermissions(identities as any, request)).toEqual(new Set());
    expect(identities.permisosRoles).toHaveBeenCalledTimes(1);
    expect(await resolveRundRequestPermissions(identities as any, { user })).toEqual(new Set(['rund.view']));
  });
});

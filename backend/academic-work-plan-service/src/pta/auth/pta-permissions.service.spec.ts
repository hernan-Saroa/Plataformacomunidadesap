import { PtaPermissionsService } from './pta-permissions.service';
import { PtaAuthGuard } from './pta-auth.guard';

describe('permisos vigentes de las decisiones PTA', () => {
  it('reconoce los permisos territoriales por nivel del rol personalizado', async () => {
    const query = jest.fn().mockResolvedValue([
      { role_code: 'APROBAR_PTA_2', permission_code: 'pta.approve.academica.territorial.pregrado' },
      { role_code: 'APROBAR_PTA_2', permission_code: 'pta.approve.academica.territorial.posgrado' },
      { role_code: 'APROBAR_PTA_2', permission_code: 'pta.review.academica.territorial.pregrado' },
    ]);
    const service = new PtaPermissionsService({ query } as any);
    const ctx = await service.resolveForUser('user-1');
    expect(ctx.allowedComponents).toEqual(['academica_territorial']);
    expect(ctx.allowedNivelesTerritorialAprobar).toEqual(['pregrado', 'posgrado']);
    expect(ctx.allowedReviewSubsecciones).toContain('academica_territorial:general');
    expect(ctx.allowedNivelesTerritorialRevisar).toEqual(['pregrado']);
    expect(query.mock.calls[0][1]).toEqual(['user-1']);
  });

  it('aplica inmediatamente altas y revocaciones sin reutilizar la caché del rol', async () => {
    const query = jest.fn().mockResolvedValueOnce([{ role_code: 'ROL', permission_code: 'pta.approve.academica.pregrado' }])
      .mockResolvedValueOnce([{ role_code: 'ROL', permission_code: null }]);
    const service = new PtaPermissionsService({ query } as any);
    expect((await service.resolveForUser('user-1')).allowedComponents).toContain('academica_pregrado');
    expect((await service.resolveForUser('user-1')).allowedComponents).toEqual([]);
  });

  it('no concede permisos a una cuenta sin roles activos ni cuando falla la consulta', async () => {
    const query = jest.fn().mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('DB no disponible'));
    const service = new PtaPermissionsService({ query } as any);
    expect((await service.resolveForUser('user-1')).isSuperUser).toBe(false);
    await expect(service.resolveForUser('user-1')).rejects.toThrow('No fue posible verificar sus permisos');
  });

  it('el guard usa la identidad firmada y los roles actuales, no un rol antiguo del token', async () => {
    const permissions = {
      resolveForUser: jest.fn().mockResolvedValue({ roles: ['ROL_ACTUAL'], isSuperUser: false, allowedComponents: [] }),
      resolvePersonalScopeForUser: jest.fn().mockResolvedValue({ territorialIds: ['900014'], cetapIds: ['169', 'Granada'] }),
    };
    const jwt = { verify: jest.fn().mockReturnValue({ sub: 'user-1', roles: ['SUPER_ADMIN'] }) };
    const guard = new PtaAuthGuard(jwt as any, permissions as any);
    const req: any = { headers: { authorization: 'Bearer signed-token' } };
    await guard.canActivate({ switchToHttp: () => ({ getRequest: () => req }) } as any);
    expect(permissions.resolveForUser).toHaveBeenCalledWith('user-1');
    expect(permissions.resolvePersonalScopeForUser).toHaveBeenCalledWith('user-1');
    expect(req.ptaAuth).toMatchObject({ roles: ['ROL_ACTUAL'], isSuperUser: false, territorialIds: ['900014'], cetapIds: ['169', 'Granada'] });
  });
});

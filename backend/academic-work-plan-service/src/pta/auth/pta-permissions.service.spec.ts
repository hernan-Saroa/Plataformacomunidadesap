import { PtaPermissionsService } from './pta-permissions.service';
import { PtaAuthGuard, PtaRoleAccessGuard } from './pta-auth.guard';

describe('permisos vigentes de las decisiones PTA', () => {
  it('consulta roles sin exigir una ficha territorial, pero conserva esa validación en las decisiones', async () => {
    const permissions = {
      resolveForUser: jest.fn().mockResolvedValue({ roles: ['REVISOR'], isSuperUser: false,
        permissions: new Set(['pta.backoffice.seguimiento']) }),
      resolvePersonalScopeForUser: jest.fn().mockRejectedValue(new Error('Persona no vinculada')),
    };
    const jwt = { verify: jest.fn().mockReturnValue({ sub: 'cuenta', roles: ['SUPER_ADMIN'] }) };
    const request: any = { headers: { cookie: 'esap_access_token=token-firmado' } };
    const context: any = { switchToHttp: () => ({ getRequest: () => request }) };
    await expect(new PtaRoleAccessGuard(jwt as any, permissions as any).canActivate(context)).resolves.toBe(true);
    expect(request.ptaAuth).toMatchObject({ userId: 'cuenta', roles: ['REVISOR'], isSuperUser: false });
    expect(permissions.resolvePersonalScopeForUser).not.toHaveBeenCalled();
    await expect(new PtaAuthGuard(jwt as any, permissions as any).canActivate(context)).rejects.toThrow('Persona no vinculada');
    expect(permissions.resolvePersonalScopeForUser).toHaveBeenCalledWith('cuenta');
  });

  it.each(['sin-token', 'invalido', 'sin-cuenta', 'revocado'])('la consulta de roles rechaza una sesión %s', async mode => {
    const permissions = { resolveForUser: jest.fn().mockRejectedValue(new Error('Cuenta revocada')) };
    const jwt = { verify: jest.fn(() => {
      if (mode === 'invalido') throw new Error('Firma inválida');
      return mode === 'sin-cuenta' ? {} : { sub: 'cuenta' };
    }) };
    const request = { headers: mode === 'sin-token' ? {} : { authorization: 'Bearer token' } };
    await expect(new PtaRoleAccessGuard(jwt as any, permissions as any).canActivate({
      switchToHttp: () => ({ getRequest: () => request }),
    } as any)).rejects.toThrow();
    if (mode !== 'revocado') expect(permissions.resolveForUser).not.toHaveBeenCalled();
  });
  it('Seguimiento suma los permisos de los roles activos y aplica altas y retiradas en el siguiente acceso', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      { role_code: 'REVISOR_TERRITORIAL', permission_code: 'pta.backoffice.seguimiento' },
      { role_code: 'REVISOR_TERRITORIAL', permission_code: 'pta.review.academica.territorial.pregrado' },
      { role_code: 'INVESTIGACION', permission_code: 'pta.approve.investigacion' },
    ]).mockResolvedValueOnce([
      { role_code: 'INVESTIGACION', permission_code: 'pta.approve.investigacion' },
    ]).mockResolvedValueOnce([]);
    const service = new PtaPermissionsService({ query } as any);
    const first = await service.resolveForUser('coordinador');
    expect(first.roles).toEqual(['REVISOR_TERRITORIAL', 'INVESTIGACION']);
    expect(first.permissions.has('pta.backoffice.seguimiento')).toBe(true);
    expect(first.allowedComponents).toEqual(['investigacion']);
    expect(first.allowedReviewSubsecciones).toEqual(['academica_territorial:general']);
    const removed = await service.resolveForUser('coordinador');
    expect(removed.permissions.has('pta.backoffice.seguimiento')).toBe(false);
    expect(removed.allowedReviewSubsecciones).toEqual([]);
    expect((await service.resolveForUser('coordinador')).permissions.size).toBe(0);
    expect(query).toHaveBeenCalledTimes(3);
    const sql = query.mock.calls[0][0];
    for (const activeCondition of ['ur.is_active', 'r.is_active', 'rp.is_active', 'p.is_active', 'u.is_active']) {
      expect(sql).toContain(`COALESCE(${activeCondition}, true) = true`);
    }
  });
  it.each([
    ['pta.review.academica.pregrado', 'academica_pregrado:general'],
    ['pta.review.investigacion', 'investigacion:general'],
    ['pta.review.extension.capacitacion', 'ext_capacitacion:general'],
    ['pta.review.complementarias.pregrado', 'complementarias_pregrado:docencia'],
    ['pta.review.complementarias.gestion_profesoral', 'complementarias_gestion_profesoral:docencia'],
    ['pta.review.complementarias.territorial.pregrado', 'complementarias_territorial:docencia'],
  ])('%s concede revisión únicamente sobre su componente', async (permissionCode, expectedScope) => {
    const query = jest.fn().mockResolvedValue([
      { role_code: 'REVISOR_COMPONENTE', permission_code: permissionCode },
    ]);
    const service = new PtaPermissionsService({ query } as any);

    const ctx = await service.resolveForUser('user-review');

    expect(ctx.allowedReviewSubsecciones).toContain(expectedScope);
    expect(ctx.allowedComponents).toEqual([]);
    expect(ctx.approvesAll).toBe(false);
  });

  it.each([
    ['pta.approve.academica.pregrado', 'academica_pregrado'],
    ['pta.approve.investigacion', 'investigacion'],
    ['pta.approve.extension.capacitacion', 'ext_capacitacion'],
    ['pta.approve.complementarias.pregrado', 'complementarias_pregrado'],
    ['pta.approve.complementarias.gestion_profesoral', 'complementarias_gestion_profesoral'],
    ['pta.approve.complementarias.territorial.pregrado', 'complementarias_territorial'],
  ])('%s concede aprobación pero no revisión de solicitudes', async (permissionCode, expectedComponent) => {
    const query = jest.fn().mockResolvedValue([
      { role_code: 'APROBADOR_COMPONENTE', permission_code: permissionCode },
    ]);
    const service = new PtaPermissionsService({ query } as any);

    const ctx = await service.resolveForUser('user-approve');

    expect(ctx.allowedComponents).toEqual([expectedComponent]);
    expect(ctx.allowedReviewSubsecciones).toEqual([]);
    expect(ctx.reviewsAll).toBe(false);
  });

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

  it('el nombre del rol y los permisos genéricos no conceden revisión de Gestión Profesoral', async () => {
    const service = new PtaPermissionsService({ query: jest.fn().mockResolvedValue([
      { role_code: 'GESTION_PROFESORAL', permission_code: 'pta.review.complementarias.docencia' },
      { role_code: 'GESTION_PROFESORAL', permission_code: 'pta.review.complementarias.academico_administrativas' },
    ]) } as any);
    const ctx = await service.resolveForUser('reviewer');
    expect(ctx.allowedReviewSubsecciones).not.toContain('complementarias_gestion_profesoral:docencia');
    expect(ctx.allowedReviewSubsecciones).not.toContain('complementarias_gestion_profesoral:academico_administrativas');
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

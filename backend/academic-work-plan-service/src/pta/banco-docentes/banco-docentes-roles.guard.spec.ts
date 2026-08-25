import { ForbiddenException } from '@nestjs/common';
import { BancoDocentesRolesGuard } from './banco-docentes-roles.guard';

function contextFor(user: any): any {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  };
}

describe('BancoDocentesRolesGuard', () => {
  it('normaliza exclusivamente los roles usados por RUND', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['DOCENTE']) };
    const guard = new BancoDocentesRolesGuard(reflector as any);

    expect(guard.canActivate(contextFor({ roles: ['Docente'] }))).toBe(true);
    expect(guard.canActivate(contextFor({ roles: [{ code: 'docente' }] }))).toBe(true);
  });

  it('rechaza un rol no autorizado', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['GESTION_PROFESORAL']) };
    const guard = new BancoDocentesRolesGuard(reflector as any);

    expect(() => guard.canActivate(contextFor({ roles: ['ADMIN'] })))
      .toThrow(ForbiddenException);
  });
});

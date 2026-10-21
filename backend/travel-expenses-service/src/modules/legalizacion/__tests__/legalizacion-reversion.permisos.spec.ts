import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../../../common/permissions.guard';
import { LegalizacionController } from '../legalizacion.controller';

/**
 * EFDS-1310 — Quién aprueba las reversiones de revisión: CONTROL_VIATICOS, el
 * mismo rol que hace la segunda revisión del analista (EFDS-1297). Los JWT solo
 * traen roles; el permiso sale del fallback de permissions.guard.ts.
 */
describe('EFDS-1310 — permiso para resolver reversiones de revisión', () => {
  const guard = new PermissionsGuard(new Reflector());
  const contexto = (handler: keyof LegalizacionController, user: any): any => ({
    getClass: () => LegalizacionController,
    getHandler: () => LegalizacionController.prototype[handler],
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  });

  it.each(['CONTROL_VIATICOS', 'ROL_CONTROL_VIATICOS'])('%s puede ver y resolver reversiones', (rol) => {
    expect(guard.canActivate(contexto('reversionesPendientes', { roles: [rol], permissions: [] }))).toBe(true);
    expect(guard.canActivate(contexto('resolverReversion', { roles: [rol], permissions: [] }))).toBe(true);
  });

  it.each(['ANALISTA', 'ENLACE_DEPENDENCIA', 'TESORERIA'])('%s no puede resolverlas', (rol) => {
    expect(() => guard.canActivate(contexto('resolverReversion', { roles: [rol], permissions: [] }))).toThrow();
  });

  it('el analista sí puede solicitarlas; CONTROL_VIATICOS no', () => {
    expect(guard.canActivate(contexto('solicitarReversion', { roles: ['ANALISTA'], permissions: [] }))).toBe(true);
    expect(() => guard.canActivate(contexto('solicitarReversion', { roles: ['CONTROL_VIATICOS'], permissions: [] }))).toThrow();
  });
});

import { GUARDS_METADATA, HEADERS_METADATA } from '@nestjs/common/constants';
import { PtaAuthGuard, PtaRoleAccessGuard } from './auth/pta-auth.guard';
import { PtaController } from './pta.controller';

describe('PtaController - protección de Seguimiento', () => {
  it('limita el guard informativo al endpoint que devuelve los permisos de la propia cuenta', () => {
    const methods = Object.getOwnPropertyNames(PtaController.prototype).filter(name => name !== 'constructor');
    expect(methods.filter(name => (Reflect.getMetadata(GUARDS_METADATA, (PtaController.prototype as any)[name]) || [])
      .includes(PtaRoleAccessGuard))).toEqual(['getCurrentRoleAccess']);
  });
  it('consulta permisos de la cuenta autenticada sin aceptar otro usuario ni usar caché', () => {
    const controller = new PtaController({} as any);
    const auth = { userId: 'coordinador', roles: ['REVISOR_TERRITORIAL'], isSuperUser: false,
      permissions: new Set(['pta.backoffice.seguimiento', 'pta.review.academica.territorial.pregrado']) };
    expect(controller.getCurrentRoleAccess({ ptaAuth: auth } as any)).toEqual({ success: true,
      data: { ...auth, permissions: [...auth.permissions] } });
    for (const method of ['getCurrentRoleAccess', 'getPtasConEvidencias', 'getEvidenciasSeguimiento']) {
      const handler = (PtaController.prototype as any)[method];
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(method === 'getCurrentRoleAccess' ? PtaRoleAccessGuard : PtaAuthGuard);
      expect(Reflect.getMetadata(HEADERS_METADATA, handler)).toContainEqual({ name: 'Cache-Control', value: 'private, no-store' });
    }
  });
  it.each(['getPtasConEvidencias', 'getEvidenciasSeguimiento', 'revisarEvidencia', 'revisarEvidenciaAlias'])('%s exige PtaAuthGuard', method => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, (PtaController.prototype as any)[method]) || [];
    expect(guards).toContain(PtaAuthGuard);
  });

  it('entrega el contexto autenticado al consultar evidencias desde el detalle administrativo', async () => {
    const ptaService = { getEvidenciasSeguimientoPTA: jest.fn().mockResolvedValue([]) } as any;
    const controller = new PtaController(ptaService);
    const auth = { userId: 'user-1', allowedComponents: ['investigacion'] } as any;

    await controller.getEvidenciasSeguimiento('pta-1', { ptaAuth: auth } as any);

    expect(ptaService.getEvidenciasSeguimientoPTA).toHaveBeenCalledWith('pta-1', auth);
  });

  it('entrega el contexto autenticado al servicio al decidir una evidencia', async () => {
    const ptaService = { revisarEvidenciaPTA: jest.fn().mockResolvedValue({ id: 'ev-1' }) } as any;
    const controller = new PtaController(ptaService);
    const auth = { userId: 'user-1', allowedComponents: ['investigacion'] } as any;

    await controller.revisarEvidencia('pta-1', 'ev-1', { decision: 'aprobado' }, { ptaAuth: auth } as any);

    expect(ptaService.revisarEvidenciaPTA).toHaveBeenCalledWith(
      'pta-1', 'ev-1', { decision: 'aprobado' }, auth,
    );
  });
});

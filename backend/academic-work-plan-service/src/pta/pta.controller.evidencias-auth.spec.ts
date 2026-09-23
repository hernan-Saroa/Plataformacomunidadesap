import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PtaAuthGuard } from './auth/pta-auth.guard';
import { PtaController } from './pta.controller';

describe('PtaController - protección de Seguimiento', () => {
  it.each(['getPtasConEvidencias', 'revisarEvidencia', 'revisarEvidenciaAlias'])('%s exige PtaAuthGuard', method => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, (PtaController.prototype as any)[method]) || [];
    expect(guards).toContain(PtaAuthGuard);
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

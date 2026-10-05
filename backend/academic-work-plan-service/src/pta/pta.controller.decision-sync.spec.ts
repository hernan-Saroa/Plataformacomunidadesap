import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PtaAuthGuard } from './auth/pta-auth.guard';
import { PtaController } from './pta.controller';

describe('sincronización de decisiones individuales con Gestión', () => {
  it.each(['aprobarComponente', 'revisarComponente'] as const)('%s entrega el estado personal del servidor después de guardar la decisión', async method => {
    const auth = { userId: 'aprobador', allowedComponents: ['investigacion'], roles: ['Docente'] } as any;
    const ptaActualizado = { id: 'pta-1', estado: 'Pendiente Jefatura',
      componentes_aprobacion_usuario: [{ componente: 'investigacion', estado: 'aprobado' }] };
    const data = { estadoGeneral: 'Pendiente Jefatura' };
    const service = { [method]: jest.fn().mockResolvedValue(data),
      getUpdatedGestionPta: jest.fn().mockResolvedValue(ptaActualizado) } as any;
    const controller = new PtaController(service);
    const body = { componente: 'investigacion', isSuperUser: true, allowedComponents: ['complementarias'] };

    const response = await controller[method]('pta-1', body, { ptaAuth: auth } as any);

    expect(Reflect.getMetadata(GUARDS_METADATA, controller[method])).toContain(PtaAuthGuard);
    expect(service[method]).toHaveBeenCalledWith('pta-1', body, auth);
    expect(service.getUpdatedGestionPta).toHaveBeenCalledWith('pta-1', auth);
    expect(service[method].mock.invocationCallOrder[0]).toBeLessThan(service.getUpdatedGestionPta.mock.invocationCallOrder[0]);
    expect(response).toEqual({ success: true, data: { ...data, ptaActualizado } });
  });

  it.each(['aprobarComponente', 'revisarComponente'] as const)('%s no consulta ni anuncia una decisión denegada', async method => {
    const error = new ForbiddenException('Fuera de alcance');
    const service = { [method]: jest.fn().mockRejectedValue(error), getUpdatedGestionPta: jest.fn() } as any;
    const controller = new PtaController(service);
    await expect(controller[method]('pta-1', {}, { ptaAuth: {} } as any)).rejects.toBe(error);
    expect(service.getUpdatedGestionPta).not.toHaveBeenCalled();
  });

  it.each(['aprobarComponente', 'revisarComponente'] as const)('%s conserva la confirmación si no se pudo consultar el estado personal', async method => {
    const data = { estadoGeneral: 'Pendiente Jefatura' };
    const service = { [method]: jest.fn().mockResolvedValue(data),
      getUpdatedGestionPta: jest.fn().mockResolvedValue(undefined) } as any;
    const controller = new PtaController(service);
    expect(await controller[method]('pta-1', {}, { ptaAuth: {} } as any)).toEqual({ success: true, data });
  });
});

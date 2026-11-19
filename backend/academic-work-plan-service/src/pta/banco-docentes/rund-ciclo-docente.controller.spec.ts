import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { BancoDocentesController } from './banco-docentes.controller';
import { RUND_PERMISSIONS, RUND_PERMISSIONS_KEY } from './rund-permissions';

const proto = BancoDocentesController.prototype as any;
const ruta = (handler: string) => ({
  path: Reflect.getMetadata(PATH_METADATA, proto[handler]),
  method: Reflect.getMetadata(METHOD_METADATA, proto[handler]),
});

describe('HU 2349 · rutas del ciclo del docente: solo GGP autorizado', () => {
  const escritura = ['decisionComiteIncorporacion', 'iniciarRecategorizacion', 'revisarRecategorizacion', 'decidirRecategorizacion'];

  it.each(escritura)('%s exige GESTION_PROFESORAL/SUPER_ADMIN y el permiso de gestión RUND (sin ADMIN ni DOCENTE)', (handler) => {
    const roles: string[] = Reflect.getMetadata('roles', proto[handler]);
    expect(roles).toEqual(expect.arrayContaining(['GESTION_PROFESORAL', 'SUPER_ADMIN']));
    expect(roles).not.toContain('DOCENTE');
    expect(roles).not.toContain('ADMIN');
    expect(Reflect.getMetadata(RUND_PERMISSIONS_KEY, proto[handler])).toEqual([RUND_PERMISSIONS.MANAGE]);
  });

  it('la consulta de recategorizaciones también exige el permiso de gestión y no es accesible al docente', () => {
    expect(Reflect.getMetadata(RUND_PERMISSIONS_KEY, proto.listarRecategorizaciones)).toEqual([RUND_PERMISSIONS.MANAGE]);
    expect(Reflect.getMetadata('roles', proto.listarRecategorizaciones)).not.toContain('DOCENTE');
  });

  it('las rutas y verbos son los que consume el front', () => {
    expect(ruta('decisionComiteIncorporacion')).toEqual({ path: ':id/ciclo/decision-comite', method: RequestMethod.POST });
    expect(ruta('listarRecategorizaciones')).toEqual({ path: ':id/recategorizaciones', method: RequestMethod.GET });
    expect(ruta('iniciarRecategorizacion')).toEqual({ path: ':id/recategorizaciones', method: RequestMethod.POST });
    expect(ruta('revisarRecategorizacion')).toEqual({ path: ':id/recategorizaciones/:recategorizacionId/revision', method: RequestMethod.POST });
    expect(ruta('decidirRecategorizacion')).toEqual({ path: ':id/recategorizaciones/:recategorizacionId/decision', method: RequestMethod.POST });
  });

  it('el controller pasa el actor y la IP del request al servicio (trazabilidad)', async () => {
    const service = {
      registrarDecisionIncorporacion: jest.fn().mockResolvedValue({ ok: true }),
      iniciarRecategorizacion: jest.fn().mockResolvedValue({ ok: true }),
      revisarRecategorizacion: jest.fn().mockResolvedValue({ ok: true }),
      decidirRecategorizacion: jest.fn().mockResolvedValue({ ok: true }),
      listarRecategorizaciones: jest.fn().mockResolvedValue([]),
    };
    const controller = new BancoDocentesController(service as any, {} as any);
    const req = { user: { userId: 'ggp-7', roles: ['GESTION_PROFESORAL'] }, headers: {}, ip: '10.1.1.1' };
    const body = { resultado: 'FAVORABLE' };

    await expect(controller.decisionComiteIncorporacion('d1', body, req)).resolves.toEqual({ success: true, data: { ok: true } });
    const [id, sent, actorId, ip] = service.registrarDecisionIncorporacion.mock.calls[0];
    expect([id, sent, ip]).toEqual(['d1', body, '10.1.1.1']);
    expect(actorId).toBeTruthy();

    await controller.iniciarRecategorizacion('d1', body, req);
    await controller.revisarRecategorizacion('d1', 'r1', body, req);
    await controller.decidirRecategorizacion('d1', 'r1', body, req);
    expect(service.revisarRecategorizacion.mock.calls[0].slice(0, 3)).toEqual(['d1', 'r1', body]);
    expect(service.decidirRecategorizacion.mock.calls[0].slice(0, 3)).toEqual(['d1', 'r1', body]);
    expect(service.decidirRecategorizacion.mock.calls[0][4]).toBe('10.1.1.1');

    await expect(controller.listarRecategorizaciones('d1', '2026-2')).resolves.toEqual({ success: true, data: [] });
    expect(service.listarRecategorizaciones).toHaveBeenCalledWith('d1', '2026-2');
  });
});

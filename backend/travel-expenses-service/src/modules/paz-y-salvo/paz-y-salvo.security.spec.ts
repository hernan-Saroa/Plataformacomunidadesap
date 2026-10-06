import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../../common/permissions.guard';
import { PazYSalvoController } from './paz-y-salvo.controller';
import { FirmaOtpClient } from './firma-otp.client';

describe('EFDS-1311 :: permisos y evidencia de firma', () => {
  const guard = new PermissionsGuard(new Reflector());
  function contexto(user: any): any {
    return { getClass: () => PazYSalvoController, getHandler: () => PazYSalvoController.prototype.firmar,
      switchToHttp: () => ({ getRequest: () => ({ user }) }) };
  }
  it.each(['ENLACE_DEPENDENCIA', 'ANALISTA', 'TESORERIA'])('AC-01 :: %s no emite certificados', role => {
    expect(() => guard.canActivate(contexto({ roles: [role], permissions: [] }))).toThrow();
  });
  it('AC-01 :: exige permiso específico a la coordinadora', () => {
    expect(guard.canActivate(contexto({ permissions: ['travel_expenses:paz_y_salvo.manage'] }))).toBe(true);
  });
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });
  it('AC-01 :: envía el contexto y acepta la respuesta real envuelta de auth', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ success: true, data: {
      context: 'documento', metodo: 'OTP_EMAIL', id: 'OTP-1', email: 'test@example.invalid', fechaFirma: new Date().toISOString(),
    } }) })) as any;
    await expect(new FirmaOtpClient().verificar('documento', '123456', { authorization: 'Bearer prueba' })).resolves.toMatchObject({ context: 'documento' });
    expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/signature-otp\/verify$/), expect.objectContaining({
      body: JSON.stringify({ context: 'documento', code: '123456' }),
    }));
  });
  it('AC-01 :: rechaza evidencia de otro documento aunque auth responda 200', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ context: 'otro', metodo: 'OTP_EMAIL' }) })) as any;
    await expect(new FirmaOtpClient().verificar('documento', '123456', {})).rejects.toThrow('no corresponde');
  });
  it('AC-01 :: no emite si auth no está disponible', async () => {
    global.fetch = jest.fn(async () => { throw new Error('sin red'); }) as any;
    await expect(new FirmaOtpClient().verificar('documento', '123456', {})).rejects.toThrow('contactar');
  });
});

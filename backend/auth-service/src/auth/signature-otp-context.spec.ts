import { AuthService } from './auth.service';

describe('EFDS-1311 :: AC-01 :: OTP ligado al documento', () => {
  const context = `paz-y-salvo:13110000-0000-4000-8000-000000009001:${'a'.repeat(64)}`;
  let user: any;
  let users: any;
  let service: AuthService;
  beforeEach(() => {
    user = { id_user: '13110000-0002-4000-8000-000000009001', token: '123456',
      signatureOtpContext: context, updated_at: new Date(), is_active: true, person: { email: 'test@example.invalid' } };
    users = { findById: jest.fn(async () => ({ ...user })), findByEmail: jest.fn(async () => ({ ...user })),
      setResetToken: jest.fn(async (_id, token, ctx) => { user.token = token; user.signatureOtpContext = ctx ?? null; }),
      consumeSignatureOtp: jest.fn(async (_id, token, ctx) => {
        if (user.token !== token || user.signatureOtpContext !== ctx) return false;
        user.token = null; user.signatureOtpContext = null; return true;
      }) };
    service = new AuthService(users, {} as any, {} as any);
  });
  const jwt = { userId: '13110000-0002-4000-8000-000000009001', email: 'test@example.invalid' };

  it('verifica el contexto y consume una sola vez', async () => {
    const result = await service.verifySignatureOtp(jwt, '123456', context);
    expect(result).toMatchObject({ context, metodo: 'OTP_EMAIL' });
    await expect(service.verifySignatureOtp(jwt, '123456', context)).rejects.toThrow();
  });
  it('impide cambiar de documento u omitir contexto', async () => {
    await expect(service.verifySignatureOtp(jwt, '123456', context.replace(/a/g, 'b'))).rejects.toThrow();
    await expect(service.verifySignatureOtp(jwt, '123456')).rejects.toThrow();
    expect(users.consumeSignatureOtp).not.toHaveBeenCalled();
  });
  it('un código de recuperación no autoriza un documento', async () => {
    user.signatureOtpContext = null;
    await expect(service.verifySignatureOtp(jwt, '123456', context)).rejects.toThrow();
  });
  it('un código de documento no recupera contraseña', async () => {
    await expect(service.verifyResetCode(jwt.email, '123456')).rejects.toThrow();
    await expect(service.resetPassword(jwt.email, '123456', 'nueva')).rejects.toThrow();
  });
  it('mantiene compatible la verificación antigua sin contexto', async () => {
    user.signatureOtpContext = null;
    await expect(service.verifySignatureOtp(jwt, '123456')).resolves.toMatchObject({ metodo: 'OTP_EMAIL' });
    expect(users.setResetToken).toHaveBeenCalledWith(user.id_user, null);
  });
  it('conserva la expiración de cinco minutos', async () => {
    user.updated_at = new Date(Date.now() - 301000);
    await expect(service.verifySignatureOtp(jwt, '123456', context)).rejects.toThrow('expiró');
  });
  it('rechaza código incorrecto', async () => {
    await expect(service.verifySignatureOtp(jwt, '000000', context)).rejects.toThrow('inválido');
  });
  it('dos verificaciones simultáneas solo producen una firma', async () => {
    const results = await Promise.allSettled([
      service.verifySignatureOtp(jwt, '123456', context), service.verifySignatureOtp(jwt, '123456', context),
    ]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  });
  it('solicita con contexto sin cambiar generación ni expiración', async () => {
    jest.spyOn(service as any, 'sendSignatureOtpEmail').mockResolvedValue(undefined);
    await expect(service.requestSignatureOtp(jwt, { context })).resolves.toMatchObject({ expiresInSeconds: 300 });
    expect(users.setResetToken).toHaveBeenCalledWith(user.id_user, expect.stringMatching(/^\d{6}$/), context);
  });
});

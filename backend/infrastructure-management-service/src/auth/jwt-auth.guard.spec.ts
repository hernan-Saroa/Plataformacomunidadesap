import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';

function montarGuard(opts) {
  opts = opts || {};
  const isPublic = opts.isPublic !== undefined ? opts.isPublic : false;
  const headers = opts.headers !== undefined ? opts.headers : {};
  const superReturnValue = opts.superReturnValue !== undefined ? opts.superReturnValue : true;
  const reflector = new Reflector();
  reflector.getAllAndOverride = jest.fn().mockReturnValue(isPublic ? true : undefined);
  const req = { headers };
  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({ getRequest: jest.fn().mockReturnValue(req) }),
  };

  const superMock = jest.fn().mockReturnValue(superReturnValue);
  const passportGuardPrototype = AuthGuard('jwt').prototype;
  const prototypeOriginal = Object.getOwnPropertyDescriptor(passportGuardPrototype, 'canActivate');
  Object.defineProperty(passportGuardPrototype, 'canActivate', {
    value: superMock,
    writable: true,
    configurable: true,
  });

  const guard = new JwtAuthGuard(reflector);
  return { guard, context, reflector, req, superMock, prototypeOriginal, passportGuardPrototype };
}

describe('JwtAuthGuard doble capa: Gateway x-user-* + Passport JWT fallback (fix 401 POST /mantenimiento)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('[Ruta @Public] (ej: POST evidencias/upload y GET catalogos/*) → retorna true sin tocar headers ni Passport JWT', async () => {
    const { guard, context, reflector, superMock } = montarGuard({ isPublic: true });
    const resultado = await guard.canActivate(context);
    expect(reflector.getAllAndOverride).toHaveBeenCalled();
    expect(superMock).not.toHaveBeenCalled();
    expect(resultado).toBe(true);
  });

  it('[Gateway reenvía headers x-user-*] llega x-user-id 746 + x-user-roles SUPER_ADMIN → pobla req.user a partir de headers, NO llama super.canActivate Passport JWT', async () => {
    const headers = {
      'x-user-id': '746',
      'x-user-name': 'Super Usuario ESAP',
      'x-user-email': 'superusuario@esap.edu',
      'x-user-roles': 'SUPER_ADMIN, GESTOR_MANTENIMIENTO',
    };
    const { guard, context, req, superMock } = montarGuard({ headers });
    const resultado = await guard.canActivate(context);
    expect(resultado).toBe(true);
    expect(superMock).not.toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe('746');
    expect(req.user.name).toBe('Super Usuario ESAP');
    expect(req.user.email).toBe('superusuario@esap.edu');
    expect(req.user.roles).toEqual(['SUPER_ADMIN', 'GESTOR_MANTENIMIENTO']);
  });

  it('[Petición directa sin gateway] SIN headers x-user-* SIN @Public → cae en super.canActivate() Passport JWT revalidación normal', async () => {
    const { guard, context, superMock } = montarGuard({ isPublic: false, headers: {}, superReturnValue: true });
    const resultado = await guard.canActivate(context);
    expect(superMock).toHaveBeenCalledTimes(1);
    expect(superMock).toHaveBeenCalledWith(context);
    expect(resultado).toBe(true);
  });

  it('x-user-roles con solo header singular x-user-role → también se parsea (alias compatibility gateway antiguo)', async () => {
    const headers = {
      'x-user-id': '22',
      'x-user-role': 'umi',
    };
    const { guard, context, req } = montarGuard({ headers });
    await guard.canActivate(context);
    expect(req.user.userId).toBe('22');
    expect(req.user.roles).toEqual(['umi']);
  });
});

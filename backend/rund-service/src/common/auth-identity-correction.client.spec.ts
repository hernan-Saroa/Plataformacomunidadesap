import { ServiceUnavailableException } from '@nestjs/common';
import { AuthIdentityCorrectionClient, AuthIdentityCorrectionConflict, authCorrection, authCorrectionFingerprint } from './auth-identity-correction.client';

const op = '11111111-1111-4111-8111-111111111111';
const persona = '22222222-2222-4222-8222-222222222222';
const sugerencia = '33333333-3333-4333-8333-333333333333';
const command = { version: 1 as const, operacionId: op, personaId: persona, campo: 'documentNumber' as const, valorPrevio: '1000000001', valorNuevo: '1000000002', actorId: 'actor-1', sugerenciaId: sugerencia };
// Mismo vector que el spec del propietario (auth-service): la huella debe ser idéntica en ambos servicios.
const VECTOR = '570551b11e1f5807637ca307ff724495265a688e5e722d5a40a96ced9ccce2b5';
const receipt = (extra: Record<string, unknown> = {}) => ({ operacionId: op, personaId: persona, campo: 'documentNumber', valorPrevio: '1000000001', valorNuevo: '1000000002',
  huella: VECTOR, estado: 'APLICADA', aplicadaEn: '2026-10-18T10:00:00.000Z', compensadaEn: null, ...extra });
const reply = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;
const originalFetch = global.fetch; const originalEnv = { ...process.env };
beforeEach(() => { process.env.INTERNAL_SERVICE_TOKEN = 'token-ficticio'; process.env.AUTH_SERVICE_URL = 'http://auth.test:3001'; delete process.env.AUTH_INTERNAL_SERVICE_TOKEN; });
afterEach(() => { global.fetch = originalFetch; process.env = { ...originalEnv }; });
const client = () => new AuthIdentityCorrectionClient();
const unavailable = (p: Promise<unknown>) => expect(p).rejects.toBeInstanceOf(ServiceUnavailableException);

describe('Cliente de correcciones de identidad de Auth', () => {
  it('la huella coincide con el vector compartido con el propietario y normaliza IDs', () => {
    expect(authCorrectionFingerprint(command)).toBe(VECTOR);
    expect(authCorrectionFingerprint({ ...command, operacionId: op.toUpperCase(), personaId: persona.toUpperCase() })).toBe(VECTOR);
    expect(Object.keys(authCorrection(command))).toEqual(['version', 'operacionId', 'personaId', 'campo', 'valorPrevio', 'valorNuevo', 'actorId', 'sugerenciaId']);
  });
  it('solo está habilitado con RUND_OCR_IDENTITY_VIA_AUTH_API=true', () => {
    delete process.env.RUND_OCR_IDENTITY_VIA_AUTH_API; expect(client().enabled).toBe(false);
    process.env.RUND_OCR_IDENTITY_VIA_AUTH_API = 'false'; expect(client().enabled).toBe(false);
    process.env.RUND_OCR_IDENTITY_VIA_AUTH_API = 'true'; expect(client().enabled).toBe(true);
  });
  it('aplica con token interno, sin redirecciones, el comando canónico y acepta el envoltorio de Auth', async () => {
    global.fetch = jest.fn().mockResolvedValue(reply({ success: true, data: { correccion: receipt() } })) as any;
    await expect(client().aplicar(command)).resolves.toEqual(receipt());
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://auth.test:3001/internal/rund/v1/personas/correcciones'); expect(init.method).toBe('POST'); expect(init.redirect).toBe('error');
    expect(init.headers['x-internal-service-token']).toBe('token-ficticio'); expect(JSON.parse(init.body)).toEqual(command);
  });
  it('acepta la respuesta sin envoltorio y usa el token propio de Auth cuando existe', async () => {
    process.env.AUTH_INTERNAL_SERVICE_TOKEN = 'token-auth';
    global.fetch = jest.fn().mockResolvedValue(reply({ correccion: receipt() })) as any;
    await client().aplicar(command);
    expect((global.fetch as jest.Mock).mock.calls[0][1].headers['x-internal-service-token']).toBe('token-auth');
  });
  it.each([['VALOR_PREVIO_CAMBIO'], ['DOCUMENTO_DUPLICADO'], ['OPERACION_DISTINTA'], ['CAMBIOS_POSTERIORES']])('un 409 con motivo %s es un rechazo de negocio tipado', async code => {
    global.fetch = jest.fn().mockResolvedValue(reply({ statusCode: 409, message: 'no', error: code }, 409)) as any;
    await expect(client().aplicar(command)).rejects.toMatchObject({ code });
    await expect(client().aplicar(command)).rejects.toBeInstanceOf(AuthIdentityCorrectionConflict);
  });
  it('un 409 sin motivo reconocido no se toma por rechazo de negocio', async () => {
    global.fetch = jest.fn().mockResolvedValue(reply({ statusCode: 409, message: 'x', error: 'Conflict' }, 409)) as any;
    await unavailable(client().aplicar(command));
  });
  it.each([
    ['HTTP 500', reply({}, 500)], ['envoltorio fallido', reply({ success: false, data: { correccion: receipt() } })], ['sin recibo', reply({ success: true, data: {} })],
    ['persona distinta', reply({ correccion: receipt({ personaId: '99999999-9999-4999-8999-999999999999' }) })],
    ['valor nuevo distinto', reply({ correccion: receipt({ valorNuevo: 'otro' }) })], ['huella distinta', reply({ correccion: receipt({ huella: 'a'.repeat(64) }) })],
    ['operación distinta', reply({ correccion: receipt({ operacionId: persona }) })], ['clave extra', reply({ correccion: receipt({ extra: 1 }) })],
    ['estado inesperado', reply({ correccion: receipt({ estado: 'COMPENSADA', compensadaEn: '2026-10-18T10:00:00.000Z' }) })],
    ['APLICADA con fecha de compensación', reply({ correccion: receipt({ compensadaEn: '2026-10-18T10:00:00.000Z' }) })], ['fecha inválida', reply({ correccion: receipt({ aplicadaEn: 'ayer' }) })],
  ])('aplicar: %s no es un éxito', async (_name, response) => {
    global.fetch = jest.fn().mockResolvedValue(response) as any;
    await unavailable(client().aplicar(command));
  });
  it('una caída de red, una URL no segura o la falta de token son 503', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('red')) as any; await unavailable(client().aplicar(command));
    process.env.AUTH_SERVICE_URL = 'http://user:pass@auth.test'; await unavailable(client().aplicar(command));
    process.env.AUTH_SERVICE_URL = 'ftp://auth.test'; await unavailable(client().aplicar(command));
    process.env.AUTH_SERVICE_URL = 'http://auth.test'; delete process.env.INTERNAL_SERVICE_TOKEN; await unavailable(client().aplicar(command));
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  it('consultar: ausencia explícita es null, existencia valida el recibo y lo inconsistente es 503', async () => {
    global.fetch = jest.fn().mockResolvedValue(reply({ data: { consulta: { operacionId: op }, encontrada: false, correccion: null } })) as any;
    await expect(client().consultar(op.toUpperCase())).resolves.toBeNull();
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('http://auth.test:3001/internal/rund/v1/personas/correcciones/' + op);
    global.fetch = jest.fn().mockResolvedValue(reply({ data: { consulta: { operacionId: op }, encontrada: true, correccion: receipt() } })) as any;
    await expect(client().consultar(op)).resolves.toEqual(receipt());
    for (const body of [{ consulta: { operacionId: persona }, encontrada: false, correccion: null }, { consulta: { operacionId: op }, encontrada: false, correccion: receipt() },
      { consulta: { operacionId: op }, encontrada: 'si', correccion: null }, { encontrada: false, correccion: null }]) {
      global.fetch = jest.fn().mockResolvedValue(reply({ data: body })) as any; await unavailable(client().consultar(op));
    }
    await unavailable(client().consultar('no-uuid'));
  });
  it('compensar exige la huella, recibo COMPENSADA con su fecha y no confunde un 404 con éxito', async () => {
    const done = receipt({ estado: 'COMPENSADA', compensadaEn: '2026-10-18T10:05:00.000Z' });
    global.fetch = jest.fn().mockResolvedValue(reply({ correccion: done })) as any;
    await expect(client().compensar(op, VECTOR)).resolves.toEqual(done);
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toEqual({ huella: VECTOR });
    global.fetch = jest.fn().mockResolvedValue(reply({ correccion: receipt() })) as any; await unavailable(client().compensar(op, VECTOR));
    global.fetch = jest.fn().mockResolvedValue(reply({}, 404)) as any; await unavailable(client().compensar(op, VECTOR));
    global.fetch = jest.fn() as any; await unavailable(client().compensar(op, 'corta')); await unavailable(client().compensar('x', VECTOR));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

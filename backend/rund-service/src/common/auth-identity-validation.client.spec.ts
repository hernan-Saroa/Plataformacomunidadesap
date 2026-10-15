import { ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import { AuthIdentityValidationClient, AuthIdentityValidationQuery } from './auth-identity-validation.client';

describe('Cliente de prevalidación Auth antes de separar escrituras', () => {
  const keys = ['AUTH_SERVICE_URL', 'AUTH_INTERNAL_SERVICE_TOKEN', 'INTERNAL_SERVICE_TOKEN', 'PTA_INTERNAL_SERVICE_TOKEN', 'JWT_SECRET'];
  let saved: Array<string | undefined>, original: typeof fetch, send: jest.Mock;
  const consulta: AuthIdentityValidationQuery = { version: 1, operacionId: '11111111-1111-4111-8111-111111111111', documento: ' 00.123 ', correo: 'prueba@example.test', resolverPorCorreo: false };
  const resultado = { personaId: '22222222-2222-4222-8222-222222222222', usuarioId: null,
    rolDocenteId: '33333333-3333-4333-8333-333333333333', coincidencia: 'documento', conflictoCorreo: false };
  const data = (result: any = resultado, query: any = consulta) => ({ consulta: query, resultado: result, reserva: false,
    huella: createHash('sha256').update(JSON.stringify([query.version, query.operacionId, query.documento, query.correo, query.resolverPorCorreo,
      result.personaId, result.usuarioId, result.rolDocenteId, result.coincidencia, result.conflictoCorreo])).digest('hex') });
  const response = (body: any, status = 200) => ({ ok: status >= 200 && status < 300, json: async () => body });
  beforeEach(() => {
    saved = keys.map(key => process.env[key]); original = global.fetch;
    process.env.AUTH_SERVICE_URL = 'http://auth.test/base/'; process.env.AUTH_INTERNAL_SERVICE_TOKEN = ' interno ';
    delete process.env.INTERNAL_SERVICE_TOKEN; process.env.PTA_INTERNAL_SERVICE_TOKEN = 'no-pta'; process.env.JWT_SECRET = 'no-jwt';
    send = jest.fn().mockResolvedValue(response({ success: true, data: data() })); global.fetch = send;
  });
  afterEach(() => { global.fetch = original; keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; }); });
  it('usa solo token Auth, sin JWT/cookie, con timeout, sin redirect y sin cambiar el ID de operación', async () => {
    expect(await new AuthIdentityValidationClient().validar(consulta)).toEqual(data());
    expect(send).toHaveBeenCalledWith('http://auth.test/base/internal/rund/v1/personas/escritura/validar', {
      method: 'POST', redirect: 'error', signal: expect.anything(), headers: { 'x-internal-service-token': 'interno', Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(consulta),
    });
  });
  it('ausencia, conflicto y rol no configurado se confirman como datos de prevalidación', async () => {
    const result = { personaId: null, usuarioId: null, rolDocenteId: null, coincidencia: 'ninguna', conflictoCorreo: true };
    send.mockResolvedValue(response(data(result))); expect((await new AuthIdentityValidationClient().validar(consulta)).resultado).toEqual(result);
  });
  it.each([{}, { ...consulta, version: 2 }, { ...consulta, operacionId: 'no-uuid' }, { ...consulta, documento: null },
    { ...consulta, correo: ' MAYUSCULAS@example.test ' }, { ...consulta, resolverPorCorreo: 'true' }, { ...consulta, commit: true }])('rechaza input incompatible antes de red %s', async input => {
    await expect(new AuthIdentityValidationClient().validar(input as any)).rejects.toBeInstanceOf(ServiceUnavailableException); expect(send).not.toHaveBeenCalled();
  });
  it.each([{}, { ...data(), reserva: true }, { ...data(), huella: '0'.repeat(64) }, { ...data(), resultado: {} },
    data({ ...resultado, personaId: null }), data({ ...resultado, coincidencia: 'correo' }),
    data({ ...resultado, coincidencia: 'ninguna' }), data({ ...resultado, rolDocenteId: 1 }), data({ ...resultado, password: 'no-admitido' }),
    data(resultado, { ...consulta, operacionId: resultado.personaId }), data(resultado, { ...consulta, documento: 'otro' }),
    { success: false, data: data() }])('rechaza respuesta ajena, inconsistente, reservada o alterada %s', async body => {
    send.mockResolvedValue(response(body)); await expect(new AuthIdentityValidationClient().validar(consulta)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each([400, 401, 403, 404, 500, 503])('HTTP %s nunca confirma disponibilidad', async status => {
    send.mockResolvedValue(response(data(), status)); await expect(new AuthIdentityValidationClient().validar(consulta)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('fallos de red o JSON no producen un resultado vacío exitoso', async () => {
    send.mockRejectedValueOnce(new Error('timeout')); await expect(new AuthIdentityValidationClient().validar(consulta)).rejects.toBeInstanceOf(ServiceUnavailableException);
    send.mockResolvedValue({ ok: true, json: async () => { throw new Error('JSON'); } });
    await expect(new AuthIdentityValidationClient().validar(consulta)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('no usa credenciales PTA/JWT; admite token común configurado', async () => {
    delete process.env.AUTH_INTERNAL_SERVICE_TOKEN;
    await expect(new AuthIdentityValidationClient().validar(consulta)).rejects.toBeInstanceOf(ServiceUnavailableException); expect(send).not.toHaveBeenCalled();
    process.env.INTERNAL_SERVICE_TOKEN = 'comun'; await new AuthIdentityValidationClient().validar(consulta);
    expect(send.mock.calls[0][1].headers['x-internal-service-token']).toBe('comun');
  });
  it.each(['file:///auth', 'http://usuario:secreto@auth.test', 'http://auth.test?token=secreto', 'http://auth.test#secreto'])('rechaza base incompatible %s', async base => {
    process.env.AUTH_SERVICE_URL = base; await expect(new AuthIdentityValidationClient().validar(consulta)).rejects.toBeInstanceOf(ServiceUnavailableException); expect(send).not.toHaveBeenCalled();
  });
  it('cada llamada confirma de nuevo, sin cachear respuestas como si fueran reservas', async () => {
    const client = new AuthIdentityValidationClient(); const a = await client.validar(consulta);
    send.mockResolvedValue(response(data({ ...resultado, usuarioId: resultado.personaId }))); const b = await client.validar(consulta);
    expect(a.huella).not.toBe(b.huella); expect(send).toHaveBeenCalledTimes(2);
  });
  it('la mutación del input durante la red no altera la correlación esperada', async () => {
    const input = { ...consulta }; send.mockImplementation(async () => { input.documento = 'MUTADO'; return response(data()); });
    expect((await new AuthIdentityValidationClient().validar(input)).consulta.documento).toBe(consulta.documento);
  });
});

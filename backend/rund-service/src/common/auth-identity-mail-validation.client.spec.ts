import { ServiceUnavailableException } from '@nestjs/common';
import { AuthIdentityMailValidationClient } from './auth-identity-mail-validation.client';
import { identityWriteFingerprint } from './auth-identity-command';

describe('Cliente de vigencia de correo en Auth', () => {
  const id = 'abcdef00-1111-4111-8111-111111111111';
  const command = { version: 1 as const, actorId: id, payload: { documentNumber: '12345', documentType: 'CC', primer_nombre: 'ANA',
    primer_apellido: 'FICTICIA', segundo_apellido: null, genero: null, fechaNacimiento: null },
    options: { relaxValidation: false, preserveTerritorial: true }, territorial: null,
    emailFinal: 'ficticio@example.test', phoneFinal: null, finalFullName: 'ANA FICTICIA' };
  const receipt = () => ({ version: 1, operacionId: id, huellaComando: identityWriteFingerprint(command), apta: true, motivo: null });
  const keys = ['AUTH_SERVICE_URL', 'AUTH_INTERNAL_SERVICE_TOKEN', 'INTERNAL_SERVICE_TOKEN'];
  const saved = keys.map(k => process.env[k]), originalFetch = global.fetch;
  const mock = jest.fn(), client = new AuthIdentityMailValidationClient();
  beforeEach(() => {
    mock.mockReset(); global.fetch = mock; process.env.AUTH_SERVICE_URL = 'http://auth.fixture';
    process.env.AUTH_INTERNAL_SERVICE_TOKEN = 'ficticio'; delete process.env.INTERNAL_SERVICE_TOKEN;
    mock.mockResolvedValue({ status: 200, json: async () => ({ success: true, data: { validacion: receipt() } }) });
  });
  afterAll(() => { global.fetch = originalFetch; keys.forEach((k,i) => { if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i]; }); });
  it('solo envía token interno, comando y huella con no-store sin reintentos', async () => {
    expect(await client.validar(id.toUpperCase(), command)).toEqual(receipt());
    const [url, options] = mock.mock.calls[0];
    expect(url).toBe('http://auth.fixture/internal/rund/v1/personas/escritura/operaciones/' + id + '/correo/validar');
    expect(options).toMatchObject({ method: 'POST', redirect: 'error', cache: 'no-store',
      headers: { 'x-internal-service-token': 'ficticio', Accept: 'application/json', 'Content-Type': 'application/json' } });
    expect(Object.keys(options.headers)).toHaveLength(3);
    expect(JSON.parse(options.body)).toEqual({ comando: command, huellaComando: receipt().huellaComando });
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it.each(['OPERACION_NO_ELEGIBLE','IDENTIDAD_NO_VIGENTE','CREDENCIALES_NO_VIGENTES'])('respeta rechazo explícito %s', async motivo => {
    mock.mockResolvedValue({ status: 200, json: async () => ({ validacion: { ...receipt(), apta: false, motivo } }) });
    expect(await client.validar(id, command)).toMatchObject({ apta: false, motivo });
  });
  it.each([{}, null, { ...receipt(), extra: 'PII' }, { ...receipt(), version: 2 }, { ...receipt(), operacionId: 'otro' },
    { ...receipt(), huellaComando: 'b'.repeat(64) }, { ...receipt(), apta: 'true' }, { ...receipt(), motivo: 'IDENTIDAD_NO_VIGENTE' },
    { ...receipt(), apta: false }, { ...receipt(), apta: false, motivo: 'DESCONOCIDO' }])('rechaza recibo inválido %j', async validacion => {
    mock.mockResolvedValue({ status: 200, json: async () => ({ validacion }) });
    await expect(client.validar(id, command)).rejects.toBeInstanceOf(ServiceUnavailableException); expect(mock).toHaveBeenCalledTimes(1);
  });
  it.each([201, 204, 302, 401, 404, 409, 503])('HTTP %s no equivale a vigencia', async status => {
    mock.mockResolvedValue({ status, json: async () => ({ validacion: receipt() }) });
    await expect(client.validar(id, command)).rejects.toThrow('No fue posible confirmar'); expect(mock).toHaveBeenCalledTimes(1);
  });
  it.each(['ftp://auth.fixture','http://user:pass@auth.fixture','http://auth.fixture?token=ficticio','http://auth.fixture#secreto'])('configuración ambigua %s no hace HTTP', async url => {
    process.env.AUTH_SERVICE_URL = url; await expect(client.validar(id, command)).rejects.toBeInstanceOf(ServiceUnavailableException); expect(mock).not.toHaveBeenCalled();
  });
  it('sin credencial, ID o comando válido no consulta ni deriva una autorización', async () => {
    await expect(client.validar('NO', command)).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(client.validar(id, {} as any)).rejects.toBeInstanceOf(ServiceUnavailableException);
    delete process.env.AUTH_INTERNAL_SERVICE_TOKEN;
    await expect(client.validar(id, command)).rejects.toBeInstanceOf(ServiceUnavailableException); expect(mock).not.toHaveBeenCalled();
  });
  it('JSON, red y sobre de error fallidos se traducen sin detalles privados', async () => {
    for (const response of [Promise.reject(new Error('RED PRIVADA')),
      { status: 200, json: async () => { throw new Error('JSON PRIVADO'); } },
      { status: 200, json: async () => ({ success: false, data: { validacion: receipt() } }) }]) {
      mock.mockReset(); mock.mockImplementation(() => response);
      await expect(client.validar(id, command)).rejects.toThrow('No fue posible confirmar la vigencia'); expect(mock).toHaveBeenCalledTimes(1);
    }
  });
});

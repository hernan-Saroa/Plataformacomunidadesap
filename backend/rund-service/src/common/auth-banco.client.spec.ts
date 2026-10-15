import { ServiceUnavailableException } from '@nestjs/common';
import { AuthBancoClient } from './auth-banco.client';

describe('AuthBancoClient', () => {
  const originalEnv = { ...process.env }, originalFetch = global.fetch;
  const item = { id_user: '11111111-1111-4111-8111-111111111111', id_person: '22222222-2222-4222-8222-222222222222',
    username: 'docente', is_active: false, created_at: '2025-01-01T00:00:00+00:00', updated_at: null,
    num_identificacion: '000.123', tip_identificacion: 'CC', nom_largo: '', nom_tercero: 'Nombre', pri_apellido: 'Apellido',
    seg_apellido: null, gen_tercero: 'F', fec_nacimiento: '1980-01-01', dir_email: null, tel_celular: null,
    id_seccional: '9007199254740993', id_sede: null, roles: ['DOCENTE', 'OTRO'] };
  const data = { version: 1, items: [item], total: 1,
    seccionales: [{ id_seccional: '9007199254740993', nom_seccional: 'Territorial', cod_seccional: '001' }], seccionalesTotal: 1,
    sedes: [{ id_sede: '9007199254740994', nom_sede: null }], sedesTotal: 1 };
  let send: jest.Mock;
  const client = new AuthBancoClient();
  const respond = (body: unknown) => send.mockResolvedValue({ ok: true, json: async () => body });
  beforeEach(() => {
    process.env = { ...originalEnv, AUTH_SERVICE_URL: 'http://auth.test', AUTH_INTERNAL_SERVICE_TOKEN: 'interno-ficticio' };
    send = jest.fn(); global.fetch = send; respond({ success: true, data });
  });
  afterEach(() => { process.env = { ...originalEnv }; global.fetch = originalFetch; });

  it.each([data, { success: true, data }])('conserva IDs bigint, documentos, nulos y cuentas inactivas: %s', async body => {
    respond(body); await expect(client.proyeccion()).resolves.toEqual(data);
    expect(send).toHaveBeenCalledWith('http://auth.test/internal/rund/v1/banco/proyeccion', {
      method: 'GET', redirect: 'error', signal: expect.anything(),
      headers: { 'x-internal-service-token': 'interno-ficticio', Accept: 'application/json' },
    });
  });
  it('acepta vacío solamente con colecciones y conteos explícitos', async () => {
    const empty = { version: 1, items: [], total: 0, seccionales: [], seccionalesTotal: 0, sedes: [], sedesTotal: 0 };
    respond(empty); await expect(client.proyeccion()).resolves.toEqual(empty);
  });
  it.each([null, [], {}, { success: false, data }, { ...data, version: 2 }, { ...data, total: 0 },
    { ...data, items: [item, item], total: 2 }, { ...data, items: [{ ...item, id_person: 'invalido' }] },
    { ...data, items: [{ ...item, roles: undefined }] }, { ...data, items: [{ ...item, tel_celular: undefined }] },
    { ...data, items: [{ ...item, is_active: 'true' }] }, { ...data, items: [{ ...item, updated_at: 'invalid' }] },
    { ...data, items: [{ ...item, id_seccional: 9007199254740992 }] },
    { ...data, items: [{ ...item, id_sede: '9223372036854775808' }] },
    { ...data, seccionalesTotal: 2 }, { ...data, sedesTotal: 0 },
    { ...data, seccionales: [{ id_seccional: '1', nom_seccional: 'Parcial' }] },
    { ...data, sedes: [{ id_sede: '01', nom_sede: null }] }])('rechaza snapshot parcial o ambiguo: %s', async body => {
    respond(body); await expect(client.proyeccion()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each([401, 404, 409, 500, 503])('HTTP %s nunca se interpreta como banco vacío', async status => {
    send.mockResolvedValue({ ok: false, status });
    await expect(client.proyeccion()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('no oculta caída de transporte o JSON inválido con datos vacíos', async () => {
    send.mockRejectedValue(new Error('privado'));
    await expect(client.proyeccion()).rejects.toThrow('No fue posible confirmar los datos del banco en Auth.');
    send.mockResolvedValue({ ok: true, json: async () => { throw new Error('privado'); } });
    await expect(client.proyeccion()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each(['file:///tmp/auth', 'http://user:pass@auth.test', 'http://auth.test?x=1', 'http://auth.test#x', 'invalida'])('rechaza URL inválida sin enviar el token: %s', async url => {
    process.env.AUTH_SERVICE_URL = url;
    await expect(client.proyeccion()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(send).not.toHaveBeenCalled();
  });
  it('sin token falla aunque exista JWT_SECRET', async () => {
    delete process.env.AUTH_INTERNAL_SERVICE_TOKEN; delete process.env.INTERNAL_SERVICE_TOKEN; process.env.JWT_SECRET = 'jwt';
    await expect(client.proyeccion()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(send).not.toHaveBeenCalled();
  });
  it('reutiliza token común y prefijo de URL sin incorporar credenciales de usuario', async () => {
    delete process.env.AUTH_INTERNAL_SERVICE_TOKEN; process.env.INTERNAL_SERVICE_TOKEN = 'comun';
    process.env.AUTH_SERVICE_URL = 'http://auth.test/prefijo/'; await client.proyeccion();
    expect(send.mock.calls[0][0]).toBe('http://auth.test/prefijo/internal/rund/v1/banco/proyeccion');
    expect(send.mock.calls[0][1].headers['x-internal-service-token']).toBe('comun');
  });
});

import { AuthIdentityClient } from './auth-identity.client';
import { isAuthBulkPreview } from './auth-bulk-preview.contract';
const query = () => ({ version: 1 as const, documento: '000123456', correo: 'ficticio@example.test' });
const personId = '11111111-1111-4111-8111-111111111111', userId = '22222222-2222-4222-8222-222222222222';
const result = (existing = false): any => ({ consulta: query(), persona: existing ? { id_person: personId,
  tip_identificacion: 'CC', nom_largo: 'DOCENTE FICTICIO', nom_tercero: 'DOCENTE', pri_apellido: 'FICTICIO',
  seg_apellido: null, gen_tercero: 'F', fec_nacimiento: '1980-01-01', dir_email: query().correo, tel_celular: null,
  id_seccional: '9007199254740993' } : null, usuario: existing ? { id_user: userId, username: query().correo } : null,
  conflictoCorreo: false, rolDocenteDisponible: true, reserva: false });
describe('Contrato mínimo Auth para preview masivo', () => {
  it.each([false, true])('acepta estado completo existente=%s', existing => expect(isAuthBulkPreview(result(existing), query())).toBe(true));
  it('admite persona sin cuenta, ausencia de rol y conflicto explícitos', () => {
    const value = result(true); value.usuario = null; value.rolDocenteDisponible = false; value.conflictoCorreo = true;
    expect(isAuthBulkPreview(value, query())).toBe(true);
  });
  it.each(['reserva', 'consulta', 'persona', 'usuario', 'conflictoCorreo', 'rolDocenteDisponible'])('rechaza falta de %s', key => {
    const value = result(); delete value[key]; expect(isAuthBulkPreview(value, query())).toBe(false);
  });
  it.each(['password_hash', 'password_temp', 'resetToken', 'roles', 'contexto'])('rechaza dato privado adicional %s', key => {
    const value = result(); value[key] = 'NO'; expect(isAuthBulkPreview(value, query())).toBe(false);
  });
  it.each(['version', 'documento', 'correo'])('rechaza echo cambiado: %s', key => {
    const value = result(); value.consulta[key] = key === 'version' ? 2 : 'OTRO'; expect(isAuthBulkPreview(value, query())).toBe(false);
  });
  it.each([true, null, 'false'])('rechaza reserva=%j', reserva => {
    const value = result(); value.reserva = reserva; expect(isAuthBulkPreview(value, query())).toBe(false);
  });
  it.each([12, '9223372036854775808', '-9223372036854775809', '01', '1.1', ''])('rechaza bigint no textual/canónico/fuera de rango %j', id => {
    const value = result(true); value.persona.id_seccional = id; expect(isAuthBulkPreview(value, query())).toBe(false);
  });
  it('rechaza cuenta sin persona', () => { const value = result(true); value.persona = null; expect(isAuthBulkPreview(value, query())).toBe(false); });
  it('rechaza credenciales en persona o usuario y campos omitidos', () => {
    for (const target of ['persona', 'usuario']) {
      const value = result(true); value[target].password_hash = 'NO'; expect(isAuthBulkPreview(value, query())).toBe(false);
    }
    const value = result(true); delete value.persona.tel_celular; expect(isAuthBulkPreview(value, query())).toBe(false);
  });
  it('no admite propiedades heredadas como sustitución del contrato propio', () => {
    expect(isAuthBulkPreview(Object.assign(Object.create(result()), { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }), query())).toBe(false);
  });
});

describe('Cliente Auth del preview sin fallback SQL', () => {
  const keys = ['AUTH_SERVICE_URL', 'AUTH_INTERNAL_SERVICE_TOKEN', 'INTERNAL_SERVICE_TOKEN'], saved = keys.map(k => process.env[k]);
  const originalFetch = global.fetch;
  beforeEach(() => { process.env.AUTH_SERVICE_URL = 'http://auth.example.test/prefijo'; process.env.AUTH_INTERNAL_SERVICE_TOKEN = 'FICTICIO'; });
  afterEach(() => { global.fetch = originalFetch; keys.forEach((k, i) => { if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i]; }); });
  const respond = (body: any, status = 200) => { global.fetch = jest.fn(async () => ({ status, ok: status === 200, json: async () => body })) as any; };
  it('envía POST con solo query/credencial interna, conserva prefijo y bigint textual', async () => {
    respond({ success: true, data: result(true) });
    const received = await new AuthIdentityClient().previsualizacionMasiva(query().documento, query().correo);
    expect(received.persona!.id_seccional).toBe('9007199254740993');
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://auth.example.test/prefijo/internal/rund/v1/personas/previsualizacion-masiva');
    expect(options.method).toBe('POST'); expect(JSON.parse(options.body)).toEqual(query());
    expect(options.headers).toEqual({ 'x-internal-service-token': 'FICTICIO', Accept: 'application/json', 'Content-Type': 'application/json' });
    expect(options.redirect).toBe('error'); expect(options.signal).toBeInstanceOf(AbortSignal);
  });
  it.each([404, 401, 403, 503])('HTTP %s impide confirmar ausencia y no reintenta', async status => {
    respond({}, status); await expect(new AuthIdentityClient().previsualizacionMasiva(query().documento, query().correo)).rejects.toThrow();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  it.each([{ success: false, data: result() }, {}, { success: true, data: { ...result(), reserva: true } }])('respuesta parcial/inválida no se considera ausencia', async body => {
    respond(body); await expect(new AuthIdentityClient().previsualizacionMasiva(query().documento, query().correo)).rejects.toThrow();
  });
  it('no conserva el estado para la consulta siguiente', async () => {
    respond(result()); const client = new AuthIdentityClient(); await client.previsualizacionMasiva(query().documento, query().correo);
    respond(result(true)); expect((await client.previsualizacionMasiva(query().documento, query().correo)).persona!.id_person).toBe(personId);
  });
  it('falta de token no permite consultar', async () => {
    delete process.env.AUTH_INTERNAL_SERVICE_TOKEN; delete process.env.INTERNAL_SERVICE_TOKEN; respond(result());
    await expect(new AuthIdentityClient().previsualizacionMasiva(query().documento, query().correo)).rejects.toThrow(); expect(global.fetch).not.toHaveBeenCalled();
  });
});

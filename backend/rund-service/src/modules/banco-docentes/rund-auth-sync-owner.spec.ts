import { ServiceUnavailableException } from '@nestjs/common';
import { RundAuthSyncOwner } from './rund-auth-sync-owner';

const personaId = '11111111-1111-4111-8111-111111111111', usuarioId = '22222222-2222-4222-8222-222222222222',
  rolId = '33333333-3333-4333-8333-333333333333';
const consulta = { personaId, usuarioId, rolId };
const identidad = { id_person: personaId, num_identificacion: ' 001.23 ', dir_email: ' Usuario@Example.test ',
  territorial_id: '9007199254740993', territorial_nombre: null, sede_id: null, usuario_activo: true, rol_docente_activo: true };
const payload = () => ({ consulta, encontrada: true, identidad: { ...identidad } });
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('Propietario Auth de la sincronización RUND', () => {
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  const owner = new RundAuthSyncOwner(new URL('http://auth.test/base/'), 'interno-ficticio', 12345);
  const revalidate = () => owner.revalidar(personaId, usuarioId, rolId);
  beforeEach(() => { fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async () => response(payload())); });
  afterEach(() => jest.restoreAllMocks());

  it('usa la base recibida y token/plazo internos, con body mínimo y sin JWT, cookies o redirecciones', async () => {
    const timeout = jest.spyOn(AbortSignal, 'timeout');
    await expect(revalidate()).resolves.toEqual(identidad);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('http://auth.test/base/internal/rund/v1/personas/sincronizacion/revalidar');
    expect(options).toMatchObject({ method: 'POST', redirect: 'error', body: JSON.stringify(consulta), headers: {
      'x-internal-service-token': 'interno-ficticio', 'Content-Type': 'application/json', Accept: 'application/json',
    } });
    expect(Object.keys(options!.headers!)).toHaveLength(3); expect(timeout).toHaveBeenCalledWith(12345);
  });
  it('admite el envoltorio de Auth y conserva documento, email, null y bigint textual sin transformar', async () => {
    fetchMock.mockResolvedValue(response({ success: true, data: payload() }));
    await expect(revalidate()).resolves.toEqual(identidad);
  });
  it('solo acepta ausencia explícita con HTTP 200 y consulta correspondiente', async () => {
    fetchMock.mockResolvedValue(response({ consulta, encontrada: false, identidad: null }));
    await expect(revalidate()).resolves.toBeNull();
  });
  it.each([false, null])('conserva el estado de usuario %s para que el flujo descarte la cuenta', async usuario_activo => {
    fetchMock.mockResolvedValue(response({ ...payload(), identidad: { ...identidad, usuario_activo, rol_docente_activo: false } }));
    await expect(revalidate()).resolves.toMatchObject({ usuario_activo, rol_docente_activo: false });
  });
  it('resuelve únicamente el UUID del rol por GET sin body', async () => {
    fetchMock.mockResolvedValue(response({ success: true, data: { rolId } }));
    await expect(owner.rolDocente()).resolves.toBe(rolId);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/sincronizacion/rol-docente');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'GET' });
    expect(fetchMock.mock.calls[0][1]?.body).toBeUndefined();
  });
  it.each([{}, { rolId: null }, { rolId: 'DOCENTE' }, { success: false, data: { rolId } }])('rechaza rol malformado %s', async raw => {
    fetchMock.mockResolvedValue(response(raw)); await expect(owner.rolDocente()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each([401, 403, 404, 500, 503])('HTTP %s nunca confirma ausencia ni recupera por SQL', async status => {
    fetchMock.mockResolvedValue(response({ consulta, encontrada: false, identidad: null }, status));
    await expect(revalidate()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each([
    {}, { consulta, encontrada: false }, { consulta, encontrada: false, identidad },
    { ...payload(), consulta: { ...consulta, usuarioId: personaId } },
    { ...payload(), encontrada: 'true' }, { success: false, data: payload() },
    { ...payload(), identidad: { ...identidad, id_person: usuarioId } },
    { ...payload(), identidad: { ...identidad, territorial_id: 9007199254740992 } },
    { ...payload(), identidad: { ...identidad, dir_email: undefined } },
    { ...payload(), identidad: { ...identidad, rol_docente_activo: null } },
    { ...payload(), identidad: { ...identidad, usuario_activo: 'true' } },
  ])('rechaza contratos parciales o ajenos %s', async raw => {
    fetchMock.mockResolvedValue(response(raw)); await expect(revalidate()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each(['timeout', 'redirección', 'JSON inválido', 'exceso de tamaño'])('cierra ante %s sin exponer datos de transporte', async mode => {
    if (mode === 'JSON inválido') fetchMock.mockResolvedValue(new Response('privado no JSON'));
    else if (mode === 'exceso de tamaño') fetchMock.mockResolvedValue(new Response('x'.repeat(1024 * 1024 + 1)));
    else fetchMock.mockRejectedValue(new Error('detalle privado: interno-ficticio'));
    await expect(revalidate()).rejects.toThrow('No fue posible revalidar la sincronización con Auth.');
  });
});

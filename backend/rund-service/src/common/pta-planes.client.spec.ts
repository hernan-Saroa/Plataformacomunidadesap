import { ServiceUnavailableException } from '@nestjs/common';
import { PtaPlanesClient } from './pta-planes.client';

describe('Planes históricos desde el propietario PTA', () => {
  const keys = ['ACADEMIC_WORK_PLAN_SERVICE_URL', 'PTA_INTERNAL_SERVICE_TOKEN', 'INTERNAL_SERVICE_TOKEN', 'AUTH_INTERNAL_SERVICE_TOKEN', 'JWT_SECRET'];
  let saved: Array<string | undefined>, send: jest.Mock, original: typeof fetch;
  const consulta = { docenteId: ' PERFIL-LEGACY ', periodo: '2026-2' };
  const plan = { id: '11111111-1111-4111-8111-111111111111', ...consulta, estado: 'EN_FIRME', datosEstructurados: { asignaturas: [null, 'legacy', { horas: '0', programa_id: '0001' }] } };
  const dto = () => ({ consulta, items: [plan], total: 1 });
  const reply = (data: any, status = 200) => ({ ok: status >= 200 && status < 300, json: async () => data });
  beforeEach(() => {
    saved = keys.map(key => process.env[key]); original = global.fetch;
    process.env.ACADEMIC_WORK_PLAN_SERVICE_URL = 'http://pta.test/base/'; process.env.PTA_INTERNAL_SERVICE_TOKEN = ' interno ';
    delete process.env.INTERNAL_SERVICE_TOKEN; process.env.AUTH_INTERNAL_SERVICE_TOKEN = 'no-auth'; process.env.JWT_SECRET = 'no-jwt';
    send = jest.fn().mockResolvedValue(reply(dto())); global.fetch = send;
  });
  afterEach(() => { global.fetch = original; keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; }); });
  it('envía filtros exactos solo a PTA, sin JWT/cookie, con timeout y sin redirects; conserva JSON histórico', async () => {
    expect(await new PtaPlanesClient().planesFirmes(consulta)).toEqual([plan]);
    expect(send).toHaveBeenCalledWith('http://pta.test/base/internal/rund/v1/planes/historial-firme', {
      method: 'POST', redirect: 'error', signal: expect.anything(), headers: { 'x-internal-service-token': 'interno', Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(consulta),
    });
  });
  it('acepta envelope y ausencia confirmada sin llamar a repositorios alternativos', async () => {
    send.mockResolvedValue(reply({ success: true, data: { consulta, items: [], total: 0 } }));
    expect(await new PtaPlanesClient().planesFirmes(consulta)).toEqual([]);
  });
  it('conserva más de 500 planes y el orden recibido sin truncar o paginar asignaturas', async () => {
    const items = Array.from({ length: 501 }, (_, i) => ({ ...plan, id: '11111111-1111-4111-8111-' + String(i).padStart(12, '0') }));
    send.mockResolvedValue(reply({ consulta, items, total: 501 }));
    expect(await new PtaPlanesClient().planesFirmes(consulta)).toEqual(items); expect(send).toHaveBeenCalledTimes(1);
  });
  it.each(['APROBADO', 'APROBADO_DEF', 'EN_FIRME', 'RADICADO', 'EN_EJECUCION', 'FINALIZADO', 'TERMINADO'])('acepta estado firme %s', async estado => {
    send.mockResolvedValue(reply({ ...dto(), items: [{ ...plan, estado }] }));
    expect((await new PtaPlanesClient().planesFirmes(consulta))[0].estado).toBe(estado);
  });
  it.each([{}, { docenteId: '' }, { periodo: null }, { docenteId: 1 }, { periodo: [] }])('rechaza filtros inválidos antes de la red %s', async filters => {
    await expect(new PtaPlanesClient().planesFirmes(filters as any)).rejects.toBeInstanceOf(ServiceUnavailableException); expect(send).not.toHaveBeenCalled();
  });
  it.each([{}, { items: [], total: 0 }, { ...dto(), total: 2 }, { ...dto(), consulta: { periodo: 'otro' } },
    { ...dto(), consulta: { ...consulta, extra: true } }, { ...dto(), items: [plan, plan], total: 2 },
    { ...dto(), items: [{ ...plan, estado: 'BORRADOR' }] }, { ...dto(), items: [{ ...plan, docenteId: 'OTRO' }] },
    { ...dto(), items: [{ ...plan, periodo: 'OTRO' }] }, { ...dto(), items: [{ ...plan, id: 1 }] },
    { ...dto(), items: [{ ...plan, datosEstructurados: {} }] }, { success: false, data: dto() }])('no entrega datos ajenos, parciales o incompatibles %s', async body => {
    send.mockResolvedValue(reply(body)); await expect(new PtaPlanesClient().planesFirmes(consulta)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each([401, 403, 404, 500, 503])('HTTP %s no confirma ausencia', async status => {
    send.mockResolvedValue(reply(dto(), status)); await expect(new PtaPlanesClient().planesFirmes(consulta)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('errores de red o JSON se propagan como indisponibilidad', async () => {
    send.mockRejectedValueOnce(new Error('timeout')); await expect(new PtaPlanesClient().planesFirmes(consulta)).rejects.toBeInstanceOf(ServiceUnavailableException);
    send.mockResolvedValue({ ok: true, json: async () => { throw new Error('JSON'); } });
    await expect(new PtaPlanesClient().planesFirmes(consulta)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it.each(['https://usuario:secreto@pta.test', 'file:///pta', 'http://pta.test?token=privado', 'http://pta.test#privado'])('rechaza base incompatible sin red %s', async base => {
    process.env.ACADEMIC_WORK_PLAN_SERVICE_URL = base;
    await expect(new PtaPlanesClient().planesFirmes(consulta)).rejects.toBeInstanceOf(ServiceUnavailableException); expect(send).not.toHaveBeenCalled();
  });
  it('no sustituye token PTA por credenciales Auth o JWT; admite token común configurado', async () => {
    delete process.env.PTA_INTERNAL_SERVICE_TOKEN;
    await expect(new PtaPlanesClient().planesFirmes(consulta)).rejects.toBeInstanceOf(ServiceUnavailableException); expect(send).not.toHaveBeenCalled();
    process.env.INTERNAL_SERVICE_TOKEN = 'comun'; await new PtaPlanesClient().planesFirmes(consulta);
    expect(send.mock.calls[0][1].headers['x-internal-service-token']).toBe('comun');
  });
  it('consulta nuevamente al propietario para reflejar cambios sin caché', async () => {
    const client = new PtaPlanesClient(); await client.planesFirmes(consulta);
    send.mockResolvedValue(reply({ consulta, items: [], total: 0 })); expect(await client.planesFirmes(consulta)).toEqual([]); expect(send).toHaveBeenCalledTimes(2);
  });
});

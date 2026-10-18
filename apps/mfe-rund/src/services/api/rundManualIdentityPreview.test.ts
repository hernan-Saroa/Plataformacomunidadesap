import { describe, expect, it, vi } from 'vitest';
import { RundManualIdentityClient } from './rundManualIdentityApi';
import { validateManualPreview } from './rundManualIdentityPreview';

const actor = '11111111-1111-4111-8111-111111111111';
const receipt = () => ({ version: 1, compatibilidad: 'COMPATIBLE_AL_CONSULTAR', reserva: false,
  solicitudCreada: false, ejecucionAutorizada: false, requierePreparacion: true });
function setup() {
  const storage = { getItem: vi.fn(() => { throw new Error('ALMACENAMIENTO BLOQUEADO'); }), setItem: vi.fn(), removeItem: vi.fn() };
  const transport = { post: vi.fn(async (..._args: any[]): Promise<any> => receipt()), get: vi.fn() }, uuid = vi.fn();
  return { client: new RundManualIdentityClient(actor, storage, transport as any, uuid), storage, transport, uuid };
}
describe('Consulta manual sin solicitud o aprobación persistida', () => {
  it('consulta la ruta fija con body sin actor o solicitud y sin tocar almacenamiento o UUID', async () => {
    const s = setup(), controller = new AbortController(), formulario = { nombreCompleto: 'FICTICIO', documentNumber: '123456' };
    expect(await s.client.previsualizar(formulario, controller.signal)).toEqual(receipt());
    expect(s.transport.post).toHaveBeenCalledTimes(1);
    expect(s.transport.post).toHaveBeenCalledWith('/rund/api/v1/banco-docentes/identidad/solicitudes-manuales/previsualizar',
      { formulario }, { retries: 0, skipAuthRefresh: true, skipErrorLog: true, skipErrorToast: true, cache: 'no-store', signal: controller.signal });
    for (const fn of Object.values(s.storage)) expect(fn).not.toHaveBeenCalled();
    expect(s.uuid).not.toHaveBeenCalled(); expect(s.transport.get).not.toHaveBeenCalled();
  });
  it('copia el formulario antes del transporte aunque este espere para serializar', async () => {
    const s = setup(); let resolve!: (value: any) => void;
    s.transport.post.mockImplementation(() => new Promise(done => { resolve = done; }));
    const form = { documentNumber: '123456', extra: { value: 'INICIAL' } }, pending = s.client.previsualizar(form);
    form.documentNumber = '999999'; form.extra.value = 'CAMBIADO';
    expect((s.transport.post.mock.calls[0] as any)[1].formulario).toEqual({ documentNumber: '123456', extra: { value: 'INICIAL' } });
    resolve(receipt()); await pending;
  });
  it('no consulta si la señal ya está cancelada', async () => {
    const s = setup(), controller = new AbortController(); controller.abort();
    await expect(s.client.previsualizar({}, controller.signal)).rejects.toThrow('No fue posible consultar');
    expect(s.transport.post).not.toHaveBeenCalled();
  });
  it('descarta respuesta tardía aunque el transporte ignore la cancelación', async () => {
    const s = setup(), controller = new AbortController(); let resolve!: (value: any) => void;
    s.transport.post.mockImplementation(() => new Promise(done => { resolve = done; }));
    const pending = s.client.previsualizar({}, controller.signal); controller.abort(); resolve(receipt());
    await expect(pending).rejects.toThrow('No fue posible consultar');
  });
  it('no conserva el objeto de respuesta compartido con el transporte', async () => {
    const s = setup(), raw = receipt(); s.transport.post.mockResolvedValue(raw);
    const known = await s.client.previsualizar({}); raw.reserva = true as false;
    expect(known.reserva).toBe(false); expect(known).not.toBe(raw);
  });
  it('dos consultas explícitas no se almacenan o reutilizan como aprobación', async () => {
    const s = setup(); await s.client.previsualizar({}); await s.client.previsualizar({});
    expect(s.transport.post).toHaveBeenCalledTimes(2); expect(s.storage.setItem).not.toHaveBeenCalled();
  });
  it('un formulario no serializable falla sin consulta ni detalles privados', async () => {
    const s = setup(), form: any = { privado: 'PRIVADO' }; form.cycle = form;
    await expect(s.client.previsualizar(form)).rejects.toThrow(/^No fue posible consultar la compatibilidad de los datos\.$/);
    expect(s.transport.post).not.toHaveBeenCalled();
  });
  it.each([401, 403, 409, 503])('un fallo %s no reintenta, refresca sesión, reserva o expone el error', async status => {
    const s = setup(); s.transport.post.mockRejectedValue(Object.assign(new Error('SQL Y DATOS PRIVADOS'), { status }));
    await expect(s.client.previsualizar({})).rejects.toThrow(/^No fue posible consultar la compatibilidad de los datos\.$/);
    expect(s.transport.post).toHaveBeenCalledTimes(1); expect(s.storage.setItem).not.toHaveBeenCalled(); expect(s.uuid).not.toHaveBeenCalled();
  });
  it.each([
    ['null', null], ['array', []], ['versión', { ...receipt(), version: 2 }],
    ['compatibilidad', { ...receipt(), compatibilidad: 'COMPATIBLE' }], ['reserva', { ...receipt(), reserva: true }],
    ['solicitud', { ...receipt(), solicitudCreada: true }], ['autorización', { ...receipt(), ejecucionAutorizada: true }],
    ['preparación', { ...receipt(), requierePreparacion: false }], ['PII extra', { ...receipt(), formulario: {} }],
    ['ID extra', { ...receipt(), solicitudId: actor }], ['incompleta', { ...receipt(), reserva: undefined }],
    ...Object.keys(receipt()).map(key => { const value: any = receipt(); delete value[key]; return ['sin ' + key, value]; }),
  ])('rechaza respuesta %s', async (_name, raw) => {
    const s = setup(); s.transport.post.mockResolvedValue(raw as any);
    await expect(s.client.previsualizar({})).rejects.toThrow(); expect(s.storage.setItem).not.toHaveBeenCalled();
  });
  it('rechaza campos heredados que sustituyen campos propios ausentes', () => {
    expect(() => validateManualPreview(Object.assign(Object.create(receipt()), { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }))).toThrow();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./apiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
import { RundManualIdentityClient } from './rundManualIdentityApi';
import { validateManualMail, type ManualMailReceipt } from './rundManualIdentityMail';

const actor = 'abcdef00-1111-4111-8111-111111111111', id = 'abcdef00-2222-4222-8222-222222222222';
const receipt = (estado: ManualMailReceipt['estado'] = 'PENDIENTE') => ({ version: 1, solicitudId: id, intencionId: actor,
  estado, registroConfirmado: estado !== 'SIN_CONFIRMAR', requiereRevision: estado === 'INCIERTO' });
beforeEach(() => sessionStorage.clear());
describe('Estado de correo sin envío desde cliente manual', () => {
  it.each(['SIN_CONFIRMAR', 'NO_APLICA', 'PENDIENTE', 'ENVIANDO', 'ENVIADO', 'INCIERTO'] as const)('valida estado %s y flags coherentes', estado => {
    expect(validateManualMail(receipt(estado), id)).toEqual(receipt(estado));
  });
  it.each(['id', 'intencion', 'version', 'estado', 'registro', 'revision', 'extra', 'campo', 'clave'])('rechaza DTO %s incoherente', kind => {
    const data: any = receipt();
    if (kind === 'id') data.solicitudId = actor;
    if (kind === 'intencion') data.intencionId = 'NO';
    if (kind === 'version') data.version = 2;
    if (kind === 'estado') data.estado = 'ENTREGADO';
    if (kind === 'registro') data.registroConfirmado = false;
    if (kind === 'revision') data.requiereRevision = true;
    if (kind === 'extra') data.destinatario = 'privado@example.test';
    if (kind === 'campo') delete data.estado;
    if (kind === 'clave') { delete data.requiereRevision; data.otra = false; }
    expect(() => validateManualMail(data, id)).toThrow('No fue posible confirmar');
  });
  it.each([null, [], {}, 'ENVIADO'])('rechaza valor no contractual %j', data => {
    expect(() => validateManualMail(data, id)).toThrow();
  });
  it('GET sin retries/refresh conserva UUID y no escribe o libera una solicitud aunque haya envío confirmado', async () => {
    const transport = { get: vi.fn().mockResolvedValue(receipt('ENVIADO')), post: vi.fn() };
    sessionStorage.setItem('rund:creacion-manual:' + actor, id);
    const client = new RundManualIdentityClient(actor, sessionStorage, transport as any);
    expect(await client.consultarCorreo()).toEqual(receipt('ENVIADO'));
    expect(transport.get).toHaveBeenCalledWith(expect.stringContaining(`/${id}/correo`), undefined,
      { retries: 0, skipAuthRefresh: true, skipErrorLog: true, skipErrorToast: true, cache: 'no-store' });
    expect(transport.post).not.toHaveBeenCalled(); expect(client.pendiente()).toBe(id);
  });
  it('sin solicitud no inicia HTTP o crea ID; fallo remoto conserva el existente', async () => {
    const transport = { get: vi.fn().mockRejectedValue(new Error('FALLO')), post: vi.fn() };
    const client = new RundManualIdentityClient(actor, sessionStorage, transport as any);
    await expect(client.consultarCorreo()).rejects.toThrow(); expect(transport.get).not.toHaveBeenCalled();
    sessionStorage.setItem('rund:creacion-manual:' + actor, id); await expect(client.consultarCorreo()).rejects.toThrow(); expect(client.pendiente()).toBe(id);
  });
  it('respuesta tardía de otro UUID local no se publica ni elimina la nueva solicitud', async () => {
    let finish!: (value: unknown) => void;
    const transport = { get: vi.fn(() => new Promise(resolve => { finish = resolve; })), post: vi.fn() };
    sessionStorage.setItem('rund:creacion-manual:' + actor, id);
    const client = new RundManualIdentityClient(actor, sessionStorage, transport as any), pending = client.consultarCorreo();
    sessionStorage.setItem('rund:creacion-manual:' + actor, actor); finish(receipt());
    await expect(pending).rejects.toThrow(); expect(client.pendiente()).toBe(actor);
  });
});

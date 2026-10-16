import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../../services/api/apiClient', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
import { apiClient } from '../../../services/api/apiClient';
import { RundManualIdentityClient } from '../../../services/api/rundManualIdentityApi';
import { BancoDocenteManualRequestModal } from './BancoDocenteManualRequestModal';
import type { ManualMailReceipt } from '../../../services/api/rundManualIdentityMail';

const actor = 'abcdef00-1111-4111-8111-111111111111', id = 'abcdef00-2222-4222-8222-222222222222';
const confirmed = () => ({ solicitudId: id, intencionId: actor, estado: 'CONFIRMADA', decisionNativa: 'EN_CURSO',
  estadoAuth: 'AUTH_APLICADA', estadoNativo: 'CONFIRMADA', docenteId: 'DOCENTE', confirmadaEn: '2026-10-16T10:00:00.123456Z', correo: 'PENDIENTE' });
const receipt = (estado: ManualMailReceipt['estado']) => ({ version: 1, solicitudId: id, intencionId: actor,
  estado, registroConfirmado: estado !== 'SIN_CONFIRMAR', requiereRevision: estado === 'INCIERTO' });
const client = (owner = actor) => new RundManualIdentityClient(owner, sessionStorage, apiClient);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name, exact: true }));
beforeEach(() => { vi.resetAllMocks(); sessionStorage.clear(); sessionStorage.setItem('rund:creacion-manual:' + actor, id); });
afterEach(cleanup);
function setup() {
  const saved = vi.fn(), close = vi.fn();
  const panel = (c = client()) => <BancoDocenteManualRequestModal client={c} onSaved={saved} onClose={close} renderForm={() => <p>Formulario</p>} />;
  const view = render(panel()); return { ...view, saved, close, panel };
}
async function recover() {
  vi.mocked(apiClient.get).mockResolvedValueOnce(confirmed()); click('Consultar resultado'); await screen.findByText('El registro está confirmado en RUND.');
}
describe('Consulta visual opcional del correo, separada de la creación', () => {
  it('no consulta correo al montar o recuperar registro; finalizar sigue disponible sin leer correo', async () => {
    const view = setup(); expect(apiClient.get).not.toHaveBeenCalled(); await recover();
    expect(apiClient.get).toHaveBeenCalledTimes(1); expect(screen.queryByText(/correo de acceso sigue pendiente/)).toBeNull();
    click('Finalizar registro'); await waitFor(() => expect(view.saved).toHaveBeenCalledOnce()); expect(sessionStorage.length).toBe(0);
  });
  it.each([
    ['NO_APLICA', /utilizó una cuenta existente/], ['PENDIENTE', /aviso está guardado y pendiente/],
    ['ENVIANDO', /intento de envío iniciado, sin confirmación final/], ['ENVIADO', /no acredita recepción o lectura/],
    ['INCIERTO', /resultado del envío es incierto y requiere revisión/],
  ] as const)('muestra %s sin POST, liberar ID o repetir creación', async (estado, message) => {
    const view = setup(); await recover(); vi.mocked(apiClient.get).mockResolvedValueOnce(receipt(estado));
    click('Consultar estado del correo'); await screen.findByText(message);
    expect(apiClient.post).not.toHaveBeenCalled(); expect(view.saved).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('rund:creacion-manual:' + actor)).toBe(id);
    expect(screen.queryByRole('button', { name: /Reenviar|Enviar correo/ })).toBeNull();
  });
  it.each([401, 403, 503])('fallo %s del correo conserva registro confirmado y permite finalizar', async status => {
    const view = setup(); await recover(); vi.mocked(apiClient.get).mockRejectedValueOnce(Object.assign(new Error('DETALLE PRIVADO'), { status }));
    click('Consultar estado del correo'); await screen.findByText(/No se pudo consultar el correo/);
    expect(screen.getByText('El registro está confirmado en RUND.')).toBeTruthy(); expect(screen.queryByText(/DETALLE PRIVADO/)).toBeNull();
    click('Finalizar registro'); await waitFor(() => expect(view.saved).toHaveBeenCalledOnce()); expect(apiClient.post).not.toHaveBeenCalled();
  });
  it.each(['intencion', 'sin-confirmar'])('recibo %s no reemplaza el estado esperado del mismo registro', async kind => {
    setup(); await recover(); vi.mocked(apiClient.get).mockResolvedValueOnce(kind === 'intencion'
      ? { ...receipt('ENVIADO'), intencionId: id } : receipt('SIN_CONFIRMAR'));
    click('Consultar estado del correo'); await screen.findByText(/No se pudo consultar el correo/);
    expect(screen.queryByText(/El servicio de notificaciones confirmó el envío/)).toBeNull(); expect(apiClient.post).not.toHaveBeenCalled();
  });
  it('nuevo intento de consulta descarta un recibo anterior y doble clic no duplica HTTP', async () => {
    setup(); await recover(); vi.mocked(apiClient.get).mockResolvedValueOnce(receipt('ENVIADO'));
    click('Consultar estado del correo'); await screen.findByText(/El servicio de notificaciones confirmó el envío/);
    let finish!: (value: unknown) => void;
    vi.mocked(apiClient.get).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    click('Consultar estado del correo'); click('Consultar estado del correo'); expect(apiClient.get).toHaveBeenCalledTimes(3);
    expect(screen.queryByText(/El servicio de notificaciones confirmó el envío/)).toBeNull();
    await act(async () => { finish(receipt('INCIERTO')); }); await screen.findByText(/resultado del envío es incierto/);
  });
  it('cambiar cliente durante GET oculta respuestas anteriores y no consulta con el cliente nuevo', async () => {
    const view = setup(); await recover(); let finish!: (value: unknown) => void;
    vi.mocked(apiClient.get).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    click('Consultar estado del correo'); view.rerender(view.panel(client(id)));
    await act(async () => { finish(receipt('ENVIADO')); });
    expect(screen.queryByText(/El servicio de notificaciones confirmó el envío/)).toBeNull();
    expect(screen.getByText(/La sesión de esta solicitud cambió/)).toBeTruthy(); expect(apiClient.get).toHaveBeenCalledTimes(2);
  });
  it('desmontar durante GET no publica respuesta tardía ni invoca onSaved', async () => {
    const view = setup(); await recover(); let finish!: (value: unknown) => void;
    vi.mocked(apiClient.get).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    click('Consultar estado del correo'); view.unmount(); await act(async () => { finish(receipt('ENVIADO')); });
    expect(view.saved).not.toHaveBeenCalled(); expect(apiClient.post).not.toHaveBeenCalled();
  });
  it('un registro sin confirmar no ofrece la consulta de correo como prueba de creación', async () => {
    setup(); vi.mocked(apiClient.get).mockResolvedValueOnce({ ...confirmed(), estado: 'PENDIENTE', estadoNativo: 'PREPARADA', docenteId: null, confirmadaEn: null });
    click('Consultar resultado'); await waitFor(() => expect(apiClient.get).toHaveBeenCalledOnce());
    expect(screen.queryByRole('button', { name: 'Consultar estado del correo' })).toBeNull();
  });
});

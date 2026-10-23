import React, { useEffect, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GlobalChatbotProvider, ChatbotFullPageScope } from '../../../shell/src/components/chatbot/GlobalChatbotProvider';

const mounts = vi.fn();
let remoteFailure = false;
vi.mock('chatbot/Module', () => ({ default: ({ mode, userId }: { mode?: string; userId?: string }) => {
  if (remoteFailure) throw new Error('Synthetic remote failure');
  const [draft, setDraft] = useState('');
  useEffect(() => { mounts(mode, userId); }, []);
  return <input aria-label="Borrador global" data-mode={mode} data-user={userId} value={draft} onChange={(event) => setDraft(event.target.value)} />;
} }));
const alice = { id: 'alice', name: 'Alice', email: 'alice@example.invalid' };
const bob = { id: 'bob', name: 'Bob', email: 'bob@example.invalid' };
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => { remoteFailure = false; mounts.mockClear(); fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ activo: true }) }); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });
const provider = (children: React.ReactNode, user?: typeof alice, base = '/services') => <GlobalChatbotProvider apiBaseUrl={base} user={user}>{children}</GlobalChatbotProvider>;
async function open() { fireEvent.click(await screen.findByRole('button', { name: 'Asistente ESAP' })); return await screen.findByRole('textbox', { name: 'Borrador global' }) as HTMLInputElement; }

it('cubre vistas públicas, portal y backoffice con la misma instancia y conserva el borrador', async () => {
  const view = render(provider(<p>Portal</p>, alice));
  fireEvent.change(await open(), { target: { value: 'Pendiente' } });
  for (const route of ['Backoffice', 'Certificados', 'Autogestión docente', 'Expediente compartido', 'Portada']) {
    view.rerender(provider(<p>{route}</p>, alice));
    expect((screen.getByRole('textbox', { name: 'Borrador global' }) as HTMLInputElement).value).toBe('Pendiente');
    expect(screen.getAllByTitle('Minimizar chat')).toHaveLength(1);
  }
  expect(mounts).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe('/services/chatbot/api/v1/public/config');
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'omit', cache: 'no-store' });
});

it('el visitante usa orientación pública y el inicio o cambio de cuenta limpia el estado anterior', async () => {
  const view = render(provider(<p>Login</p>));
  const input = await open();
  expect(input.getAttribute('data-mode')).toBe('public');
  fireEvent.change(input, { target: { value: 'Consulta visitante' } });
  view.rerender(provider(<p>Portal</p>, alice));
  expect((await open()).value).toBe('');
  expect(screen.getByRole('textbox').getAttribute('data-user')).toBe('alice');
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Privado Alice' } });
  view.rerender(provider(<p>Portal</p>, bob));
  expect((await open()).value).toBe('');
  expect(screen.getByRole('textbox').getAttribute('data-user')).toBe('bob');
  view.rerender(provider(<p>Portada</p>));
  expect((await open()).getAttribute('data-mode')).toBe('public');
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
});

it('oculta el widget en la vista completa y lo recupera conservando su borrador', async () => {
  const view = render(provider(<p>Portal</p>, alice));
  fireEvent.change(await open(), { target: { value: 'Conservar' } });
  view.rerender(provider(<ChatbotFullPageScope><p>Historial completo</p></ChatbotFullPageScope>, alice));
  expect(screen.queryByRole('textbox', { name: 'Borrador global' })).toBeNull();
  expect(screen.getByText('Historial completo')).toBeTruthy();
  view.rerender(provider(<p>Otro módulo</p>, alice));
  expect((await screen.findByRole('textbox', { name: 'Borrador global' }) as HTMLInputElement).value).toBe('Conservar');
  expect(mounts).toHaveBeenCalledTimes(1);
});

it('no supone que el módulo esté activo mientras carga y respeta su desactivación', async () => {
  let resolve!: (value: unknown) => void;
  fetchMock.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  render(provider(<ChatbotFullPageScope><p>Historial privado</p></ChatbotFullPageScope>, alice));
  expect(screen.queryByRole('button', { name: 'Asistente ESAP' })).toBeNull();
  expect(screen.queryByText('Historial privado')).toBeNull();
  await act(async () => resolve({ ok: true, json: async () => ({ activo: false }) }));
  expect(await screen.findByText('El asistente está desactivado.')).toBeTruthy();
  expect(mounts).not.toHaveBeenCalled();
});

it.each([null, { activo: 'true' }, new Error('offline')])('ofrece reintento sin habilitar el asistente ante configuración inválida o fallo: %s', async (result) => {
  if (result instanceof Error) fetchMock.mockRejectedValueOnce(result);
  else fetchMock.mockResolvedValueOnce({ ok: true, json: async () => result });
  render(provider(<p>Portada</p>));
  fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByRole('button', { name: 'Asistente ESAP' })).toBeTruthy();
  expect(mounts).not.toHaveBeenCalled();
});

it('actualiza la activación al cambiar configuración y al recuperar el foco', async () => {
  render(provider(<p>Portal</p>, alice));
  await open();
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ activo: false }) });
  act(() => window.dispatchEvent(new Event('esap:chatbot-config-changed')));
  await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
  act(() => window.dispatchEvent(new Event('focus')));
  expect(await screen.findByRole('button', { name: 'Asistente ESAP' })).toBeTruthy();
  expect((await open()).value).toBe('');
});

it('descarta respuestas de configuración de un gateway anterior', async () => {
  let resolve!: (value: unknown) => void;
  fetchMock.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  const view = render(provider(<p>Portada</p>));
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ activo: false }) });
  view.rerender(provider(<p>Portada</p>, undefined, '/qa-services'));
  await act(async () => resolve({ ok: true, json: async () => ({ activo: true }) }));
  expect(screen.queryByRole('button', { name: 'Asistente ESAP' })).toBeNull();
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
});

it('conserva el borrador oculto si falla una actualización de disponibilidad y lo recupera al reintentar', async () => {
  render(provider(<p>Portal</p>, alice));
  fireEvent.change(await open(), { target: { value: 'Borrador conservado' } });
  fetchMock.mockRejectedValueOnce(new Error('offline'));
  act(() => window.dispatchEvent(new Event('focus')));
  fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
  expect((await screen.findByRole('textbox') as HTMLInputElement).value).toBe('Borrador conservado');
  expect(mounts).toHaveBeenCalledTimes(1);
});

it('un error del remoto deja funcionando la vista y ofrece un reintento aislado', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  remoteFailure = true;
  render(provider(<p>Vista principal operativa</p>, alice));
  fireEvent.click(await screen.findByRole('button', { name: 'Asistente ESAP' }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByText('Vista principal operativa')).toBeTruthy();
  remoteFailure = false;
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect((await open()).getAttribute('data-user')).toBe('alice');
});

it('cancela una comprobación que tarda demasiado sin habilitar el asistente', async () => {
  vi.useFakeTimers();
  fetchMock.mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  render(provider(<p>Portada</p>));
  await act(async () => { vi.advanceTimersByTime(20_000); });
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Asistente ESAP' })).toBeNull();
});

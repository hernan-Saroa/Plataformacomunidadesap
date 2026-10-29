import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ChatbotModule } from './ChatbotModule';

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => { fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ respuesta: 'Orientación del servidor' }) }); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function send(text = 'Certificados') { fireEvent.change(screen.getByRole('textbox', { name: 'Consulta pública' }), { target: { value: text } }); fireEvent.click(screen.getByRole('button', { name: 'Enviar' })); }

it('el modo público no consulta historial ni permisos y envía solo el texto sin cookie', async () => {
  render(<ChatbotModule mode="public" apiBaseUrl="/services" userId="ignored" />);
  expect(fetchMock).not.toHaveBeenCalled();
  send();
  expect(await screen.findByText('Orientación del servidor', { exact: false })).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/public\/consultas$/);
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'omit', body: JSON.stringify({ contenido: 'Certificados' }) });
});

it('conserva la consulta y permite reintentar manualmente sin inventar respuesta', async () => {
  fetchMock.mockRejectedValueOnce(new Error('offline'));
  render(<ChatbotModule mode="public" />);
  send();
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Certificados');
  expect(screen.queryByText('Orientación del servidor')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(await screen.findByText('Orientación del servidor', { exact: false })).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('no duplica consultas pendientes y descarta respuestas de un gateway anterior', async () => {
  let resolve!: (value: unknown) => void;
  fetchMock.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  const view = render(<ChatbotModule mode="public" apiBaseUrl="/services" />);
  send('Consulta anterior');
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  view.rerender(<ChatbotModule mode="public" apiBaseUrl="/new-services" />);
  await act(async () => resolve({ ok: true, json: async () => ({ respuesta: 'Respuesta anterior' }) }));
  expect(screen.queryByText('Respuesta anterior', { exact: false })).toBeNull();
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
});

it('permite abrir el inicio de sesión sin solicitar información personal', () => {
  const login = vi.fn();
  render(<ChatbotModule mode="public" onLogin={login} />);
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  expect(login).toHaveBeenCalledTimes(1);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('informa una desactivación sobrevenida sin hablar de conversaciones privadas', async () => {
  fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
  render(<ChatbotModule mode="public" />);
  send();
  expect((await screen.findByRole('alert')).textContent).toContain('El asistente público ya no está habilitado.');
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Certificados');
});

it('inicia una consulta pública nueva limpiando únicamente la memoria local y enfocando la entrada', async () => {
  render(<ChatbotModule mode="public" />);
  send();
  await screen.findByText('Orientación del servidor', { exact: false });
  fireEvent.click(screen.getByRole('button', { name: 'Nueva consulta' }));
  expect(screen.queryByText('Orientación del servidor', { exact: false })).toBeNull();
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
  expect(document.activeElement).toBe(screen.getByRole('textbox'));
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

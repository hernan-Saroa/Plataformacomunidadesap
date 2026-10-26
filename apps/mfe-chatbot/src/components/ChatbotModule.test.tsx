import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotModule } from './ChatbotModule';
import { ChatbotHttpError, ChatbotService, ChatbotServiceError, createChatbotService } from '../services/chatbot.service';

vi.mock('../services/chatbot.service', async () => {
  const original = await vi.importActual<typeof import('../services/chatbot.service')>('../services/chatbot.service');
  return { ...original, createChatbotService: vi.fn(), ChatbotService: {
    obtenerAcceso: vi.fn(), listarConversaciones: vi.fn(), crearConversacion: vi.fn(),
    obtenerConversacion: vi.fn(), enviarMensaje: vi.fn(),
  } };
});

const api = vi.mocked(ChatbotService);
const own = { id: 'own', titulo: 'Mi consulta', contexto: 'general', puedeEscribir: true,
  createdAt: '2026-10-22T12:00:00Z', updatedAt: '2026-10-22T12:00:00Z', mensajes: [] };
const other = { ...own, id: 'other', titulo: 'Consulta ajena', puedeEscribir: false,
  mensajes: [{ id: 'msg', conversacionId: 'other', rol: 'user' as const, contenido: 'Contenido privado anterior', createdAt: own.createdAt }] };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(createChatbotService).mockReturnValue(api);
  Element.prototype.scrollIntoView = vi.fn();
  api.obtenerAcceso.mockResolvedValue({ puedeVerTodas: false });
  api.listarConversaciones.mockResolvedValue([own]);
  api.obtenerConversacion.mockResolvedValue(own);
  api.crearConversacion.mockResolvedValue({ ...own, id: 'new' });
});
afterEach(cleanup);

const input = () => screen.getByPlaceholderText(/Escribe tu consulta/) as HTMLInputElement;
const sendButton = () => screen.getByRole('button', { name: 'Enviar' }) as HTMLButtonElement;
const ready = async () => { await waitFor(() => expect(input().disabled).toBe(false)); };
const confirmed = {
  userMessage: { id: 'saved-user', conversacionId: 'own', rol: 'user' as const, contenido: 'Mi consulta pendiente', createdAt: own.createdAt },
  botMessage: { id: 'saved-bot', conversacionId: 'own', rol: 'assistant' as const, contenido: 'Respuesta real del servidor', createdAt: own.createdAt },
};

describe('fallos y recuperación del servicio', () => {
  it('muestra una desconexión al iniciar y permite recuperar el historial mediante lectura', async () => {
    api.obtenerAcceso.mockRejectedValueOnce(new ChatbotServiceError('network'));
    render(<ChatbotModule userId="alice" isWidget />);
    await screen.findByRole('alert');
    expect(screen.queryByText('Última consulta correcta')).toBeNull();
    expect(screen.getByText('Servicio no disponible')).toBeTruthy();
    expect(api.listarConversaciones).not.toHaveBeenCalled();
    expect(api.crearConversacion).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await ready();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Última consulta correcta')).toBeTruthy();
  });

  it('un fallo del historial no se interpreta como una lista vacía ni crea conversaciones', async () => {
    api.listarConversaciones.mockRejectedValueOnce(new ChatbotHttpError(503));
    render(<ChatbotModule userId="alice" />);
    await screen.findByRole('alert');
    expect(api.crearConversacion).not.toHaveBeenCalled();
    expect(screen.queryByText('No se encontraron conversaciones.')).toBeNull();
    expect(sendButton().disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await ready();
    expect(api.listarConversaciones).toHaveBeenCalledTimes(2);
    expect(api.crearConversacion).not.toHaveBeenCalled();
  });

  it('una creación no confirmada se recupera leyendo y no repite POST automáticamente', async () => {
    api.listarConversaciones.mockResolvedValue([]);
    api.crearConversacion.mockRejectedValueOnce(new ChatbotServiceError('timeout'));
    render(<ChatbotModule userId="alice" isWidget />);
    expect((await screen.findByRole('alert')).textContent).toContain('confirmar la creación');
    expect(api.crearConversacion).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Revisar historial' }));
    const start = await screen.findByRole('button', { name: 'Iniciar conversación' });
    expect(api.crearConversacion).toHaveBeenCalledTimes(1);
    fireEvent.click(start);
    await ready();
    expect(api.crearConversacion).toHaveBeenCalledTimes(2);
  });

  it('permite reintentar una lectura fallida de detalle sin usar el detalle anterior en caché', async () => {
    api.obtenerConversacion.mockRejectedValueOnce(new ChatbotServiceError('network'));
    render(<ChatbotModule userId="alice" />);
    await screen.findByRole('alert');
    expect(input().disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await ready();
    expect(api.obtenerConversacion).toHaveBeenCalledTimes(2);
  });

  it('una conversación inaccesible permite volver al historial personal sin repetir escrituras', async () => {
    api.obtenerConversacion.mockRejectedValueOnce(new ChatbotHttpError(404));
    render(<ChatbotModule userId="alice" isWidget />);
    await screen.findByRole('alert');
    api.listarConversaciones.mockResolvedValue([]);
    fireEvent.click(screen.getByRole('button', { name: 'Revisar historial' }));
    await screen.findByRole('button', { name: 'Iniciar conversación' });
    expect(api.listarConversaciones).toHaveBeenLastCalledWith(false);
    expect(api.crearConversacion).not.toHaveBeenCalled();
    expect(api.enviarMensaje).not.toHaveBeenCalled();
  });

  it('conserva el mensaje fallido y revisa el servidor antes de habilitar otro envío', async () => {
    api.enviarMensaje.mockRejectedValueOnce(new ChatbotServiceError('network'));
    render(<ChatbotModule userId="alice" isWidget />);
    await ready();
    fireEvent.change(input(), { target: { value: 'Mi consulta pendiente' } });
    fireEvent.click(sendButton());
    expect((await screen.findByRole('alert')).textContent).toContain('podría haberse guardado');
    expect(input().value).toBe('Mi consulta pendiente');
    expect(sendButton().disabled).toBe(true);
    expect(screen.queryByText('Pendiente de confirmación')).toBeNull();
    expect(screen.queryByText(/He recibido tu mensaje/)).toBeNull();
    fireEvent.change(input(), { target: { value: 'Consulta revisada por el usuario' } });
    fireEvent.click(screen.getByRole('button', { name: 'Revisar conversación' }));
    await screen.findByText(/Historial actualizado/);
    expect(input().value).toBe('Consulta revisada por el usuario');
    expect(api.enviarMensaje).toHaveBeenCalledTimes(1);
    expect(sendButton().disabled).toBe(false);
  });

  it('si la revisión también falla conserva el borrador y mantiene bloqueado el reenvío', async () => {
    api.enviarMensaje.mockRejectedValueOnce(new ChatbotHttpError(500));
    render(<ChatbotModule userId="alice" />);
    await ready();
    fireEvent.change(input(), { target: { value: 'Mi consulta pendiente' } });
    fireEvent.click(sendButton());
    await screen.findByRole('alert');
    api.obtenerConversacion.mockRejectedValueOnce(new ChatbotServiceError('timeout'));
    fireEvent.click(screen.getByRole('button', { name: 'Revisar conversación' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('cargar la conversación'));
    expect(input().value).toBe('Mi consulta pendiente');
    expect(sendButton().disabled).toBe(true);
    expect(api.enviarMensaje).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await ready();
    expect(input().value).toBe('Mi consulta pendiente');
    expect(api.enviarMensaje).toHaveBeenCalledTimes(1);
  });

  it('el éxito guarda solo la respuesta confirmada y limpia el borrador', async () => {
    api.enviarMensaje.mockResolvedValue(confirmed);
    render(<ChatbotModule userId="alice" />);
    await ready();
    fireEvent.change(input(), { target: { value: 'Mi consulta pendiente' } });
    fireEvent.click(sendButton());
    await screen.findByText('Respuesta real del servidor');
    await ready();
    expect(input().value).toBe('');
    expect(screen.queryByText('Pendiente de confirmación')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(api.enviarMensaje).toHaveBeenCalledTimes(1);
  });

  it('un fallo al refrescar la lista después del éxito no reenvía ni elimina mensajes confirmados', async () => {
    api.enviarMensaje.mockResolvedValue(confirmed);
    render(<ChatbotModule userId="alice" />);
    await ready();
    api.listarConversaciones.mockRejectedValueOnce(new ChatbotHttpError(502));
    fireEvent.change(input(), { target: { value: 'Mi consulta pendiente' } });
    fireEvent.click(sendButton());
    expect((await screen.findByRole('alert')).textContent).toContain('actualizar la lista');
    expect(screen.getByText('Respuesta real del servidor')).toBeTruthy();
    expect(input().value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(api.enviarMensaje).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Respuesta real del servidor')).toBeTruthy();
  });

  it('identifica el mensaje optimista como pendiente y bloquea dobles envíos', async () => {
    let resolveSend!: (value: typeof confirmed) => void;
    api.enviarMensaje.mockImplementationOnce(() => new Promise<typeof confirmed>((resolve) => { resolveSend = resolve; }));
    render(<ChatbotModule userId="alice" isWidget />);
    await ready();
    fireEvent.change(input(), { target: { value: 'Mi consulta pendiente' } });
    fireEvent.click(sendButton());
    fireEvent.click(sendButton());
    await screen.findByText('Pendiente de confirmación');
    expect(api.enviarMensaje).toHaveBeenCalledTimes(1);
    await act(async () => resolveSend(confirmed));
    await screen.findByText('Respuesta real del servidor');
  });

  it('deja de indicar que se procesa la respuesta cuando ya llegó, aunque la lista siga cargando', async () => {
    let resolveList!: (value: (typeof own)[]) => void;
    api.enviarMensaje.mockResolvedValue(confirmed);
    render(<ChatbotModule userId="alice" />);
    await ready();
    api.listarConversaciones.mockImplementationOnce(() => new Promise<(typeof own)[]>((resolve) => { resolveList = resolve; }));
    fireEvent.change(input(), { target: { value: 'Mi consulta pendiente' } });
    fireEvent.click(sendButton());
    await screen.findByText('Respuesta real del servidor');
    expect(screen.queryByText(/está procesando tu respuesta/)).toBeNull();
    await act(async () => resolveList([own]));
    await ready();
  });

  it('conserva borradores separados por conversación y los elimina al cambiar de cuenta', async () => {
    const second = { ...own, id: 'second', titulo: 'Segunda consulta' };
    api.listarConversaciones.mockResolvedValue([own, second]);
    api.obtenerConversacion.mockImplementation(async (id) => id === 'second' ? second : own);
    const view = render(<ChatbotModule userId="alice" />);
    await ready();
    fireEvent.change(input(), { target: { value: 'Borrador privado de Alice' } });
    fireEvent.click(screen.getByRole('button', { name: /Segunda consulta/ }));
    await ready();
    expect(input().value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: /Mi consulta/ }));
    await ready();
    expect(input().value).toBe('Borrador privado de Alice');
    view.rerender(<ChatbotModule userId="bob" />);
    await ready();
    expect(input().value).toBe('');
  });
});
describe('privacidad del historial en la interfaz', () => {
  it('usa una instancia con la base entregada por el shell', async () => {
    render(<ChatbotModule userId="alice" apiBaseUrl="https://qa.example/services" />);
    await ready();
    expect(createChatbotService).toHaveBeenCalledWith('https://qa.example/services');
    expect(api.obtenerAcceso).toHaveBeenCalledTimes(1);
  });

  it('cambiar de gateway descarta respuestas pendientes y borradores del destino anterior', async () => {
    let resolveOld!: (value: typeof other) => void;
    const oldApi = { ...api, obtenerConversacion: vi.fn().mockImplementation(() => new Promise<typeof other>((resolve) => { resolveOld = resolve; })) };
    vi.mocked(createChatbotService).mockImplementation((base) => base === '/first' ? oldApi : { ...api });
    const view = render(<ChatbotModule userId="alice" apiBaseUrl="/first" />);
    await waitFor(() => expect(oldApi.obtenerConversacion).toHaveBeenCalledTimes(1));
    view.rerender(<ChatbotModule userId="alice" apiBaseUrl="/second" />);
    await ready();
    await act(async () => resolveOld(other));
    expect(screen.queryByText('Contenido privado anterior')).toBeNull();
    fireEvent.change(input(), { target: { value: 'Borrador del segundo destino' } });
    view.rerender(<ChatbotModule userId="alice" apiBaseUrl="/third" />);
    await ready();
    expect(input().value).toBe('');
  });

  it('el módulo completo abre el historial personal sin pedir todas las conversaciones', async () => {
    render(<ChatbotModule userId="alice" />);
    await waitFor(() => expect(api.obtenerConversacion).toHaveBeenCalledWith('own'));
    expect(api.listarConversaciones).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('button', { name: 'Historial institucional' })).toBeNull();
  });

  it('permite consulta institucional autorizada, pero sin formulario de escritura ajena', async () => {
    api.obtenerAcceso.mockResolvedValue({ puedeVerTodas: true });
    render(<ChatbotModule userId="admin" />);
    const globalButton = await screen.findByRole('button', { name: 'Historial institucional' });
    await waitFor(() => expect((globalButton as HTMLButtonElement).disabled).toBe(false));
    api.listarConversaciones.mockResolvedValue([other]);
    api.obtenerConversacion.mockResolvedValue(other);
    fireEvent.click(globalButton);
    await screen.findByText(/Consulta de solo lectura/);
    expect(api.listarConversaciones).toHaveBeenLastCalledWith(true);
    expect(screen.queryByRole('button', { name: 'Enviar' })).toBeNull();
    expect(api.enviarMensaje).not.toHaveBeenCalled();
  });

  it('el widget mantiene el historial personal incluso con permiso administrativo', async () => {
    api.obtenerAcceso.mockResolvedValue({ puedeVerTodas: true });
    render(<ChatbotModule userId="admin" isWidget />);
    await waitFor(() => expect(api.obtenerConversacion).toHaveBeenCalled());
    expect(api.listarConversaciones).toHaveBeenCalledWith(false);
    expect(api.listarConversaciones).not.toHaveBeenCalledWith(true);
  });

  it('al revocar lectura institucional permite recuperar solo el historial propio sin escrituras', async () => {
    api.obtenerAcceso.mockResolvedValue({ puedeVerTodas: true });
    render(<ChatbotModule userId="admin" />);
    await ready();
    api.listarConversaciones.mockRejectedValueOnce(new ChatbotHttpError(403));
    fireEvent.click(screen.getByRole('button', { name: 'Historial institucional' }));
    await screen.findByRole('alert');
    expect(screen.queryByText('Contenido privado anterior')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Historial institucional' })).toBeNull();
    api.obtenerAcceso.mockResolvedValue({ puedeVerTodas: false });
    fireEvent.click(screen.getByRole('button', { name: 'Ver mi historial' }));
    await ready();
    expect(api.listarConversaciones).toHaveBeenLastCalledWith(false);
    expect(api.crearConversacion).not.toHaveBeenCalled();
    expect(api.enviarMensaje).not.toHaveBeenCalled();
  });

  it('una sesión rechazada muestra error y no crea una conversación simulada', async () => {
    api.obtenerAcceso.mockRejectedValue(new ChatbotHttpError(401));
    render(<ChatbotModule userId="alice" />);
    expect((await screen.findByRole('alert')).textContent).toContain('sesión');
    expect(api.listarConversaciones).not.toHaveBeenCalled();
    expect(api.crearConversacion).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Enviar' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('no muestra detalle antiguo en caché si el servidor rechaza la conversación', async () => {
    api.listarConversaciones.mockResolvedValue([other]);
    api.obtenerConversacion.mockRejectedValue(new ChatbotHttpError(404));
    render(<ChatbotModule userId="alice" />);
    await screen.findByRole('alert');
    expect(screen.queryByText('Contenido privado anterior')).toBeNull();
    expect((screen.getByRole('button', { name: 'Enviar' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('ignora respuestas pendientes de la sesión anterior al cambiar de cuenta', async () => {
    let resolveOld!: (value: typeof other) => void;
    api.obtenerConversacion.mockImplementationOnce(() => new Promise<typeof other>((resolve) => { resolveOld = resolve; }));
    const view = render(<ChatbotModule userId="alice" />);
    await waitFor(() => expect(api.obtenerConversacion).toHaveBeenCalledTimes(1));
    view.rerender(<ChatbotModule userId="bob" />);
    await waitFor(() => expect(api.obtenerConversacion).toHaveBeenCalledTimes(2));
    await act(async () => resolveOld(other));
    expect(screen.queryByText('Contenido privado anterior')).toBeNull();
  });

  it('respeta la conversación inicial sin que la selección automática la sustituya', async () => {
    render(<ChatbotModule userId="alice" initialConversationId="initial" />);
    await waitFor(() => expect(api.obtenerConversacion).toHaveBeenCalledWith('initial'));
    expect(api.obtenerConversacion).not.toHaveBeenCalledWith('own');
  });
});

describe('navegación del widget', () => {
  it('la vista completa en móvil alterna historial y chat sin perder borradores', async () => {
    const previousWidth = window.innerWidth;
    try {
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
      render(<ChatbotModule userId="alice" />);
      await ready();
      expect(input().maxLength).toBe(2000);
      fireEvent.change(input(), { target: { value: 'Borrador móvil' } });
      fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
      expect(screen.queryByRole('textbox', { name: 'Mensaje para el asistente' })).toBeNull();
      expect(screen.getByRole('textbox', { name: 'Buscar conversaciones' })).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Volver al chat' }));
      expect(input().value).toBe('Borrador móvil');
      await act(async () => { window.innerWidth = 1200; window.dispatchEvent(new Event('resize')); });
      expect(screen.queryByRole('button', { name: 'Historial' })).toBeNull();
      expect(screen.getByRole('textbox', { name: 'Buscar conversaciones' })).toBeTruthy();
      expect(input().value).toBe('Borrador móvil');
    } finally { window.innerWidth = previousWidth; }
  });

  it('permite buscar y cambiar de conversación conservando borradores y enfocando la entrada', async () => {
    const second = { ...own, id: 'second', titulo: 'Segunda consulta' };
    api.listarConversaciones.mockResolvedValue([own, second]);
    api.obtenerConversacion.mockImplementation(async (id) => id === 'second' ? second : own);
    render(<ChatbotModule userId="alice" isWidget />);
    await ready();
    fireEvent.change(input(), { target: { value: 'Borrador de la primera' } });
    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    const search = screen.getByRole('textbox', { name: 'Buscar conversaciones' });
    expect(document.activeElement).toBe(search);
    fireEvent.change(search, { target: { value: 'Segunda' } });
    expect(screen.queryByRole('button', { name: /Mi consulta/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Segunda consulta/ }));
    await ready();
    expect(input().value).toBe('');
    expect(document.activeElement).toBe(input());
    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar conversaciones' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Mi consulta/ }));
    await ready();
    expect(input().value).toBe('Borrador de la primera');
    expect(api.listarConversaciones).not.toHaveBeenCalledWith(true);
  });

  it('crea una sola conversación desde el widget y permite regresar al borrador anterior', async () => {
    let resolveCreate!: (value: typeof own) => void;
    api.crearConversacion.mockReturnValueOnce(new Promise((resolve) => { resolveCreate = resolve; }));
    api.obtenerConversacion.mockImplementation(async (id) => ({ ...own, id }));
    render(<ChatbotModule userId="alice" isWidget />);
    await ready();
    fireEvent.change(input(), { target: { value: 'Borrador anterior' } });
    const create = screen.getByRole('button', { name: 'Nueva conversación' });
    fireEvent.click(create); fireEvent.click(create);
    expect(api.crearConversacion).toHaveBeenCalledTimes(1);
    expect((create as HTMLButtonElement).disabled).toBe(true);
    await act(async () => resolveCreate({ ...own, id: 'new', titulo: 'Nueva consulta' }));
    await ready();
    expect(input().value).toBe('');
    expect(document.activeElement).toBe(input());
    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    fireEvent.click(screen.getByRole('button', { name: /Mi consulta/ }));
    await ready();
    expect(input().value).toBe('Borrador anterior');
  });

  it('un fallo de selección desde el historial queda visible y se recupera sin crear ni enviar', async () => {
    render(<ChatbotModule userId="alice" isWidget />);
    await ready();
    api.obtenerConversacion.mockRejectedValueOnce(new ChatbotHttpError(503));
    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    fireEvent.click(screen.getByRole('button', { name: /Mi consulta/ }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(input().disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await ready();
    expect(api.crearConversacion).not.toHaveBeenCalled();
    expect(api.enviarMensaje).not.toHaveBeenCalled();
  });

  it('ofrece sugerencias después del saludo y las usa como borrador sin enviarlas', async () => {
    api.obtenerConversacion.mockResolvedValue({ ...own, mensajes: [{ id: 'welcome', conversacionId: 'own', rol: 'assistant', contenido: 'Bienvenido', createdAt: own.createdAt }] });
    render(<ChatbotModule userId="alice" isWidget />);
    await ready();
    fireEvent.click(screen.getByRole('button', { name: /Viáticos y Gastos de Viaje/ }));
    expect(input().value).toContain('viáticos');
    expect(document.activeElement).toBe(input());
    expect(api.enviarMensaje).not.toHaveBeenCalled();
  });

  it('actualiza el historial del widget tras enviar y un fallo de esa lectura nunca repite el envío', async () => {
    api.enviarMensaje.mockResolvedValue(confirmed);
    render(<ChatbotModule userId="alice" isWidget />);
    await ready();
    api.listarConversaciones.mockRejectedValueOnce(new ChatbotHttpError(503));
    fireEvent.change(input(), { target: { value: 'Mi consulta pendiente' } });
    fireEvent.click(sendButton());
    expect((await screen.findByRole('alert')).textContent).toContain('actualizar la lista');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(api.enviarMensaje).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Respuesta real del servidor')).toBeTruthy();
  });
});

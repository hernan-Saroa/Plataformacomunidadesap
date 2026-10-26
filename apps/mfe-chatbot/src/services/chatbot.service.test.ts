import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHATBOT_REQUEST_TIMEOUT_MS, ChatbotHttpError, ChatbotService, ChatbotServiceError, createChatbotService, resolveChatbotGatewayBaseUrl } from './chatbot.service';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

const conversation = { id: 'id', titulo: 'Consulta', contexto: 'general', puedeEscribir: true,
  createdAt: '2026-10-22T12:00:00Z', updatedAt: '2026-10-22T12:00:00Z' };
const sent = {
  userMessage: { id: 'user-id', conversacionId: 'id', rol: 'user', contenido: 'Hola', createdAt: conversation.createdAt },
  botMessage: { id: 'bot-id', conversacionId: 'id', rol: 'assistant', contenido: 'Respuesta del servidor', createdAt: conversation.createdAt },
};
const operations = () => [
  () => ChatbotService.obtenerAcceso(), () => ChatbotService.listarConversaciones(),
  () => ChatbotService.crearConversacion(), () => ChatbotService.obtenerConversacion('id'),
  () => ChatbotService.enviarMensaje('id', 'Hola'),
];

describe('cliente autenticado del chatbot', () => {
  it('envía la cookie en todas las operaciones y no envía identidad declarada por el navegador', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url, options) => ({ ok: true, json: async () =>
      url.endsWith('/acceso') ? { puedeVerTodas: false } : url.endsWith('/mensajes') ? sent
      : url.endsWith('/conversaciones') && !options.method ? [] : conversation }));
    vi.stubGlobal('fetch', fetchMock);
    await ChatbotService.obtenerAcceso();
    await ChatbotService.listarConversaciones();
    await ChatbotService.crearConversacion('Consulta', 'general');
    await ChatbotService.obtenerConversacion('id');
    await ChatbotService.enviarMensaje('id', 'Hola');
    expect(fetchMock.mock.calls).toHaveLength(5);
    for (const [, options] of fetchMock.mock.calls) {
      expect(options.credentials).toBe('include');
      expect(options.cache).toBe('no-store');
      expect(options.signal).toBeInstanceOf(AbortSignal);
    }
    expect(fetchMock.mock.calls[1][0]).not.toContain('todos');
    expect(fetchMock.mock.calls[1][0]).not.toContain('email');
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ titulo: 'Consulta', contexto: 'general' });
  });

  it.each([400, 401, 403, 404, 409, 429, 500, 502, 503, 504])('propaga HTTP %s sin inventar un historial ni simular una respuesta', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status }));
    for (const operation of operations()) {
      await expect(operation()).rejects.toBeInstanceOf(ChatbotHttpError);
      await expect(operation()).rejects.toMatchObject({ status });
    }
  });

  it('propaga desconexión en todas las operaciones sin exponer errores internos', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Internal host and connection details'));
    vi.stubGlobal('fetch', fetchMock);
    for (const operation of operations()) {
      await expect(operation()).rejects.toMatchObject({ reason: 'network', message: expect.not.stringContaining('Internal host') });
    }
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('una lista realmente vacía se devuelve solo si la API responde correctamente', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    await expect(ChatbotService.listarConversaciones()).resolves.toEqual([]);
  });

  it('no transforma HTML o JSON inválido en una respuesta del asistente', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new SyntaxError('HTML from proxy'); } }));
    for (const operation of operations()) await expect(operation()).rejects.toMatchObject({ reason: 'response' });
  });

  it('rechaza estructuras de respuesta inválidas en todas las operaciones', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    for (const operation of operations()) await expect(operation()).rejects.toBeInstanceOf(ChatbotServiceError);
  });

  it('rechaza detalles o respuestas que correspondan a otra conversación', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ ...conversation, id: 'another' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...sent, botMessage: { ...sent.botMessage, conversacionId: 'another' } }) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(ChatbotService.obtenerConversacion('id')).rejects.toMatchObject({ reason: 'response' });
    await expect(ChatbotService.enviarMensaje('id', 'Hola')).rejects.toMatchObject({ reason: 'response' });
  });

  it('cancela una petición lenta y no reintenta el POST automáticamente', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    vi.stubGlobal('fetch', fetchMock);
    const failure = expect(ChatbotService.enviarMensaje('id', 'Hola')).rejects.toMatchObject({ reason: 'timeout' });
    await vi.advanceTimersByTimeAsync(CHATBOT_REQUEST_TIMEOUT_MS);
    await failure;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aplica el tiempo límite también al cuerpo de la respuesta', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url, options) => ({ ok: true, json: () => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }) })));
    const failure = expect(ChatbotService.listarConversaciones()).rejects.toMatchObject({ reason: 'timeout' });
    await vi.advanceTimersByTimeAsync(CHATBOT_REQUEST_TIMEOUT_MS);
    await failure;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('mantiene los mensajes confirmados por el servidor en el flujo normal', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => sent }));
    await expect(ChatbotService.enviarMensaje('id', 'Hola')).resolves.toEqual(sent);
  });

  it('solo solicita el listado institucional al indicarlo expresamente', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);
    await ChatbotService.listarConversaciones(true);
    expect(fetchMock.mock.calls[0][0]).toContain('todos=true');
  });
});

describe('configuración de gateway y sesión', () => {
  const browser = (origin: string, runtimeUrl?: unknown) => {
    vi.stubGlobal('window', { location: new URL(origin), __ESAP_CONFIG__: { API_URL: runtimeUrl } });
    vi.stubEnv('VITE_API_URL', '');
  };

  it('la configuración entregada por el shell prevalece sobre runtime y Vite', () => {
    browser('https://plataforma.example', 'https://runtime.example/services');
    vi.stubEnv('VITE_API_URL', 'https://build.example/services');
    expect(resolveChatbotGatewayBaseUrl('https://gateway.example/custom-prefix///')).toBe('https://gateway.example/custom-prefix');
  });

  it('admite rutas relativas y normaliza barras finales con el origen actual', () => {
    browser('https://plataforma.example');
    expect(resolveChatbotGatewayBaseUrl('/services///')).toBe('https://plataforma.example/services');
    expect(resolveChatbotGatewayBaseUrl('services/')).toBe('https://plataforma.example/services');
  });

  it('en standalone usa runtime antes de la configuración de Vite', () => {
    browser('https://plataforma.example', '/runtime-services/');
    vi.stubEnv('VITE_API_URL', '/build-services');
    expect(resolveChatbotGatewayBaseUrl()).toBe('https://plataforma.example/runtime-services');
  });

  it('respeta VITE_API_URL cuando no hay configuración del shell o runtime', () => {
    browser('https://plataforma.example');
    vi.stubEnv('VITE_API_URL', 'https://api.example/platform/');
    expect(resolveChatbotGatewayBaseUrl()).toBe('https://api.example/platform');
  });

  it.each(['http://localhost:3118', 'http://127.0.0.1:3118', 'http://[::1]:3118', 'https://qa.example', 'https://preview.trycloudflare.com'])
    ('sin configuración usa /services en el mismo origen de %s', (origin) => {
      browser(origin);
      expect(resolveChatbotGatewayBaseUrl()).toBe('/services');
    });

  it('un build con localhost se adapta al dominio remoto como en el shell', () => {
    browser('https://qa.example:8443');
    vi.stubEnv('VITE_API_URL', 'http://localhost:4000/services/');
    expect(resolveChatbotGatewayBaseUrl()).toBe('https://qa.example:8443/services');
  });

  it.each(['http://127.0.0.1:4500', 'http://localhost:4500', 'https://[::1]:4500'])
    ('una dirección explícita local conserva su host y protocolo: %s', (base) => {
      browser('http://127.0.0.1:3000');
      expect(resolveChatbotGatewayBaseUrl(base)).toBe(base);
    });

  it.each(['javascript:alert(1)', 'ftp://api.example', 'https://user:pass@api.example', 'https://api.example/?token=secret', 'https://api.example/#hash', 'http://api.example'])
    ('rechaza una configuración incompatible sin hacer peticiones: %s', async (base) => {
      browser('https://plataforma.example');
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      await expect(createChatbotService(base).obtenerAcceso()).rejects.toMatchObject({ reason: 'configuration' });
      expect(fetchMock).not.toHaveBeenCalled();
    });

  it('una configuración runtime mal formada no redirige silenciosamente a otro gateway', async () => {
    browser('http://localhost:3000', 123);
    vi.stubGlobal('fetch', vi.fn());
    await expect(ChatbotService.obtenerAcceso()).rejects.toMatchObject({ reason: 'configuration' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('resuelve runtime en cada petición, sin mantener una base capturada al importar', async () => {
    browser('http://localhost:3000', '/first');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ puedeVerTodas: false }) });
    vi.stubGlobal('fetch', fetchMock);
    await ChatbotService.obtenerAcceso();
    (window as any).__ESAP_CONFIG__.API_URL = '/second';
    await ChatbotService.obtenerAcceso();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:3000/first/chatbot/api/v1/chat/acceso',
      'http://localhost:3000/second/chatbot/api/v1/chat/acceso',
    ]);
  });

  it('las instancias conservan gateways separados sin cambiar el cliente global', async () => {
    browser('http://127.0.0.1:3000');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ puedeVerTodas: false }) });
    vi.stubGlobal('fetch', fetchMock);
    const first = createChatbotService('http://127.0.0.1:4500');
    const second = createChatbotService('/services');
    await first.obtenerAcceso(); await second.obtenerAcceso(); await ChatbotService.obtenerAcceso();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://127.0.0.1:4500/chatbot/api/v1/chat/acceso',
      'http://127.0.0.1:3000/services/chatbot/api/v1/chat/acceso',
      '/services/chatbot/api/v1/chat/acceso',
    ]);
    for (const [, options] of fetchMock.mock.calls) {
      expect(options.credentials).toBe('include');
      expect(options.headers).not.toHaveProperty('Authorization');
      expect(options.headers).not.toHaveProperty('Cookie');
    }
  });
});

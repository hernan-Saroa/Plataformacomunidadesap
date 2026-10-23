export interface MensajeChat {
  id: string;
  conversacionId: string;
  rol: 'user' | 'assistant' | 'system';
  contenido: string;
  createdAt: string;
  metadatos?: Record<string, any>;
}

export interface ConversacionChat {
  id: string;
  titulo: string;
  contexto: string;
  usuarioEmail?: string;
  usuarioNombre?: string;
  usuarioId?: string;
  createdAt: string;
  updatedAt: string;
  mensajes?: MensajeChat[];
  puedeEscribir?: boolean;
}

export class ChatbotHttpError extends Error {
  constructor(public readonly status: number) {
    super(status === 401 ? 'Tu sesión ha expirado. Inicia sesión nuevamente.'
      : status === 403 ? 'No tienes permiso para consultar este historial.'
      : status === 404 ? 'La conversación no está disponible para tu cuenta.'
      : status === 429 ? 'Hay demasiadas consultas. Espera un momento antes de reintentar.'
      : status >= 500 ? 'El servicio del chatbot no está disponible. Intenta nuevamente.'
      : 'El servicio no pudo aceptar la consulta. Revisa los datos e intenta nuevamente.');
  }
}

export class ChatbotServiceError extends Error {
  constructor(public readonly reason: 'network' | 'timeout' | 'response' | 'configuration') {
    super(reason === 'timeout' ? 'El servicio tardó demasiado en responder. Intenta nuevamente.'
      : reason === 'response' ? 'El chatbot recibió una respuesta no válida del servicio. Intenta nuevamente.'
      : reason === 'configuration' ? 'La conexión del chatbot no está configurada correctamente. Contacta al administrador.'
      : 'No se pudo conectar con el chatbot. Comprueba tu conexión e intenta nuevamente.');
  }
}

export const CHATBOT_REQUEST_TIMEOUT_MS = 20_000;

export function resolveChatbotGatewayBaseUrl(apiBaseUrl?: string): string {
  // El shell entrega la misma base que utiliza su cliente autenticado.
  // Runtime/Vite y /services son alternativas para abrir el remoto por separado.
  const runtimeUrl: unknown = typeof window !== 'undefined' ? (window as any).__ESAP_CONFIG__?.API_URL : undefined;
  const candidates: unknown[] = [apiBaseUrl, runtimeUrl, import.meta.env.VITE_API_URL];
  const configured = candidates.find((value) => value !== undefined && value !== null && value !== '');
  if (configured === undefined) return '/services';
  try {
    if (typeof configured !== 'string' || !configured.trim()) throw new Error('Invalid gateway configuration');
    const url = new URL(configured.trim(), typeof window !== 'undefined' ? window.location.origin : undefined);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error('Invalid gateway configuration');
    }
    const isLoopback = (hostname: string) => ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
    // Misma normalización del shell para builds locales utilizados en un dominio remoto.
    if (typeof window !== 'undefined' && isLoopback(url.hostname) && !isLoopback(window.location.hostname)) {
      url.host = window.location.host;
      url.protocol = window.location.protocol;
    }
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.protocol === 'http:') {
      throw new Error('Mixed content gateway');
    }
    return url.toString().replace(/\/+$/, '');
  } catch {
    throw new ChatbotServiceError('configuration');
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isMensaje = (value: unknown): value is MensajeChat => isRecord(value)
  && typeof value.id === 'string' && value.id.length > 0
  && typeof value.conversacionId === 'string'
  && ['user', 'assistant', 'system'].includes(value.rol as string)
  && typeof value.contenido === 'string' && typeof value.createdAt === 'string';
const isConversacion = (value: unknown): value is ConversacionChat => isRecord(value)
  && typeof value.id === 'string' && value.id.length > 0
  && typeof value.titulo === 'string' && typeof value.contexto === 'string'
  && typeof value.createdAt === 'string' && typeof value.updatedAt === 'string'
  && typeof value.puedeEscribir === 'boolean'
  && (value.mensajes === undefined || (Array.isArray(value.mensajes)
    && value.mensajes.every((message) => isMensaje(message) && message.conversacionId === value.id)));

// Una llamada fallida nunca representa un historial vacío ni un mensaje guardado.
// No reintentar POST automáticamente: el servidor pudo guardar antes de cortarse la conexión.
async function request<T>(apiBaseUrl: string | undefined, path: string, validate: (value: unknown) => value is T, init: RequestInit = {}): Promise<T> {
  const baseUrl = `${resolveChatbotGatewayBaseUrl(apiBaseUrl)}/chatbot/api/v1`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHATBOT_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      credentials: path.startsWith('/public/') ? 'omit' : 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new ChatbotHttpError(res.status);
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new ChatbotServiceError(controller.signal.aborted ? 'timeout' : 'response');
    }
    if (!validate(data)) throw new ChatbotServiceError('response');
    return data;
  } catch (error) {
    if (error instanceof ChatbotHttpError || error instanceof ChatbotServiceError) throw error;
    throw new ChatbotServiceError(controller.signal.aborted ? 'timeout' : 'network');
  } finally {
    clearTimeout(timeout);
  }
}

export const createChatbotService = (apiBaseUrl?: string) => ({
  obtenerConfiguracion(): Promise<{ activo: boolean }> {
    return request(apiBaseUrl, '/public/config', (value): value is { activo: boolean } => isRecord(value) && typeof value.activo === 'boolean');
  },

  consultarPublico(contenido: string): Promise<{ respuesta: string }> {
    return request(apiBaseUrl, '/public/consultas', (value): value is { respuesta: string } => isRecord(value)
      && typeof value.respuesta === 'string' && value.respuesta.trim().length > 0,
    { method: 'POST', body: JSON.stringify({ contenido }) });
  },

  obtenerAcceso(): Promise<{ puedeVerTodas: boolean }> {
    return request(apiBaseUrl, '/chat/acceso', (value): value is { puedeVerTodas: boolean } => isRecord(value) && typeof value.puedeVerTodas === 'boolean');
  },

  listarConversaciones(todos: boolean = false): Promise<ConversacionChat[]> {
    return request(apiBaseUrl, `/chat/conversaciones${todos ? '?todos=true' : ''}`,
      (value): value is ConversacionChat[] => Array.isArray(value) && value.every(isConversacion));
  },

  crearConversacion(
    titulo?: string,
    contexto?: string,
  ): Promise<ConversacionChat> {
    return request(apiBaseUrl, '/chat/conversaciones', isConversacion, {
      method: 'POST', body: JSON.stringify({ titulo, contexto: contexto || 'general' }),
    });
  },

  obtenerConversacion(id: string): Promise<ConversacionChat> {
    return request(apiBaseUrl, `/chat/conversaciones/${encodeURIComponent(id)}`,
      (value): value is ConversacionChat => isConversacion(value) && value.id === id);
  },

  enviarMensaje(
    conversacionId: string,
    contenido: string,
  ): Promise<{ userMessage: MensajeChat; botMessage: MensajeChat }> {
    return request(apiBaseUrl, `/chat/conversaciones/${encodeURIComponent(conversacionId)}/mensajes`,
      (value): value is { userMessage: MensajeChat; botMessage: MensajeChat } => isRecord(value)
        && isMensaje(value.userMessage) && value.userMessage.rol === 'user' && value.userMessage.conversacionId === conversacionId
        && isMensaje(value.botMessage) && value.botMessage.rol === 'assistant' && value.botMessage.conversacionId === conversacionId,
      { method: 'POST', body: JSON.stringify({ contenido }) });
  },
});

export const ChatbotService = createChatbotService();

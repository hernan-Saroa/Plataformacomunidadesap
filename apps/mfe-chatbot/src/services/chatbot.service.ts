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
}

const BASE_URL = '/services/chatbot/api/v1/chat';

export const ChatbotService = {
  async listarConversaciones(usuarioEmail?: string, todos: boolean = false): Promise<ConversacionChat[]> {
    try {
      let url = `${BASE_URL}/conversaciones`;
      const params = new URLSearchParams();
      if (todos) {
        params.append('todos', 'true');
      } else if (usuarioEmail) {
        params.append('email', usuarioEmail);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Error al listar conversaciones');
      return await res.json();
    } catch (error) {
      console.warn('Fallback local para conversaciones:', error);
      return [];
    }
  },

  async crearConversacion(
    titulo?: string,
    contexto?: string,
    usuarioEmail?: string,
    usuarioId?: string,
    usuarioNombre?: string,
  ): Promise<ConversacionChat> {
    try {
      const res = await fetch(`${BASE_URL}/conversaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          contexto: contexto || 'general',
          usuarioEmail,
          usuarioId,
          usuarioNombre,
        }),
      });
      if (!res.ok) throw new Error('Error al crear conversación');
      return await res.json();
    } catch (error) {
      console.warn('Fallback al crear conversación:', error);
      const id = 'local-' + Date.now();
      return {
        id,
        titulo: titulo || 'Nueva consulta',
        contexto: contexto || 'general',
        usuarioEmail,
        usuarioNombre,
        usuarioId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mensajes: [
          {
            id: 'msg-init',
            conversacionId: id,
            rol: 'assistant',
            contenido: '¡Hola! Soy el Asistente Virtual institucional de la ESAP. ¿En qué puedo ayudarte hoy?',
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }
  },

  async obtenerConversacion(id: string): Promise<ConversacionChat> {
    const res = await fetch(`${BASE_URL}/conversaciones/${id}`);
    if (!res.ok) throw new Error('Error al obtener conversación');
    return await res.json();
  },

  async enviarMensaje(
    conversacionId: string,
    contenido: string,
  ): Promise<{ userMessage: MensajeChat; botMessage: MensajeChat }> {
    try {
      const res = await fetch(`${BASE_URL}/conversaciones/${conversacionId}/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido }),
      });
      if (!res.ok) throw new Error('Error al enviar mensaje');
      return await res.json();
    } catch (error) {
      console.warn('Simulando respuesta local:', error);
      return {
        userMessage: {
          id: 'user-' + Date.now(),
          conversacionId,
          rol: 'user',
          contenido,
          createdAt: new Date().toISOString(),
        },
        botMessage: {
          id: 'bot-' + Date.now(),
          conversacionId,
          rol: 'assistant',
          contenido: `He recibido tu mensaje: "${contenido}". Puedes acceder a los diferentes módulos de la ESAP a través del menú lateral para gestionar trámites académicos, viáticos, certificaciones o gestión profesoral.`,
          createdAt: new Date().toISOString(),
        },
      };
    }
  },
};

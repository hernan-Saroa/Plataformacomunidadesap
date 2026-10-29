import { ChatbotHttpError, ChatbotServiceError, createChatbotService, resolveChatbotGatewayBaseUrl } from '../services/chatbot.service';

type Exchange = { question: string; answer: string };
type Snapshot = { messages: Exchange[]; draft: string; busy: boolean; error: string };

// Memoria del documento actual, compartida entre vistas. Una recarga la destruye.
class TransientChat {
  private state: Snapshot = { messages: [], draft: '', busy: false, error: '' };
  private listeners = new Set<() => void>();
  private revision = 0;
  private api;
  constructor(gateway: string) { this.api = createChatbotService(gateway); }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(change: Partial<Snapshot>) {
    this.state = { ...this.state, ...change };
    this.listeners.forEach(listener => listener());
  }
  setDraft = (draft: string) => { if (!this.state.busy) this.update({ draft: draft.slice(0, 2000) }); };
  reset = () => { ++this.revision; this.update({ messages: [], draft: '', busy: false, error: '' }); };
  send = async () => {
    const question = this.state.draft.trim();
    if (!question || this.state.busy) return;
    const revision = this.revision;
    this.update({ busy: true, error: '' });
    try {
      const result = await this.api.consultarPublico(question);
      if (revision !== this.revision) return;
      this.update({ messages: [...this.state.messages, { question, answer: result.respuesta }], draft: '' });
    } catch (failure) {
      if (revision !== this.revision) return;
      this.update({ error: failure instanceof ChatbotHttpError && failure.status === 404
        ? 'El asistente no está habilitado en este momento.'
        : failure instanceof ChatbotHttpError && [401, 403].includes(failure.status)
          ? 'El asistente no está disponible en este momento. Intenta nuevamente más tarde.'
          : failure instanceof ChatbotHttpError || failure instanceof ChatbotServiceError ? failure.message
            : 'No se pudo consultar el asistente. Intenta nuevamente.' });
    } finally { if (revision === this.revision) this.update({ busy: false }); }
  };
}

const sessions = new Map<string, TransientChat>();
export function getTransientChat(apiBaseUrl?: string) {
  const gateway = new URL(resolveChatbotGatewayBaseUrl(apiBaseUrl), window.location.origin).toString().replace(/\/+$/, '');
  let session = sessions.get(gateway);
  if (!session) { session = new TransientChat(gateway); sessions.set(gateway, session); }
  return session;
}

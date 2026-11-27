import { ChatbotHttpError, ChatbotServiceError, createChatbotService, resolveChatbotGatewayBaseUrl } from '../services/chatbot.service';
import type { ChatbotProcessId } from '../components/chatbotProcesses';

type Exchange = { question: string; answer: string; detailsUnavailable?: boolean };
export type ChatView = 'menu' | 'conversation' | ChatbotProcessId;
type Snapshot = { messages: Exchange[]; draft: string; busy: boolean; error: string; view: ChatView };
const initialState: Snapshot = { messages: [], draft: '', busy: false, error: '', view: 'menu' };
const followupAspects = ['Requisitos', 'Soportes', 'Plazos'];
// El endpoint devuelve este texto cuando no puede resolver el contexto.
const clarificationAnswer = 'Puedo orientarte sobre la plataforma y los documentos de ESAP. Indícame el módulo, el trámite o el código del documento que necesitas consultar.';
const isGuidedFollowup = (question: string) => followupAspects.some(aspect => aspect.toLowerCase() === question.toLowerCase());

// Memoria del documento actual, compartida entre vistas. Una recarga la destruye.
class TransientChat {
  private state = initialState;
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
  prepareFollowup = () => {
    const last = this.state.messages.at(-1);
    if (!last || this.state.draft.trim()) return;
    const previousAspect = followupAspects.findIndex(aspect => new RegExp(`\\b${aspect}\\b`, 'i').test(last.question));
    this.setDraft(followupAspects[(previousAspect + 1) % followupAspects.length]);
  };
  navigate = (view: ChatView) => { if (!this.state.busy) this.update({ view }); };
  reset = () => { ++this.revision; this.update(initialState); };

  private historyFor(question: string): Exchange[] {
    const { messages } = this.state;
    if (!isGuidedFollowup(question)) return messages.slice(-2);
    // Cada aspecto se consulta sobre el último tema, aunque ya haya varios seguimientos.
    for (let index = messages.length - 1; index >= 0; index--) {
      if (!isGuidedFollowup(messages[index].question)) return [messages[index]];
    }
    return messages.slice(-2);
  }

  send = async () => {
    const question = this.state.draft.trim();
    if (!question || this.state.busy) return;
    const revision = this.revision;
    const history = this.historyFor(question);
    this.update({ busy: true, error: '' });
    try {
      const result = await this.api.consultarPublico(question, history.map((message) => ({ pregunta: message.question, respuesta: message.answer })));
      if (revision !== this.revision) return;
      const answer = result.respuesta;
      const messages = this.state.messages;
      const detailsUnavailable = isGuidedFollowup(question) && history.length > 0
        && (answer.trim() === clarificationAnswer
          || messages.slice(messages.lastIndexOf(history[0])).some(message => message.answer.trim() === answer.trim()));
      this.update({ messages: [...messages, { question, answer, detailsUnavailable }], draft: '', view: 'conversation' });
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

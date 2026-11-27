import React, { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { ArrowLeft, ArrowRight, Bot, ChevronRight, MessageCircle, Plus, Send } from 'lucide-react';
import { ChatMessageText } from './ChatMessageText';
import { chatbotProcesses } from './chatbotProcesses';
import { getTransientChat, type ChatView } from '../state/transientChat';

export function PublicChatbotModule({ apiBaseUrl, isWidget = false }: { apiBaseUrl?: string; isWidget?: boolean }) {
  const session = getTransientChat(apiBaseUrl);
  const { messages, draft, busy, error, view } = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusAfterNavigation = useRef(false);
  const showConversation = busy || view === 'conversation';
  const selectedProcess = chatbotProcesses.find((process) => process.id === view);
  const lastExchange = messages.at(-1);
  const showToolbar = showConversation || view !== 'menu' || Boolean(lastExchange || draft || error);

  useLayoutEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    container.scrollTop = showConversation ? container.scrollHeight : 0;
    if (focusAfterNavigation.current) {
      focusAfterNavigation.current = false;
      (headingRef.current ?? container).focus({ preventScroll: true });
    }
  }, [session, view, showConversation, messages, busy]);

  function navigate(next: ChatView) {
    focusAfterNavigation.current = true;
    session.navigate(next);
  }

  function draftQuestion(question: string) {
    session.setDraft(question);
    inputRef.current?.focus({ preventScroll: true });
  }

  function startNewConversation() {
    session.reset();
    inputRef.current?.focus({ preventScroll: true });
  }

  function expandQuestion() {
    session.prepareFollowup();
    inputRef.current?.focus({ preventScroll: true });
  }

  return <section className={['esap-chatbot-module esap-chatbot-temporary bg-slate-50 text-slate-800', isWidget ? 'esap-chatbot-module--widget' : 'esap-chatbot-temporary--page'].join(' ')} aria-label="Asistente ESAP">
    {showToolbar && <nav className="esap-chatbot-module__toolbar esap-chatbot-temporary__navigation" aria-label="Navegación del asistente">
      {(view !== 'menu' || busy) && <button type="button" disabled={busy} onClick={() => navigate('menu')}>
        <ArrowLeft size={16} aria-hidden="true" />Volver al menú
      </button>}
      {!showConversation && lastExchange && <button type="button" onClick={() => navigate('conversation')}>
        <MessageCircle size={16} aria-hidden="true" />Ver conversación
      </button>}
      <button type="button" className="esap-chatbot-temporary__restart" disabled={busy} onClick={startNewConversation}>
        <Plus size={16} aria-hidden="true" />Nueva conversación
      </button>
    </nav>}
    <div ref={messagesRef} className="esap-chatbot-module__messages esap-chatbot-temporary__messages"
      tabIndex={showConversation ? 0 : undefined} role={showConversation ? 'region' : undefined}
      aria-label={showConversation ? 'Conversación' : undefined}>
      {showConversation ? <>
        <div role="log" aria-label="Mensajes de la conversación" aria-relevant="additions text">
          {messages.map((message, index) => <article key={index} className="esap-chatbot-temporary__exchange">
            <p className="esap-chatbot-module__bubble esap-chatbot-temporary__question"><strong>Tú: </strong>{message.question}</p>
            <div className="esap-chatbot-module__bubble esap-chatbot-temporary__answer">
              <strong>Asistente: </strong>
              {message.detailsUnavailable
                ? 'No tengo detalles adicionales para esta consulta. Puedes preguntar por otro aspecto del trámite.'
                : <ChatMessageText text={message.answer} />}
            </div>
          </article>)}
        </div>
        {busy && <p role="status" className="esap-chatbot-temporary__pending">Preparando respuesta…</p>}
        {!busy && lastExchange && <div className="esap-chatbot-temporary__followup">
          <button type="button" className="esap-chatbot-guide__button" onClick={expandQuestion}>
            Ampliar información<ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>}
      </> : <div className="esap-chatbot-guide">
        {selectedProcess ? <>
          <h3 className="esap-chatbot-guide__title" ref={headingRef} tabIndex={-1}>{selectedProcess.name}</h3>
          <p className="esap-chatbot-guide__description">Elige una pregunta frecuente para editarla o escribe tu propia consulta.</p>
          <ul className="esap-chatbot-guide__list esap-chatbot-guide__questions" aria-label="Preguntas frecuentes">
            {selectedProcess.questions.map((question) => <li key={question}>
              <button type="button" className="esap-chatbot-guide__button" onClick={() => draftQuestion(question)}>
                <span>{question}</span><ArrowRight size={16} aria-hidden="true" />
              </button>
            </li>)}
          </ul>
        </> : <>
          <div className="esap-chatbot-guide__welcome">
            <span className="esap-chatbot-guide__icon"><Bot size={22} aria-hidden="true" /></span>
            <div>
              <h3 className="esap-chatbot-guide__title" ref={headingRef} tabIndex={-1}>¡Hola! Soy el asistente virtual de la ESAP</h3>
              <p className="esap-chatbot-guide__description">Elige un proceso o escribe tu pregunta.</p>
            </div>
          </div>
          <nav aria-label="Procesos institucionales">
            <h4 className="esap-chatbot-guide__label">Procesos institucionales</h4>
            <ul className="esap-chatbot-guide__list esap-chatbot-guide__processes">
              {chatbotProcesses.map(({ id, name }) => <li key={id}>
                <button type="button" className="esap-chatbot-guide__button" onClick={() => navigate(id)}>
                  <span>{name}</span><ChevronRight size={16} aria-hidden="true" />
                </button>
              </li>)}
            </ul>
          </nav>
        </>}
      </div>}
    </div>
    {error && <div role="alert" className="esap-chatbot-module__notice esap-chatbot-temporary__error">{error} Tu consulta sigue en el campo de texto.</div>}
    <div className="esap-chatbot-module__composer p-4 bg-white border-t border-slate-200">
      <form className="flex items-center gap-3 max-w-4xl mx-auto" onSubmit={event => { event.preventDefault();void session.send(); }}>
        <input ref={inputRef} aria-label="Mensaje para el asistente" type="text" maxLength={2000} value={draft} disabled={busy}
          onChange={event => session.setDraft(event.target.value)} placeholder="Escribe tu consulta sobre trámites, módulos o procesos ESAP…"
          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
        <button type="submit" disabled={busy || !draft.trim()} className="px-5 py-3 bg-blue-600 text-white text-xs font-semibold rounded-xl flex items-center gap-2"><Send size={16} aria-hidden="true" />Enviar</button>
      </form>
      <p className="esap-chatbot-temporary__hint">Conversación temporal · Se borra al recargar</p>
    </div>
  </section>;
}

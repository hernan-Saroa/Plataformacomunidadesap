import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { Bot, Send, Plus, DollarSign, FileText, BookOpen, Calendar } from 'lucide-react';
import { ChatMessageText } from './ChatMessageText';
import { getTransientChat } from '../state/transientChat';

const prompts = [
  { icon: DollarSign, title: 'Viáticos y gastos de viaje', question: '¿Cómo solicito y legalizo viáticos para una comisión de servicios?' },
  { icon: FileText, title: 'Certificados laborales', question: '¿Cómo solicito un certificado laboral?' },
  { icon: BookOpen, title: 'Plan de Trabajo Académico (PTA)', question: '¿Dónde consulto y diligencio mi Plan de Trabajo Académico docente?' },
  { icon: Calendar, title: 'Programación académica', question: '¿Cómo reviso las franjas horarias y la asignación de aulas?' },
];

export function PublicChatbotModule({ apiBaseUrl, isWidget = false }: { apiBaseUrl?: string; isWidget?: boolean }) {
  const session = getTransientChat(apiBaseUrl);
  const { messages, draft, busy, error } = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const container = messagesRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages, busy]);

  return <section className={['esap-chatbot-module esap-chatbot-temporary bg-slate-50 text-slate-800', isWidget ? 'esap-chatbot-module--widget' : 'esap-chatbot-temporary--page'].join(' ')} aria-label="Asistente ESAP">
    <div className="esap-chatbot-module__toolbar">
      <p className="esap-chatbot-temporary__hint">Conversación temporal · Se borra al recargar</p>
      <button type="button" disabled={busy || (!messages.length && !draft && !error)} onClick={() => {
        session.reset();inputRef.current?.focus({ preventScroll: true });
      }}><Plus size={16} aria-hidden="true" />Nueva conversación</button>
    </div>
    <div ref={messagesRef} className="esap-chatbot-module__messages esap-chatbot-temporary__messages" role="log" aria-label="Mensajes de la conversación" aria-live="polite" aria-relevant="additions text">
      {!messages.length && <div className="esap-chatbot-module__welcome max-w-xl mx-auto text-center py-12">
        <div className="esap-chatbot-module__welcome-icon w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4"><Bot size={28} aria-hidden="true" /></div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">¿En qué puedo orientarte hoy?</h3>
        <p className="esap-chatbot-module__welcome-help text-xs text-slate-500 mb-6">Selecciona una consulta rápida o escribe tu pregunta abajo.</p>
        <div className="esap-chatbot-module__suggestions grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
          {prompts.map(({ icon: Icon, title, question }) => <button key={title} type="button" disabled={busy}
            className="esap-chatbot-module__suggestion p-3 bg-white border border-slate-200 rounded-xl text-xs flex items-start gap-3" onClick={() => { session.setDraft(question);inputRef.current?.focus({ preventScroll: true }); }}>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Icon size={16} aria-hidden="true" /></div>
            <div><h4 className="font-semibold text-slate-900">{title}</h4><p className="text-slate-500 text-[11px] mt-0.5 line-clamp-2">{question}</p></div>
          </button>)}
        </div>
      </div>}
      {messages.map((message, index) => <article key={index} className="esap-chatbot-temporary__exchange">
        <p className="esap-chatbot-module__bubble esap-chatbot-temporary__question"><strong>Tú: </strong>{message.question}</p>
        <div className="esap-chatbot-module__bubble esap-chatbot-temporary__answer"><strong>Asistente: </strong><ChatMessageText text={message.answer} /></div>
      </article>)}
      {busy && <p role="status" className="esap-chatbot-temporary__pending">Consultando servicio…</p>}
    </div>
    {error && <div role="alert" className="esap-chatbot-module__notice esap-chatbot-temporary__error">{error} Tu consulta sigue en el campo de texto.</div>}
    <div className="esap-chatbot-module__composer p-4 bg-white border-t border-slate-200">
      <form className="flex items-center gap-3 max-w-4xl mx-auto" onSubmit={event => { event.preventDefault();void session.send(); }}>
        <input ref={inputRef} aria-label="Mensaje para el asistente" type="text" maxLength={2000} value={draft} disabled={busy}
          onChange={event => session.setDraft(event.target.value)} placeholder="Escribe tu consulta sobre trámites, módulos o procesos ESAP…"
          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
        <button type="submit" disabled={busy || !draft.trim()} className="px-5 py-3 bg-blue-600 text-white text-xs font-semibold rounded-xl flex items-center gap-2"><Send size={16} aria-hidden="true" />Enviar</button>
      </form>
    </div>
  </section>;
}

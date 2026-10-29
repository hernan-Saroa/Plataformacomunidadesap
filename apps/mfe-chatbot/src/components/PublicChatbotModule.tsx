import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChatbotHttpError, ChatbotService, createChatbotService } from '../services/chatbot.service';
import { ChatMessageText } from './ChatMessageText';

export function PublicChatbotModule({ apiBaseUrl, onLogin }: { apiBaseUrl?: string; onLogin?: () => void }) {
  const api = useMemo(() => apiBaseUrl === undefined ? ChatbotService : createChatbotService(apiBaseUrl), [apiBaseUrl]);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Array<{ question: string; answer: string }>>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const revision = useRef(0);
  const sending = useRef(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ++revision.current;
    sending.current = false;
    setMessages([]); setText(''); setError(''); setBusy(false);
    return () => { ++revision.current; };
  }, [api]);
  useEffect(() => {
    const container = messagesRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages, busy]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const question = text.trim();
    if (!question || sending.current) return;
    const current = revision.current;
    sending.current = true; setBusy(true); setError('');
    try {
      const result = await api.consultarPublico(question);
      if (current !== revision.current) return;
      setMessages((previous) => [...previous, { question, answer: result.respuesta }]);
      setText('');
    } catch (failure) {
      if (current !== revision.current) return;
      setError(failure instanceof ChatbotHttpError && failure.status === 404
        ? 'El asistente público ya no está habilitado.'
        : failure instanceof Error ? failure.message : 'No se pudo consultar el asistente. Intenta nuevamente.');
    } finally {
      if (current === revision.current) { sending.current = false; setBusy(false); }
    }
  }

  return <section className="esap-chatbot-public flex h-full min-h-0 flex-col bg-slate-50 text-slate-800" aria-label="Orientación pública ESAP">
    <div className="esap-chatbot-public__intro border-b bg-white p-4 text-sm">
      <p>Orientación general sin acceso a tu historial privado.</p>
      <p className="mt-1 text-xs text-slate-500">Puedes consultar sobre acceso, certificados y autogestión docente. Evita compartir datos personales.</p>
      {onLogin && <button type="button" className="mt-2 text-blue-700 underline" onClick={onLogin}>Iniciar sesión</button>}
      <button type="button" className="ml-3 mt-2 text-blue-700 underline disabled:opacity-50" disabled={busy || (!messages.length && !error)} onClick={() => {
        setMessages([]); setText(''); setError(''); inputRef.current?.focus({ preventScroll: true });
      }}>Nueva consulta</button>
    </div>
    <div ref={messagesRef} className="esap-chatbot-public__messages flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-label="Consultas públicas" aria-live="polite" aria-relevant="additions text">
      {messages.map((message, index) => <div key={index} className="space-y-2 text-sm">
        <p className="ml-6 rounded-lg bg-blue-100 p-3 whitespace-pre-wrap"><strong>Tú: </strong>{message.question}</p>
        <p className="mr-6 rounded-lg border bg-white p-3 whitespace-pre-wrap"><strong>Asistente: </strong><ChatMessageText text={message.answer} /></p>
      </div>)}
      {busy && <p role="status" className="text-xs text-slate-500">Consultando servicio…</p>}
    </div>
    {error && <p role="alert" className="esap-chatbot-public__error mx-4 rounded bg-red-50 p-3 text-xs text-red-700">{error} Tu consulta sigue en el campo de texto.</p>}
    <form onSubmit={send} className="esap-chatbot-public__composer flex gap-2 border-t bg-white p-3">
      <input ref={inputRef} aria-label="Consulta pública" className="min-w-0 flex-1 rounded border px-3 py-2 text-sm" placeholder="Escribe tu consulta…" maxLength={2000} value={text} disabled={busy} onChange={(event) => setText(event.target.value)} />
      <button type="submit" disabled={busy || !text.trim()} className="rounded bg-blue-700 px-3 py-2 text-sm text-white disabled:opacity-50">Enviar</button>
    </form>
  </section>;
}

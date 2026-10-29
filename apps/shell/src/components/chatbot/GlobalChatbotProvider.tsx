import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ChatbotFloatingButton } from '../esap/ChatbotFloatingButton';

type Availability = { base: string; active?: boolean; error: boolean };
type ChatbotContextValue = { active?: boolean; error: boolean; retry: () => void; registerFullView: () => () => void };
const ChatbotContext = createContext<ChatbotContextValue | null>(null);

class ChatbotBoundary extends React.Component<React.PropsWithChildren<{ hidden: boolean }>, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <div role="alert" hidden={this.props.hidden} className="fixed bottom-6 right-6 z-50 rounded border bg-white p-3 text-sm">No se pudo abrir el asistente. <button className="text-blue-700 underline" onClick={() => this.setState({ failed: false })}>Reintentar</button></div>
      : this.props.children;
  }
}

function AvailabilityMessage({ error, retry }: { error: boolean; retry: () => void }) {
  return <div role={error ? 'alert' : 'status'} className="rounded border bg-white p-3 text-sm text-slate-700">
    {error ? <>No se pudo comprobar la disponibilidad del asistente. <button type="button" className="text-blue-700 underline" onClick={retry}>Reintentar</button></> : 'Comprobando disponibilidad del asistente…'}
  </div>;
}

export function GlobalChatbotProvider({ children, apiBaseUrl, user, onLogin }: React.PropsWithChildren<{
  apiBaseUrl: string;
  user?: { id: string; email: string; name: string };
  onLogin?: () => void;
}>) {
  const [availability, setAvailability] = useState<Availability>({ base: apiBaseUrl, error: false });
  const [revision, setRevision] = useState(0);
  const [fullViews, setFullViews] = useState(0);
  const registrations = useRef(new Set<symbol>());
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  const registerFullView = useCallback(() => {
    const token = Symbol();
    registrations.current.add(token); setFullViews(registrations.current.size);
    return () => { registrations.current.delete(token); setFullViews(registrations.current.size); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timeout = setTimeout(() => controller.abort(), 20_000);
    async function check() {
      try {
        const response = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}/chatbot/api/v1/public/config`, {
          credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' }, signal: controller.signal,
        });
        if (!response.ok) throw new Error('Unavailable configuration');
        const result: unknown = await response.json();
        if (!result || typeof (result as { activo?: unknown }).activo !== 'boolean') throw new Error('Invalid configuration');
        if (!disposed) setAvailability({ base: apiBaseUrl, active: (result as { activo: boolean }).activo, error: false });
      } catch {
        if (!disposed) setAvailability((previous) => ({ base: apiBaseUrl, active: previous.base === apiBaseUrl ? previous.active : undefined, error: true }));
      } finally { clearTimeout(timeout); }
    }
    void check();
    return () => { disposed = true; clearTimeout(timeout); controller.abort(); };
  }, [apiBaseUrl, revision]);

  useEffect(() => {
    window.addEventListener('focus', retry);
    window.addEventListener('esap:chatbot-config-changed', retry);
    return () => { window.removeEventListener('focus', retry); window.removeEventListener('esap:chatbot-config-changed', retry); };
  }, [retry]);

  const active = availability.base === apiBaseUrl ? availability.active : undefined;
  const error = availability.base === apiBaseUrl && availability.error;
  const context = useMemo(() => ({ active, error, retry, registerFullView }), [active, error, retry, registerFullView]);
  const sessionKey = JSON.stringify([apiBaseUrl, user?.id, user?.email]);
  return <ChatbotContext.Provider value={context}>
    {children}
    {active === true && <ChatbotBoundary key={sessionKey} hidden={fullViews > 0 || error}>
      <ChatbotFloatingButton isActive apiBaseUrl={apiBaseUrl} mode={user ? 'authenticated' : 'public'} userId={user?.id} userEmail={user?.email} userName={user?.name} onLogin={onLogin} hidden={fullViews > 0 || error} />
    </ChatbotBoundary>}
    {error && fullViews === 0 && <div className="fixed bottom-6 right-6 z-50 max-w-[calc(100vw-3rem)]"><AvailabilityMessage error retry={retry} /></div>}
  </ChatbotContext.Provider>;
}

// Evita dos asistentes visibles sin desmontar el widget al navegar al historial completo.
export function ChatbotFullPageScope({ children }: React.PropsWithChildren) {
  const context = useContext(ChatbotContext);
  const register = context?.registerFullView;
  useEffect(() => register?.(), [register]);
  if (!context) return <>{children}</>;
  return <>
    {context.error || context.active === undefined ? <AvailabilityMessage error={context.error} retry={context.retry} />
      : context.active === false ? <p role="status" className="p-4">El asistente está desactivado.</p> : null}
    {context.active === true && <div hidden={context.error} className="h-full min-h-0">{children}</div>}
  </>;
}

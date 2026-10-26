import React, { useEffect, useId, useRef, useState, Suspense, lazy } from 'react';
import { Bot, Maximize2, Minimize2, ChevronDown } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import './ChatbotFloatingButton.css';

export interface ChatbotFloatingButtonProps {
  mode?: 'authenticated' | 'public';
  onLogin?: () => void;
  hidden?: boolean;
  apiBaseUrl?: string;
  isActive: boolean;
  userEmail?: string;
  userId?: string;
  userName?: string;
  currentModule?: string;
  onOpenFullModule?: () => void;
}

export const ChatbotFloatingButton: React.FC<ChatbotFloatingButtonProps> = ({
  mode = 'authenticated', onLogin, hidden = false, apiBaseUrl, isActive,
  userEmail, userId, userName, currentModule, onOpenFullModule,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [viewport, setViewport] = useState<{ width: number; height: number; left: number; top: number } | null>(null);
  const [ChatbotRemoteModule] = useState(() => lazy(() => import('chatbot/Module')));
  const launcher = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const returnFocus = useRef(false);
  const panelId = useId();
  const titleId = useId();
  const reducedMotion = useReducedMotion();
  const suppressed = hidden || currentModule === 'chatbot' || !isActive;

  useEffect(() => {
    if (suppressed) return;
    if (isOpen) panel.current?.focus({ preventScroll: true });
    else if (returnFocus.current) {
      returnFocus.current = false;
      launcher.current?.focus({ preventScroll: true });
    }
  }, [isOpen, suppressed]);

  useEffect(() => {
    if (!isOpen || suppressed) { setViewport(null); return; }
    // El viewport visual descuenta el teclado móvil sin modificar el scroll del documento.
    const visual = window.visualViewport;
    const update = () => setViewport({
      width: visual?.width ?? window.innerWidth, height: visual?.height ?? window.innerHeight,
      left: visual?.offsetLeft ?? 0, top: visual?.offsetTop ?? 0,
    });
    update();
    visual?.addEventListener('resize', update);
    visual?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      visual?.removeEventListener('resize', update);
      visual?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [isOpen, suppressed]);

  const minimize = (restoreFocus = true) => {
    returnFocus.current = restoreFocus;
    setIsOpen(false);
  };

  if (!isActive) return null;

  const viewportStyle = viewport ? {
    '--chatbot-viewport-width': `${viewport.width}px`, '--chatbot-viewport-height': `${viewport.height}px`,
    '--chatbot-viewport-left': `${viewport.left}px`, '--chatbot-viewport-top': `${viewport.top}px`,
  } : {};

  return <div className="esap-chatbot-widget" aria-hidden={suppressed || undefined}
    style={{ ...viewportStyle, display: suppressed ? 'none' : undefined } as React.CSSProperties}>
    {hasOpened && <motion.div
      ref={panel} id={panelId} role="dialog" aria-modal="false" aria-labelledby={titleId}
      tabIndex={-1} aria-hidden={!isOpen}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
          event.preventDefault(); event.stopPropagation(); minimize();
        }
      }}
      initial={false} animate={{ opacity: isOpen ? 1 : 0 }} transition={{ duration: reducedMotion ? 0 : 0.15 }}
      className={`esap-chatbot-widget__panel${expanded ? ' esap-chatbot-widget__panel--expanded' : ''}`}
      style={{ display: isOpen ? 'flex' : 'none' }}>
      <div className="esap-chatbot-widget__header">
        <div className="esap-chatbot-widget__identity">
          <Bot aria-hidden="true" size={22} />
          <div><h2 id={titleId}>ChatBot Institucional</h2><p>Asistente virtual ESAP</p></div>
        </div>
        <div className="esap-chatbot-widget__actions">
          {onOpenFullModule && <button type="button" onClick={() => { minimize(false); onOpenFullModule(); }}
            aria-label="Abrir módulo completo" title="Abrir módulo completo"><Maximize2 aria-hidden="true" size={18} /></button>}
          <button type="button" onClick={() => setExpanded((value) => !value)}
            aria-label={expanded ? 'Restaurar tamaño del chat' : 'Ampliar chat'} title={expanded ? 'Restaurar tamaño del chat' : 'Ampliar chat'} aria-pressed={expanded}>
            {expanded ? <Minimize2 aria-hidden="true" size={18} /> : <Maximize2 aria-hidden="true" size={18} />}
          </button>
          <button type="button" onClick={() => minimize()} aria-label="Minimizar chat" title="Minimizar chat"><ChevronDown aria-hidden="true" size={20} /></button>
        </div>
      </div>
      <div className="esap-chatbot-widget__content">
        <Suspense fallback={<p role="status" className="esap-chatbot-widget__loading">Iniciando asistente…</p>}>
          <ChatbotRemoteModule mode={mode} onLogin={onLogin ? () => { minimize(false); onLogin(); } : undefined}
            apiBaseUrl={apiBaseUrl} userEmail={userEmail} userId={userId} userName={userName}
            isWidget onClose={() => minimize()} />
        </Suspense>
      </div>
    </motion.div>}
    <motion.button ref={launcher} type="button" className="esap-chatbot-widget__launcher"
      aria-haspopup="dialog" aria-expanded={isOpen} aria-controls={hasOpened ? panelId : undefined}
      whileHover={reducedMotion ? undefined : { scale: 1.03 }} whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      style={{ display: isOpen ? 'none' : 'flex' }}
      onClick={() => { setHasOpened(true); setIsOpen(true); }}>
      <Bot aria-hidden="true" size={22} /><span>Asistente ESAP</span>
    </motion.button>
  </div>;
};

export default ChatbotFloatingButton;

import React, { useState, Suspense, lazy } from 'react';
import { Bot, X, MessageSquare, Maximize2, Sparkles, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Carga perezosa del módulo remoto
const ChatbotRemoteModule = lazy(() =>
  import('chatbot/Module').catch((err) => {
    console.error('Error al cargar chatbot/Module:', err);
    return {
      default: () => (
        <div className="p-6 text-center text-xs text-slate-500">
          No se pudo conectar con el microfrontend de ChatBot.
        </div>
      ),
    };
  }),
);

export interface ChatbotFloatingButtonProps {
  isActive: boolean;
  userEmail?: string;
  userId?: string;
  userName?: string;
  currentModule?: string;
  onOpenFullModule?: () => void;
}

export const ChatbotFloatingButton: React.FC<ChatbotFloatingButtonProps> = ({
  isActive,
  userEmail,
  userId,
  userName,
  currentModule,
  onOpenFullModule,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Si el módulo no está activo en la base de datos o el usuario ya está viendo el módulo completo, no mostramos el botón flotante
  if (!isActive || currentModule === 'chatbot') {
    return null;
  }

  return (
    <>
      {/* Botón Flotante Inferior Derecho */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="mb-4 w-[420px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-7rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
              style={{ boxShadow: '0px 0px 10px 0px' }}
            >
              {/* Header del Widget Flotante */}
              <div className="px-4 py-3 bg-gradient-to-r from-blue-700 to-indigo-800 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold leading-tight flex items-center gap-1.5">
                      ChatBot Institucional
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    </h3>
                    <p className="text-[10px] text-blue-100/80">Asistente virtual ESAP</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {onOpenFullModule && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        onOpenFullModule();
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
                      title="Abrir en pantalla completa"
                      style={{ display: 'none' }}
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
                    title="Minimizar chat"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Contenedor del Chat */}
              <div className="flex-1 overflow-hidden bg-slate-50">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-[11px] text-slate-400">Iniciando asistente...</p>
                      </div>
                    </div>
                  }
                >
                  <ChatbotRemoteModule
                    userEmail={userEmail}
                    userId={userId}
                    userName={userName}
                    isWidget={true}
                    onClose={() => setIsOpen(false)}
                  />
                </Suspense>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botón Circular Principal */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          style={{ display: isOpen ? 'none' : 'flex' }}
          className={`relative group flex items-center justify-center rounded-full shadow-2xl transition-all duration-300 ${
            isOpen
              ? 'w-12 h-12 bg-slate-800 text-white hover:bg-slate-900'
              : 'px-4 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white hover:shadow-blue-500/25 hover:shadow-xl'
          }`}
        >
          {isOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bot className="w-5 h-5 animate-bounce-short" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-blue-700"></span>
              </div>
              <span className="text-xs font-semibold tracking-wide pr-1">Asistente ESAP</span>
            </div>
          )}
        </motion.button>
      </div>
    </>
  );
};

export default ChatbotFloatingButton;

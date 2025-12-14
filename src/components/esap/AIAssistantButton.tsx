import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, MessageSquare, TrendingUp, Users, FileText, HelpCircle } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { toast } from 'sonner';

interface AIAssistantButtonProps {
  className?: string;
}

export function AIAssistantButton({ className = '' }: AIAssistantButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);
  const [isTyping, setIsTyping] = useState(false);

  const quickSuggestions = [
    {
      icon: TrendingUp,
      text: '¿Cómo analizo las tendencias?',
      query: 'Explícame cómo interpretar las tendencias del dashboard ejecutivo'
    },
    {
      icon: Users,
      text: '¿Cómo gestiono usuarios?',
      query: 'Guíame en la gestión de usuarios y personas'
    },
    {
      icon: FileText,
      text: '¿Cómo genero reportes?',
      query: 'Ayúdame a generar y programar reportes'
    },
    {
      icon: HelpCircle,
      text: 'Tour del sistema',
      query: 'Dame un tour completo del sistema ESAP'
    }
  ];

  const handleSendMessage = async (messageToSend?: string) => {
    const textToSend = messageToSend || message.trim();
    if (!textToSend) return;

    // Agregar mensaje del usuario
    const userMessage = {
      role: 'user' as const,
      content: textToSend,
      timestamp: new Date()
    };
    
    setConversation(prev => [...prev, userMessage]);
    setMessage('');
    setIsTyping(true);

    // Simular respuesta del asistente (en producción conectaría con API)
    setTimeout(() => {
      const responses: Record<string, string> = {
        'tendencias': 'Las tendencias del dashboard muestran el rendimiento histórico de los indicadores clave. Los gráficos de líneas te permiten identificar patrones de crecimiento o decrecimiento. Presta especial atención a las tarjetas KPI con badges de porcentaje de cambio.',
        'usuarios': 'Para gestionar usuarios ve al módulo "Usuarios y Personas". Allí puedes crear nuevos usuarios, asignar roles, editar información personal, y gestionar documentos. El sistema soporta múltiples roles por persona.',
        'reportes': 'Ve al módulo "Reportes" donde encontrarás el Constructor Visual. Puedes crear reportes personalizados arrastrando campos, aplicar filtros, programar envíos automáticos y exportar en múltiples formatos (PDF, Excel, CSV).',
        'tour': '¡Bienvenido! El sistema ESAP tiene 15 módulos principales: Dashboard Ejecutivo, Usuarios y Personas, Roles y Permisos, Gestión Profesoral, Control Interno, Certificados Laborales, y más. ¿Te gustaría explorar alguno en particular?',
        'default': 'Entiendo tu consulta. El sistema ESAP es muy completo. ¿Podrías ser más específico sobre qué necesitas ayuda? Puedo asistirte con usuarios, reportes, gestión profesoral, certificados, y más.'
      };

      let response = responses.default;
      const lowerQuery = textToSend.toLowerCase();
      
      if (lowerQuery.includes('tendencia') || lowerQuery.includes('gráfico') || lowerQuery.includes('dashboard')) {
        response = responses.tendencias;
      } else if (lowerQuery.includes('usuario') || lowerQuery.includes('persona') || lowerQuery.includes('gestión')) {
        response = responses.usuarios;
      } else if (lowerQuery.includes('reporte') || lowerQuery.includes('exportar') || lowerQuery.includes('informe')) {
        response = responses.reportes;
      } else if (lowerQuery.includes('tour') || lowerQuery.includes('ayuda') || lowerQuery.includes('cómo usar')) {
        response = responses.tour;
      }

      const assistantMessage = {
        role: 'assistant' as const,
        content: response,
        timestamp: new Date()
      };

      setConversation(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestionClick = (query: string) => {
    handleSendMessage(query);
  };

  const handleClearConversation = () => {
    setConversation([]);
    toast.success('Conversación reiniciada');
  };

  return (
    <>
      {/* Botón flotante de IA */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${className}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Asistente IA"
      >
        <Sparkles className="w-5 h-5" />
        
        {/* Badge de "nuevo" */}
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full border-2 border-white" />
      </motion.button>

      {/* Modal del Asistente */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            />

            {/* Panel del Asistente */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="fixed right-2 sm:right-4 top-16 sm:top-20 w-[calc(100vw-1rem)] sm:w-[90vw] md:w-[400px] lg:w-[420px] xl:w-[450px] max-h-[calc(100vh-5rem)] sm:max-h-[600px] z-50"
            >
              <Card className="flex flex-col h-full shadow-2xl border-2 border-gray-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold">Asistente ESAP</h3>
                        <p className="text-xs text-blue-100">Powered by IA</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {conversation.length > 0 && (
                        <button
                          onClick={handleClearConversation}
                          className="text-white/80 hover:text-white transition-colors text-xs"
                        >
                          Reiniciar
                        </button>
                      )}
                      <button
                        onClick={() => setIsOpen(false)}
                        className="text-white/80 hover:text-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Conversation Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {conversation.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-blue-600" />
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2">¡Hola! 👋</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?
                      </p>

                      {/* Quick Suggestions */}
                      <div className="grid grid-cols-1 gap-2 mt-6">
                        {quickSuggestions.map((suggestion, index) => {
                          const Icon = suggestion.icon;
                          return (
                            <button
                              key={index}
                              onClick={() => handleSuggestionClick(suggestion.query)}
                              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                <Icon className="w-4 h-4 text-blue-600" />
                              </div>
                              <span className="text-sm text-gray-700 group-hover:text-blue-700 font-medium">
                                {suggestion.text}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <>
                      {conversation.map((msg, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-200 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <span className={`text-xs mt-1 block ${
                              msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {msg.timestamp.toLocaleTimeString('es-CO', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                        </motion.div>
                      ))}

                      {/* Typing indicator */}
                      {isTyping && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex justify-start"
                        >
                          <div className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Escribe tu pregunta..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <Button
                      onClick={() => handleSendMessage()}
                      disabled={!message.trim() || isTyping}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Presiona Enter para enviar
                  </p>
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
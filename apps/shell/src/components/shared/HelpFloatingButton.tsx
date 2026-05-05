import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HelpCircle, X, MessageCircle, Book, Video, Phone, Mail, 
  ChevronRight, Sparkles, Search, ExternalLink 
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface HelpFloatingButtonProps {
  context?: 'backoffice' | 'portal' | 'public';
}

export function HelpFloatingButton({ context = 'backoffice' }: HelpFloatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Artículos de ayuda según contexto
  const helpArticles = {
    backoffice: [
      { title: '¿Cómo crear un nuevo usuario?', icon: Book, category: 'Usuarios' },
      { title: '¿Cómo asignar roles y permisos?', icon: Book, category: 'Roles' },
      { title: '¿Cómo generar reportes?', icon: Book, category: 'Reportes' },
      { title: '¿Cómo revisar la auditoría?', icon: Book, category: 'Auditoría' },
    ],
    portal: [
      { title: '¿Cómo consultar mis calificaciones?', icon: Book, category: 'Académico' },
      { title: '¿Cómo realizar un pago?', icon: Book, category: 'Financiero' },
      { title: '¿Cómo inscribir materias?', icon: Book, category: 'Matrícula' },
      { title: '¿Cómo descargar certificados?', icon: Book, category: 'Documentos' },
    ],
    public: [
      { title: '¿Cómo solicitar un certificado?', icon: Book, category: 'Servicios' },
      { title: '¿Cómo verificar un título?', icon: Book, category: 'Verificación' },
      { title: '¿Cómo registrarme en ESAP?', icon: Book, category: 'Vinculaciones' },
      { title: '¿Cómo iniciar sesión?', icon: Book, category: 'Acceso' },
    ],
  };

  const quickActions = {
    backoffice: [
      { label: 'Video Tutorial', icon: Video, action: 'video' },
      { label: 'Chat en Vivo', icon: MessageCircle, action: 'chat' },
      { label: 'Contactar Soporte', icon: Phone, action: 'contact' },
    ],
    portal: [
      { label: 'Video Tutorial', icon: Video, action: 'video' },
      { label: 'Chat Estudiantil', icon: MessageCircle, action: 'chat' },
      { label: 'Soporte Técnico', icon: Mail, action: 'contact' },
    ],
    public: [
      { label: 'Ver Demo', icon: Video, action: 'video' },
      { label: 'Chat con Asesor', icon: MessageCircle, action: 'chat' },
      { label: 'Llamar a ESAP', icon: Phone, action: 'contact' },
    ],
  };

  const currentArticles = helpArticles[context];
  const currentActions = quickActions[context];

  const filteredArticles = searchQuery
    ? currentArticles.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentArticles;

  const handleAction = (action: string) => {
    if (action === 'chat') {
      // Simular apertura de chat
      alert('Chat de soporte próximamente disponible. Por ahora, escríbenos a soporte@esap.edu.co');
    } else if (action === 'video') {
      alert('Videos tutoriales próximamente disponibles');
    } else if (action === 'contact') {
      alert('Contacto: soporte@esap.edu.co | Tel: (601) 220 3700');
    }
  };

  return (
    <>
      {/* Botón Flotante */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 260, damping: 20 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-[#1e5da8] to-blue-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all group flex items-center justify-center"
          aria-label="Ayuda y soporte"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-6 h-6 lg:w-7 lg:h-7" />
              </motion.div>
            ) : (
              <motion.div
                key="help"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <HelpCircle className="w-6 h-6 lg:w-7 lg:h-7" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pulse Animation */}
          {!isOpen && (
            <motion.div
              className="absolute inset-0 rounded-full bg-blue-400"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}

          {/* Badge de ayuda disponible */}
          <motion.div
            className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-3 h-3 text-white" />
          </motion.div>
        </motion.button>

        {/* Tooltip cuando está cerrado */}
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.5 }}
            className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap pointer-events-none hidden lg:block"
          >
            ¿Necesitas ayuda? 💡
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rotate-45 w-2 h-2 bg-gray-900" />
          </motion.div>
        )}
      </motion.div>

      {/* Panel de Ayuda */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-24 lg:bottom-28 right-6 z-50 w-[calc(100vw-3rem)] max-w-md"
            >
              <Card className="shadow-2xl border-2 border-gray-200 overflow-hidden">
                <CardHeader className="bg-gradient-to-br from-[#1e5da8] to-blue-600 text-white pb-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl mb-1">Centro de Ayuda</CardTitle>
                      <p className="text-sm text-blue-100">
                        Estamos aquí para ayudarte 24/7
                      </p>
                    </div>
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    >
                      <Sparkles className="w-6 h-6 text-yellow-300" />
                    </motion.div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 max-h-[60vh] overflow-y-auto">
                  {/* Barra de Búsqueda */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar ayuda..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#1e5da8] focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
                    />
                  </div>

                  {/* Acciones Rápidas */}
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Acciones Rápidas
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {currentActions.map((action, idx) => (
                        <motion.button
                          key={action.action}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          onClick={() => handleAction(action.action)}
                          className="flex flex-col items-center gap-2 p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-all group border border-gray-200 hover:border-blue-300"
                        >
                          <action.icon className="w-5 h-5 text-gray-600 group-hover:text-[#1e5da8] transition-colors" />
                          <span className="text-xs text-gray-700 group-hover:text-[#1e5da8] font-medium text-center">
                            {action.label}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Artículos de Ayuda */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Artículos Populares
                    </h3>
                    <div className="space-y-2">
                      {filteredArticles.map((article, idx) => (
                        <motion.button
                          key={article.title}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + idx * 0.05 }}
                          onClick={() => alert(`Abriendo: ${article.title}`)}
                          className="w-full flex items-center gap-3 p-3 bg-white hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all group text-left"
                        >
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                            <article.icon className="w-4 h-4 text-[#1e5da8]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 group-hover:text-[#1e5da8] transition-colors truncate">
                              {article.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {article.category}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1e5da8] group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => alert('Centro de Ayuda completo próximamente disponible')}
                      className="w-full flex items-center justify-center gap-2 py-2 text-sm text-[#1e5da8] hover:text-blue-700 font-medium group"
                    >
                      Ver Centro de Ayuda Completo
                      <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

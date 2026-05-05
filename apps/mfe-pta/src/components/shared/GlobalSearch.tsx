import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Command, ArrowRight, FileText, Users, BarChart3, 
  BookOpen, CreditCard, Award, Clock, TrendingUp, X 
} from 'lucide-react';

interface GlobalSearchProps {
  context?: 'backoffice' | 'portal';
  onNavigate?: (path: string) => void;
}

export function GlobalSearch({ context = 'backoffice', onNavigate }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Detectar Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus en input cuando se abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Resultados de búsqueda según contexto
  const searchResults = {
    backoffice: [
      { 
        title: 'Gestión de Usuarios', 
        category: 'Módulos', 
        icon: Users, 
        path: '/usuarios',
        description: 'Crear, editar y gestionar usuarios del sistema'
      },
      { 
        title: 'Roles y Permisos', 
        category: 'Módulos', 
        icon: Award, 
        path: '/roles',
        description: 'Configurar roles y permisos de acceso'
      },
      { 
        title: 'Reportes', 
        category: 'Módulos', 
        icon: BarChart3, 
        path: '/reportes',
        description: 'Generar reportes personalizados'
      },
      { 
        title: 'Dashboard Ejecutivo', 
        category: 'Vistas', 
        icon: TrendingUp, 
        path: '/dashboard',
        description: 'Métricas y KPIs en tiempo real'
      },
      { 
        title: 'Formularios de Aspirantes', 
        category: 'Módulos', 
        icon: FileText, 
        path: '/aspirantes',
        description: 'Gestionar solicitudes de aspirantes'
      },
    ],
    portal: [
      { 
        title: 'Mis Calificaciones', 
        category: 'Académico', 
        icon: Award, 
        path: '/calificaciones',
        description: 'Consultar notas y promedios'
      },
      { 
        title: 'Inscripción de Materias', 
        category: 'Matrícula', 
        icon: FileText, 
        path: '/inscripcion',
        description: 'Inscribir o cancelar materias'
      },
      { 
        title: 'Estado de Cuenta', 
        category: 'Financiero', 
        icon: CreditCard, 
        path: '/financiero',
        description: 'Ver pagos y estados de cuenta'
      },
      { 
        title: 'Biblioteca', 
        category: 'Recursos', 
        icon: BookOpen, 
        path: '/biblioteca',
        description: 'Catálogo y préstamos de libros'
      },
      { 
        title: 'Certificados', 
        category: 'Documentos', 
        icon: FileText, 
        path: '/certificados',
        description: 'Descargar certificados y constancias'
      },
    ],
  };

  const results = searchResults[context];

  const filteredResults = query
    ? results.filter(
        result =>
          result.title.toLowerCase().includes(query.toLowerCase()) ||
          result.description.toLowerCase().includes(query.toLowerCase()) ||
          result.category.toLowerCase().includes(query.toLowerCase())
      )
    : results.slice(0, 5); // Mostrar solo 5 si no hay búsqueda

  const handleSelect = (path: string) => {
    setIsOpen(false);
    setQuery('');
    onNavigate?.(path);
  };

  // Detectar si es Mac
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <>
      {/* Botón de búsqueda visible en el navbar */}
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.01, y: -1 }}
        whileTap={{ scale: 0.98 }}
        className="relative flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-all group border-2 border-gray-200 hover:border-[#1e5da8]/30 dark:border-gray-700 w-full max-w-xs shadow-sm hover:shadow-md overflow-hidden"
      >
        {/* Gradiente sutil en hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#1e5da8]/0 via-[#1e5da8]/[0.035] to-[#1e5da8]/0 opacity-0 group-hover:opacity-[0.39] transition-opacity duration-300 scale-[0.7]" />
        
        {/* Contenido */}
        <div className="relative flex items-center gap-3 w-full">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#1e5da8]/10 to-blue-500/10 group-hover:from-[#1e5da8]/20 group-hover:to-blue-500/20 transition-all duration-300">
            <Search className="w-4 h-4 text-[#1e5da8] dark:text-blue-400 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400 flex-1 text-left font-medium">
            Buscar...
          </span>
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-mono font-semibold text-gray-600 dark:text-gray-400 shadow-sm">
              {isMac ? '⌘' : 'Ctrl'}
            </kbd>
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-mono font-semibold text-gray-600 dark:text-gray-400 shadow-sm">
              K
            </kbd>
          </div>
        </div>
      </motion.button>

      {/* Modal de búsqueda */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
            />

            {/* Panel de búsqueda */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 w-[90vw] max-w-2xl z-[101]"
            >
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Input de búsqueda */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                  <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Buscar módulos, acciones, documentos..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 text-lg"
                  />
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Resultados */}
                <div className="max-h-[60vh] overflow-y-auto p-2">
                  {filteredResults.length > 0 ? (
                    <div className="space-y-1">
                      {filteredResults.map((result, idx) => (
                        <motion.button
                          key={result.path}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => handleSelect(result.path)}
                          className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-all group text-left"
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <result.icon className="w-5 h-5 text-[#1e5da8] dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-[#1e5da8] dark:group-hover:text-blue-400 transition-colors truncate">
                                {result.title}
                              </p>
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400 rounded-full flex-shrink-0">
                                {result.category}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {result.description}
                            </p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#1e5da8] dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 mb-2">
                        No se encontraron resultados
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        Intenta con otros términos de búsqueda
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer con shortcuts */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded font-mono">
                        ↑↓
                      </kbd>
                      <span>Navegar</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded font-mono">
                        Enter
                      </kbd>
                      <span>Seleccionar</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded font-mono">
                      Esc
                    </kbd>
                    <span>Cerrar</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard, Command, Search, Zap, LayoutGrid, Settings, ArrowRight } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  const shortcuts: Shortcut[] = [
    // Navegación
    { keys: ['⌘', 'K'], description: 'Abrir paleta de comandos', category: 'Navegación' },
    { keys: ['G', '→', 'U'], description: 'Ir a Gestión de Usuarios', category: 'Navegación' },
    { keys: ['G', '→', 'R'], description: 'Ir a Roles y Permisos', category: 'Navegación' },
    { keys: ['G', '→', 'A'], description: 'Ir a Auditoría', category: 'Navegación' },
    { keys: ['G', '→', 'P'], description: 'Ir a Personas', category: 'Navegación' },
    { keys: ['G', '→', 'I'], description: 'Ir a Informes', category: 'Navegación' },
    { keys: ['Esc'], description: 'Cerrar modal/diálogo', category: 'Navegación' },
    
    // Búsqueda y Filtros
    { keys: ['/'], description: 'Buscar en sistema', category: 'Búsqueda' },
    { keys: ['F'], description: 'Abrir filtros', category: 'Búsqueda' },
    { keys: ['⌘', 'F'], description: 'Buscar en página', category: 'Búsqueda' },
    
    // Acciones Rápidas
    { keys: ['C', '→', 'R'], description: 'Crear nuevo rol', category: 'Acciones' },
    { keys: ['C', '→', 'U'], description: 'Crear nuevo usuario', category: 'Acciones' },
    { keys: ['E'], description: 'Exportar datos', category: 'Acciones' },
    { keys: ['H'], description: 'Ver historial', category: 'Acciones' },
    { keys: ['Shift', 'C'], description: 'Comparar roles', category: 'Acciones' },
    
    // Permisos
    { keys: ['Ctrl', 'A'], description: 'Otorgar todos los permisos', category: 'Permisos' },
    { keys: ['Ctrl', 'D'], description: 'Revocar todos los permisos', category: 'Permisos' },
    { keys: ['Space'], description: 'Toggle permiso seleccionado', category: 'Permisos' },
    { keys: ['↑', '↓'], description: 'Navegar permisos', category: 'Permisos' },
    { keys: ['Enter'], description: 'Activar/Desactivar permiso', category: 'Permisos' },
    
    // Configuración
    { keys: ['T'], description: 'Cambiar tema (claro/oscuro)', category: 'Configuración' },
    { keys: ['D'], description: 'Cambiar densidad', category: 'Configuración' },
    { keys: ['?'], description: 'Ver estos atajos', category: 'Configuración' },
    { keys: ['⌘', 'S'], description: 'Guardar cambios', category: 'Configuración' },
    
    // General
    { keys: ['Tab'], description: 'Siguiente elemento', category: 'General' },
    { keys: ['Shift', 'Tab'], description: 'Elemento anterior', category: 'General' },
    { keys: ['⌘', 'Z'], description: 'Deshacer', category: 'General' },
    { keys: ['⌘', 'Shift', 'Z'], description: 'Rehacer', category: 'General' },
  ];

  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  // Detectar sistema operativo para mostrar teclas correctas
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const formatKey = (key: string) => {
    if (key === '⌘' && !isMac) return 'Ctrl';
    return key;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full pointer-events-auto overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-[--esap-gray-200] bg-gradient-to-b from-[--esap-gray-50] to-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Keyboard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-xl text-[--esap-gray-900]">
                        Atajos de Teclado
                      </h2>
                      <p className="text-sm text-[--esap-gray-600]">
                        Navega más rápido con estos shortcuts
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-[--esap-gray-100] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-[--esap-gray-500]" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {categories.map((category) => {
                    const categoryShortcuts = shortcuts.filter(s => s.category === category);
                    
                    const categoryIcons: Record<string, React.ElementType> = {
                      'Navegación': LayoutGrid,
                      'Búsqueda': Search,
                      'Acciones': Zap,
                      'Permisos': Command,
                      'Configuración': Settings,
                      'General': Keyboard,
                    };

                    const Icon = categoryIcons[category] || Keyboard;

                    return (
                      <motion.div
                        key={category}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: categories.indexOf(category) * 0.05 }}
                        className="bg-[--esap-gray-50] rounded-xl p-4 border border-[--esap-gray-200]"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-lg bg-[--esap-primary] bg-opacity-10 flex items-center justify-center">
                            <Icon className="w-3.5 h-3.5 text-[--esap-primary]" strokeWidth={2.5} />
                          </div>
                          <h3 className="text-sm font-bold text-[--esap-gray-900]">
                            {category}
                          </h3>
                        </div>
                        
                        <div className="space-y-2">
                          {categoryShortcuts.map((shortcut, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg hover:shadow-sm transition-shadow"
                            >
                              <span className="text-xs text-[--esap-gray-700] flex-1">
                                {shortcut.description}
                              </span>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {shortcut.keys.map((key, keyIndex) => (
                                  <span key={keyIndex} className="flex items-center">
                                    <kbd className="px-2 py-1 text-[10px] font-bold bg-white text-[--esap-gray-700] rounded border-2 border-[--esap-gray-300] shadow-sm min-w-[24px] text-center">
                                      {formatKey(key)}
                                    </kbd>
                                    {keyIndex < shortcut.keys.length - 1 && key !== '→' && (
                                      <span className="text-[--esap-gray-400] text-xs mx-0.5">+</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[--esap-gray-200] bg-[--esap-gray-50]">
                <div className="flex items-center justify-between text-xs text-[--esap-gray-600]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-white border border-[--esap-gray-300] rounded font-bold">Esc</kbd>
                      Cerrar
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-white border border-[--esap-gray-300] rounded font-bold">?</kbd>
                      Abrir/Cerrar
                    </span>
                  </div>
                  <span className="text-[--esap-gray-500]">
                    {shortcuts.length} atajos disponibles
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook para usar el modal de shortcuts
export function useKeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ? para abrir shortcuts
      if (e.key === '?' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        // No abrir si estamos en un input
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, setIsOpen, KeyboardShortcutsModal: () => <KeyboardShortcuts isOpen={isOpen} onClose={() => setIsOpen(false)} /> };
}

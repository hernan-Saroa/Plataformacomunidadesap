/**
 * Modal Shortcuts - Ayuda de Atajos de Teclado
 * Muestra todos los shortcuts disponibles en el sistema
 */

import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Command } from 'lucide-react';
import { isMac } from '../../../hooks/useKeyboardShortcuts';

interface ModalShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  titulo: string;
  descripcion: string;
  shortcuts: {
    keys: string[];
    descripcion: string;
  }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    titulo: 'General',
    descripcion: 'Atajos globales disponibles en toda la aplicación',
    shortcuts: [
      {
        keys: [isMac ? '⌘' : 'Ctrl', 'K'],
        descripcion: 'Abrir buscador rápido'
      },
      {
        keys: ['?'],
        descripcion: 'Mostrar esta ayuda'
      },
      {
        keys: [isMac ? '⌘' : 'Ctrl', 'S'],
        descripcion: 'Guardar cambios'
      },
      {
        keys: ['Esc'],
        descripcion: 'Cerrar modal o cancelar'
      }
    ]
  },
  {
    titulo: 'Navegación',
    descripcion: 'Moverse por la aplicación',
    shortcuts: [
      {
        keys: ['↑', '↓'],
        descripcion: 'Navegar en listas'
      },
      {
        keys: ['↵', 'Enter'],
        descripcion: 'Seleccionar o confirmar'
      },
      {
        keys: ['Tab'],
        descripcion: 'Siguiente campo'
      },
      {
        keys: ['Shift', 'Tab'],
        descripcion: 'Campo anterior'
      }
    ]
  },
  {
    titulo: 'Acciones PTA',
    descripcion: 'Atajos para gestionar tu Plan de Trabajo',
    shortcuts: [
      {
        keys: [isMac ? '⌘' : 'Ctrl', 'N'],
        descripcion: 'Crear nuevo PTA'
      },
      {
        keys: [isMac ? '⌘' : 'Ctrl', 'A'],
        descripcion: 'Agregar asignatura'
      },
      {
        keys: [isMac ? '⌘' : 'Ctrl', 'E'],
        descripcion: 'Cargar evidencias'
      },
      {
        keys: [isMac ? '⌘' : 'Ctrl', 'Enter'],
        descripcion: 'Enviar a aprobación'
      }
    ]
  },
  {
    titulo: 'Búsqueda',
    descripcion: 'Buscar y filtrar información',
    shortcuts: [
      {
        keys: [isMac ? '⌘' : 'Ctrl', 'F'],
        descripcion: 'Buscar en página actual'
      },
      {
        keys: [isMac ? '⌘' : 'Ctrl', 'P'],
        descripcion: 'Buscar PTAs'
      },
      {
        keys: [isMac ? '⌘' : 'Ctrl', 'D'],
        descripcion: 'Buscar docentes'
      }
    ]
  },
  {
    titulo: 'Aprobadores',
    descripcion: 'Atajos para proceso de aprobación',
    shortcuts: [
      {
        keys: [isMac ? '⌘' : 'Ctrl', '1'],
        descripcion: 'Ver PTAs pendientes'
      },
      {
        keys: [isMac ? '⌘' : 'Ctrl', '2'],
        descripcion: 'Ver PTAs en revisión'
      },
      {
        keys: ['A'],
        descripcion: 'Aprobar PTA seleccionado'
      },
      {
        keys: ['R'],
        descripcion: 'Rechazar PTA seleccionado'
      },
      {
        keys: ['C'],
        descripcion: 'Agregar comentario'
      }
    ]
  }
];

export function ModalShortcuts({ isOpen, onClose }: ModalShortcutsProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Atajos de Teclado</h2>
              <p className="text-xs text-white/80">
                Acelera tu trabajo con estos shortcuts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Mensaje principal */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Command className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-purple-900 mb-1">
                  Trabaja más rápido con el teclado
                </h3>
                <p className="text-sm text-purple-800">
                  Estos atajos te permiten realizar acciones comunes sin usar el mouse.
                  Presiona <kbd className="px-2 py-1 bg-white rounded border border-purple-300 text-xs font-mono">{isMac ? '⌘K' : 'Ctrl+K'}</kbd> en cualquier momento para abrir el buscador rápido.
                </p>
              </div>
            </div>
          </div>

          {/* Grupos de shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shortcutGroups.map((group, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-50 rounded-xl p-5 border border-gray-200"
              >
                <h3 className="font-semibold text-gray-900 mb-1">
                  {group.titulo}
                </h3>
                <p className="text-xs text-gray-600 mb-4">
                  {group.descripcion}
                </p>

                <div className="space-y-3">
                  {group.shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between group hover:bg-white p-2 rounded-lg transition-colors"
                    >
                      <span className="text-sm text-gray-700">
                        {shortcut.descripcion}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <div key={keyIdx} className="flex items-center">
                            {keyIdx > 0 && (
                              <span className="text-gray-400 mx-1">+</span>
                            )}
                            <kbd className="px-3 py-1.5 bg-white rounded-lg border-2 border-gray-300 text-sm font-mono font-medium text-gray-900 shadow-sm group-hover:border-purple-400 transition-colors">
                              {key}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Tips adicionales */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <span>💡</span>
              Tips profesionales
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>
                  <strong>Combina atajos:</strong> Usa <kbd className="px-2 py-1 bg-white rounded border border-blue-300 text-xs">{isMac ? '⌘K' : 'Ctrl+K'}</kbd> para buscar y luego las flechas para navegar.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>
                  <strong>Personaliza:</strong> En configuración puedes cambiar algunos atajos según tu preferencia.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>
                  <strong>Practica:</strong> Usa los atajos frecuentemente para que se vuelvan automáticos.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Presiona <kbd className="px-2 py-1 bg-white rounded border border-gray-300 text-xs">?</kbd> en cualquier momento para ver esta ayuda
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            Entendido
          </button>
        </div>
      </motion.div>
    </div>
  );
}

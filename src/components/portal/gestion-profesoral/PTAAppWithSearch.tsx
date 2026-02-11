/**
 * PTA App With Search - Aplicación completa con búsqueda global
 * Integra Command Palette y keyboard shortcuts
 */

import { useState } from 'react';
import { CommandPalette } from './CommandPalette';
import { ModalShortcuts } from './ModalShortcuts';
import { useKeyboardShortcuts, SHORTCUTS } from '../../../hooks/useKeyboardShortcuts';
import { Search, Zap, Command as CommandIcon } from 'lucide-react';
import { motion } from 'motion/react';

export function PTAAppWithSearch() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Keyboard shortcuts globales
  useKeyboardShortcuts([
    {
      ...SHORTCUTS.COMMAND_PALETTE,
      callback: () => setCommandPaletteOpen(true)
    },
    {
      ...SHORTCUTS.AYUDA,
      callback: () => setShortcutsModalOpen(true)
    },
    {
      ...SHORTCUTS.NUEVO_PTA,
      callback: () => {
        console.log('Crear nuevo PTA');
        // Aquí iría la lógica para crear PTA
      }
    },
    {
      ...SHORTCUTS.AGREGAR_ASIGNATURA,
      callback: () => {
        console.log('Agregar asignatura');
        // Aquí iría la lógica para agregar asignatura
      }
    }
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con indicador de búsqueda */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sistema PTA ESAP</h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestión del Plan de Trabajo Académico
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Botón de búsqueda rápida */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCommandPaletteOpen(true)}
                className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border-2 border-purple-200 rounded-xl transition-all group"
              >
                <Search className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-600 hidden sm:inline">
                  Buscar...
                </span>
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-purple-300">
                  <kbd className="text-xs font-medium text-purple-700">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'}
                  </kbd>
                  <kbd className="text-xs font-medium text-purple-700">K</kbd>
                </div>
              </motion.button>

              {/* Botón de shortcuts */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShortcutsModalOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                title="Ver atajos de teclado (?)"
              >
                <Zap className="w-5 h-5 text-gray-600 group-hover:text-purple-600 transition-colors" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-3">
                🚀 Búsqueda Global Activada
              </h2>
              <p className="text-white/90 mb-6 max-w-2xl">
                Ahora puedes buscar PTAs, docentes, asignaturas y ejecutar acciones rápidamente desde cualquier lugar.
                Presiona <kbd className="px-3 py-1.5 bg-white/20 rounded-lg mx-1">
                  {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘K' : 'Ctrl+K'}
                </kbd> para empezar.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setCommandPaletteOpen(true)}
                  className="px-5 py-2.5 bg-white text-purple-600 hover:bg-purple-50 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Probar búsqueda
                </button>
                <button
                  onClick={() => setShortcutsModalOpen(true)}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <CommandIcon className="w-4 h-4" />
                  Ver todos los atajos
                </button>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center">
                <Zap className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-purple-300 transition-all"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Búsqueda Universal</h3>
            <p className="text-sm text-gray-600 mb-4">
              Busca PTAs, docentes, asignaturas y más desde un solo lugar.
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">
                {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'}K
              </kbd>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-blue-300 transition-all"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Acciones Rápidas</h3>
            <p className="text-sm text-gray-600 mb-4">
              Ejecuta acciones comunes sin navegar por menús.
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">
                {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'}N
              </kbd>
              <span>Nuevo PTA</span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-green-300 transition-all"
          >
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <CommandIcon className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Atajos de Teclado</h3>
            <p className="text-sm text-gray-600 mb-4">
              Más de 20 atajos para trabajar más rápido.
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">?</kbd>
              <span>Ver todos</span>
            </div>
          </motion.div>
        </div>

        {/* Demo Section */}
        <div className="bg-white rounded-xl p-8 border-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            ⚡ Cómo usar la búsqueda global
          </h3>

          <div className="space-y-6">
            {/* Paso 1 */}
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-purple-600">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  Abre el buscador
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  Presiona <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-xs">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘K' : 'Ctrl+K'}
                  </kbd> en cualquier momento desde cualquier página.
                </p>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-purple-600">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  Escribe lo que buscas
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  Puedes buscar por nombre de docente, radicado de PTA, código de asignatura o acción que quieres realizar.
                </p>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                  Ejemplos: "Juan Pérez", "PTA-847", "Gestión Pública", "agregar asignatura"
                </div>
              </div>
            </div>

            {/* Paso 3 */}
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-purple-600">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  Navega y selecciona
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  Usa las flechas <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-xs">↑↓</kbd> para navegar
                  y <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-xs">Enter</kbd> para seleccionar.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              Probar ahora
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">90%</div>
            <div className="text-sm text-gray-600">Más rápido</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">20+</div>
            <div className="text-sm text-gray-600">Atajos disponibles</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">4</div>
            <div className="text-sm text-gray-600">Categorías</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-1">100%</div>
            <div className="text-sm text-gray-600">Accesible</div>
          </div>
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Shortcuts Modal */}
      <ModalShortcuts
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </div>
  );
}

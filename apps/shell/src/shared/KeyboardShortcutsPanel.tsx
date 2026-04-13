/**
 * KeyboardShortcutsPanel Component
 * Panel para mostrar todos los atajos de teclado disponibles
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard, Search, Command } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { FocusManager } from './FocusManager';
import { useMicrointeractions } from '../../hooks/useMicrointeractions';
import { ESAP_GLOBAL_SHORTCUTS, KeyboardShortcut } from '../../hooks/useKeyboardNavigation';

interface KeyboardShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  customShortcuts?: KeyboardShortcut[];
}

export function KeyboardShortcutsPanel({
  isOpen,
  onClose,
  customShortcuts = [],
}: KeyboardShortcutsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { getEntranceAnimation } = useMicrointeractions();

  const allShortcuts = [...ESAP_GLOBAL_SHORTCUTS, ...customShortcuts];

  const filteredShortcuts = allShortcuts.filter(shortcut =>
    shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shortcut.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const keys: string[] = [];
    
    if (shortcut.ctrl) keys.push('Ctrl');
    if (shortcut.alt) keys.push('Alt');
    if (shortcut.shift) keys.push('Shift');
    if (shortcut.meta) keys.push('⌘');
    keys.push(shortcut.key.toUpperCase());

    return keys.join(' + ');
  };

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <FocusManager isActive={isOpen} onEscape={onClose} restoreFocus>
          <motion.div
            {...getEntranceAnimation('scaleIn')}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[80vh] mx-4"
          >
            <Card className="border-2 border-[#1e5da8]/20 shadow-2xl">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-[#1e5da8]/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#1e5da8]/10 rounded-lg">
                      <Keyboard className="w-6 h-6 text-[#1e5da8]" />
                    </div>
                    <div>
                      <CardTitle id="shortcuts-title" className="text-xl">
                        Atajos de Teclado
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Navega La Comunidad ESAP sin tocar la pantalla
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    aria-label="Cerrar panel de atajos"
                    className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Búsqueda */}
                <div className="mt-4 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar atajo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 
                             rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[#1e5da8] 
                             focus:border-transparent outline-none"
                    data-search-input
                    aria-label="Buscar atajos de teclado"
                  />
                </div>
              </CardHeader>

              <CardContent className="p-6 overflow-y-auto max-h-[50vh]">
                {filteredShortcuts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Keyboard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No se encontraron atajos</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredShortcuts.map((shortcut, index) => (
                      <motion.div
                        key={`${shortcut.key}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-center justify-between p-3 rounded-lg 
                                 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 
                                 dark:hover:bg-gray-700/50 transition-colors group"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1">
                          {shortcut.meta && (
                            <kbd className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 
                                         dark:border-gray-600 rounded shadow-sm text-xs font-mono 
                                         text-gray-700 dark:text-gray-300">
                              {isMac ? '⌘' : 'Win'}
                            </kbd>
                          )}
                          {shortcut.ctrl && (
                            <kbd className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 
                                         dark:border-gray-600 rounded shadow-sm text-xs font-mono 
                                         text-gray-700 dark:text-gray-300">
                              Ctrl
                            </kbd>
                          )}
                          {shortcut.alt && (
                            <kbd className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 
                                         dark:border-gray-600 rounded shadow-sm text-xs font-mono 
                                         text-gray-700 dark:text-gray-300">
                              Alt
                            </kbd>
                          )}
                          {shortcut.shift && (
                            <kbd className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 
                                         dark:border-gray-600 rounded shadow-sm text-xs font-mono 
                                         text-gray-700 dark:text-gray-300">
                              Shift
                            </kbd>
                          )}
                          <kbd className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 
                                       dark:border-gray-600 rounded shadow-sm text-xs font-mono 
                                       text-gray-700 dark:text-gray-300 uppercase">
                            {shortcut.key === ' ' ? 'Space' : shortcut.key}
                          </kbd>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Tip adicional */}
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Command className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Consejo de navegación
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Presiona <kbd className="px-1 py-0.5 bg-white dark:bg-gray-800 border border-blue-300 
                        dark:border-blue-600 rounded text-xs">Tab</kbd> para navegar entre elementos y{' '}
                        <kbd className="px-1 py-0.5 bg-white dark:bg-gray-800 border border-blue-300 
                        dark:border-blue-600 rounded text-xs">Enter</kbd> para activarlos.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </FocusManager>
      </motion.div>
    </AnimatePresence>
  );
}

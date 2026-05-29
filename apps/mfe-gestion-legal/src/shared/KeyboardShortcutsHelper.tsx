/**
 * COMPONENTE: KeyboardShortcutsHelper
 * Muestra un diálogo con todos los atajos de teclado disponibles
 * Se puede activar con Ctrl+K o haciendo clic en un botón
 */

import { useState, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard, Command } from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';

interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: 'navegacion' | 'acciones' | 'mobile';
}

const SHORTCUTS: KeyboardShortcut[] = [
  // Navegación
  { keys: ['←'], description: 'Sección anterior', category: 'navegacion' },
  { keys: ['→'], description: 'Sección siguiente', category: 'navegacion' },
  { keys: ['Alt', '↑'], description: 'Primera sección', category: 'navegacion' },
  { keys: ['Alt', '↓'], description: 'Última sección', category: 'navegacion' },
  { keys: ['Tab'], description: 'Navegar entre elementos', category: 'navegacion' },
  
  // Acciones rápidas
  { keys: ['Ctrl', '1'], description: 'Ir a Sección 1', category: 'acciones' },
  { keys: ['Ctrl', '2'], description: 'Ir a Sección 2', category: 'acciones' },
  { keys: ['Ctrl', '3'], description: 'Ir a Sección 3', category: 'acciones' },
  { keys: ['Ctrl', '4-9'], description: 'Ir a Sección 4-9', category: 'acciones' },
  { keys: ['Enter'], description: 'Activar botón enfocado', category: 'acciones' },
  { keys: ['Escape'], description: 'Cerrar menú/modal', category: 'acciones' },
  
  // Mobile
  { keys: ['Ctrl', 'M'], description: 'Abrir/cerrar menú mobile', category: 'mobile' },
];

const CATEGORY_LABELS = {
  navegacion: 'Navegación',
  acciones: 'Acciones Rápidas',
  mobile: 'Mobile'
};

interface KeyboardShortcutsHelperProps {
  moduleColor?: string;
}

export function KeyboardShortcutsHelper({ moduleColor = '#003DA5' }: KeyboardShortcutsHelperProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Abrir con Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Modal de atajos */}
      <AnimatePresence>
        {isOpen && (
          <Fragment key="keyboard-shortcuts-modal">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Diálogo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => setIsOpen(false)}
            >
              <Card
                className="w-full max-w-2xl max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-6 border-b-2 border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl" style={{ background: `${moduleColor}15` }}>
                        <Keyboard className="w-6 h-6" style={{ color: moduleColor }} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          Atajos de Teclado
                        </h2>
                        <p className="text-sm text-gray-600">
                          Navega más rápido con estos comandos
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setIsOpen(false)}
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  {/* Nota importante */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-900">
                      <span className="font-bold">💡 Tip:</span> En Mac, usa <kbd className="px-2 py-1 bg-white rounded text-xs font-mono border">Cmd</kbd> en lugar de <kbd className="px-2 py-1 bg-white rounded text-xs font-mono border">Ctrl</kbd>
                    </p>
                  </div>

                  {/* Atajos por categoría */}
                  {Object.entries(CATEGORY_LABELS).map(([category, label]) => {
                    const categoryShortcuts = SHORTCUTS.filter(s => s.category === category);
                    
                    return (
                      <div key={category} className="mb-6 last:mb-0">
                        <h3 className="font-bold text-sm mb-3 text-gray-700 uppercase tracking-wide">
                          {label}
                        </h3>
                        <div className="space-y-2">
                          {categoryShortcuts.map((shortcut, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <span className="text-sm text-gray-700">
                                {shortcut.description}
                              </span>
                              <div className="flex items-center gap-1">
                                {shortcut.keys.map((key, keyIndex) => (
                                  <div key={keyIndex} className="flex items-center gap-1">
                                    {keyIndex > 0 && (
                                      <span className="text-gray-400 text-xs">+</span>
                                    )}
                                    <kbd
                                      className="px-3 py-1.5 rounded-md font-mono text-xs font-bold shadow-sm border-2"
                                      style={{
                                        background: '#FFFFFF',
                                        borderColor: '#E5E7EB',
                                        color: moduleColor
                                      }}
                                    >
                                      {key === 'Ctrl' && (
                                        <span className="hidden sm:inline">Ctrl</span>
                                      )}
                                      {key === 'Ctrl' && (
                                        <span className="sm:hidden">⌃</span>
                                      )}
                                      {key === 'Alt' && (
                                        <span className="hidden sm:inline">Alt</span>
                                      )}
                                      {key === 'Alt' && (
                                        <span className="sm:hidden">⌥</span>
                                      )}
                                      {key !== 'Ctrl' && key !== 'Alt' && key}
                                    </kbd>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Footer info */}
                  <div className="mt-6 pt-6 border-t-2 border-gray-200">
                    <p className="text-xs text-gray-600 text-center">
                      Los atajos solo funcionan cuando no estás escribiendo en un campo de texto
                    </p>
                  </div>
                </div>

                {/* Footer con botón de cerrar */}
                <div className="p-4 border-t-2 border-gray-200 bg-gray-50">
                  <Button
                    onClick={() => setIsOpen(false)}
                    className="w-full font-bold"
                    style={{ background: moduleColor, color: '#FFFFFF' }}
                  >
                    Entendido
                  </Button>
                </div>
              </Card>
            </motion.div>
          </Fragment>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * DEMO VISUAL - ATAJOS DE TECLADO
 * Muestra cómo funcionan los atajos de teclado en tiempo real
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Keyboard, ArrowLeft, ArrowRight, Command, Zap, 
  CheckCircle2, LayoutDashboard, FileText, Users
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';

const DEMO_SECTIONS = [
  { id: '1', name: 'Procesos', icon: LayoutDashboard, color: '#003DA5' },
  { id: '2', name: 'Noticias', icon: FileText, color: '#F59E0B' },
  { id: '3', name: 'Revisión', icon: CheckCircle2, color: '#10B981' },
  { id: '4', name: 'Profesionales', icon: Users, color: '#8B5CF6' }
];

export function KeyboardShortcutsDemo() {
  const [activeSection, setActiveSection] = useState(0);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [keyCount, setKeyCount] = useState(0);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignorar si está en input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      let keyPressed = '';

      // Flecha derecha
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveSection((prev) => (prev + 1) % DEMO_SECTIONS.length);
        keyPressed = '→';
      }

      // Flecha izquierda
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveSection((prev) => prev === 0 ? DEMO_SECTIONS.length - 1 : prev - 1);
        keyPressed = '←';
      }

      // Ctrl/Cmd + número
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        setActiveSection(parseInt(e.key) - 1);
        keyPressed = `${e.ctrlKey ? 'Ctrl' : 'Cmd'}+${e.key}`;
      }

      if (keyPressed) {
        setLastKey(keyPressed);
        setKeyCount(prev => prev + 1);
        
        // Limpiar después de 2 segundos
        setTimeout(() => setLastKey(null), 2000);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const currentSection = DEMO_SECTIONS[activeSection];
  const Icon = currentSection.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-white shadow-lg">
              <Keyboard className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Demo de Atajos de Teclado
          </h1>
          <p className="text-gray-600">
            Prueba los atajos en tiempo real
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Atajos usados</p>
                <p className="text-2xl font-bold text-gray-900">{keyCount}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Sección activa</p>
                <p className="text-lg font-bold text-gray-900">{currentSection.name}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Command className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Último atajo</p>
                <p className="text-lg font-bold text-gray-900">
                  {lastKey || '—'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Vista de sección activa */}
        <Card className="p-8 mb-8 min-h-[300px] relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {/* Icono grande */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
                className="inline-flex p-8 rounded-3xl mb-6"
                style={{ background: `${currentSection.color}15` }}
              >
                <Icon className="w-20 h-20" style={{ color: currentSection.color }} />
              </motion.div>

              {/* Título */}
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {currentSection.name}
              </h2>

              {/* Badge con número */}
              <Badge 
                className="text-sm font-bold px-4 py-1"
                style={{ background: currentSection.color, color: '#FFFFFF' }}
              >
                Sección {activeSection + 1}
              </Badge>

              {/* Descripción */}
              <p className="text-gray-600 mt-4">
                Presiona <kbd className="px-2 py-1 bg-gray-200 rounded font-mono text-sm">←</kbd> o{' '}
                <kbd className="px-2 py-1 bg-gray-200 rounded font-mono text-sm">→</kbd> para navegar
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Animación de fondo */}
          <motion.div
            className="absolute inset-0 opacity-10"
            style={{ background: currentSection.color }}
            initial={{ scale: 0 }}
            animate={{ scale: 2 }}
            transition={{ duration: 0.6 }}
          />
        </Card>

        {/* Indicadores de secciones */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {DEMO_SECTIONS.map((section, index) => (
            <motion.button
              key={section.id}
              onClick={() => setActiveSection(index)}
              className="relative"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <div
                className="w-3 h-3 rounded-full transition-all"
                style={{
                  background: index === activeSection ? section.color : '#E5E7EB',
                  width: index === activeSection ? '40px' : '12px',
                  height: '12px'
                }}
              />
              {index === activeSection && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: section.color }}
                />
              )}
            </motion.button>
          ))}
        </div>

        {/* Instrucciones */}
        <Card className="p-6">
          <h3 className="font-bold text-lg text-gray-900 mb-4">
            🎮 Prueba estos atajos:
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Navegación */}
            <div>
              <h4 className="font-bold text-sm text-gray-700 mb-2">
                Navegación
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">Siguiente</span>
                  <kbd className="px-3 py-1 bg-white rounded border-2 font-mono text-sm">
                    <ArrowRight className="w-4 h-4 inline" />
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">Anterior</span>
                  <kbd className="px-3 py-1 bg-white rounded border-2 font-mono text-sm">
                    <ArrowLeft className="w-4 h-4 inline" />
                  </kbd>
                </div>
              </div>
            </div>

            {/* Acceso directo */}
            <div>
              <h4 className="font-bold text-sm text-gray-700 mb-2">
                Acceso Directo
              </h4>
              <div className="space-y-2">
                {DEMO_SECTIONS.map((section, index) => (
                  <div 
                    key={section.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm text-gray-700">{section.name}</span>
                    <kbd className="px-3 py-1 bg-white rounded border-2 font-mono text-sm">
                      Ctrl+{index + 1}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <span className="font-bold">💡 Tip:</span> En Mac, usa{' '}
              <kbd className="px-2 py-1 bg-white rounded text-xs">Cmd</kbd> en lugar de{' '}
              <kbd className="px-2 py-1 bg-white rounded text-xs">Ctrl</kbd>
            </p>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            Estos atajos funcionan en Control Interno Disciplinario, Control Interno y Gestión Legal (SIGL)
          </p>
        </div>
      </div>
    </div>
  );
}

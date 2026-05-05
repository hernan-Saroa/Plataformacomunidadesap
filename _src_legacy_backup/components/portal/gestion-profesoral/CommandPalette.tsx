/**
 * Command Palette - Búsqueda Global Omnipresente
 * Inspirado en: VS Code, Linear, Notion, Slack
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  FileText,
  User,
  BookOpen,
  Clock,
  TrendingUp,
  ChevronRight,
  Command,
  Plus,
  Send,
  Download,
  Settings,
  HelpCircle,
  Zap
} from 'lucide-react';
import { isMac } from '../../../hooks/useKeyboardShortcuts';

// ============================================================================
// TYPES
// ============================================================================

interface SearchResult {
  id: string;
  type: 'pta' | 'docente' | 'asignatura' | 'accion';
  titulo: string;
  subtitulo?: string;
  descripcion?: string;
  icono: React.ReactNode;
  color: string;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
  onAction?: (actionId: string) => void;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockPTAs: SearchResult[] = [
  {
    id: 'pta-1',
    type: 'pta',
    titulo: 'PTA 2025-2 - Juan Pérez',
    subtitulo: 'PTA-2025-2-00847',
    descripcion: '800/800h • Aprobado',
    icono: <FileText className="w-5 h-5" />,
    color: '#10B981',
    action: () => console.log('Navegar a PTA-847')
  },
  {
    id: 'pta-2',
    type: 'pta',
    titulo: 'PTA 2025-2 - María López',
    subtitulo: 'PTA-2025-2-00848',
    descripcion: '784/800h • En Aprobación',
    icono: <FileText className="w-5 h-5" />,
    color: '#3B82F6',
    action: () => console.log('Navegar a PTA-848')
  },
  {
    id: 'pta-3',
    type: 'pta',
    titulo: 'PTA 2025-2 - Carlos Rodríguez',
    subtitulo: 'PTA-2025-2-00849',
    descripcion: '800/800h • Borrador',
    icono: <FileText className="w-5 h-5" />,
    color: '#F59E0B',
    action: () => console.log('Navegar a PTA-849')
  }
];

const mockDocentes: SearchResult[] = [
  {
    id: 'doc-1',
    type: 'docente',
    titulo: 'Juan Carlos Pérez García',
    subtitulo: 'DOC-12345',
    descripcion: 'Docente Ocasional • Bogotá',
    icono: <User className="w-5 h-5" />,
    color: '#8B5CF6',
    action: () => console.log('Ver perfil Juan Pérez')
  },
  {
    id: 'doc-2',
    type: 'docente',
    titulo: 'María Fernanda López',
    subtitulo: 'DOC-12346',
    descripcion: 'Docente Tiempo Completo • Antioquia',
    icono: <User className="w-5 h-5" />,
    color: '#8B5CF6',
    action: () => console.log('Ver perfil María López')
  }
];

const mockAsignaturas: SearchResult[] = [
  {
    id: 'asig-1',
    type: 'asignatura',
    titulo: 'Gestión Pública II',
    subtitulo: 'GPUB-202',
    descripcion: '3 créditos • 144 horas',
    icono: <BookOpen className="w-5 h-5" />,
    color: '#003DA5',
    action: () => console.log('Ver asignatura Gestión Pública II')
  },
  {
    id: 'asig-2',
    type: 'asignatura',
    titulo: 'Seminario de Investigación',
    subtitulo: 'SEM-301',
    descripcion: '2 créditos • 96 horas',
    icono: <BookOpen className="w-5 h-5" />,
    color: '#003DA5',
    action: () => console.log('Ver asignatura Seminario')
  }
];

const acciones: SearchResult[] = [
  {
    id: 'accion-1',
    type: 'accion',
    titulo: 'Crear nuevo PTA',
    descripcion: 'Iniciar un nuevo Plan de Trabajo Académico',
    icono: <Plus className="w-5 h-5" />,
    color: '#10B981',
    action: () => console.log('Crear PTA'),
    shortcut: isMac ? '⌘N' : 'Ctrl+N'
  },
  {
    id: 'accion-2',
    type: 'accion',
    titulo: 'Agregar asignatura',
    descripcion: 'Agregar una nueva asignatura al PTA actual',
    icono: <Plus className="w-5 h-5" />,
    color: '#003DA5',
    action: () => console.log('Agregar asignatura'),
    shortcut: isMac ? '⌘A' : 'Ctrl+A'
  },
  {
    id: 'accion-3',
    type: 'accion',
    titulo: 'Enviar a aprobación',
    descripcion: 'Enviar PTA actual a proceso de aprobación',
    icono: <Send className="w-5 h-5" />,
    color: '#3B82F6',
    action: () => console.log('Enviar aprobación')
  },
  {
    id: 'accion-4',
    type: 'accion',
    titulo: 'Descargar PDF',
    descripcion: 'Descargar PTA actual en formato PDF',
    icono: <Download className="w-5 h-5" />,
    color: '#6B7280',
    action: () => console.log('Descargar PDF')
  },
  {
    id: 'accion-5',
    type: 'accion',
    titulo: 'Ver bandeja de aprobación',
    descripcion: 'Ir a bandeja de PTAs pendientes',
    icono: <FileText className="w-5 h-5" />,
    color: '#F59E0B',
    action: () => console.log('Bandeja aprobación')
  },
  {
    id: 'accion-6',
    type: 'accion',
    titulo: 'Configuración',
    descripcion: 'Preferencias y ajustes del sistema',
    icono: <Settings className="w-5 h-5" />,
    color: '#6B7280',
    action: () => console.log('Configuración')
  },
  {
    id: 'accion-7',
    type: 'accion',
    titulo: 'Ayuda y atajos',
    descripcion: 'Ver todos los atajos de teclado disponibles',
    icono: <HelpCircle className="w-5 h-5" />,
    color: '#8B5CF6',
    action: () => console.log('Ayuda'),
    shortcut: '?'
  }
];

// ============================================================================
// COMPONENT
// ============================================================================

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onAction
}: CommandPaletteProps) {
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState(0);
  const [historial, setHistorial] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Cargar historial de localStorage
  useEffect(() => {
    const stored = localStorage.getItem('search_history');
    if (stored) {
      setHistorial(JSON.parse(stored));
    }
  }, []);

  // Focus en input cuando se abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Filtrar resultados
  const resultados = useMemo(() => {
    const query = busqueda.toLowerCase().trim();

    if (!query) {
      // Sin búsqueda: mostrar acciones frecuentes
      return {
        acciones: acciones.slice(0, 7),
        ptas: [],
        docentes: [],
        asignaturas: []
      };
    }

    // Con búsqueda: filtrar todo
    return {
      acciones: acciones.filter(a =>
        a.titulo.toLowerCase().includes(query) ||
        a.descripcion?.toLowerCase().includes(query)
      ),
      ptas: mockPTAs.filter(p =>
        p.titulo.toLowerCase().includes(query) ||
        p.subtitulo?.toLowerCase().includes(query)
      ),
      docentes: mockDocentes.filter(d =>
        d.titulo.toLowerCase().includes(query) ||
        d.subtitulo?.toLowerCase().includes(query)
      ),
      asignaturas: mockAsignaturas.filter(a =>
        a.titulo.toLowerCase().includes(query) ||
        a.subtitulo?.toLowerCase().includes(query)
      )
    };
  }, [busqueda]);

  // Aplanar resultados para navegación
  const todosResultados = useMemo(() => {
    const results: SearchResult[] = [];
    
    if (resultados.acciones.length > 0) results.push(...resultados.acciones);
    if (resultados.ptas.length > 0) results.push(...resultados.ptas);
    if (resultados.docentes.length > 0) results.push(...resultados.docentes);
    if (resultados.asignaturas.length > 0) results.push(...resultados.asignaturas);
    
    return results;
  }, [resultados]);

  // Manejar teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSeleccionado(prev => 
            prev < todosResultados.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSeleccionado(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
          e.preventDefault();
          if (todosResultados[seleccionado]) {
            handleSelectResult(todosResultados[seleccionado]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, seleccionado, todosResultados]);

  // Scroll to selected
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[seleccionado] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [seleccionado]);

  const handleSelectResult = (resultado: SearchResult) => {
    // Guardar en historial
    const newHistorial = [
      busqueda,
      ...historial.filter(h => h !== busqueda)
    ].slice(0, 10);
    
    setHistorial(newHistorial);
    localStorage.setItem('search_history', JSON.stringify(newHistorial));

    // Ejecutar acción
    resultado.action();
    
    // Cerrar
    onClose();
    setBusqueda('');
    setSeleccionado(0);
  };

  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'accion': return 'ACCIONES';
      case 'pta': return 'PLANES DE TRABAJO';
      case 'docente': return 'DOCENTES';
      case 'asignatura': return 'ASIGNATURAS';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header con búsqueda */}
        <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-gray-200">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setSeleccionado(0);
            }}
            placeholder="Buscar PTAs, docentes, asignaturas o acciones..."
            className="flex-1 text-lg border-0 focus:outline-none"
          />
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">
              {isMac ? '⌘' : 'Ctrl'}K
            </kbd>
          </div>
        </div>

        {/* Resultados */}
        <div 
          ref={listRef}
          className="max-h-[60vh] overflow-auto"
        >
          {todosResultados.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No se encontraron resultados</p>
              <p className="text-sm mt-1">Intenta con otro término de búsqueda</p>
            </div>
          ) : (
            <>
              {/* Acciones */}
              {resultados.acciones.length > 0 && (
                <div className="py-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500">
                    {getCategoryLabel('accion')}
                  </div>
                  {resultados.acciones.map((resultado, index) => {
                    const globalIndex = todosResultados.indexOf(resultado);
                    return (
                      <motion.div
                        key={resultado.id}
                        whileHover={{ backgroundColor: '#F3F4F6' }}
                        onClick={() => handleSelectResult(resultado)}
                        className={`
                          px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors
                          ${globalIndex === seleccionado ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}
                        `}
                      >
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${resultado.color}20`, color: resultado.color }}
                        >
                          {resultado.icono}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{resultado.titulo}</div>
                          {resultado.descripcion && (
                            <div className="text-sm text-gray-600 truncate">{resultado.descripcion}</div>
                          )}
                        </div>
                        {resultado.shortcut && (
                          <kbd className="px-2 py-1 text-xs bg-gray-100 rounded border border-gray-300">
                            {resultado.shortcut}
                          </kbd>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* PTAs */}
              {resultados.ptas.length > 0 && (
                <div className="py-2 border-t border-gray-200">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500">
                    {getCategoryLabel('pta')}
                  </div>
                  {resultados.ptas.map((resultado) => {
                    const globalIndex = todosResultados.indexOf(resultado);
                    return (
                      <motion.div
                        key={resultado.id}
                        whileHover={{ backgroundColor: '#F3F4F6' }}
                        onClick={() => handleSelectResult(resultado)}
                        className={`
                          px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors
                          ${globalIndex === seleccionado ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}
                        `}
                      >
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${resultado.color}20`, color: resultado.color }}
                        >
                          {resultado.icono}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{resultado.titulo}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <span className="font-mono text-xs">{resultado.subtitulo}</span>
                            <span>•</span>
                            <span>{resultado.descripcion}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Docentes */}
              {resultados.docentes.length > 0 && (
                <div className="py-2 border-t border-gray-200">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500">
                    {getCategoryLabel('docente')}
                  </div>
                  {resultados.docentes.map((resultado) => {
                    const globalIndex = todosResultados.indexOf(resultado);
                    return (
                      <motion.div
                        key={resultado.id}
                        whileHover={{ backgroundColor: '#F3F4F6' }}
                        onClick={() => handleSelectResult(resultado)}
                        className={`
                          px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors
                          ${globalIndex === seleccionado ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}
                        `}
                      >
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${resultado.color}20`, color: resultado.color }}
                        >
                          {resultado.icono}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{resultado.titulo}</div>
                          <div className="text-sm text-gray-600">{resultado.descripcion}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Asignaturas */}
              {resultados.asignaturas.length > 0 && (
                <div className="py-2 border-t border-gray-200">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500">
                    {getCategoryLabel('asignatura')}
                  </div>
                  {resultados.asignaturas.map((resultado) => {
                    const globalIndex = todosResultados.indexOf(resultado);
                    return (
                      <motion.div
                        key={resultado.id}
                        whileHover={{ backgroundColor: '#F3F4F6' }}
                        onClick={() => handleSelectResult(resultado)}
                        className={`
                          px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors
                          ${globalIndex === seleccionado ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}
                        `}
                      >
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${resultado.color}20`, color: resultado.color }}
                        >
                          {resultado.icono}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{resultado.titulo}</div>
                          <div className="text-sm text-gray-600">{resultado.descripcion}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer con shortcuts */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white rounded border border-gray-300">↑↓</kbd>
              <span>Navegar</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white rounded border border-gray-300">↵</kbd>
              <span>Seleccionar</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white rounded border border-gray-300">Esc</kbd>
              <span>Cerrar</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <Zap className="w-3 h-3" />
            <span>Búsqueda rápida</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

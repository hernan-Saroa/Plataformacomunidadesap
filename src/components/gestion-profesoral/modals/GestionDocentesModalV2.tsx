/**
 * Modal V2: Gestión de Docentes - OPTIMIZADO para 1400+ profesores
 * 
 * Características principales:
 * - Búsqueda inteligente con múltiples campos
 * - Filtros avanzados con contador en tiempo real
 * - Paginación robusta (10/25/50/100 por página)
 * - Vista de tabla configurable
 * - Selección múltiple y acciones masivas
 * - Exportación Excel/CSV
 * - Vistas guardadas predefinidas
 * - Vista rápida lateral
 * - Atajos de teclado
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  UserPlus,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Award,
  Eye,
  Edit,
  FileText,
  BarChart3,
  Clock,
  CheckCircle,
  Download,
  Upload,
  MoreVertical,
  BookOpen,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Settings,
  Star,
  TrendingUp,
  AlertCircle,
  Check,
  X as XIcon,
  Trash2,
  Send,
  FileSpreadsheet,
  Columns,
  Save,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { toast } from 'sonner@2.0.3';

interface Docente {
  id: string;
  cedula: string;
  nombre: string;
  email: string;
  telefono: string;
  tipoVinculacion: 'Planta' | 'Cátedra' | 'Ocasional';
  estado: 'Activo' | 'Inactivo' | 'Licencia';
  facultad: string;
  programa: string;
  fechaVinculacion: string;
  horasBase: number;
  ptasAprobados: number;
  evaluacionPromedio: number;
  titulacion: string;
  materias: string[];
}

interface FiltrosAvanzados {
  busqueda: string;
  tipoVinculacion: string[];
  estado: string[];
  facultad: string[];
  evaluacionMin: number;
  evaluacionMax: number;
  fechaVinculacionDesde: string;
  fechaVinculacionHasta: string;
}

interface VistaGuardada {
  id: string;
  nombre: string;
  descripcion: string;
  icono: React.ReactNode;
  filtros: Partial<FiltrosAvanzados>;
}

interface ColumnConfig {
  key: keyof Docente;
  label: string;
  visible: boolean;
  width?: string;
}

interface GestionDocentesModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  onDocenteUpdated?: (docenteId: string) => void;
}

// Generar datos mock para 1400+ profesores
const generarDocentesMock = (cantidad: number): Docente[] => {
  const nombres = ['Carlos', 'Ana', 'Roberto', 'María', 'Luis', 'Patricia', 'Jorge', 'Laura', 'Diego', 'Sofía'];
  const apellidos = ['Méndez', 'Gutiérrez', 'Silva', 'Fernández', 'Ramírez', 'Gómez', 'Torres', 'Castro', 'Ruiz', 'López'];
  const titulaciones = ['Doctor', 'Doctora', 'Magíster', 'Especialista'];
  const facultades = [
    'Ciencias Políticas',
    'Ciencias Administrativas',
    'Ciencias Jurídicas',
    'Ciencias Económicas',
    'Ciencias Sociales',
  ];
  const programas = [
    'Administración Pública',
    'Derecho Público',
    'Economía',
    'Sociología',
    'Gobierno y Relaciones Internacionales',
  ];
  const materias = [
    'Teoría Política',
    'Gestión Pública',
    'Políticas Públicas',
    'Derecho Constitucional',
    'Economía Pública',
    'Administración Financiera',
    'Gestión Estratégica',
  ];

  return Array.from({ length: cantidad }, (_, i) => {
    const nombre = nombres[i % nombres.length];
    const apellido1 = apellidos[Math.floor(i / nombres.length) % apellidos.length];
    const apellido2 = apellidos[(i + 3) % apellidos.length];
    const titulacion = titulaciones[i % titulaciones.length];
    const tipoVinculacion: Docente['tipoVinculacion'] =
      i % 3 === 0 ? 'Planta' : i % 3 === 1 ? 'Cátedra' : 'Ocasional';
    const estado: Docente['estado'] =
      i % 10 === 0 ? 'Licencia' : i % 20 === 0 ? 'Inactivo' : 'Activo';

    return {
      id: `doc_${String(i + 1).padStart(4, '0')}`,
      cedula: String(1000000000 + i),
      nombre: `${titulacion} ${nombre} ${apellido1} ${apellido2}`,
      email: `${nombre.toLowerCase()}.${apellido1.toLowerCase()}${i}@esap.edu.co`,
      telefono: `+57 3${String(10 + (i % 90)).padStart(2, '0')} ${String(100 + (i % 900)).padStart(3, '0')} ${String(1000 + (i % 9000)).padStart(4, '0')}`,
      tipoVinculacion,
      estado,
      facultad: facultades[i % facultades.length],
      programa: programas[i % programas.length],
      fechaVinculacion: `20${String(10 + (i % 15)).padStart(2, '0')}-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`,
      horasBase: tipoVinculacion === 'Planta' ? 1600 : tipoVinculacion === 'Cátedra' ? 600 : 400,
      ptasAprobados: Math.floor(5 + (i % 20)),
      evaluacionPromedio: 3.5 + (i % 16) / 10,
      titulacion: `${titulacion} en ${programas[i % programas.length]}`,
      materias: [materias[i % materias.length], materias[(i + 2) % materias.length]],
    };
  });
};

export function GestionDocentesModalV2({
  isOpen,
  onClose,
  onDocenteUpdated,
}: GestionDocentesModalV2Props) {
  // Estados principales
  const [todosLosDocentes] = useState<Docente[]>(() => generarDocentesMock(1450));
  const [selectedDocente, setSelectedDocente] = useState<Docente | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [vistaActual, setVistaActual] = useState<'lista' | 'detalle'>('lista');
  const [quickViewDocente, setQuickViewDocente] = useState<Docente | null>(null);

  // Filtros y búsqueda
  const [filtros, setFiltros] = useState<FiltrosAvanzados>({
    busqueda: '',
    tipoVinculacion: [],
    estado: [],
    facultad: [],
    evaluacionMin: 0,
    evaluacionMax: 5,
    fechaVinculacionDesde: '',
    fechaVinculacionHasta: '',
  });
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(25);

  // Configuración de columnas
  const [columnas, setColumnas] = useState<ColumnConfig[]>([
    { key: 'nombre', label: 'Nombre', visible: true, width: '250px' },
    { key: 'cedula', label: 'Cédula', visible: true, width: '120px' },
    { key: 'email', label: 'Email', visible: true, width: '220px' },
    { key: 'tipoVinculacion', label: 'Vinculación', visible: true, width: '120px' },
    { key: 'estado', label: 'Estado', visible: true, width: '100px' },
    { key: 'facultad', label: 'Facultad', visible: false, width: '180px' },
    { key: 'programa', label: 'Programa', visible: false, width: '200px' },
    { key: 'evaluacionPromedio', label: 'Evaluación', visible: true, width: '100px' },
    { key: 'ptasAprobados', label: 'PTAs', visible: true, width: '80px' },
    { key: 'telefono', label: 'Teléfono', visible: false, width: '150px' },
  ]);
  const [mostrarConfigColumnas, setMostrarConfigColumnas] = useState(false);

  // Vistas guardadas
  const vistasGuardadas: VistaGuardada[] = [
    {
      id: 'todos',
      nombre: 'Todos los docentes',
      descripcion: 'Ver todos los profesores',
      icono: <Users className="w-4 h-4" />,
      filtros: {},
    },
    {
      id: 'planta-activos',
      nombre: 'Planta Activos',
      descripcion: 'Profesores de planta activos',
      icono: <CheckCircle className="w-4 h-4" />,
      filtros: {
        tipoVinculacion: ['Planta'],
        estado: ['Activo'],
      },
    },
    {
      id: 'catedra-activos',
      nombre: 'Cátedra Activos',
      descripcion: 'Profesores de cátedra activos',
      icono: <BookOpen className="w-4 h-4" />,
      filtros: {
        tipoVinculacion: ['Cátedra'],
        estado: ['Activo'],
      },
    },
    {
      id: 'evaluacion-alta',
      nombre: 'Evaluación Alta',
      descripcion: 'Evaluación promedio > 4.5',
      icono: <Star className="w-4 h-4" />,
      filtros: {
        evaluacionMin: 4.5,
        estado: ['Activo'],
      },
    },
    {
      id: 'nuevos',
      nombre: 'Recientes',
      descripcion: 'Vinculados últimos 2 años',
      icono: <TrendingUp className="w-4 h-4" />,
      filtros: {
        fechaVinculacionDesde: '2023-01-01',
        estado: ['Activo'],
      },
    },
    {
      id: 'atencion',
      nombre: 'Requieren Atención',
      descripcion: 'Inactivos o en licencia',
      icono: <AlertCircle className="w-4 h-4" />,
      filtros: {
        estado: ['Inactivo', 'Licencia'],
      },
    },
  ];

  const [vistaSeleccionada, setVistaSeleccionada] = useState('todos');

  // Filtrar y ordenar docentes
  const docentesFiltrados = useMemo(() => {
    return todosLosDocentes.filter((docente) => {
      // Búsqueda general
      if (filtros.busqueda) {
        const busquedaLower = filtros.busqueda.toLowerCase();
        const coincide =
          docente.nombre.toLowerCase().includes(busquedaLower) ||
          docente.cedula.includes(filtros.busqueda) ||
          docente.email.toLowerCase().includes(busquedaLower) ||
          docente.facultad.toLowerCase().includes(busquedaLower) ||
          docente.programa.toLowerCase().includes(busquedaLower);
        if (!coincide) return false;
      }

      // Filtro tipo vinculación
      if (filtros.tipoVinculacion.length > 0) {
        if (!filtros.tipoVinculacion.includes(docente.tipoVinculacion)) return false;
      }

      // Filtro estado
      if (filtros.estado.length > 0) {
        if (!filtros.estado.includes(docente.estado)) return false;
      }

      // Filtro facultad
      if (filtros.facultad.length > 0) {
        if (!filtros.facultad.includes(docente.facultad)) return false;
      }

      // Filtro evaluación
      if (
        docente.evaluacionPromedio < filtros.evaluacionMin ||
        docente.evaluacionPromedio > filtros.evaluacionMax
      ) {
        return false;
      }

      // Filtro fecha vinculación
      if (filtros.fechaVinculacionDesde) {
        if (docente.fechaVinculacion < filtros.fechaVinculacionDesde) return false;
      }
      if (filtros.fechaVinculacionHasta) {
        if (docente.fechaVinculacion > filtros.fechaVinculacionHasta) return false;
      }

      return true;
    });
  }, [todosLosDocentes, filtros]);

  // Paginación
  const totalPaginas = Math.ceil(docentesFiltrados.length / itemsPorPagina);
  const docentesPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = inicio + itemsPorPagina;
    return docentesFiltrados.slice(inicio, fin);
  }, [docentesFiltrados, paginaActual, itemsPorPagina]);

  // Reset página cuando cambian filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [filtros, itemsPorPagina]);

  // Aplicar vista guardada
  const aplicarVista = (vistaId: string) => {
    const vista = vistasGuardadas.find((v) => v.id === vistaId);
    if (vista) {
      setFiltros({
        busqueda: vista.filtros.busqueda || '',
        tipoVinculacion: vista.filtros.tipoVinculacion || [],
        estado: vista.filtros.estado || [],
        facultad: vista.filtros.facultad || [],
        evaluacionMin: vista.filtros.evaluacionMin || 0,
        evaluacionMax: vista.filtros.evaluacionMax || 5,
        fechaVinculacionDesde: vista.filtros.fechaVinculacionDesde || '',
        fechaVinculacionHasta: vista.filtros.fechaVinculacionHasta || '',
      });
      setVistaSeleccionada(vistaId);
    }
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltros({
      busqueda: '',
      tipoVinculacion: [],
      estado: [],
      facultad: [],
      evaluacionMin: 0,
      evaluacionMax: 5,
      fechaVinculacionDesde: '',
      fechaVinculacionHasta: '',
    });
    setVistaSeleccionada('todos');
  };

  // Selección múltiple
  const toggleSeleccion = (docenteId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(docenteId)) {
      newSet.delete(docenteId);
    } else {
      newSet.add(docenteId);
    }
    setSelectedIds(newSet);
  };

  const seleccionarTodosPagina = () => {
    const newSet = new Set(selectedIds);
    docentesPaginados.forEach((d) => newSet.add(d.id));
    setSelectedIds(newSet);
  };

  const deseleccionarTodos = () => {
    setSelectedIds(new Set());
  };

  // Exportar a CSV
  const exportarCSV = (docentes: Docente[]) => {
    const columnasVisibles = columnas.filter((c) => c.visible);
    const headers = columnasVisibles.map((c) => c.label).join(',');
    const rows = docentes.map((d) =>
      columnasVisibles.map((c) => {
        const valor = d[c.key];
        if (typeof valor === 'string' && valor.includes(',')) {
          return `"${valor}"`;
        }
        return valor;
      }).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `docentes_esap_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success(`Se exportaron ${docentes.length} docentes a CSV`);
  };

  const exportarSeleccionados = () => {
    const seleccionados = todosLosDocentes.filter((d) => selectedIds.has(d.id));
    exportarCSV(seleccionados);
  };

  const exportarFiltrados = () => {
    exportarCSV(docentesFiltrados);
  };

  // Atajos de teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + F para buscar
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('busqueda-docentes')?.focus();
      }
      // Escape para cerrar
      if (e.key === 'Escape') {
        if (quickViewDocente) {
          setQuickViewDocente(null);
        } else if (mostrarConfigColumnas) {
          setMostrarConfigColumnas(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, quickViewDocente, mostrarConfigColumnas]);

  // Badges de estilo
  const getVinculacionBadge = (tipo: Docente['tipoVinculacion']) => {
    const estilos = {
      Planta: 'bg-purple-100 text-purple-800 border-purple-300',
      Cátedra: 'bg-blue-100 text-blue-800 border-blue-300',
      Ocasional: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return estilos[tipo];
  };

  const getEstadoBadge = (estado: Docente['estado']) => {
    const estilos = {
      Activo: 'bg-green-100 text-green-800 border-green-300',
      Inactivo: 'bg-gray-100 text-gray-800 border-gray-300',
      Licencia: 'bg-amber-100 text-amber-800 border-amber-300',
    };
    return estilos[estado];
  };

  const getEvaluacionColor = (evaluacion: number) => {
    if (evaluacion >= 4.5) return 'text-green-600';
    if (evaluacion >= 4.0) return 'text-blue-600';
    if (evaluacion >= 3.5) return 'text-amber-600';
    return 'text-red-600';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#003DA5] to-[#1e5da8] text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl mb-1">👥 Gestión de Docentes</h2>
                <p className="text-sm text-blue-100">
                  Mostrando {docentesPaginados.length} de {docentesFiltrados.length} docentes
                  {docentesFiltrados.length !== todosLosDocentes.length && (
                    <span> (filtrados de {todosLosDocentes.length} totales)</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                  title="Cerrar (Esc)"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Vistas Guardadas */}
            <div className="flex flex-wrap gap-2 mb-4">
              {vistasGuardadas.map((vista) => (
                <button
                  key={vista.id}
                  onClick={() => aplicarVista(vista.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    vistaSeleccionada === vista.id
                      ? 'bg-white text-[#003DA5] shadow-md'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={vista.descripcion}
                >
                  {vista.icono}
                  <span>{vista.nombre}</span>
                </button>
              ))}
            </div>

            {/* Barra de búsqueda y acciones */}
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Búsqueda */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200" />
                <input
                  id="busqueda-docentes"
                  type="text"
                  placeholder="Buscar por nombre, cédula, email, facultad... (Ctrl+F)"
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:bg-white/20 focus:border-white/40"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2">
                <button
                  onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    mostrarFiltrosAvanzados
                      ? 'bg-white text-[#003DA5]'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filtros</span>
                </button>

                <button
                  onClick={() => setMostrarConfigColumnas(!mostrarConfigColumnas)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-all"
                >
                  <Columns className="w-4 h-4" />
                  <span className="hidden sm:inline">Columnas</span>
                </button>

                <button
                  onClick={exportarFiltrados}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </button>
              </div>
            </div>

            {/* Filtros Avanzados */}
            <AnimatePresence>
              {mostrarFiltrosAvanzados && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className="bg-white/10 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Tipo Vinculación */}
                      <div>
                        <label className="text-xs text-blue-100 mb-1 block">Vinculación</label>
                        <select
                          multiple
                          value={filtros.tipoVinculacion}
                          onChange={(e) =>
                            setFiltros({
                              ...filtros,
                              tipoVinculacion: Array.from(
                                e.target.selectedOptions,
                                (option) => option.value
                              ),
                            })
                          }
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                          size={3}
                        >
                          <option value="Planta">Planta</option>
                          <option value="Cátedra">Cátedra</option>
                          <option value="Ocasional">Ocasional</option>
                        </select>
                      </div>

                      {/* Estado */}
                      <div>
                        <label className="text-xs text-blue-100 mb-1 block">Estado</label>
                        <select
                          multiple
                          value={filtros.estado}
                          onChange={(e) =>
                            setFiltros({
                              ...filtros,
                              estado: Array.from(e.target.selectedOptions, (option) => option.value),
                            })
                          }
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                          size={3}
                        >
                          <option value="Activo">Activo</option>
                          <option value="Inactivo">Inactivo</option>
                          <option value="Licencia">Licencia</option>
                        </select>
                      </div>

                      {/* Evaluación */}
                      <div>
                        <label className="text-xs text-blue-100 mb-1 block">
                          Evaluación: {filtros.evaluacionMin.toFixed(1)} - {filtros.evaluacionMax.toFixed(1)}
                        </label>
                        <div className="space-y-2">
                          <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.1"
                            value={filtros.evaluacionMin}
                            onChange={(e) =>
                              setFiltros({ ...filtros, evaluacionMin: parseFloat(e.target.value) })
                            }
                            className="w-full"
                          />
                          <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.1"
                            value={filtros.evaluacionMax}
                            onChange={(e) =>
                              setFiltros({ ...filtros, evaluacionMax: parseFloat(e.target.value) })
                            }
                            className="w-full"
                          />
                        </div>
                      </div>

                      {/* Fecha Vinculación */}
                      <div>
                        <label className="text-xs text-blue-100 mb-1 block">Vinculado desde</label>
                        <input
                          type="date"
                          value={filtros.fechaVinculacionDesde}
                          onChange={(e) =>
                            setFiltros({ ...filtros, fechaVinculacionDesde: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={limpiarFiltros}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Limpiar
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Config Columnas */}
            <AnimatePresence>
              {mostrarConfigColumnas && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {columnas.map((col) => (
                        <label
                          key={col.key}
                          className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white/10 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={col.visible}
                            onChange={() => {
                              setColumnas(
                                columnas.map((c) =>
                                  c.key === col.key ? { ...c, visible: !c.visible } : c
                                )
                              );
                            }}
                            className="rounded"
                          />
                          <span>{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Acciones de selección múltiple */}
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-4 bg-white/10 rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{selectedIds.size} seleccionados</span>
                  <button
                    onClick={deseleccionarTodos}
                    className="text-xs hover:underline"
                  >
                    Deseleccionar todos
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={exportarSeleccionados}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#003DA5] rounded-lg text-sm font-medium hover:bg-blue-50"
                  >
                    <Download className="w-4 h-4" />
                    Exportar
                  </button>
                  <button
                    onClick={() => {
                      toast.info(`Enviando notificación a ${selectedIds.size} docentes`);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#003DA5] rounded-lg text-sm font-medium hover:bg-blue-50"
                  >
                    <Send className="w-4 h-4" />
                    Notificar
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex">
            {/* Lista principal */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tabla */}
              <div className="flex-1 overflow-auto">
                {docentesPaginados.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center py-12">
                      <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">
                        No se encontraron docentes con los filtros aplicados
                      </p>
                      <button
                        onClick={limpiarFiltros}
                        className="text-[#003DA5] hover:underline text-sm"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={
                              docentesPaginados.length > 0 &&
                              docentesPaginados.every((d) => selectedIds.has(d.id))
                            }
                            onChange={() => {
                              if (docentesPaginados.every((d) => selectedIds.has(d.id))) {
                                deseleccionarTodos();
                              } else {
                                seleccionarTodosPagina();
                              }
                            }}
                            className="rounded"
                          />
                        </th>
                        {columnas
                          .filter((c) => c.visible)
                          .map((col) => (
                            <th
                              key={col.key}
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              style={{ width: col.width }}
                            >
                              {col.label}
                            </th>
                          ))}
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {docentesPaginados.map((docente, idx) => (
                        <motion.tr
                          key={docente.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.01 }}
                          className="hover:bg-blue-50 transition-colors cursor-pointer"
                          onClick={() => setQuickViewDocente(docente)}
                        >
                          <td
                            className="px-4 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.has(docente.id)}
                              onChange={() => toggleSeleccion(docente.id)}
                              className="rounded"
                            />
                          </td>
                          {columnas.filter((c) => c.visible).map((col) => (
                            <td key={col.key} className="px-4 py-3 text-sm">
                              {col.key === 'nombre' && (
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs flex-shrink-0">
                                    {docente.nombre.charAt(0)}
                                  </div>
                                  <div className="font-medium text-gray-900">
                                    {docente[col.key]}
                                  </div>
                                </div>
                              )}
                              {col.key === 'tipoVinculacion' && (
                                <Badge className={getVinculacionBadge(docente.tipoVinculacion)}>
                                  {docente.tipoVinculacion}
                                </Badge>
                              )}
                              {col.key === 'estado' && (
                                <Badge className={getEstadoBadge(docente.estado)}>
                                  {docente.estado}
                                </Badge>
                              )}
                              {col.key === 'evaluacionPromedio' && (
                                <div className="flex items-center gap-1">
                                  <Star
                                    className={`w-4 h-4 ${getEvaluacionColor(docente.evaluacionPromedio)}`}
                                  />
                                  <span
                                    className={`font-medium ${getEvaluacionColor(docente.evaluacionPromedio)}`}
                                  >
                                    {docente.evaluacionPromedio.toFixed(1)}
                                  </span>
                                </div>
                              )}
                              {col.key === 'ptasAprobados' && (
                                <span className="text-gray-700">{docente.ptasAprobados}</span>
                              )}
                              {!['nombre', 'tipoVinculacion', 'estado', 'evaluacionPromedio', 'ptasAprobados'].includes(col.key) && (
                                <span className="text-gray-700">{String(docente[col.key])}</span>
                              )}
                            </td>
                          ))}
                          <td
                            className="px-4 py-3 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setQuickViewDocente(docente)}
                                className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Vista rápida"
                              >
                                <Eye className="w-4 h-4 text-blue-600" />
                              </button>
                              <button
                                onClick={() => {
                                  toast.info(`Editando ${docente.nombre}`);
                                }}
                                className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4 text-blue-600" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Paginación */}
              {docentesFiltrados.length > 0 && (
                <div className="border-t bg-white p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Selector items por página */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Mostrar:</span>
                      <select
                        value={itemsPorPagina}
                        onChange={(e) => setItemsPorPagina(Number(e.target.value))}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="text-gray-600">por página</span>
                    </div>

                    {/* Info paginación */}
                    <div className="text-sm text-gray-600">
                      Mostrando {(paginaActual - 1) * itemsPorPagina + 1} -{' '}
                      {Math.min(paginaActual * itemsPorPagina, docentesFiltrados.length)} de{' '}
                      {docentesFiltrados.length}
                    </div>

                    {/* Controles paginación */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPaginaActual(1)}
                        disabled={paginaActual === 1}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Primera página"
                      >
                        <ChevronsLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setPaginaActual(paginaActual - 1)}
                        disabled={paginaActual === 1}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Página anterior"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <div className="flex items-center gap-2 px-3">
                        <input
                          type="number"
                          min={1}
                          max={totalPaginas}
                          value={paginaActual}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val >= 1 && val <= totalPaginas) {
                              setPaginaActual(val);
                            }
                          }}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-gray-600">de {totalPaginas}</span>
                      </div>

                      <button
                        onClick={() => setPaginaActual(paginaActual + 1)}
                        disabled={paginaActual === totalPaginas}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Página siguiente"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setPaginaActual(totalPaginas)}
                        disabled={paginaActual === totalPaginas}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Última página"
                      >
                        <ChevronsRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick View Panel */}
            <AnimatePresence>
              {quickViewDocente && (
                <motion.div
                  initial={{ x: 400, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 400, opacity: 0 }}
                  className="w-96 border-l bg-gray-50 overflow-y-auto flex-shrink-0"
                >
                  <div className="p-6 space-y-4">
                    {/* Header Quick View */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl">
                          {quickViewDocente.nombre.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{quickViewDocente.nombre}</h3>
                          <p className="text-sm text-gray-600">{quickViewDocente.cedula}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setQuickViewDocente(null)}
                        className="p-1.5 hover:bg-gray-200 rounded-lg"
                      >
                        <XIcon className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Badges */}
                    <div className="flex gap-2">
                      <Badge className={getVinculacionBadge(quickViewDocente.tipoVinculacion)}>
                        {quickViewDocente.tipoVinculacion}
                      </Badge>
                      <Badge className={getEstadoBadge(quickViewDocente.estado)}>
                        {quickViewDocente.estado}
                      </Badge>
                    </div>

                    {/* Información detallada */}
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <Mail className="w-4 h-4" />
                          <span className="font-medium">Email</span>
                        </div>
                        <p className="text-sm pl-6">{quickViewDocente.email}</p>
                      </div>

                      <div className="bg-white rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <Phone className="w-4 h-4" />
                          <span className="font-medium">Teléfono</span>
                        </div>
                        <p className="text-sm pl-6">{quickViewDocente.telefono}</p>
                      </div>

                      <div className="bg-white rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <GraduationCap className="w-4 h-4" />
                          <span className="font-medium">Titulación</span>
                        </div>
                        <p className="text-sm pl-6">{quickViewDocente.titulacion}</p>
                      </div>

                      <div className="bg-white rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <BookOpen className="w-4 h-4" />
                          <span className="font-medium">Facultad / Programa</span>
                        </div>
                        <p className="text-sm pl-6">
                          {quickViewDocente.facultad}
                          <br />
                          {quickViewDocente.programa}
                        </p>
                      </div>

                      <div className="bg-white rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">Vinculación</span>
                        </div>
                        <p className="text-sm pl-6">
                          {new Date(quickViewDocente.fechaVinculacion).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 text-center">
                          <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                          <p className="text-xs text-gray-600">Horas Base</p>
                          <p className="font-bold text-lg">{quickViewDocente.horasBase}</p>
                        </div>

                        <div className="bg-white rounded-lg p-3 text-center">
                          <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                          <p className="text-xs text-gray-600">PTAs</p>
                          <p className="font-bold text-lg">{quickViewDocente.ptasAprobados}</p>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600 font-medium">Evaluación</span>
                          <div className="flex items-center gap-1">
                            <Star
                              className={`w-5 h-5 ${getEvaluacionColor(quickViewDocente.evaluacionPromedio)}`}
                            />
                            <span
                              className={`font-bold text-lg ${getEvaluacionColor(quickViewDocente.evaluacionPromedio)}`}
                            >
                              {quickViewDocente.evaluacionPromedio.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <BookOpen className="w-4 h-4" />
                          <span className="font-medium">Materias</span>
                        </div>
                        <div className="flex flex-wrap gap-2 pl-6">
                          {quickViewDocente.materias.map((materia, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg"
                            >
                              {materia}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="space-y-2 pt-4">
                      <Button
                        onClick={() => {
                          toast.info(`Ver PTAs de ${quickViewDocente.nombre}`);
                        }}
                        className="w-full bg-[#003DA5] hover:bg-[#002d7a] text-white"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Ver PTAs
                      </Button>
                      <Button
                        onClick={() => {
                          toast.info(`Editar perfil de ${quickViewDocente.nombre}`);
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar Perfil
                      </Button>
                      <Button
                        onClick={() => {
                          toast.info(`Ver evaluaciones de ${quickViewDocente.nombre}`);
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Ver Evaluaciones
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Exportar Users desde lucide-react para el icono en vistas guardadas
function Users({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

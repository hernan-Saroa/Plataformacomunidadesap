import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  BookOpen,
  Plus,
  Filter,
  Download,
  Search,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  Users,
  Building2,
  Grid3x3,
  List,
  Eye
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner@2.0.3';

// Importar modales (los crearemos después)
import { AsignaturaFormModal } from './AsignaturaFormModal';
import { CalendarioAcademicoModal } from './CalendarioAcademicoModal';

// Mock data temporal
const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const horariosDisponibles = [
  '06:00 - 08:00',
  '08:00 - 10:00',
  '10:00 - 12:00',
  '12:00 - 14:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
  '18:00 - 20:00',
  '20:00 - 22:00'
];

interface AsignaturaProgramada {
  id: string;
  codigo: string;
  nombre: string;
  grupo: string;
  docente_id: string;
  docente_nombre: string;
  territorial: string;
  programa: string;
  nivel: 'Pregrado' | 'Especialización' | 'Maestría' | 'Doctorado';
  creditos: number;
  estudiantes_inscritos: number;
  capacidad_maxima: number;
  modalidad: 'Presencial' | 'Virtual' | 'Híbrida';
  
  // Horarios
  horarios: {
    dia: string;
    hora_inicio: string;
    hora_fin: string;
    aula?: string;
    edificio?: string;
  }[];
  
  periodo: string;
  estado: 'programada' | 'en_curso' | 'finalizada' | 'cancelada';
  tiene_conflictos: boolean;
  conflictos?: string[];
}

const asignaturasMock: AsignaturaProgramada[] = [
  {
    id: 'asig-001',
    codigo: 'ADM-101',
    nombre: 'Administración Pública I',
    grupo: 'A',
    docente_id: 'doc-001',
    docente_nombre: 'Juan Carlos Pérez',
    territorial: 'Bogotá',
    programa: 'Administración Pública',
    nivel: 'Pregrado',
    creditos: 3,
    estudiantes_inscritos: 35,
    capacidad_maxima: 40,
    modalidad: 'Presencial',
    horarios: [
      { dia: 'Lunes', hora_inicio: '08:00', hora_fin: '10:00', aula: '201', edificio: 'A' },
      { dia: 'Miércoles', hora_inicio: '08:00', hora_fin: '10:00', aula: '201', edificio: 'A' }
    ],
    periodo: '2025-I',
    estado: 'programada',
    tiene_conflictos: false
  },
  {
    id: 'asig-002',
    codigo: 'DER-201',
    nombre: 'Derecho Administrativo',
    grupo: 'B',
    docente_id: 'doc-002',
    docente_nombre: 'María Fernanda López',
    territorial: 'Bogotá',
    programa: 'Derecho',
    nivel: 'Pregrado',
    creditos: 4,
    estudiantes_inscritos: 42,
    capacidad_maxima: 40,
    modalidad: 'Presencial',
    horarios: [
      { dia: 'Martes', hora_inicio: '10:00', hora_fin: '12:00', aula: '305', edificio: 'B' },
      { dia: 'Jueves', hora_inicio: '10:00', hora_fin: '12:00', aula: '305', edificio: 'B' }
    ],
    periodo: '2025-I',
    estado: 'programada',
    tiene_conflictos: true,
    conflictos: ['Aula sobrecargada: 42/40 estudiantes', 'Docente con otra asignatura en horario similar']
  },
  {
    id: 'asig-003',
    codigo: 'POL-301',
    nombre: 'Políticas Públicas',
    grupo: 'A',
    docente_id: 'doc-003',
    docente_nombre: 'Carlos Alberto Gómez',
    territorial: 'Bogotá',
    programa: 'Ciencia Política',
    nivel: 'Maestría',
    creditos: 3,
    estudiantes_inscritos: 18,
    capacidad_maxima: 25,
    modalidad: 'Híbrida',
    horarios: [
      { dia: 'Viernes', hora_inicio: '18:00', hora_fin: '20:00', aula: 'Virtual', edificio: 'N/A' },
      { dia: 'Sábado', hora_inicio: '08:00', hora_fin: '12:00', aula: 'Auditorio', edificio: 'C' }
    ],
    periodo: '2025-I',
    estado: 'programada',
    tiene_conflictos: false
  },
  {
    id: 'asig-004',
    codigo: 'GES-102',
    nombre: 'Gestión Pública',
    grupo: 'C',
    docente_id: 'doc-001',
    docente_nombre: 'Juan Carlos Pérez',
    territorial: 'Bogotá',
    programa: 'Administración Pública',
    nivel: 'Pregrado',
    creditos: 3,
    estudiantes_inscritos: 28,
    capacidad_maxima: 35,
    modalidad: 'Presencial',
    horarios: [
      { dia: 'Martes', hora_inicio: '14:00', hora_fin: '16:00', aula: '102', edificio: 'A' },
      { dia: 'Jueves', hora_inicio: '14:00', hora_fin: '16:00', aula: '102', edificio: 'A' }
    ],
    periodo: '2025-I',
    estado: 'programada',
    tiene_conflictos: false
  },
  {
    id: 'asig-005',
    codigo: 'ECO-201',
    nombre: 'Economía Pública',
    grupo: 'A',
    docente_id: 'doc-004',
    docente_nombre: 'Ana Patricia Rodríguez',
    territorial: 'Medellín',
    programa: 'Economía',
    nivel: 'Pregrado',
    creditos: 4,
    estudiantes_inscritos: 30,
    capacidad_maxima: 35,
    modalidad: 'Virtual',
    horarios: [
      { dia: 'Lunes', hora_inicio: '18:00', hora_fin: '20:00', aula: 'Virtual', edificio: 'N/A' },
      { dia: 'Miércoles', hora_inicio: '18:00', hora_fin: '20:00', aula: 'Virtual', edificio: 'N/A' }
    ],
    periodo: '2025-I',
    estado: 'programada',
    tiene_conflictos: false
  }
];

interface PlanificacionListProps {
  className?: string;
}

export function PlanificacionList({ className = '' }: PlanificacionListProps) {
  const [vistaActual, setVistaActual] = useState<'lista' | 'cuadricula' | 'horario'>('lista');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroModalidad, setFiltroModalidad] = useState<string>('todas');
  const [filtroNivel, setFiltroNivel] = useState<string>('todos');
  const [filtroTerritorial, setFiltroTerritorial] = useState<string>('todos');
  const [soloConflictos, setSoloConflictos] = useState(false);

  // Estado para modales
  const [isAsignaturaModalOpen, setIsAsignaturaModalOpen] = useState(false);
  const [isCalendarioModalOpen, setIsCalendarioModalOpen] = useState(false);
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState<AsignaturaProgramada | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);

  // Estado local de asignaturas
  const [asignaturas, setAsignaturas] = useState(asignaturasMock);

  // Filtrar asignaturas
  const asignaturasFiltradas = asignaturas.filter(asig => {
    const matchSearch = 
      asig.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asig.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asig.docente_nombre.toLowerCase().includes(searchQuery.toLowerCase());

    const matchModalidad = filtroModalidad === 'todas' || asig.modalidad === filtroModalidad;
    const matchNivel = filtroNivel === 'todos' || asig.nivel === filtroNivel;
    const matchTerritorial = filtroTerritorial === 'todos' || asig.territorial === filtroTerritorial;
    const matchConflictos = !soloConflictos || asig.tiene_conflictos;

    return matchSearch && matchModalidad && matchNivel && matchTerritorial && matchConflictos;
  });

  // Calcular estadísticas
  const stats = {
    total: asignaturas.length,
    programadas: asignaturas.filter(a => a.estado === 'programada').length,
    en_curso: asignaturas.filter(a => a.estado === 'en_curso').length,
    conflictos: asignaturas.filter(a => a.tiene_conflictos).length,
    estudiantes_total: asignaturas.reduce((sum, a) => sum + a.estudiantes_inscritos, 0),
    ocupacion_promedio: Math.round(
      (asignaturas.reduce((sum, a) => sum + (a.estudiantes_inscritos / a.capacidad_maxima * 100), 0) / asignaturas.length)
    )
  };

  // Handlers
  const handleNuevaAsignatura = () => {
    setAsignaturaSeleccionada(null);
    setModoEdicion(false);
    setIsAsignaturaModalOpen(true);
  };

  const handleEditarAsignatura = (asignatura: AsignaturaProgramada) => {
    setAsignaturaSeleccionada(asignatura);
    setModoEdicion(true);
    setIsAsignaturaModalOpen(true);
  };

  const handleEliminarAsignatura = (asignatura: AsignaturaProgramada) => {
    if (confirm(`¿Estás seguro de eliminar la asignatura ${asignatura.nombre}?`)) {
      setAsignaturas(prev => prev.filter(a => a.id !== asignatura.id));
      toast.success('Asignatura eliminada exitosamente');
    }
  };

  const handleSuccessForm = (data: AsignaturaProgramada) => {
    if (modoEdicion) {
      setAsignaturas(prev => prev.map(a => a.id === data.id ? data : a));
    } else {
      setAsignaturas(prev => [data, ...prev]);
    }
  };

  const handleVerCalendario = () => {
    setIsCalendarioModalOpen(true);
  };

  const handleExportar = () => {
    toast.info('Generando reporte de planificación...');
  };

  const getEstadoBadge = (estado: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      'programada': { label: 'Programada', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      'en_curso': { label: 'En Curso', className: 'bg-green-100 text-green-700 border-green-200' },
      'finalizada': { label: 'Finalizada', className: 'bg-gray-100 text-gray-700 border-gray-200' },
      'cancelada': { label: 'Cancelada', className: 'bg-red-100 text-red-700 border-red-200' }
    };
    return configs[estado] || configs['programada'];
  };

  const getModalidadIcon = (modalidad: string) => {
    switch (modalidad) {
      case 'Virtual': return '💻';
      case 'Presencial': return '🏫';
      case 'Híbrida': return '🔀';
      default: return '📚';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Planificación Académica
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {asignaturasFiltradas.length} asignaturas programadas - Periodo 2025-I
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleVerCalendario}>
            <Calendar className="w-4 h-4 mr-2" />
            Calendario
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportar}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button size="sm" className="bg-[#1e5da8] hover:bg-[#1a4d8f]" onClick={handleNuevaAsignatura}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Asignatura
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#1e5da8]" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Programadas</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.programadas}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">En Curso</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.en_curso}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Conflictos</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.conflictos}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Estudiantes</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.estudiantes_total}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Ocupación</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.ocupacion_promedio}%</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Grid3x3 className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros y Búsqueda */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Búsqueda */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por asignatura, código o docente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filtro Modalidad */}
          <select
            value={filtroModalidad}
            onChange={(e) => setFiltroModalidad(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="todas">Todas las modalidades</option>
            <option value="Presencial">Presencial</option>
            <option value="Virtual">Virtual</option>
            <option value="Híbrida">Híbrida</option>
          </select>

          {/* Filtro Nivel */}
          <select
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="todos">Todos los niveles</option>
            <option value="Pregrado">Pregrado</option>
            <option value="Especialización">Especialización</option>
            <option value="Maestría">Maestría</option>
            <option value="Doctorado">Doctorado</option>
          </select>

          {/* Filtro Territorial */}
          <select
            value={filtroTerritorial}
            onChange={(e) => setFiltroTerritorial(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="todos">Todas las territoriales</option>
            <option value="Bogotá">Bogotá</option>
            <option value="Medellín">Medellín</option>
            <option value="Cali">Cali</option>
            <option value="Barranquilla">Barranquilla</option>
          </select>
        </div>

        <div className="flex items-center justify-between mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={soloConflictos}
              onChange={(e) => setSoloConflictos(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#1e5da8] focus:ring-[#1e5da8]"
            />
            <span className="text-sm text-gray-700">Solo mostrar asignaturas con conflictos</span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Vista:</span>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setVistaActual('lista')}
                className={`p-2 ${vistaActual === 'lista' ? 'bg-[#1e5da8] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setVistaActual('cuadricula')}
                className={`p-2 border-l border-gray-300 ${vistaActual === 'cuadricula' ? 'bg-[#1e5da8] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setVistaActual('horario')}
                className={`p-2 border-l border-gray-300 ${vistaActual === 'horario' ? 'bg-[#1e5da8] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Contenido según vista */}
      <AnimatePresence mode="wait">
        {vistaActual === 'lista' && (
          <motion.div
            key="lista"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {asignaturasFiltradas.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron asignaturas</h3>
                <p className="text-gray-600">Intenta ajustar los filtros o la búsqueda</p>
              </Card>
            ) : (
              asignaturasFiltradas.map((asignatura, index) => {
                const estadoBadge = getEstadoBadge(asignatura.estado);
                const ocupacion = Math.round((asignatura.estudiantes_inscritos / asignatura.capacidad_maxima) * 100);

                return (
                  <motion.div
                    key={asignatura.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-6 hover:shadow-lg transition-shadow">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        {/* Info Principal */}
                        <div className="flex-1 space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">{getModalidadIcon(asignatura.modalidad)}</span>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-lg font-bold text-gray-900">{asignatura.nombre}</h3>
                                    <Badge className={estadoBadge.className}>
                                      {estadoBadge.label}
                                    </Badge>
                                    {asignatura.tiene_conflictos && (
                                      <Badge className="bg-red-100 text-red-700 border-red-200 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        <span className="hidden sm:inline">Conflicto</span>
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs md:text-sm text-gray-600">
                                    {asignatura.codigo} - Grupo {asignatura.grupo} - {asignatura.creditos} créditos
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs md:text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                  <User className="w-4 h-4 flex-shrink-0" />
                                  <span className="truncate">{asignatura.docente_nombre}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Building2 className="w-4 h-4 flex-shrink-0" />
                                  <span className="truncate">{asignatura.territorial}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                  <BookOpen className="w-4 h-4 flex-shrink-0" />
                                  <span className="truncate">{asignatura.programa} - {asignatura.nivel}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Users className="w-4 h-4 flex-shrink-0" />
                                  <span className="truncate">{asignatura.estudiantes_inscritos}/{asignatura.capacidad_maxima} ({ocupacion}%)</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Horarios */}
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-700 mb-2">Horarios:</p>
                            <div className="space-y-2">
                              {asignatura.horarios.map((horario, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs md:text-sm text-gray-700">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-gray-500 flex-shrink-0" />
                                    <span className="font-medium">{horario.dia}</span>
                                    <span className="whitespace-nowrap">{horario.hora_inicio} - {horario.hora_fin}</span>
                                  </div>
                                  {horario.aula !== 'Virtual' && (
                                    <div className="flex items-center gap-2 ml-5 sm:ml-0">
                                      <MapPin className="w-3 h-3 text-gray-500 flex-shrink-0" />
                                      <span className="truncate">Aula {horario.aula} - Edificio {horario.edificio}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Conflictos */}
                          {asignatura.tiene_conflictos && asignatura.conflictos && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <p className="text-xs font-medium text-red-900 mb-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Conflictos detectados:
                              </p>
                              <ul className="space-y-1">
                                {asignatura.conflictos.map((conflicto, idx) => (
                                  <li key={idx} className="text-xs text-red-700">• {conflicto}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Acciones */}
                        <div className="lg:w-40 space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleEditarAsignatura(asignatura)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-red-600 hover:bg-red-50"
                            onClick={() => handleEliminarAsignatura(asignatura)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}

        {vistaActual === 'cuadricula' && (
          <motion.div
            key="cuadricula"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {asignaturasFiltradas.map((asignatura, index) => {
              const estadoBadge = getEstadoBadge(asignatura.estado);
              const ocupacion = Math.round((asignatura.estudiantes_inscritos / asignatura.capacidad_maxima) * 100);

              return (
                <motion.div
                  key={asignatura.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-5 hover:shadow-lg transition-shadow h-full flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl">{getModalidadIcon(asignatura.modalidad)}</span>
                      <Badge className={estadoBadge.className}>
                        {estadoBadge.label}
                      </Badge>
                    </div>

                    <h3 className="font-bold text-gray-900 mb-1">{asignatura.nombre}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {asignatura.codigo} - Grupo {asignatura.grupo}
                    </p>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="truncate">{asignatura.docente_nombre}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{asignatura.estudiantes_inscritos}/{asignatura.capacidad_maxima} ({ocupacion}%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{asignatura.horarios.length} sesiones/semana</span>
                      </div>
                    </div>

                    {asignatura.tiene_conflictos && (
                      <div className="mb-4">
                        <Badge className="bg-red-100 text-red-700 border-red-200 flex items-center gap-1 w-full justify-center">
                          <AlertTriangle className="w-3 h-3" />
                          Tiene conflictos
                        </Badge>
                      </div>
                    )}

                    <div className="mt-auto space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleEditarAsignatura(asignatura)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {vistaActual === 'horario' && (
          <motion.div
            key="horario"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-6">
              <h3 className="font-bold text-gray-900 mb-4">Vista de Horario Semanal</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 bg-gray-50 p-2 text-sm font-medium text-gray-700 w-32">
                        Hora
                      </th>
                      {diasSemana.map(dia => (
                        <th key={dia} className="border border-gray-300 bg-gray-50 p-2 text-sm font-medium text-gray-700">
                          {dia}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {horariosDisponibles.map(horario => (
                      <tr key={horario}>
                        <td className="border border-gray-300 bg-gray-50 p-2 text-xs text-gray-600 font-medium">
                          {horario}
                        </td>
                        {diasSemana.map(dia => {
                          const asignaturasEnHorario = asignaturasFiltradas.filter(asig =>
                            asig.horarios.some(h => h.dia === dia && `${h.hora_inicio} - ${h.hora_fin}` === horario)
                          );

                          return (
                            <td key={`${dia}-${horario}`} className="border border-gray-300 p-1 align-top">
                              {asignaturasEnHorario.map(asig => (
                                <div
                                  key={asig.id}
                                  className={`
                                    text-xs p-2 rounded mb-1 cursor-pointer hover:opacity-80 transition-opacity
                                    ${asig.tiene_conflictos ? 'bg-red-100 border border-red-300' : 'bg-blue-100 border border-blue-300'}
                                  `}
                                  onClick={() => handleEditarAsignatura(asig)}
                                >
                                  <p className="font-medium text-gray-900 truncate">{asig.nombre}</p>
                                  <p className="text-gray-600 truncate">{asig.docente_nombre}</p>
                                  {asig.horarios.find(h => h.dia === dia && `${h.hora_inicio} - ${h.hora_fin}` === horario)?.aula && (
                                    <p className="text-gray-600">
                                      Aula {asig.horarios.find(h => h.dia === dia)?.aula}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modales */}
      <AsignaturaFormModal
        isOpen={isAsignaturaModalOpen}
        onClose={() => setIsAsignaturaModalOpen(false)}
        onSuccess={handleSuccessForm}
        asignatura={asignaturaSeleccionada}
        modo={modoEdicion ? 'editar' : 'crear'}
      />

      <CalendarioAcademicoModal
        isOpen={isCalendarioModalOpen}
        onClose={() => setIsCalendarioModalOpen(false)}
      />
    </div>
  );
}
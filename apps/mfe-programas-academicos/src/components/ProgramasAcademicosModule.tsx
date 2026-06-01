import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Clock,
  Users,
  BookOpen,
  Building2,
  MapPin,
  Award,
  Calendar,
  FileText,
  X,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Loader2,
  BarChart3,
  Layers
} from 'lucide-react';
import { Card, Badge, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, Container4K, ResponsiveHeader, ConfirmationDialog } from '@esap-mfe/shared-ui';
import { toast } from 'sonner';
import { Toaster } from '@esap-mfe/shared-ui/sonner';
import { PaginationPremium } from './shared/PaginationPremium';
import { CreateProgramaModal } from './CreateProgramaModal';
import { PlanesEstudioDashboard } from './PlanesEstudioDashboard';
import { OfertaAsignaturasModule } from './OfertaAsignaturasModule';
import { AsignaturasPlanEstudios } from './AsignaturasPlanEstudios';
import { ImportarAsignaturas } from './ImportarAsignaturas';
import { GestionPeriodos } from './GestionPeriodos';
import { useAuth } from '../hooks';
import { programasService, apiClient, type ProgramaAcademicoDTO } from '../../services/api';

// ✅ DÍA 4: Container4K para padding adaptativo
// ✅ DÍA 5: ResponsiveHeader para headers adaptativos

// Usar la interfaz del servicio actualizado
type ProgramaAcademico = ProgramaAcademicoDTO;



export function ProgramasAcademicosModule() {
  const [programas, setProgramas] = useState<ProgramaAcademico[]>([]);
  const [pagination, setPagination] = useState<{
    total: number;
    pagina: number;
    porPagina: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [nivelFilter, setNivelFilter] = useState<string>('all');
  const [modalidadFilter, setModalidadFilter] = useState<string>('all');
  const [sedeFilter, setSedeFilter] = useState<string>('all');
  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const [expandedProgramaId, setExpandedProgramaId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [programaToEdit, setProgramaToEdit] = useState<ProgramaAcademico | null>(null);
  const [programaToDelete, setProgramaToDelete] = useState<ProgramaAcademico | null>(null);
  const [activeView, setActiveView] = useState<'lista' | 'dashboard' | 'oferta-asignaturas' | 'importar-asignaturas' | 'periodos-academicos'>('lista');
  const [selectedPeriodoForImport, setSelectedPeriodoForImport] = useState<string | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const itemsPerPage = 10;
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const canImport = hasRole('GESTION_PROFESORAL') || isSuperAdmin;

  // Cargar datos del backend
  useEffect(() => {
    const loadProgramas = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get('/auth/api/v1/programas-academicos', {
          params: {
            search: searchQuery || undefined,
            nivelFormacion: nivelFilter !== 'all' ? nivelFilter : undefined,
            modalidad: modalidadFilter !== 'all' ? modalidadFilter : undefined,
            sede: sedeFilter !== 'all' ? sedeFilter : undefined,
            estado: estadoFilter !== 'all' ? estadoFilter : undefined,
            page: currentPage,
            limit: itemsPerPage,
          },
          requiresAuth: false,
        });
        const programasData = response.data || [];
        setProgramas(programasData);
        setPagination({
          total: response.total || 0,
          pagina: response.pagina || 1,
          porPagina: response.porPagina || itemsPerPage,
        });


      } catch (err) {
        console.error('Error loading programas:', err);
        setError('Error al cargar los programas académicos');
        toast.error('Error al cargar los programas');
      } finally {
        setLoading(false);
      }
    };

    loadProgramas();
  }, [searchQuery, nivelFilter, modalidadFilter, sedeFilter, estadoFilter, currentPage, refreshTrigger]);



  // Calculate totalPages from pagination data
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.porPagina) : 1;

  // Stats
  const stats = {
    totalProgramas: pagination?.total || 0,
    programasConPlan: programas.filter(p => (p.totalAsignaturas || 0) > 0).length,
    totalAsignaturas: programas.reduce((sum, p) => sum + (p.totalAsignaturas || 0), 0),
    totalCreditos: programas.reduce((sum, p) => sum + (p.creditosPlan || 0), 0),
    totalEstudiantes: programas.reduce((sum, p) => sum + (p.estudiantesActivos || 0), 0),
    totalGraduados: programas.reduce((sum, p) => sum + (p.graduados || 0), 0),
  };

  // Filtros únicos
  const niveles = Array.from(new Set(programas.map(p => p.nivelFormacion).filter(Boolean)));
  const modalidades = Array.from(new Set(programas.map(p => p.modalidad).filter(Boolean)));
  const sedes = Array.from(new Set(programas.map(p => p.sede).filter(Boolean)));

  // Los datos ya vienen filtrados y paginados del backend
  const filteredProgramas = programas;
  const paginatedProgramas = programas; // Ya paginados por el backend

  const getEstadoBadge = (estado: string) => {
    const estadoConfig: Record<string, { className: string; icon: any }> = {
      'ACTIVO': { className: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle },
      'INACTIVO': { className: 'bg-gray-100 text-gray-700 border-gray-300', icon: AlertCircle },
    };

    const config = estadoConfig[estado] || { className: 'bg-gray-100 text-gray-700 border-gray-300', icon: AlertCircle };
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} hover:${config.className} border`}>
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3" />
          {estado}
        </div>
      </Badge>
    );
  };

  const getNivelBadge = (nivel: NivelFormacion) => {
    const nivelColors: Record<NivelFormacion, string> = {
      'Pregrado': 'bg-blue-100 text-blue-700',
      'Especialización': 'bg-orange-100 text-orange-700',
      'Maestría': 'bg-pink-100 text-pink-700',
      'Doctorado': 'bg-red-100 text-red-700'
    };
    return <Badge className={nivelColors[nivel]}>{nivel}</Badge>;
  };

  const handleEdit = (programa: ProgramaAcademico) => {
    setProgramaToEdit(programa);
    setShowCreateModal(true);
  };

  const handleDelete = (programa: ProgramaAcademico) => {
    setProgramaToDelete(programa);
  };

  const confirmDelete = async () => {
    if (programaToDelete) {
      try {
        await apiClient.delete(`/auth/api/v1/programas-academicos/${programaToDelete.id}`);
        toast.success('Programa Eliminado', { description: `Se eliminó: ${programaToDelete.nombre}` });
        // Recargar datos
        setRefreshTrigger(prev => prev + 1);
      } catch (error) {
        console.error('Error deleting programa:', error);
        toast.error('Error al eliminar el programa');
      } finally {
        setProgramaToDelete(null);
      }
    }
  };

  const handleView = (programa: ProgramaAcademico) => {
    toast.info('Ver Programa', { description: `Viendo: ${programa.nombre}` });
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setNivelFilter('all');
    setModalidadFilter('all');
    setSedeFilter('all');
    setEstadoFilter('all');
  };

  const hasActiveFilters = searchQuery || nivelFilter !== 'all' || modalidadFilter !== 'all' || sedeFilter !== 'all' || estadoFilter !== 'all';

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setProgramaToEdit(null);
  };

  if (loading) {
    return (
      <Container4K className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#003DA5]" />
          <p className="text-gray-600">Cargando programas académicos...</p>
        </div>
      </Container4K>
    );
  }

  if (error) {
    return (
      <Container4K className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar datos</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="px-4 py-2 bg-[#003DA5] text-white rounded-lg hover:bg-[#002d7a] transition-colors"
          >
            Reintentar
          </button>
        </div>
      </Container4K>
    );
  }

  return (
    <>
    <Toaster position="bottom-right" richColors />
    <Container4K className="space-y-6">
      {/* Header - DÍA 5: ResponsiveHeader */}
      <ResponsiveHeader
        title="Programas Académicos"
        description="Gestiona los programas académicos de todas las sedes ESAP"
        icon={GraduationCap}
        primaryAction={{
          label: "Crear Programa",
          icon: Plus,
          onClick: () => setShowCreateModal(true),
          variant: "primary"
        }}
      />

      {/* Stats Summary */}
      {stats.totalAsignaturas > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 hide-scrollbar"
        >
          {[
            { label: 'Programas', value: stats.totalProgramas, sub: `${stats.programasConPlan} con plan`, color: 'text-[#003DA5]', bg: 'bg-blue-50 border-blue-200', icon: GraduationCap },
            { label: 'Con Plan de Estudios', value: stats.programasConPlan, sub: `de ${stats.totalProgramas}`, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: BookOpen },
            { label: 'Asignaturas Totales', value: stats.totalAsignaturas, sub: `${stats.totalCreditos} creditos`, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', icon: Layers },
            { label: 'Estudiantes', value: stats.totalEstudiantes, sub: `${stats.totalGraduados} graduados`, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: Users },
          ].map((stat) => (
            <Card key={stat.label} className={`${stat.bg} border p-3 min-w-[200px] lg:min-w-0 flex-shrink-0`}>
              <div className="flex items-center gap-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">{stat.label}</span>
              </div>
              <p className={`text-2xl font-black ${stat.color} mt-1`}>{stat.value.toLocaleString()}</p>
              <p className="text-[11px] text-gray-500">{stat.sub}</p>
            </Card>
          ))}
        </motion.div>
      )}

      {/* View Toggle: Lista vs Dashboard vs Oferta Asignaturas vs Importar Catálogo */}
      {(stats.totalProgramas > 0 || canImport) && (
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-full md:w-fit overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveView('lista')}
            className={`flex items-center flex-shrink-0 whitespace-nowrap gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeView === 'lista' ? 'bg-white text-[#003DA5] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Lista de Programas
          </button>
          {stats.programasConPlan > 0 && (
            <button
              onClick={() => setActiveView('dashboard')}
              className={`flex items-center flex-shrink-0 whitespace-nowrap gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeView === 'dashboard' ? 'bg-white text-[#003DA5] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Dashboard Planes de Estudio
            </button>
          )}
          {stats.totalProgramas > 0 && (
            <button
              onClick={() => setActiveView('oferta-asignaturas')}
              className={`flex items-center flex-shrink-0 whitespace-nowrap gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeView === 'oferta-asignaturas' ? 'bg-white text-[#003DA5] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Oferta de Asignaturas
            </button>
          )}
          {canImport && (
            <>
              <button
                onClick={() => setActiveView('importar-asignaturas')}
                className={`flex items-center flex-shrink-0 whitespace-nowrap gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeView === 'importar-asignaturas' ? 'bg-white text-[#003DA5] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Importar Catálogo (Excel)
              </button>
              <button
                onClick={() => setActiveView('periodos-academicos')}
                className={`flex items-center flex-shrink-0 whitespace-nowrap gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeView === 'periodos-academicos' ? 'bg-white text-[#003DA5] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Periodos Académicos
              </button>
            </>
          )}
        </div>
      )}

      {/* Dashboard View */}
      {activeView === 'dashboard' ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PlanesEstudioDashboard />
        </motion.div>
      ) : activeView === 'oferta-asignaturas' ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <OfertaAsignaturasModule onBack={() => setActiveView('lista')} />
        </motion.div>
      ) : activeView === 'importar-asignaturas' ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ImportarAsignaturas
            onBack={() => {
              setActiveView('lista');
              setSelectedPeriodoForImport(undefined);
            }}
            initialPeriodo={selectedPeriodoForImport}
          />
        </motion.div>
      ) : activeView === 'periodos-academicos' ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <GestionPeriodos
            onBack={() => setActiveView('lista')}
            onNavigateToImport={(pCod) => {
              setSelectedPeriodoForImport(pCod);
              setActiveView('importar-asignaturas');
            }}
          />
        </motion.div>
      ) : (
      <>
      {/* Búsqueda y Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, código o facultad..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={nivelFilter}
              onChange={(e) => setNivelFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-medium text-sm transition-all"
            >
              <option value="all">Todos los niveles</option>
              {niveles.map(nivel => (
                <option key={nivel} value={nivel}>{nivel}</option>
              ))}
            </select>

            <select
              value={modalidadFilter}
              onChange={(e) => setModalidadFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-medium text-sm transition-all"
            >
              <option value="all">Todas las modalidades</option>
              {modalidades.map(mod => (
                <option key={mod} value={mod}>{mod}</option>
              ))}
            </select>

            <select
              value={sedeFilter}
              onChange={(e) => setSedeFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-medium text-sm transition-all"
            >
              <option value="all">Todas las sedes</option>
              {sedes.map(sede => (
                <option key={sede} value={sede}>{sede}</option>
              ))}
            </select>

            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-medium text-sm transition-all"
            >
              <option value="all">Todos los estados</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
              <option value="En Trámite">En Trámite</option>
              <option value="Suspendido">Suspendido</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
            <span className="text-xs font-semibold text-gray-500">Filtros activos:</span>
            {searchQuery && (
              <Badge variant="outline" className="gap-1">
                Búsqueda: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {nivelFilter !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Nivel: {nivelFilter}
                <button onClick={() => setNivelFilter('all')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {modalidadFilter !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Modalidad: {modalidadFilter}
                <button onClick={() => setModalidadFilter('all')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {sedeFilter !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Sede: {sedeFilter}
                <button onClick={() => setSedeFilter('all')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {estadoFilter !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Estado: {estadoFilter}
                <button onClick={() => setEstadoFilter('all')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs font-semibold text-[#003DA5] hover:underline ml-auto"
            >
              Limpiar todos
            </button>
          </div>
        )}
      </motion.div>

      {/* Tabla Premium */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black text-gray-900 text-lg">Programas Académicos</h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Mostrando {paginatedProgramas.length} de {filteredProgramas.length} programas
                </p>
              </div>
              <Badge variant="outline" className="font-semibold">
                Total: {filteredProgramas.length}
              </Badge>
            </div>
          </div>

          {/* Vista Desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Programa
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Nivel
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Plan de Estudios
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Sede
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Estudiantes
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-black text-gray-700 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                <AnimatePresence>
                  {paginatedProgramas.map((programa, index) => [
                    <motion.tr
                      key={programa.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors cursor-pointer group"
                      onClick={() => setExpandedProgramaId(expandedProgramaId === programa.id ? null : programa.id)}
                    >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-gray-900 text-sm group-hover:text-[#003DA5] transition-colors">
                              {programa.nombre}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">{programa.codigo}</p>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {getNivelBadge(programa.nivelFormacion)}
                            <p className="text-xs text-gray-500">{programa.modalidad}</p>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {(programa.totalAsignaturas || 0) > 0 ? (() => {
                            const pct = programa.creditos > 0 ? Math.min((programa.creditosPlan / programa.creditos) * 100, 100) : 0;
                            const barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 75 ? 'bg-blue-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400';
                            const textColor = pct >= 100 ? 'text-emerald-600' : pct >= 75 ? 'text-blue-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500';
                            const iconColor = pct >= 100 ? 'text-emerald-500' : pct >= 75 ? 'text-blue-500' : pct >= 50 ? 'text-amber-500' : 'text-red-400';
                            return (
                              <div className="space-y-1.5 min-w-[130px]">
                                <div className="flex items-center gap-1.5">
                                  <BookOpen className={`w-3.5 h-3.5 ${iconColor}`} />
                                  <span className="text-xs font-semibold text-gray-900">{programa.totalAsignaturas} asignaturas</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${barColor} transition-all duration-500`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className={`text-[10px] font-bold ${textColor} whitespace-nowrap`}>
                                    {programa.creditosPlan || 0}/{programa.creditos} cr.
                                  </span>
                                </div>
                              </div>
                            );
                          })() : (
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="w-4 h-4 text-gray-300" />
                              <span className="text-xs text-gray-400 italic">Sin plan</span>
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{programa.sede}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900">{programa.estudiantesActivos}</span>
                            </div>
                            <p className="text-xs text-gray-500">{programa.graduados} graduados</p>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {getEstadoBadge(programa.estado)}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                  <MoreVertical className="w-5 h-5 text-gray-600" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleView(programa)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver Detalles
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(programa)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar Programa
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDelete(programa)} className="text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Eliminar Programa
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <button
                              onClick={() => setExpandedProgramaId(expandedProgramaId === programa.id ? null : programa.id)}
                              className="p-2 hover:bg-[#003DA5] hover:text-white rounded-lg transition-all"
                            >
                              <ChevronDown 
                                className={`w-5 h-5 transition-transform ${expandedProgramaId === programa.id ? 'rotate-180' : ''}`}
                              />
                            </button>
                          </div>
                        </td>
                      </motion.tr>,

                      expandedProgramaId === programa.id && (
                        <motion.tr
                          key={`${programa.id}-expanded`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <td colSpan={7} className="px-0 py-0">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-t border-b-2 border-[#003DA5]/20 p-6">
                                <div className="grid md:grid-cols-2 gap-4">
                                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                                    <h4 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-[#003DA5]" />
                                      Información Académica
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                      <p className="text-gray-700"><span className="font-semibold">Duración:</span> {programa.duracionSemestres} semestres ({programa.creditos} créditos)</p>
                                      <p className="text-gray-700"><span className="font-semibold">Jornada:</span> {programa.jornada}</p>
                                      <p className="text-gray-700"><span className="font-semibold">Facultad:</span> {programa.facultad}</p>
                                      <p className="text-gray-700"><span className="font-semibold">Costo matrícula:</span> ${(programa.costoMatricula || 0).toLocaleString()}</p>
                                      <p className="text-gray-700"><span className="font-semibold">Docentes:</span> {programa.docentesAsignados}</p>
                                    </div>
                                  </div>

                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                                      <h4 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2">
                                        <Award className="w-4 h-4 text-[#003DA5]" />
                                        Registro y Acreditación
                                      </h4>
                                      <div className="space-y-2 text-sm">
                                        <p className="text-gray-700"><span className="font-semibold">Reg. Calificado:</span> {programa.registroCalificado?.numero || 'Pendiente'}</p>
                                        <p className="text-gray-700"><span className="font-semibold">Vigencia RC:</span> {programa.registroCalificado?.vigencia ? new Date(programa.registroCalificado.vigencia).toLocaleDateString('es-CO') : 'N/A'}</p>
                                        {programa.acreditacion && (
                                          <>
                                            <p className="text-gray-700"><span className="font-semibold">Acreditación:</span> {programa.acreditacion?.tipo}</p>
                                            <p className="text-gray-700"><span className="font-semibold">Vigencia:</span> {programa.acreditacion?.vigencia ? new Date(programa.acreditacion.vigencia).toLocaleDateString('es-CO') : 'N/A'}</p>
                                          </>
                                        )}
                                        <p className="text-gray-700"><span className="font-semibold">Creación:</span> {programa.fechaCreacion ? new Date(programa.fechaCreacion).toLocaleDateString('es-CO') : 'N/A'}</p>
                                      </div>
                                    </div>
                                  </div>

                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mt-4">
                                  <h4 className="font-black text-gray-900 text-sm mb-2">Descripción</h4>
                                  <p className="text-sm text-gray-700">{programa.descripcion}</p>
                                  <h4 className="font-black text-gray-900 text-sm mb-2">Requisitos de Ingreso</h4>
                                  <p className="text-sm text-gray-700">{programa.requisitosDeIngreso}</p>
                                </div>

                                {/* Plan de Estudios — Asignaturas */}
                                <AsignaturasPlanEstudios
                                  programaId={String(programa.id)}
                                  programaNombre={programa.nombre}
                                  totalCreditos={programa.creditos || 160}
                                  totalSemestres={programa.duracionSemestres || 10}
                                />
                              </div>
                            </motion.div>
                          </td>
                        </motion.tr>
                      )
                    ])}
                  </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Vista Mobile */}
          <div className="lg:hidden divide-y divide-gray-200">
            <AnimatePresence>
              {paginatedProgramas.map((programa, index) => (
                <motion.div
                  key={programa.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-sm">{programa.nombre}</h3>
                      <p className="text-xs text-gray-500 font-mono">{programa.codigo}</p>
                    </div>
                    {getEstadoBadge(programa.estado)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {programa.sede}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {programa.estudiantesActivos}
                    </div>
                    {(programa.totalAsignaturas || 0) > 0 && (
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="font-semibold">{programa.totalAsignaturas} asig.</span>
                        <span className="text-gray-400">({programa.creditosPlan} cr.)</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {getNivelBadge(programa.nivelFormacion)}
                    <Badge variant="outline" className="text-xs">{programa.modalidad}</Badge>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedProgramaId(expandedProgramaId === programa.id ? null : programa.id);
                        }}
                        className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold text-[#003DA5] bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all min-h-[44px]"
                      >
                        {expandedProgramaId === programa.id ? 'Ocultar' : 'Ver Detalles'}
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedProgramaId === programa.id ? 'rotate-180' : ''}`} />
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(programa); }}
                        className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 active:scale-95 transition-all min-h-[44px]"
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </button>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(programa); }}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 active:scale-95 transition-all border border-red-100 min-h-[44px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar Programa
                    </button>
                  </div>

                  {expandedProgramaId === programa.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-3"
                    >
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4 space-y-4 shadow-inner">
                        <div>
                          <h4 className="font-bold text-gray-900 text-[13px] mb-2 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-[#003DA5]" />
                            Información Académica
                          </h4>
                          <div className="space-y-1.5 text-xs text-gray-700">
                            <p><span className="font-semibold text-gray-900">Duración:</span> {programa.duracionSemestres} semestres</p>
                            <p><span className="font-semibold text-gray-900">Jornada:</span> {programa.jornada}</p>
                            <p><span className="font-semibold text-gray-900">Facultad:</span> {programa.facultad}</p>
                            <p><span className="font-semibold text-gray-900">Costo:</span> ${(programa.costoMatricula || 0).toLocaleString()} COP</p>
                          </div>
                        </div>
                        
                        {(programa.totalAsignaturas || 0) > 0 && (
                           <div>
                             <h4 className="font-bold text-gray-900 text-[13px] mb-3 flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5 text-[#003DA5]" />
                                Plan de Estudios
                             </h4>
                             <AsignaturasPlanEstudios
                                programaId={String(programa.id)}
                                programaNombre={programa.nombre}
                                totalCreditos={programa.creditos || 160}
                                totalSemestres={programa.duracionSemestres || 10}
                             />
                           </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Empty State */}
          {filteredProgramas.length === 0 && (
            <div className="py-16 px-4 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <GraduationCap className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">No se encontraron programas</h3>
              <p className="text-sm text-gray-600 mb-6">
                {hasActiveFilters ? 'Intenta ajustar los filtros' : 'Aún no hay programas registrados'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-[#003DA5] text-white rounded-lg hover:bg-[#002d7a] transition-colors font-semibold text-sm"
                >
                  Limpiar Filtros
                </button>
              )}
            </div>
          )}

          {/* Paginación */}
          {filteredProgramas.length > 0 && (
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <PaginationPremium
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={pagination?.total || 0}
              />
            </div>
          )}
        </Card>
      </motion.div>

      {/* Modal para Crear/Editar Programa */}
      {showCreateModal && (
        <CreateProgramaModal
          onClose={handleCloseModal}
          programaToEdit={programaToEdit}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}

      {/* Dialog para Eliminar Programa */}
      <ConfirmationDialog
        isOpen={!!programaToDelete}
        title="Eliminar Programa"
        message={`¿Estás seguro de eliminar el programa "${programaToDelete?.nombre}"?\nEsta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setProgramaToDelete(null)}
      />
      </>
      )}
    </Container4K>
    </>
  );
}

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
  Loader2
} from 'lucide-react';
import { Card, Badge, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, Container4K, ResponsiveHeader } from '@esap-mfe/shared-ui';
import { toast, Toaster } from 'sonner';
import { PaginationPremium } from './shared/PaginationPremium';
import { CreateProgramaModal } from './CreateProgramaModal';
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
  const itemsPerPage = 10;
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN');

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
  }, [searchQuery, nivelFilter, modalidadFilter, sedeFilter, estadoFilter, currentPage]);



  // Calculate totalPages from pagination data
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.porPagina) : 1;

  // Stats (usando el total del backend)
  const stats = {
    totalProgramas: pagination?.total || 0,
    activos: programas.filter(p => p.estado === 'ACTIVO').length,
    totalEstudiantes: 0, // Estos campos ya no existen en la nueva tabla
    totalGraduados: 0
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

  const handleDelete = async (programa: ProgramaAcademico) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el programa "${programa.nombre}"?`)) {
      try {
        await apiClient.delete(`/auth/api/v1/programas-academicos/${programa.id}`);
        toast.success('Programa Eliminado', { description: `Se eliminó: ${programa.nombre}` });
        // Recargar datos
        window.location.reload();
      } catch (error) {
        console.error('Error deleting programa:', error);
        toast.error('Error al eliminar el programa');
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
            onClick={() => window.location.reload()}
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
    <Toaster position="top-right" richColors />
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
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
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
                  Mostrando {programas.length} de {pagination?.total || 0} programas
                </p>
              </div>
              <Badge variant="outline" className="font-semibold">
                Total: {pagination?.total || 0}
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
                <AnimatePresence mode="popLayout">
                  {paginatedProgramas.map((programa, index) => (
                    <React.Fragment key={`programa-fragment-${programa.id}`}>
                      <motion.tr
                        key={`programa-${programa.id}`}
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
                          {(() => {
                            const pct = programa.creditos > 0 ? Math.min((programa.creditosPlan / programa.creditos) * 100, 100) : 0;
                            const barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 75 ? 'bg-blue-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400';
                            const textColor = pct >= 100 ? 'text-emerald-600' : pct >= 75 ? 'text-blue-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500';
                            const iconColor = pct >= 100 ? 'text-emerald-500' : pct >= 75 ? 'text-blue-500' : pct >= 50 ? 'text-amber-500' : 'text-red-400';

                            return (
                              <div className="space-y-1.5 min-w-[130px]">
                                <div className="flex items-center gap-1.5">
                                  <BookOpen className={`w-3.5 h-3.5 ${iconColor}`} />
                                  <span className="text-xs font-semibold text-gray-900">
                                    {programa.totalAsignaturas} asignaturas
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${barColor} transition-all duration-500`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className={`text-[10px] font-bold ${textColor} whitespace-nowrap`}>
                                    {programa.creditosPlan}/{programa.creditos || 0} cr.
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
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
                      </motion.tr>

                      {expandedProgramaId === programa.id && (
                        <motion.tr
                          key={`programa-expanded-${programa.id}`}
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
                                <div className="grid md:grid-cols-3 gap-4">
                                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                                    <h4 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-[#003DA5]" />
                                      Información Académica
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                      <p className="text-gray-700"><span className="font-semibold">Duración:</span> {programa.duracion} semestres ({programa.creditos} créditos)</p>
                                      <p className="text-gray-700"><span className="font-semibold">Jornada:</span> {programa.jornada}</p>
                                      <p className="text-gray-700"><span className="font-semibold">Facultad:</span> {programa.facultad}</p>
                                      {programa.costoMatricula && <p className="text-gray-700"><span className="font-semibold">Costo matrícula:</span> ${programa.costoMatricula.toLocaleString()}</p>}
                                    </div>
                                  </div>

                                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                                    <h4 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2">
                                      <Award className="w-4 h-4 text-[#003DA5]" />
                                      Registro y Acreditación
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                      {programa.registroCalificado && (
                                        <>
                                          <p className="text-gray-700"><span className="font-semibold">Reg. Calificado:</span> {programa.registroCalificado.numero_registro_calificado}</p>
                                          <p className="text-gray-700"><span className="font-semibold">Vigencia RC:</span> {new Date(programa.registroCalificado.vigencia).toLocaleDateString('es-CO')}</p>
                                          {programa.registroCalificado.acreditacion && (
                                            <>
                                              <p className="text-gray-700"><span className="font-semibold">Acreditación:</span> {programa.registroCalificado.acreditacion.tipo_acreditacion}</p>
                                              <p className="text-gray-700"><span className="font-semibold">Vigencia:</span> {new Date(programa.registroCalificado.acreditacion.vigencia).toLocaleDateString('es-CO')}</p>
                                            </>
                                          )}
                                        </>
                                      )}
                                      <p className="text-gray-700"><span className="font-semibold">Creación:</span> {new Date(programa.createdAt).toLocaleDateString('es-CO')}</p>
                                    </div>
                                  </div>

                                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                                    <h4 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2">
                                      <BookOpen className="w-4 h-4 text-[#003DA5]" />
                                      Plan de Estudios
                                    </h4>
                                    <div className="space-y-3 text-sm">
                                      {(() => {
                                        const pct = programa.creditos > 0 ? Math.min((programa.creditosPlan / programa.creditos) * 100, 100) : 0;
                                        const statusText = pct >= 100 ? 'Completado' : pct >= 75 ? 'Avanzado' : pct >= 50 ? 'En progreso' : 'Incompleto';
                                        const statusColor = pct >= 100 ? 'text-emerald-600' : pct >= 75 ? 'text-blue-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600';

                                        return (
                                          <>
                                            <div className="flex justify-between items-center">
                                              <span className="font-semibold text-gray-900">Asignaturas:</span>
                                              <span className={`font-bold ${statusColor}`}>{programa.totalAsignaturas}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span className="font-semibold text-gray-900">Créditos completados:</span>
                                              <span className={`font-bold ${statusColor}`}>
                                                {programa.creditosPlan}/{programa.creditos || 0}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span className="font-semibold text-gray-900">Créditos completados:</span>
                                              <span className={`font-bold ${statusColor}`}>
                                                {programa.creditosPlan}/{programa.creditos || 0}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span className="font-semibold text-gray-900">Estado:</span>
                                              <span className={`font-bold ${statusColor}`}>{statusText}</span>
                                            </div>
                                            <div className="mt-3">
                                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                                <span>Progreso</span>
                                                <span>{Math.round(pct)}%</span>
                                              </div>
                                              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                  className={`h-full rounded-full transition-all duration-500 ${
                                                    pct >= 100 ? 'bg-emerald-500' : pct >= 75 ? 'bg-blue-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'
                                                  }`}
                                                  style={{ width: `${pct}%` }}
                                                />
                                              </div>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mt-4">
                                  <h4 className="font-black text-gray-900 text-sm mb-2">Descripción</h4>
                                  <p className="text-sm text-gray-700">{programa.descripcion}</p>
                                  {programa.requisitosDeIngreso && (
                                    <>
                                      <h4 className="font-black text-gray-900 text-sm mb-2 mt-4">Requisitos de Ingreso</h4>
                                      <p className="text-sm text-gray-700">{programa.requisitosDeIngreso}</p>
                                    </>
                                  )}
                                  {programa.perfilEgresado && (
                                    <>
                                      <h4 className="font-black text-gray-900 text-sm mb-2 mt-4">Perfil del Egresado</h4>
                                      <p className="text-sm text-gray-700">{programa.perfilEgresado}</p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </motion.tr>
                      )}
                    </React.Fragment>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Vista Mobile */}
          <div className="lg:hidden divide-y divide-gray-200">
            <AnimatePresence mode="popLayout">
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
                  </div>
                  <div className="flex gap-1">
                    {programa.nivelFormacion && getNivelBadge(programa.nivelFormacion)}
                    {programa.modalidad && <Badge variant="outline" className="text-xs">{programa.modalidad}</Badge>}
                  </div>
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
        />
      )}
    </Container4K>
    </>
  );
}

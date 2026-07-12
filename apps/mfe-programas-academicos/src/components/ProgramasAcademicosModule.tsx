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
  Layers,
  Settings
} from 'lucide-react';
import { Card, Badge, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, Container4K, ResponsiveHeader, ConfirmationDialog } from '@esap-mfe/shared-ui';
import { toast } from 'sonner';
import { Toaster } from '@esap-mfe/shared-ui/sonner';
import { PaginationPremium } from './shared/PaginationPremium';
import { CreateProgramaModal } from './CreateProgramaModal';
import { PlanesEstudioDashboard } from './PlanesEstudioDashboard';
import { AsignaturasPlanEstudios } from './AsignaturasPlanEstudios';
import { ImportarAsignaturas } from './ImportarAsignaturas';
import { GestionPeriodos } from './GestionPeriodos';
import { ProgramCetapsModal } from './ProgramCetapsModal';
import { useAuth } from '../hooks';
import { apiClient } from '../../services/api';
import type { ProgramaAcademicoDTO } from '../../services/api/programas.service';

// ✅ DÍA 4: Container4K para padding adaptativo
// ✅ DÍA 5: ResponsiveHeader para headers adaptativos

// Usar la interfaz del servicio actualizado
type ProgramaAcademico = ProgramaAcademicoDTO;
type FilterOption = { value: string; label: string };
type ProgramFilterOptions = {
  niveles: FilterOption[];
  modalidades: FilterOption[];
  cetaps: FilterOption[];
  estados: FilterOption[];
};
const EMPTY_FILTER_OPTIONS: ProgramFilterOptions = {
  niveles: [], modalidades: [], cetaps: [], estados: [],
};
const PROGRAMAS_PERIOD_STORAGE_KEY = 'esap.periodo.programas-academicos';
const CATALOG_PERIOD_CHANGE_EVENT = 'esap:academic-catalog-period-changed';
const getPeriodCode = (period: any) =>
  String(
    period?.codigo ||
      period?.periodo ||
      (period?.anio && period?.semestre ? `${period.anio}-${period.semestre}` : ''),
  ).trim();
const getPeriodCreationTime = (period: any) => {
  const value = period?.createdAt || period?.created_at || period?.fechaCreacion;
  const timestamp = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(timestamp) ? 0 : timestamp;
};
const sortPeriodsByCreation = (periods: any[]) =>
  [...periods].sort((a, b) => {
    const creationDifference = getPeriodCreationTime(b) - getPeriodCreationTime(a);
    if (creationDifference !== 0) return creationDifference;
    if (Number(b?.anio || 0) !== Number(a?.anio || 0)) {
      return Number(b?.anio || 0) - Number(a?.anio || 0);
    }
    return Number(b?.semestre || 0) - Number(a?.semestre || 0);
  });


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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [nivelFilter, setNivelFilter] = useState<string>('all');
  const [modalidadFilter, setModalidadFilter] = useState<string>('all');
  const [sedeFilter, setSedeFilter] = useState<string>('all');
  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const [filterOptions, setFilterOptions] = useState<ProgramFilterOptions>(EMPTY_FILTER_OPTIONS);
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);
  const [hasLoadedPrograms, setHasLoadedPrograms] = useState(false);
  const [expandedProgramaId, setExpandedProgramaId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [programaToEdit, setProgramaToEdit] = useState<ProgramaAcademico | null>(null);
  const [programaToDelete, setProgramaToDelete] = useState<ProgramaAcademico | null>(null);
  const [activeView, setActiveView] = useState<'lista' | 'dashboard' | 'importar-asignaturas' | 'periodos-academicos'>('lista');
  const [selectedProgramaForCetaps, setSelectedProgramaForCetaps] = useState<ProgramaAcademicoDTO | null>(null);
  const [selectedPeriodoForImport, setSelectedPeriodoForImport] = useState<string | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [periodosRefreshTrigger, setPeriodosRefreshTrigger] = useState(0);
  const itemsPerPage = 10;
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const canImport = hasRole('GESTION_PROFESORAL') || isSuperAdmin;

  // ─── Periodo Académico (Selector Global) ───
  const [periodosPA, setPeriodosPA] = useState<any[]>([]);
  const [periodoSeleccionadoPA, setPeriodoSeleccionadoPA] = useState<string>('');
  const [periodosCargadosPA, setPeriodosCargadosPA] = useState(false);
  const [showPeriodoDropdownPA, setShowPeriodoDropdownPA] = useState(false);

  useEffect(() => {
    const cargarPeriodos = async () => {
      try {
        const res = await apiClient.get<any[]>('/pta/api/v1/periodos-academicos');
        const data = Array.isArray(res) ? res : [];
        const sorted = sortPeriodsByCreation(data);
        setPeriodosPA(sorted);
        // Al llegar a la página, el selector SIEMPRE inicia en el período activo
        // (en_curso), sin importar cuál se haya visualizado antes.
        const active = sorted.find((p: any) => p.estado === 'en_curso') || sorted[0];
        setPeriodoSeleccionadoPA(getPeriodCode(active));
      } catch {
        setPeriodosPA([]);
        setPeriodoSeleccionadoPA('');
      } finally {
        setPeriodosCargadosPA(true);
      }
    };
    cargarPeriodos();
  }, [periodosRefreshTrigger]);

  const periodoActivoPA = periodosPA.find((p) => p.estado === 'en_curso') || periodosPA[0];
  const periodoActivoCodigoPA = periodoActivoPA?.codigo || periodoActivoPA?.periodo || '';
  const esPeriodoActivoPA =
    !!periodoSeleccionadoPA && periodoSeleccionadoPA === periodoActivoCodigoPA;

  useEffect(() => {
    if (periodoSeleccionadoPA) {
      localStorage.setItem(PROGRAMAS_PERIOD_STORAGE_KEY, periodoSeleccionadoPA);
      window.dispatchEvent(
        new CustomEvent(CATALOG_PERIOD_CHANGE_EVENT, {
          detail: {
            source: 'programas-academicos',
            storageKey: PROGRAMAS_PERIOD_STORAGE_KEY,
            periodCode: periodoSeleccionadoPA,
          },
        }),
      );
    }
  }, [periodoSeleccionadoPA]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    if (!periodoSeleccionadoPA) {
      setFilterOptions(EMPTY_FILTER_OPTIONS);
      return;
    }
    let cancelled = false;
    setFilterOptionsLoading(true);
    apiClient.get<ProgramFilterOptions>('/auth/api/v1/programas-academicos/filtros/opciones', {
      periodoAcademico: periodoSeleccionadoPA,
    }).then((options) => {
      if (!cancelled) setFilterOptions({ ...EMPTY_FILTER_OPTIONS, ...(options || {}) });
    }).catch(() => {
      if (!cancelled) setFilterOptions(EMPTY_FILTER_OPTIONS);
    }).finally(() => {
      if (!cancelled) setFilterOptionsLoading(false);
    });
    return () => { cancelled = true; };
  }, [periodoSeleccionadoPA, refreshTrigger]);

  // Cargar datos del backend
  useEffect(() => {
    const loadProgramas = async () => {
      if (!periodosCargadosPA) {
        return;
      }
      if (!periodoSeleccionadoPA) {
        setProgramas([]);
        setPagination({ total: 0, pagina: 1, porPagina: itemsPerPage });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('[FRONTEND DEBUG] Fetching programas with params:', {
          search: debouncedSearch,
          nivelFormacion: nivelFilter,
          modalidad: modalidadFilter,
          sede: sedeFilter,
          estado: estadoFilter,
          page: currentPage,
          limit: 15,
          periodoAcademico: periodoSeleccionadoPA,
          _t: Date.now()
        });
        const response = await apiClient.get('/auth/api/v1/programas-academicos', {
          search: debouncedSearch || undefined,
          nivelFormacion: nivelFilter !== 'all' ? nivelFilter : undefined,
          modalidad: modalidadFilter !== 'all' ? modalidadFilter : undefined,
          sede: sedeFilter !== 'all' ? sedeFilter : undefined,
          estado: estadoFilter !== 'all' ? estadoFilter : undefined,
          periodoAcademico: periodoSeleccionadoPA || undefined,
          page: currentPage,
          limit: itemsPerPage,
          _t: Date.now()
        });
        console.log('[DEBUG] Raw API response keys:', Object.keys(response));
        console.log('[DEBUG] response.data count:', response.data?.length, 'response.total:', response.total);
        const programasData = response.data || [];
        if (programasData.length > 0) {
          console.log('[DEBUG] First programa keys:', Object.keys(programasData[0]));
          console.log('[DEBUG] First programa cetapsList:', programasData[0].cetapsList?.length, 'sede:', programasData[0].sede);
          const progWithCetaps = programasData.find((p: any) => p.cetapsList && p.cetapsList.length > 0);
          console.log('[DEBUG] Programa with cetapsList:', progWithCetaps?.nombre, 'count:', progWithCetaps?.cetapsList?.length);
        }
        setProgramas(programasData);
        setPagination({
          total: response.total || 0,
          pagina: response.pagina || 1,
          porPagina: response.porPagina || itemsPerPage,
        });


      } catch (error) {
        console.error('Error cargando programas:', error);
        setError('Error al cargar los programas. Por favor intente nuevamente.');
        setProgramas([]);
        setPagination(null);
        toast.error('Error al cargar los programas');
      } finally {
        setLoading(false);
        setHasLoadedPrograms(true);
      }
    };

    loadProgramas();
  }, [debouncedSearch, nivelFilter, modalidadFilter, sedeFilter, estadoFilter, periodoSeleccionadoPA, periodosCargadosPA, currentPage, refreshTrigger]);



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

  const getNivelBadge = (nivel?: string) => {
    const nivelColors: Record<string, string> = {
      'Pregrado': 'bg-blue-100 text-blue-700',
      'Técnico Profesional': 'bg-cyan-100 text-cyan-700',
      'Tecnológico': 'bg-indigo-100 text-indigo-700',
      'Especialización': 'bg-orange-100 text-orange-700',
      'Maestría': 'bg-pink-100 text-pink-700',
      'Doctorado': 'bg-red-100 text-red-700'
    };
    const label = nivel || 'Sin nivel';
    return <Badge className={nivelColors[label] || 'bg-gray-100 text-gray-700'}>{label}</Badge>;
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
        // Se envía el período visualizado para que el borrado sea SOLO de ese período
        // (si el programa también existe en otro período, allí se conserva).
        const periodoQS = periodoSeleccionadoPA
          ? `?periodo=${encodeURIComponent(periodoSeleccionadoPA)}`
          : '';
        await apiClient.delete(`/auth/api/v1/programas-academicos/${programaToDelete.id}${periodoQS}`);
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

  const handleUpdateEstudiantesCetap = async (ofertaId: string, estudiantes: number) => {
    if (!selectedProgramaForCetaps) return;
    try {
      // PATCH directo (mismo patrón que el resto del módulo, p. ej. el delete de arriba).
      // El barrel de servicios de esta app no expone updateCetapEstudiantes, por eso
      // se llama al endpoint con apiClient para evitar el ReferenceError previo.
      await apiClient.patch(
        `/auth/api/v1/programas-academicos/${selectedProgramaForCetaps.id}/cetaps/${ofertaId}`,
        { cupos: estudiantes },
      );
      // Update local state to reflect the new count
      const updatedCetapsList = selectedProgramaForCetaps.cetapsList?.map(c => 
        c.ofertaId === ofertaId ? { ...c, estudiantes } : c
      );
      
      const prevTotal = selectedProgramaForCetaps.cetapsList?.find(c => c.ofertaId === ofertaId)?.estudiantes || 0;
      const diff = estudiantes - prevTotal;
      const newTotal = (selectedProgramaForCetaps.estudiantesActivos || 0) + diff;

      setSelectedProgramaForCetaps({
        ...selectedProgramaForCetaps,
        cetapsList: updatedCetapsList,
        estudiantesActivos: newTotal
      });

      // Reload program data slightly after to ensure consistency in the background
      setTimeout(() => setRefreshTrigger(prev => prev + 1), 500);
      toast.success('Cupos actualizados exitosamente');
    } catch (e) {
      console.error(e);
      toast.error('Error al actualizar los cupos del CETAP');
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setNivelFilter('all');
    setModalidadFilter('all');
    setSedeFilter('all');
    setEstadoFilter('all');
  };

  const activeFilterCount = [
    Boolean(searchQuery.trim()),
    nivelFilter !== 'all',
    modalidadFilter !== 'all',
    sedeFilter !== 'all',
    estadoFilter !== 'all',
  ].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setProgramaToEdit(null);
  };

  // Las pantallas de carga/error a página completa solo aplican a las vistas que
  // muestran la lista de programas. Las vistas de import y periodos se gestionan
  // por sí mismas; no deben desmontarse por una recarga en segundo plano (si no,
  // perderían su estado, p. ej. la pantalla de "importación exitosa").
  const isListLikeView =
    activeView !== 'importar-asignaturas' && activeView !== 'periodos-academicos';

  if (loading && !hasLoadedPrograms && isListLikeView) {
    return (
      <Container4K className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#003DA5]" />
          <p className="text-gray-600">Cargando programas académicos...</p>
        </div>
      </Container4K>
    );
  }

  if (error && isListLikeView) {
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
    <Container4K className="space-y-4">
      {/* ━━━ Premium Header ━━━ */}
      <div className="rounded-2xl bg-white border border-gray-200 px-8 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EBF0FA' }}>
              <GraduationCap className="w-6 h-6 text-[#003DA5]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Programas Académicos</h1>

              <p className="text-xs text-gray-400 mt-0.5">Gestión de programas de todos los CETAPs ESAP</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Selector de Periodo Académico */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">PERIODO:</span>
              <div className="relative">
                <button
                  onClick={() => setShowPeriodoDropdownPA(!showPeriodoDropdownPA)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-[#003DA5]/20 bg-[#EBF0FA] text-[#003DA5] text-sm font-bold hover:border-[#003DA5]/40 transition-all"
                >
                  {periodoSeleccionadoPA || 'Sin periodo'}
                  {esPeriodoActivoPA && (
                    <span className="text-[9px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Actual</span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showPeriodoDropdownPA && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowPeriodoDropdownPA(false)} />
                    <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-1 z-20">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Periodos Académicos</p>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {periodosPA.length > 0 ? periodosPA.map((p: any, idx: number) => {
                          const codigo = p.codigo || `${p.anio}-${p.semestre}`;
                          const esActivo = p.estado === 'en_curso';
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                setPeriodoSeleccionadoPA(codigo);
                                clearAllFilters();
                                setCurrentPage(1);
                                setExpandedProgramaId(null);
                                setShowPeriodoDropdownPA(false);
                              }}
                              className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between transition-colors ${
                                codigo === periodoSeleccionadoPA ? 'bg-[#EBF0FA] text-[#003DA5] font-bold' : 'hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              <span>{codigo}{esActivo ? ' (Actual)' : ''}</span>
                              {esActivo ? <span className="w-2 h-2 rounded-full bg-green-500" /> : <span className="text-[10px] text-gray-400">Historial</span>}
                            </button>
                          );
                        }) : (
                          <div className="px-3 py-3 text-sm text-gray-500">No hay periodos disponibles</div>
                        )}
                      </div>
                      <div className="border-t border-gray-100 mt-1 p-1 bg-gray-50/50">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveView('periodos-academicos');
                            setShowPeriodoDropdownPA(false);
                          }}
                          className="w-full px-3 py-2 text-center text-xs font-bold text-[#003DA5] hover:bg-blue-50 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Administrar Periodos
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              {!esPeriodoActivoPA && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Solo lectura
                </span>
              )}
            </div>

            {/* Tabs integrados */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveView('lista')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeView === 'lista' ? 'bg-[#003DA5] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Programas
              </button>
              <button
                onClick={() => setActiveView('periodos-academicos')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeView === 'periodos-academicos' ? 'bg-[#003DA5] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Periodos
              </button>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#003DA5] text-white text-xs font-bold rounded-xl hover:bg-[#002d7a] transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Crear Programa
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard View */}
      {activeView === 'dashboard' ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PlanesEstudioDashboard />
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
            onImportSuccess={() => setRefreshTrigger(prev => prev + 1)}
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
            onPeriodosChanged={() => setPeriodosRefreshTrigger(prev => prev + 1)}
          />
        </motion.div>
      ) : (
      <>
      {/* Búsqueda y Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        {/* Compact search & filters bar */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2.5" style={{ flexWrap: 'wrap' }}>
            <div className="relative sm:col-span-2 lg:flex-1 lg:min-w-[240px]" style={{ flex: '1 1 240px', minWidth: 0 }}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                type="text"
                placeholder="Buscar por nombre, código o facultad..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                aria-label="Buscar programas por nombre, código o facultad"
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[11px] focus:outline-none focus:ring-2 focus:ring-[#003DA5]/15 focus:border-[#003DA5]/30 transition-all placeholder:text-gray-300"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
            <select
              value={nivelFilter}
              onChange={(e) => { setNivelFilter(e.target.value); setCurrentPage(1); }}
              aria-label="Filtrar por nivel de formación"
              disabled={filterOptionsLoading}
              style={{ flex: '0 1 135px' }}
              className="w-full lg:w-[135px] min-w-0 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#003DA5]/15 cursor-pointer transition-all disabled:opacity-60"
            >
              <option value="all">Todos los niveles</option>
              {filterOptions.niveles.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={modalidadFilter}
              onChange={(e) => { setModalidadFilter(e.target.value); setCurrentPage(1); }}
              aria-label="Filtrar por modalidad"
              disabled={filterOptionsLoading}
              style={{ flex: '0 1 150px' }}
              className="w-full lg:w-[150px] min-w-0 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#003DA5]/15 cursor-pointer transition-all disabled:opacity-60"
            >
              <option value="all">Todas las modalidades</option>
              {filterOptions.modalidades.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={sedeFilter}
              onChange={(e) => { setSedeFilter(e.target.value); setCurrentPage(1); }}
              aria-label="Filtrar por CETAP"
              disabled={filterOptionsLoading}
              style={{ flex: '0 1 175px' }}
              className="w-full lg:w-[175px] min-w-0 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#003DA5]/15 cursor-pointer transition-all disabled:opacity-60"
            >
              <option value="all">Todos los CETAP</option>
              {filterOptions.cetaps.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={estadoFilter}
              onChange={(e) => { setEstadoFilter(e.target.value); setCurrentPage(1); }}
              aria-label="Filtrar por estado"
              disabled={filterOptionsLoading}
              style={{ flex: '0 1 135px' }}
              className="w-full lg:w-[135px] min-w-0 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#003DA5]/15 cursor-pointer transition-all disabled:opacity-60"
            >
              <option value="all">Todos los estados</option>
              {filterOptions.estados.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                onClick={() => { clearAllFilters(); setCurrentPage(1); }}
                style={{ flex: '0 0 auto' }}
                className="sm:col-span-2 lg:col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold text-[#003DA5] bg-blue-50 hover:bg-blue-100 whitespace-nowrap transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar ({activeFilterCount})
              </button>
            )}
          </div>
        </div>


          {/* Table info bar */}
          <div className="px-4 sm:px-6 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 bg-gray-50/30">
            <p className="text-xs text-gray-400">
              Mostrando <span className="font-semibold text-gray-600">{paginatedProgramas.length}</span> de <span className="font-semibold text-gray-600">{pagination?.total || 0}</span> programas
            </p>
            {loading && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#003DA5]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Actualizando resultados
              </span>
            )}
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Programa</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Nivel</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Plan de Estudios</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">CETAP</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Estudiantes</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                <AnimatePresence>
                  {paginatedProgramas.map((programa, index) => [
                    <motion.tr
                      key={programa.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="hover:bg-blue-50/20 transition-colors cursor-pointer group"
                      onClick={() => setExpandedProgramaId(expandedProgramaId === programa.id ? null : programa.id)}
                    >
                        <td className="px-6 py-3">
                          <div>
                            <p className="font-semibold text-gray-900 text-xs group-hover:text-[#003DA5] transition-colors">
                              {programa.nombre}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[10px] text-gray-400 font-mono">{programa.codigo}</p>
                              {programa.categoria_horas_circular003 && (
                                <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                  programa.categoria_horas_circular003 === 'pregrado_sede_central' ? 'bg-orange-100 text-orange-700' :
                                  programa.categoria_horas_circular003 === 'pregrado_territorial' ? 'bg-blue-100 text-blue-700' :
                                  programa.categoria_horas_circular003 === 'especializacion' ? 'bg-emerald-100 text-emerald-700' :
                                  programa.categoria_horas_circular003 === 'maestria' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {programa.categoria_horas_circular003 === 'pregrado_sede_central' ? 'SC Fijo' :
                                   programa.categoria_horas_circular003 === 'pregrado_territorial' ? 'Territorial' :
                                   programa.categoria_horas_circular003 === 'especializacion' ? 'Esp.' :
                                   programa.categoria_horas_circular003 === 'maestria' ? 'Maestría' : programa.categoria_horas_circular003}
                                </span>
                              )}
                              {programa.nombre_corto && (
                                <span className="text-[9px] text-gray-400">({programa.nombre_corto})</span>
                              )}
                            </div>
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
                            {programa.cetapsList && programa.cetapsList.length > 0 ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProgramaForCetaps(programa);
                                }}
                                style={{ color: '#003DA5' }}
                                className="text-sm font-medium hover:underline transition-colors text-left"
                              >
                                {programa.sede}
                              </button>
                            ) : (
                              <span className="text-sm text-gray-900">{programa.sede}</span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900">{programa.estudiantesActivos}</span>
                            </div>
                            <p className="text-xs text-gray-500">{programa.horasBasePorCredito}h / créd.</p>
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
                                      <p className="text-gray-700"><span className="font-semibold">Modalidad Principal:</span> <span className="capitalize">{programa.modalidad || 'Presencial'}</span></p>
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

                                {/* Circular 003 — Configuración de Horas */}
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-200">
                                  <h4 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-600" />
                                    Configuración Circular 003/2025
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <p className="text-gray-700">
                                      <span className="font-semibold">Categoría Normativa:</span>{' '}
                                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                                        programa.categoria_horas_circular003 === 'pregrado_sede_central' ? 'bg-orange-100 text-orange-700' :
                                        programa.categoria_horas_circular003 === 'pregrado_territorial' ? 'bg-blue-100 text-blue-700' :
                                        programa.categoria_horas_circular003 === 'especializacion' ? 'bg-emerald-100 text-emerald-700' :
                                        programa.categoria_horas_circular003 === 'maestria' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                                      }`}>
                                        {programa.descripcion_categoria_circular003 || programa.categoria_horas_circular003 || 'Sin categorizar'}
                                      </span>
                                    </p>
                                    <p className="text-gray-700">
                                      <span className="font-semibold">Tipo Programa:</span>{' '}
                                      <span className="capitalize">{programa.tipo_programa || programa.nivelFormacion || 'N/A'}</span>
                                    </p>
                                    {programa.categoria_horas_circular003 === 'pregrado_sede_central' ? (
                                      <>
                                        <p className="text-gray-700">
                                          <span className="font-semibold">Horas Bloque Fijo:</span> {programa.horas_pregrado_central || 64}h
                                          <span className="text-gray-400 ml-1">(N/A por crédito)</span>
                                        </p>
                                        <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mt-1">
                                          <p className="text-xs font-bold text-orange-800">
                                            Fórmula: {programa.horas_pregrado_central || 64}h × 3 (Criterio 1+2) = <span className="text-orange-900 text-sm">{(programa.horas_pregrado_central || 64) * 3}h PTA</span>
                                          </p>
                                          <p className="text-[10px] text-orange-600 mt-0.5">Bloque fijo — independiente del número de créditos</p>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-gray-700">
                                          <span className="font-semibold">Horas Base por Crédito:</span> {programa.horas_base_por_credito || programa.horasBasePorCredito || 'N/A'}h/Cr
                                        </p>
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mt-1">
                                          <p className="text-xs font-bold text-blue-800">
                                            Fórmula: Créditos × {programa.horas_base_por_credito || programa.horasBasePorCredito || '?'}h × 3 (Criterio 1+2)
                                          </p>
                                          <p className="text-[10px] text-blue-600 mt-0.5">
                                            Ejemplo: 3 Cr × {programa.horas_base_por_credito || programa.horasBasePorCredito || '?'} × 3 = {3 * (programa.horas_base_por_credito || programa.horasBasePorCredito || 0) * 3}h PTA
                                          </p>
                                        </div>
                                      </>
                                    )}
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
                  <div className="flex gap-1 flex-wrap">
                    {getNivelBadge(programa.nivelFormacion)}
                    <Badge variant="outline" className="text-xs">{programa.modalidad}</Badge>
                    {programa.categoria_horas_circular003 && (
                      <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        programa.categoria_horas_circular003 === 'pregrado_sede_central' ? 'bg-orange-100 text-orange-700' :
                        programa.categoria_horas_circular003 === 'pregrado_territorial' ? 'bg-blue-100 text-blue-700' :
                        programa.categoria_horas_circular003 === 'especializacion' ? 'bg-emerald-100 text-emerald-700' :
                        programa.categoria_horas_circular003 === 'maestria' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {programa.descripcion_categoria_circular003 || programa.categoria_horas_circular003}
                      </span>
                    )}
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
                            <p><span className="font-semibold text-gray-900">Modalidad Principal:</span> <span className="capitalize">{programa.modalidad || 'Presencial'}</span></p>
                            <p><span className="font-semibold text-gray-900">Facultad:</span> {programa.facultad}</p>
                            <p><span className="font-semibold text-gray-900">Costo:</span> ${(programa.costoMatricula || 0).toLocaleString()} COP</p>
                          </div>
                        </div>

                        {/* Circular 003 — Mobile */}
                        <div>
                          <h4 className="font-bold text-gray-900 text-[13px] mb-2 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            Circular 003/2025
                          </h4>
                          <div className="space-y-1.5 text-xs text-gray-700">
                            <p><span className="font-semibold text-gray-900">Categoría:</span> {programa.descripcion_categoria_circular003 || programa.categoria_horas_circular003 || 'Sin categorizar'}</p>
                            {programa.categoria_horas_circular003 === 'pregrado_sede_central' ? (
                              <div className="bg-orange-50 border border-orange-200 rounded-lg px-2 py-1.5">
                                <p className="text-[10px] font-bold text-orange-800">
                                  Bloque fijo: {programa.horas_pregrado_central || 64}h × 3 = {(programa.horas_pregrado_central || 64) * 3}h PTA
                                </p>
                              </div>
                            ) : (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5">
                                <p className="text-[10px] font-bold text-blue-800">
                                  Cr × {programa.horas_base_por_credito || programa.horasBasePorCredito || '?'}h × 3 = horas PTA
                                </p>
                              </div>
                            )}
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
            <div className="py-20 px-4 text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center">
                <GraduationCap className="w-8 h-8 text-[#003DA5]/40" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">No se encontraron programas</h3>
              <p className="text-xs text-gray-400 mb-5 max-w-xs mx-auto">
                {hasActiveFilters ? 'Intenta ajustar los filtros de búsqueda' : 'Aún no hay programas registrados. Crea uno para comenzar.'}
              </p>
              <div className="flex items-center justify-center gap-3">
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Limpiar Filtros
                  </button>
                )}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-5 py-2 bg-[#003DA5] text-white text-xs font-bold rounded-lg hover:bg-[#002d7a] transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Crear Programa
                </button>
              </div>
            </div>
          )}

          {/* Paginación */}
          {filteredProgramas.length > 0 && (
            <div className="border-t border-gray-100 px-6 py-3 bg-gray-50/30">
              <PaginationPremium
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={pagination?.total || 0}
              />
            </div>
          )}
      </motion.div>

      {/* Dialog para Eliminar Programa */}
      <ConfirmationDialog
        open={!!programaToDelete}
        title="Eliminar Programa"
        description={`¿Estás seguro de eliminar el programa "${programaToDelete?.nombre}"?\nEsta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDelete}
        onClose={() => setProgramaToDelete(null)}
      />
      </>
      )}

      {/* Modal para Crear/Editar Programa (disponible en todas las vistas) */}
      {showCreateModal && (
        <CreateProgramaModal
          onClose={handleCloseModal}
          programaToEdit={programaToEdit}
          periodoAcademico={periodoActivoCodigoPA}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}

      {/* Modal para ver CETAPs */}
      {selectedProgramaForCetaps && (
        <ProgramCetapsModal
          onClose={() => setSelectedProgramaForCetaps(null)}
          programaNombre={selectedProgramaForCetaps.nombre}
          cetapsList={selectedProgramaForCetaps.cetapsList || []}
          onUpdateEstudiantes={handleUpdateEstudiantesCetap}
        />
      )}
    </Container4K>
    </>
  );
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIVERSO AUDITABLE UNIFICADO - OCIG ESAP
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Módulo único y completo que integra:
 * - Universo Auditable (DÓNDE se puede auditar)
 * - Programa Anual de Auditorías (CUÁNDO auditar)
 * - Profesionales OCIG (QUIÉN audita)
 * - Integración con Auditorías OCIG (ejecución)
 * - Integración con Planes de Mejoramiento (hallazgos)
 * 
 * Base normativa:
 * - Decreto 648 de 2017 (Rol 4 - Evaluación del SCI)
 * - Guía de Auditoría Interna DAFP
 * - Modelo Estándar de Control Interno MECI
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers, Calendar as CalendarIcon, Target, Filter, Search, Download, Plus,
  BarChart3, Activity, AlertTriangle, CheckCircle2, Clock,
  TrendingUp, Users, FileText, Link2, Eye, Edit2, Trash2,
  ChevronRight, ChevronDown, AlertCircle, Info, X, FileCheck, Save, XCircle,
  Loader2, WifiOff, RefreshCw, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { FormularioAuditoriaUnificado, type AuditoriaUnificadaFormData } from './FormularioAuditoriaUnificado';
// ✅ NUEVO: Cuestionario DAFP Visual SIMPLIFICADO - Implementación exacta según CUESTIONARIO_FLUJO_DAFP_VISUAL.md
import { FormularioProcesoDafpVisual as FormularioProcesoAuditable, type FormularioDafpData as ProcesoAuditableData } from './FormularioProcesoDafpVisualSimplificado';
import { ResponsiveTable, MobileCard, MobileCardRow, type Column } from '../../ui/responsive-table';
import { TabUniversoAuditableResponsive } from './TabUniversoAuditableResponsive';
import { CronogramaAuditoriasPremium } from './CronogramaAuditoriasPremium';

import { TooltipGuia } from './TooltipGuia';
// ✅ HOOKS DE INTEGRACIÓN CON BACKEND (reemplazan datos mock)
import { useUniversoAuditableData, type ProcesoAuditableUI } from './hooks/useUniversoAuditableData';
import { useProgramaAnualData, calcularEstadisticas, type AuditoriaProgramadaUI, type AuditoriaCreateData } from './hooks/useProgramaAnualData';
import type { Estadisticas, EstadoAuditoria, TipoAuditoria } from './hooks/useProgramaAnualData';
// ✅ SERVICIO DE EXPORTACIÓN PDF
import { exportarUniversoAuditablePDF, exportarUniversoAuditableExcel } from './services/exportarUniversoAuditablePDF';
// ✅ UTILIDAD DE CONVERSIÓN (separada para reutilización)
import { convertirProcesoAFormularioDafp as convertirProcesoAFormulario } from './utils/procesoAuditableConverters';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS LOCALES (re-exportados desde hooks)
// ════════════════════════════════════════════════════════════════════════════

type TabActiva = 'universo' | 'programa' | 'profesionales';
type NivelRiesgo = 'Crítico' | 'Alto' | 'Medio' | 'Bajo';
type TipoProceso = 'Estratégico' | 'Misional' | 'Apoyo' | 'Evaluación';

// Re-usar los tipos de ProcesoAuditable y AuditoriaProgramada desde hooks
type ProcesoAuditable = ProcesoAuditableUI;
type AuditoriaProgramada = AuditoriaProgramadaUI;

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

interface UniversoAuditableUnificadoProps {
  vigencia?: number;
  onVolver?: () => void;
}

export function UniversoAuditableUnificado({ vigencia = 2026, onVolver }: UniversoAuditableUnificadoProps) {
  const [tabActiva, setTabActiva] = useState<TabActiva>('universo');
  const [mostrarMenuExportar, setMostrarMenuExportar] = useState(false);
  const [filtroNivelRiesgo, setFiltroNivelRiesgo] = useState<NivelRiesgo | 'TODOS'>('TODOS');
  const [filtroTipoProceso, setFiltroTipoProceso] = useState<TipoProceso | 'TODOS'>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  // ✅ INTEGRACIÓN CON BACKEND — reemplaza todos los datos mock
  const {
    procesos,
    loading: loadingProcesos,
    error: errorProcesos,
    isOnline: isOnlineProcesos,
    agregarProceso,
    editarProceso,
    eliminarProceso,
    refetch: refetchProcesos,
  } = useUniversoAuditableData();

  const {
    auditorias: auditoriasProgramadas,
    estadisticas,
    loading: loadingAuditorias,
    error: errorAuditorias,
    isOnline: isOnlineAuditorias,
    agregarAuditoria,
    refetch: refetchAuditorias,
  } = useProgramaAnualData({ vigencia, procesos });

  const loading = loadingProcesos || loadingAuditorias;
  const error = errorProcesos || errorAuditorias;
  const isOnline = isOnlineProcesos && isOnlineAuditorias;

  const [mostrarFormularioProceso, setMostrarFormularioProceso] = useState(false);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<ProcesoAuditable | null>(null);
  
  // Filtrar procesos
  const procesosFiltrados = useMemo(() => {
    return procesos.filter(proceso => {
      const cumpleFiltroRiesgo = filtroNivelRiesgo === 'TODOS' || proceso.nivelRiesgo === filtroNivelRiesgo;
      const cumpleFiltroTipo = filtroTipoProceso === 'TODOS' || proceso.tipo === filtroTipoProceso;
      const cumpleBusqueda = busqueda === '' || 
        proceso.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        proceso.responsable.toLowerCase().includes(busqueda.toLowerCase());
      
      return cumpleFiltroRiesgo && cumpleFiltroTipo && cumpleBusqueda;
    });
  }, [procesos, filtroNivelRiesgo, filtroTipoProceso, busqueda]);
  
  // ✅ HANDLERS con integración backend
  const handleAgregarProceso = async (nuevoProceso: ProcesoAuditableData) => {
    await agregarProceso(nuevoProceso);
  };
  
  const handleEditarProceso = async (procesoData: ProcesoAuditableData, id: string) => {
    await editarProceso(id, procesoData);
  };
  
  const handleEliminarProceso = async (id: string) => {
    await eliminarProceso(id);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* INDICADOR DE ESTADO DE CONEXIÓN */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {!isOnline && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-amber-700">
            <WifiOff className="w-4 h-4" />
            <span className="font-medium">Sin conexión al servidor</span>
            <span className="text-amber-600">— {error || 'Verificando conexión...'}</span>
          </div>
          <button
            onClick={() => { refetchProcesos(); refetchAuditorias(); }}
            className="flex items-center gap-1 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Reintentar
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border-b-2 border-gray-200 shadow-sm flex-shrink-0">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-black mb-2" style={{ color: '#003DA5' }}>
                Universo Auditable {vigencia}
              </h1>
              <p className="text-gray-600 text-lg">
                Gestión integral del universo auditable y programa anual de auditorías
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Dropdown de Exportación */}
              <div className="relative">
                <button
                  onClick={() => setMostrarMenuExportar(!mostrarMenuExportar)}
                  onBlur={() => setTimeout(() => setMostrarMenuExportar(false), 150)}
                  className="px-4 py-2 bg-white border-2 border-gray-300 hover:border-blue-600 text-gray-700 rounded-lg font-semibold flex items-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Exportar
                  <ChevronDown className={`w-4 h-4 transition-transform ${mostrarMenuExportar ? 'rotate-180' : ''}`} />
                </button>
                
                {mostrarMenuExportar && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={async () => {
                        setMostrarMenuExportar(false);
                        try {
                          const resultado = await exportarUniversoAuditablePDF(
                            procesos,
                            {
                              totalProcesos: estadisticas.totalProcesos,
                              procesosAuditables: estadisticas.procesosAuditables,
                              procesosCriticos: estadisticas.procesosCriticos,
                              procesosAltos: estadisticas.procesosAltos,
                              procesosMedios: estadisticas.procesosMedios,
                              procesosBajos: estadisticas.procesosBajos
                            },
                            { vigencia }
                          );
                          if (resultado.exito) {
                            toast.success('PDF exportado exitosamente');
                          } else {
                            toast.error(resultado.error || 'Error al exportar');
                          }
                        } catch (error) {
                          console.error('Error al exportar PDF:', error);
                          toast.error('Error al exportar el PDF');
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-blue-50 flex items-center gap-3 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-red-600" />
                      Exportar a PDF
                    </button>
                    <button
                      onClick={async () => {
                        setMostrarMenuExportar(false);
                        try {
                          const resultado = await exportarUniversoAuditableExcel(
                            procesos,
                            {
                              totalProcesos: estadisticas.totalProcesos,
                              procesosAuditables: estadisticas.procesosAuditables,
                              procesosCriticos: estadisticas.procesosCriticos,
                              procesosAltos: estadisticas.procesosAltos,
                              procesosMedios: estadisticas.procesosMedios,
                              procesosBajos: estadisticas.procesosBajos
                            },
                            { vigencia }
                          );
                          if (resultado.exito) {
                            toast.success('Excel exportado exitosamente');
                          } else {
                            toast.error(resultado.error || 'Error al exportar');
                          }
                        } catch (error) {
                          console.error('Error al exportar Excel:', error);
                          toast.error('Error al exportar el Excel');
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-green-50 flex items-center gap-3 transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      Exportar a Excel
                    </button>
                  </div>
                )}
              </div>
              {onVolver && (
                <button
                  onClick={onVolver}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
                >
                  Volver
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setTabActiva('universo')}
              className={`px-6 py-3 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                tabActiva === 'universo'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              Universo Auditable
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                tabActiva === 'universo' ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {estadisticas.procesosAuditables}
              </span>
            </button>
            <button
              onClick={() => setTabActiva('programa')}
              className={`px-6 py-3 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                tabActiva === 'programa'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              Programa Anual
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                tabActiva === 'programa' ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {estadisticas.totalProgramadas}
              </span>
            </button>
            <button
              onClick={() => setTabActiva('profesionales')}
              className={`px-6 py-3 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                tabActiva === 'profesionales'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Profesionales
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                tabActiva === 'profesionales' ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {new Set(
                  auditoriasProgramadas.flatMap((a) => {
                    const lider = typeof a.auditorLider === 'string' ? a.auditorLider : (a.auditorLider as any)?.nombre || '';
                    const equipoNombres = (a.equipo || []).map(m => typeof m === 'string' ? m : (m as any)?.nombre || '');
                    return [lider, ...equipoNombres].filter(Boolean);
                  })
                ).size}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CONTENIDO */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Estado de carga */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-gray-600 font-medium">Cargando datos desde el servidor...</p>
          </div>
        )}

        {/* Contenido cuando no está cargando */}
        {!loading && (
          <AnimatePresence mode="wait">
            {tabActiva === 'universo' && (
              <TabUniversoAuditable
                key="universo"
                procesos={procesosFiltrados}
                estadisticas={estadisticas}
                filtroRiesgo={filtroNivelRiesgo}
                filtroTipo={filtroTipoProceso}
                busqueda={busqueda}
                onFiltroRiesgoChange={setFiltroNivelRiesgo}
                onFiltroTipoChange={setFiltroTipoProceso}
                onBusquedaChange={setBusqueda}
                onAgregarProceso={() => {
                  setProcesoSeleccionado(null);
                  setMostrarFormularioProceso(true);
                }}
                onEditarProceso={(proceso) => {
                  setProcesoSeleccionado(proceso);
                  setMostrarFormularioProceso(true);
                }}
                onEliminarProceso={handleEliminarProceso}
              />
            )}
            {tabActiva === 'programa' && (
              <TabProgramaAnual
                key="programa"
                auditorias={auditoriasProgramadas}
                estadisticas={estadisticas}
                mostrarFormulario={mostrarFormulario}
                setMostrarFormulario={setMostrarFormulario}
              />
            )}
            {tabActiva === 'profesionales' && (
              <TabProfesionales
                key="profesionales"
                auditorias={auditoriasProgramadas}
                estadisticas={estadisticas}
              />
            )}
          </AnimatePresence>
        )}
      </div>

      {/* MODALES */}
      {/* Formulario para gestionar auditorías programadas */}
      {mostrarFormulario && (
        <FormularioAuditoriaUnificado
          open={mostrarFormulario}
          onClose={() => setMostrarFormulario(false)}
          onSubmit={async (data: AuditoriaUnificadaFormData) => {
            // Convertir datos del formulario al formato del hook
            const auditoriaData: AuditoriaCreateData = {
              tipoAuditoria: data.tipoAuditoria,
              titulo: data.titulo,
              descripcion: data.descripcion,
              territorial: data.territorial,
              areaObjetivo: data.areaObjetivo,
              procesoAuditado: data.procesoAuditado,
              alcance: data.alcance,
              auditorLider: data.auditorLider,
              auditorAsignado: data.auditorAsignado,
              equipoAuditores: data.equipoAuditores,
              supervisorAsignado: data.supervisorAsignado,
              fechaInicio: data.fechaInicio,
              fechaFin: data.fechaFin,
              periodicidad: data.periodicidad,
              objetivos: data.objetivos,
              criteriosAuditoria: data.criteriosAuditoria,
              normatividadAplicable: data.normatividadAplicable,
              nivelRiesgo: data.nivelRiesgo,
              riesgosIdentificados: data.riesgosIdentificados,
              controlesAplicar: data.controlesAplicar,
              presupuestoEstimado: data.presupuestoEstimado,
              recursos: data.recursos,
              productosEsperados: data.productosEsperados,
              hitos: data.hitos,
              vinculadaPlanAnual: data.vinculadaPlanAnual,
              planAnualId: data.planAnualId,
              planAnualAño: data.planAnualAño,
              rolDecretoAsociado: data.rolDecretoAsociado,
            };
            
            const exito = await agregarAuditoria(auditoriaData);
            if (exito) {
              setMostrarFormulario(false);
            }
          }}
          mode="create"
        />
      )}
      
      {/* Formulario para gestionar procesos del Universo Auditable */}
      {mostrarFormularioProceso && (
        <FormularioProcesoAuditable
          open={mostrarFormularioProceso}
          onClose={() => {
            setMostrarFormularioProceso(false);
            setProcesoSeleccionado(null);
          }}
          onSubmit={(proceso) => {
            if (procesoSeleccionado) {
              handleEditarProceso(proceso, procesoSeleccionado.id);
            } else {
              handleAgregarProceso(proceso);
            }
            setMostrarFormularioProceso(false);
            setProcesoSeleccionado(null);
          }}
          procesoInicial={convertirProcesoAFormulario(procesoSeleccionado)}
          mode={procesoSeleccionado ? 'edit' : 'create'}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 1: UNIVERSO AUDITABLE
// ════════════════════════════════════════════════════════════════════════════

interface TabUniversoAuditableProps {
  procesos: ProcesoAuditable[];
  estadisticas: Estadisticas;
  filtroRiesgo: NivelRiesgo | 'TODOS';
  filtroTipo: TipoProceso | 'TODOS';
  busqueda: string;
  onFiltroRiesgoChange: (filtro: NivelRiesgo | 'TODOS') => void;
  onFiltroTipoChange: (filtro: TipoProceso | 'TODOS') => void;
  onBusquedaChange: (busqueda: string) => void;
  onAgregarProceso: () => void;
  onEditarProceso: (proceso: ProcesoAuditable) => void;
  onEliminarProceso: (id: string) => void;
}

function TabUniversoAuditable({
  procesos,
  estadisticas,
  filtroRiesgo,
  filtroTipo,
  busqueda,
  onFiltroRiesgoChange,
  onFiltroTipoChange,
  onBusquedaChange,
  onAgregarProceso,
  onEditarProceso,
  onEliminarProceso
}: TabUniversoAuditableProps) {
  // ✅ DELEGAMOS TODO AL COMPONENTE RESPONSIVE WORLD-CLASS
  return (
    <TabUniversoAuditableResponsive
      procesos={procesos as any}
      estadisticas={estadisticas as any}
      busqueda={busqueda}
      filtroRiesgo={filtroRiesgo}
      filtroTipo={filtroTipo}
      onBusquedaChange={onBusquedaChange}
      onFiltroRiesgoChange={onFiltroRiesgoChange}
      onFiltroTipoChange={onFiltroTipoChange}
      onAgregarProceso={onAgregarProceso}
      onEditarProceso={onEditarProceso as any}
      onEliminarProceso={onEliminarProceso}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 2: PROGRAMA ANUAL
// ════════════════════════════════════════════════════════════════════════════

interface TabProgramaAnualProps {
  auditorias: AuditoriaProgramada[];
  estadisticas: Estadisticas;
  mostrarFormulario: boolean;
  setMostrarFormulario: (mostrar: boolean) => void;
}

function TabProgramaAnual({ auditorias, estadisticas, mostrarFormulario, setMostrarFormulario }: TabProgramaAnualProps) {
  const [vistaProgramaAnual, setVistaProgramaAnual] = useState<'lista' | 'cronograma'>('cronograma'); // 🆕 Estado para alternar vista
  
  const getColorEstado = (estado: EstadoAuditoria) => {
    const colores = {
      'PROGRAMADA': { bg: '#DBEAFE', text: '#1E40AF', icon: Clock },
      'EN_EJECUCION': { bg: '#FEF08A', text: '#854D0E', icon: Activity },
      'COMPLETADA': { bg: '#D1FAE5', text: '#065F46', icon: CheckCircle2 },
      'CANCELADA': { bg: '#FEE2E2', text: '#991B1B', icon: X }
    };
    return colores[estado];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Estadísticas del programa */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border-2 border-blue-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-blue-700">Total Programadas</span>
            <CalendarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-blue-700">{estadisticas.totalProgramadas}</p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-gray-600">{estadisticas.completadas} completadas</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border-2 border-yellow-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-yellow-700">En Ejecución</span>
            <Activity className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-black text-yellow-700">{estadisticas.enEjecucion}</p>
          <p className="text-xs text-yellow-600 mt-1">Auditorías activas</p>
        </div>

        <div className="bg-white rounded-xl border-2 border-purple-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-purple-700">Cobertura Críticos</span>
            <Target className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-black text-purple-700">{estadisticas.coberturaCriticos}%</p>
          <p className="text-xs text-purple-600 mt-1">de procesos críticos</p>
        </div>

        <div className="bg-white rounded-xl border-2 border-green-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-green-700">Horas Ejecutadas</span>
            <Clock className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-black text-green-700">{estadisticas.horasEjecutadas}</p>
          <p className="text-xs text-green-600 mt-1">de {estadisticas.horasTotales} estimadas</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TOGGLE: VISTA LISTA vs CRONOGRAMA */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="p-6 border-b-2 border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-black text-gray-900">
                Programa Anual de Auditorías
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {vistaProgramaAnual === 'cronograma' 
                  ? 'Vista de cronograma interactivo con múltiples vistas temporales' 
                  : 'Auditorías calendarizadas por trimestre'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Toggle Vista */}
              <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg border-2 border-gray-300">
                <button
                  onClick={() => setVistaProgramaAnual('lista')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    vistaProgramaAnual === 'lista'
                      ? 'bg-white text-[#003DA5] shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Lista
                </button>
                <button
                  onClick={() => setVistaProgramaAnual('cronograma')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    vistaProgramaAnual === 'cronograma'
                      ? 'bg-white text-[#003DA5] shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <CalendarIcon className="w-4 h-4" />
                  Cronograma
                </button>
              </div>
              
              <button
                onClick={() => setMostrarFormulario(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                Programar Auditoría
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CONTENIDO DINÁMICO: LISTA O CRONOGRAMA */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {vistaProgramaAnual === 'cronograma' ? (
            <motion.div
              key="cronograma"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <CronogramaAuditoriasPremium 
                auditorias={auditorias as any}
                vigencia={new Date().getFullYear()}
              />
            </motion.div>
          ) : (
            <motion.div
              key="lista"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 space-y-4"
            >
              {auditorias.map((auditoria) => {
                const colorEstado = getColorEstado(auditoria.estado);
                const IconoEstado = colorEstado.icon;
                
                return (
                  <div
                    key={auditoria.id}
                    className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-400 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-black text-gray-900">
                            {auditoria.nombre}
                          </h3>
                          <span
                            className="px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                            style={{ backgroundColor: colorEstado.bg, color: colorEstado.text }}
                          >
                            <IconoEstado className="w-3 h-3" />
                            {auditoria.estado.replace('_', ' ')}
                          </span>
                          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">
                            Q{auditoria.trimestre} {new Date(auditoria.fechaInicio).getFullYear()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{auditoria.objetivo}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Proceso:</span>
                            <span className="ml-2 font-semibold text-gray-900">{auditoria.proceso.nombre}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Auditor Líder:</span>
                            <span className="ml-2 font-semibold text-gray-900">{auditoria.auditorLider}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Periodo:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              {new Date(auditoria.fechaInicio).toLocaleDateString('es-CO')} - {new Date(auditoria.fechaFin).toLocaleDateString('es-CO')}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Horas:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              {auditoria.horasReales} / {auditoria.horasEstimadas}h
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center ml-6">
                        <div className="text-3xl font-black text-blue-600 mb-1">{auditoria.avance}%</div>
                        <div className="text-xs text-gray-500">Avance</div>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-700 transition-all"
                        style={{ width: `${auditoria.avance}%` }}
                      ></div>
                    </div>

                    {/* Etiquetas de vinculación */}
                    <div className="flex items-center gap-2">
                      {auditoria.auditoriaOCIGId && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          Vinculada OCIG
                        </span>
                      )}
                      {auditoria.hallazgosCount > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                          {auditoria.hallazgosCount} Hallazgos
                        </span>
                      )}
                      {auditoria.planMejoramientoId && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Plan de Mejoramiento
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 3: PROFESIONALES
// ════════════════════════════════════════════════════════════════════════════

interface TabProfesionalesProps {
  auditorias: AuditoriaProgramada[];
  estadisticas: Estadisticas;
}

function TabProfesionales({ auditorias, estadisticas }: TabProfesionalesProps) {
  const resumenProfesionales = useMemo(() => {
    const mapa = new Map<string, { lider: number; apoyo: number; horas: number }>();

    auditorias.forEach((a) => {
      // Extraer nombre del auditor líder (puede ser string u objeto)
      const liderRaw = a.auditorLider;
      const lider = typeof liderRaw === 'string' 
        ? liderRaw.trim() 
        : (liderRaw && typeof liderRaw === 'object' && 'nombre' in liderRaw) 
          ? String((liderRaw as any).nombre || '').trim()
          : '';
      
      if (lider) {
        const actual = mapa.get(lider) || { lider: 0, apoyo: 0, horas: 0 };
        actual.lider += 1;
        actual.horas += a.horasEstimadas || 0;
        mapa.set(lider, actual);
      }

      // Procesar equipo (puede ser array de strings u objetos)
      (a.equipo || []).forEach((miembro) => {
        const apoyo = typeof miembro === 'string'
          ? miembro.trim()
          : (miembro && typeof miembro === 'object' && 'nombre' in miembro)
            ? String((miembro as any).nombre || '').trim()
            : '';
        if (!apoyo) return;
        const actual = mapa.get(apoyo) || { lider: 0, apoyo: 0, horas: 0 };
        actual.apoyo += 1;
        actual.horas += Math.round((a.horasEstimadas || 0) * 0.3);
        mapa.set(apoyo, actual);
      });
    });

    return Array.from(mapa.entries())
      .map(([nombre, data]) => {
        const carga = data.lider + data.apoyo * 0.3;
        const capacidadMax = 4;
        const porcentaje = Math.round((carga / capacidadMax) * 100);
        const semaforo = porcentaje > 90 ? 'rojo' : porcentaje >= 70 ? 'amarillo' : 'verde';
        return { nombre, ...data, carga, porcentaje, semaforo };
      })
      .sort((a, b) => b.carga - a.carga);
  }, [auditorias]);

  const totalProfesionales = resumenProfesionales.length;
  const conCargaAlta = resumenProfesionales.filter((p) => p.semaforo === 'rojo').length;
  const conCargaMedia = resumenProfesionales.filter((p) => p.semaforo === 'amarillo').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Estadísticas de profesionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border-2 border-blue-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-blue-700">Profesionales Activos</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-blue-700">{totalProfesionales}</p>
          <p className="text-xs text-blue-600 mt-1">con asignaciones en el programa</p>
        </div>

        <div className="bg-white rounded-xl border-2 border-yellow-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-yellow-700">Carga Media</span>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-black text-yellow-700">{conCargaMedia}</p>
          <p className="text-xs text-yellow-600 mt-1">profesionales en alerta</p>
        </div>

        <div className="bg-white rounded-xl border-2 border-red-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-red-700">Carga Alta</span>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-black text-red-700">{conCargaAlta}</p>
          <p className="text-xs text-red-600 mt-1">requieren balance de carga</p>
        </div>
      </div>

      {/* Mapa de carga profesional */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <h2 className="text-xl font-black text-gray-900 mb-4">
          Mapa de Carga de Profesionales
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Distribución de auditorías por profesional (liderazgo y apoyo) para balancear capacidad operativa.
        </p>

        <div className="space-y-4">
          {resumenProfesionales.map((p) => (
            <div key={p.nombre} className="border-2 border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-black text-gray-900">{p.nombre}</p>
                  <p className="text-xs text-gray-600">
                    Lidera {p.lider} auditoría(s) • Apoya {p.apoyo} auditoría(s)
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    p.semaforo === 'rojo'
                      ? 'bg-red-100 text-red-700'
                      : p.semaforo === 'amarillo'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  Carga {p.porcentaje}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    p.semaforo === 'rojo'
                      ? 'bg-red-500'
                      : p.semaforo === 'amarillo'
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(p.porcentaje, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Carga ponderada: {p.carga.toFixed(1)} / 4.0
              </p>
            </div>
          ))}
          {resumenProfesionales.length === 0 && (
            <div className="text-center py-10">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-semibold">No hay profesionales asignados aún</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          La configuración detallada de perfiles y capacidades puede gestionarse en <strong>Configuraciones → Profesionales OCIG</strong>.
        </p>
      </div>
    </motion.div>
  );
}

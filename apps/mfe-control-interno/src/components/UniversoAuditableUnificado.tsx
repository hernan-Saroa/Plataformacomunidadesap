/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROGRAMA DE AUDITORÍA - OCI ESAP
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Módulo único y completo que integra:
 * - Universo Auditable (DÓNDE se puede auditar)
 * - Programa Anual de Auditorías (CUÁNDO auditar)
 * - Profesionales OCI (QUIÉN audita)
 * - Integración con Auditorías OCI (ejecución)
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
  Layers, Calendar as CalendarIcon, Target, Filter, Search, Plus,
  BarChart3, Activity, AlertTriangle, CheckCircle2, Clock,
  TrendingUp, Users, Link2, Eye, Edit2, Trash2,
  ChevronRight, AlertCircle, Info, X, FileCheck, Save, XCircle,
  Loader2, WifiOff, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { FormularioAuditoriaUnificado, type AuditoriaUnificadaFormData } from './FormularioAuditoriaUnificado';
// ✅ NUEVO: Cuestionario DAFP Visual SIMPLIFICADO - Implementación exacta según CUESTIONARIO_FLUJO_DAFP_VISUAL.md
import { FormularioProcesoDafpVisual as FormularioProcesoAuditable, type FormularioDafpData as ProcesoAuditableData } from './FormularioProcesoDafpVisualSimplificado';
import { ResponsiveTable, MobileCard, MobileCardRow, type Column } from '@esap-mfe/shared-ui/responsive-table';
import { TabUniversoAuditableResponsive } from './TabUniversoAuditableResponsive';
import { CronogramaAuditoriasPremium } from './CronogramaAuditoriasPremium';

import { TooltipGuia } from './TooltipGuia';
// ✅ HOOKS DE INTEGRACIÓN CON BACKEND (reemplazan datos mock)
import { useUniversoAuditableData, type ProcesoAuditableUI } from './hooks/useUniversoAuditableData';
import { useProgramaAnualData, calcularEstadisticas, type AuditoriaProgramadaUI, type AuditoriaCreateData } from './hooks/useProgramaAnualData';
import type { Estadisticas, EstadoAuditoria, TipoAuditoria } from './hooks/useProgramaAnualData';
// ✅ HOOK DE EVALUACIONES DAFP (nueva funcionalidad)
import { useEvaluacionesProcesoData, type EvaluacionProcesoUI } from './hooks/useEvaluacionesProcesoData';
// ✅ UTILIDAD DE CONVERSIÓN (separada para reutilización)
import { convertirProcesoAFormularioDafp as convertirProcesoAFormulario } from './utils/procesoAuditableConverters';
import { loadTipos, loadEspIds } from './ConfiguracionProcesosModule';
// ✅ HOOK DE CONFIGURACIÓN DE PROFESIONALES OCI (backend)
import { useConfiguracionProfesionales, type ProfesionalOCI } from './services/useConfiguracionProfesionales';
// ✅ HOOK DE PERMISOS FLEXIBLE
import { useControlInternoPermissions } from './hooks/useControlInternoPermissions';
import { ModuleHeaderBar } from './ModuleHeaderBar';
import { usePlanAnualVigenciaContextOptional } from './PlanAnualVigenciaContext';

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
// UTILIDADES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Horas estimadas por auditoría según Guía RE-E-GE-034:
 *   Extremo  / Cada año    → 80h
 *   Alto     / Cada 2 años → 60h
 *   Moderado / Cada 3 años → 40h
 *   Bajo (Priorizado) / Cada 4 años → 24h
 *   Bajo / No auditar → 0h
 */
function calcHorasEstimadas(nivelCriticidad?: string, ciclo?: string): number {
  const c = (ciclo || '').toLowerCase();
  if (c.includes('no auditar')) return 0;
  const n = (nivelCriticidad || '').toLowerCase();
  if (n === 'extremo')  return 80;
  if (n === 'alto')     return 60;
  if (n === 'moderado') return 40;
  if (n === 'bajo')     return 24;
  if (n.includes('bajo')) return 24;
  // fallback por ciclo
  if (c.includes('todos los años') || c.includes('cada año') || c.includes('anual')) return 80;
  if (c.includes('2')) return 60;
  if (c.includes('3')) return 40;
  if (c.includes('4')) return 24;
  return 0;
}

function resolverResultadoDafp(ponderacion: number, modoEspecial?: string) {
  const base =
    ponderacion < 1.5
      ? { nivel: 'Bajo', ciclo: 'No auditar' }
      : ponderacion < 2
      ? { nivel: 'Bajo (Priorizado)', ciclo: 'Cada 4 años' }
      : ponderacion < 3
      ? { nivel: 'Moderado', ciclo: 'Cada 3 años' }
      : ponderacion < 4
      ? { nivel: 'Alto', ciclo: 'Cada 2 años' }
      :
      { nivel: 'Extremo', ciclo: 'Cada año' };

  if (modoEspecial === 'todos_los_anos') {
    return { ...base, ciclo: 'Todos los años' };
  }

  return base;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

interface UniversoAuditableUnificadoProps {
  vigencia?: number;
  onVolver?: () => void;
  /** Modo solo seguimiento: arranca en pestaña Programa y oculta botones de creación */
  modoSeguimiento?: boolean;
}

export function UniversoAuditableUnificado({ vigencia: vigenciaProp, onVolver, modoSeguimiento = false }: UniversoAuditableUnificadoProps) {
  const vigenciaCtx = usePlanAnualVigenciaContextOptional();
  const vigencia = vigenciaCtx?.vigencia ?? vigenciaProp ?? new Date().getFullYear();
  const planAnualId = vigenciaCtx?.planActivoId ?? undefined;

  const [tabActiva, setTabActiva] = useState<TabActiva>(modoSeguimiento ? 'programa' : 'universo');
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

  // ✅ MAPA de procesos por ID para lookup rápido (Mover aquí para evitar ReferenceError)
  const procesosMap = useMemo(() => {
    const map = new Map<string, any>();
    procesos.forEach(p => map.set(p.id, p));
    return map;
  }, [procesos]);

  // ✅ HOOK DE EVALUACIONES DAFP - Para crear nuevas evaluaciones por proceso
  const {
    evaluaciones,
    loading: loadingEvaluaciones,
    agregarEvaluacion,
    editarEvaluacion,
    eliminarEvaluacion,
    refetch: refetchEvaluaciones,
  } = useEvaluacionesProcesoData({ vigencia });

  const {
    auditorias: auditoriasProgramadas,
    estadisticas,
    loading: loadingAuditorias,
    error: errorAuditorias,
    isOnline: isOnlineAuditorias,
    agregarAuditoria,
    refetch: refetchAuditorias,
  } = useProgramaAnualData({ vigencia, planAnualId, procesos });

  // ══════════════════════════════════════════════════════════════════════════
  // PROCESAR DATOS PARA LA TABLA (Merge de Procesos + Evaluaciones)
  // ══════════════════════════════════════════════════════════════════════════
  
  const evaluacionesComoFilas = useMemo((): ProcesoAuditable[] => {
    if (!procesos.length && !evaluaciones.length) return [];

    const nivelRiesgoMap: Record<string, NivelRiesgo> = {
      'Extremo': 'Crítico', 'Alto': 'Alto', 'Moderado': 'Medio', 'Bajo': 'Bajo',
    };
    const mapPonderacion: Record<string, NivelRiesgo> = {
      'EXTREMO': 'Crítico', 'ALTO': 'Alto', 'MODERADO': 'Medio', 'BAJO': 'Bajo', 'MUY BAJO': 'Bajo',
    };

    const evMap = new Map<string, EvaluacionProcesoUI>();
    evaluaciones.forEach(ev => {
      if (!evMap.has(ev.procesoId)) {
        evMap.set(ev.procesoId, ev);
      }
    });

    return procesos
      .filter(p => evMap.has(p.id))
      .map(p => {
      const ev = evMap.get(p.id);
      const nivelRiesgo = ev ? (nivelRiesgoMap[ev.nivelCriticidadDafp || ''] || mapPonderacion[ev.ponderacionRiesgo || ''] || 'Medio') : 'Bajo';
      const scoreCalculado = ev?.ponderacionFinalDafp ? +(ev.ponderacionFinalDafp * 20).toFixed(0) : (ev?.scoreRiesgo || 0);
      const frecuencia = ev?.cicloRotacionDafp || ev?.planRotacion || 'Anual';
      
      // ✅ Calcular horas estimadas desde evaluación o nivel de riesgo
      const horasEst = ev?.horasEstimadas ?? calcHorasEstimadas(ev?.nivelCriticidadDafp, ev?.cicloRotacionDafp);

      return {
        id: p.id,
        idEvaluacion: ev?.id,
        _backendId: p.id, // ✅ Crucial para que onEditarProceso funcione
        codigo: p.codigo,
        nombre: p.nombre,
        tipo: p.tipo,
        // ✅ Campo que la tabla busca con key: 'tipoProceso'
        tipoProceso: p.tipoProceso || p.tipo,
        macroproceso: p.macroproceso,
        dependencia: p.dependencia,
        dependenciaResponsable: p.dependencia || ev?.dependenciaResponsable || '', // ✅ Crucial para búsqueda
        responsable: p.responsable,
        nivelRiesgo,
        puntajeRiesgo: scoreCalculado,
        // ✅ Campo que la tabla busca con key: 'scoreRiesgo'
        scoreRiesgo: scoreCalculado,
        // ✅ Campo que la tabla busca con key: 'horasEstimadas'
        horasEstimadas: horasEst,
        // ✅ Campo que la tabla busca con key: 'frecuenciaSugerida'
        frecuenciaSugerida: frecuencia,
        frecuenciaAuditoria: frecuencia as any,
        _evaluacionRiesgo: ev ? {
          ponderacionFinalDafp: ev.ponderacionFinalDafp,
          nivelCriticidadDafp: ev.nivelCriticidadDafp,
          cicloRotacionDafp: ev.cicloRotacionDafp,
          riesgosExtremos: ev.riesgosExtremos,
          riesgosAltos: ev.riesgosAltos,
          riesgosModerados: ev.riesgosModerados,
          riesgosBajos: ev.riesgosBajos,
          totalRiesgos: ev.totalRiesgos,
          scoreRiesgo: ev.scoreRiesgo,
          decisionFinal: ev.decisionFinal,
          vigencia: ev.vigencia,
          fechaCorte: ev.fechaCorte,
        } as any : undefined,
        auditable: ev?.decisionFinal === 'INCLUIR_PLAN_ANUAL' || ev?.decisionFinal === 'INCLUIR PLAN ANUAL' || (ev as any)?.priorizacionAnos?.length > 0,
        activo: ev?.activo ?? p.activo,
        createdAt: ev?.createdAt || p.createdAt,
        updatedAt: ev?.updatedAt || p.updatedAt,
      } as ProcesoAuditable;
    });
  }, [evaluaciones, procesos]);

  // ══════════════════════════════════════════════════════════════════════════
  // ESTADOS Y UI
  // ══════════════════════════════════════════════════════════════════════════

  // ✅ HOOK DE PROFESIONALES OCI (para badge del tab)
  const {
    profesionalesOCI,
    loading: loadingProfesionales,
  } = useConfiguracionProfesionales();

  // ✅ PERMISOS FLEXIBLES - Control de acceso UI
  const { puedeRealizar } = useControlInternoPermissions();
  const puedeCrearProceso = puedeRealizar('planificacion', 'create');
  const puedeEditarProceso = puedeRealizar('planificacion', 'edit');
  const puedeEliminarProceso = puedeRealizar('planificacion', 'delete');

  const loading = loadingProcesos || loadingAuditorias || loadingEvaluaciones;
  const error = errorProcesos || errorAuditorias;
  const isOnline = isOnlineProcesos && isOnlineAuditorias;

  const [mostrarFormularioProceso, setMostrarFormularioProceso] = useState(false);
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<ProcesoAuditable | null>(null);
  const [evaluacionSeleccionada, setEvaluacionSeleccionada] = useState<EvaluacionProcesoUI | null>(null);

  // ✅ Estadísticas calculadas desde evaluaciones
  const estadisticasEvaluaciones = useMemo(() => {
    const total = evaluacionesComoFilas.length;
    const criticos = evaluacionesComoFilas.filter(e => e.nivelRiesgo === 'Crítico').length;
    const altos = evaluacionesComoFilas.filter(e => e.nivelRiesgo === 'Alto').length;
    const medios = evaluacionesComoFilas.filter(e => e.nivelRiesgo === 'Medio').length;
    const bajos = evaluacionesComoFilas.filter(e => e.nivelRiesgo === 'Bajo').length;
    return {
      ...estadisticas,
      totalProcesos: total,
      procesosAuditables: evaluacionesComoFilas.filter(e => e.auditable).length,
      procesosCriticos: criticos,
      procesosAltos: altos,
      procesosMedios: medios,
      procesosBajos: bajos,
    };
  }, [evaluacionesComoFilas, estadisticas]);
  
  // Filtrar evaluaciones (misma lógica que antes pero sobre evaluaciones)
  const evaluacionesFiltradas = useMemo(() => {
    return evaluacionesComoFilas.filter(fila => {
      const cumpleFiltroRiesgo = filtroNivelRiesgo === 'TODOS' || fila.nivelRiesgo === filtroNivelRiesgo;
      const cumpleFiltroTipo = filtroTipoProceso === 'TODOS' || fila.tipo === filtroTipoProceso;
      const cumpleBusqueda = busqueda === '' || 
        fila.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        fila.dependenciaResponsable.toLowerCase().includes(busqueda.toLowerCase());
      
      return cumpleFiltroRiesgo && cumpleFiltroTipo && cumpleBusqueda;
    });
  }, [evaluacionesComoFilas, filtroNivelRiesgo, filtroTipoProceso, busqueda]);
  
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

  // ✅ HANDLER para crear/editar EVALUACIONES DAFP (nuevos registros por proceso)
  const handleAgregarEvaluacion = async (datos: ProcesoAuditableData, procesoId?: string) => {
    if (!procesoId) {
      toast.error('Debe seleccionar un proceso del catálogo');
      return;
    }
    
    const riesgoExt = datos.riesgosExtremos || 0;
    const riesgoAlt = datos.riesgosAltos || 0;
    const riesgoMod = datos.riesgosModerados || 0;
    const riesgoBaj = datos.riesgosBajos || 0;
    const totalRiesgos = riesgoExt + riesgoAlt + riesgoMod + riesgoBaj;
    
    // Calcular ponderación DAFP si tenemos todos los criterios
    const riCuan = riesgoExt >= 1 ? 5 : riesgoAlt >= 1 ? 4 : riesgoMod >= 1 ? 3 : riesgoBaj >= 1 ? 2 : 1;
    const tiempo = datos.tiempoUltimaAuditoria || 0;
    const ad = datos.temasAltaDireccion || 0;
    const obj = datos.objetivosEstrategicos || 0;
    const hall = datos.hallazgosAnteriores || 0;
    
    let ponderacionFinalDafp = Number(datos.ponderacionFinalDafp) || 0;
    let nivelCriticidadDafp = datos.nivelCriticidadDafp || '';
    let cicloRotacionDafp = datos.cicloRotacionDafp || '';

    if (tiempo > 0 && ad > 0 && obj > 0 && hall > 0 && (!ponderacionFinalDafp || !nivelCriticidadDafp || !cicloRotacionDafp)) {
      ponderacionFinalDafp = +(riCuan * 0.4 + tiempo * 0.1 + ad * 0.1 + obj * 0.1 + hall * 0.3).toFixed(1);
      const resultado = resolverResultadoDafp(ponderacionFinalDafp, datos.modoProcesoEspecial);
      nivelCriticidadDafp = resultado.nivel;
      cicloRotacionDafp = resultado.ciclo;
    }

    const evaluacionData: Partial<EvaluacionProcesoUI> = {
      procesoId,
      vigencia: Number(datos.vigencia) || new Date().getFullYear(),
      fechaCorte: datos.fechaCorte || new Date().toISOString().split('T')[0],
      dependenciaResponsable: datos.dependenciaResponsable || 'Sin dependencia',
      riesgosExtremos: Number(riesgoExt),
      riesgosAltos: Number(riesgoAlt),
      riesgosModerados: Number(riesgoMod),
      riesgosBajos: Number(riesgoBaj),
      totalRiesgos: Number(totalRiesgos),
      requerimientoComite: Boolean(datos.requerimientoComite),
      requerimientoEntesReg: Boolean(datos.requerimientoEntesReg),
      fechaUltimaAuditoria: datos.fechaUltimaAuditoria ?? undefined,
      resultadoUltimaAuditoria: datos.resultadoUltimaAuditoria || 'SIN_AUDITORIA',
      criticidad: Number(datos.criticidad) || 0,
      exposicion: Number(datos.exposicion) || 0,
      mitigantes: Number(datos.mitigantes) || 0,
      scoreRiesgo: Number(datos.scoreRiesgoCEM) || 0,
      ponderacionRiesgo: datos.ponderacionRiesgo || 'BAJO',
      // Criterios de priorización DAFP (migración 179) - FORZAR VALORES DESDE EL FORMULARIO
      tiempoUltimaAuditoria: Number(datos.tiempoUltimaAuditoria) || Number(tiempo),
      temasAltaDireccion: Number(datos.temasAltaDireccion) || Number(ad),
      objetivosEstrategicos: Number(datos.objetivosEstrategicos) || Number(obj),
      hallazgosAnteriores: Number(datos.hallazgosAnteriores) || Number(hall),
      ponderacionFinalDafp: Number(ponderacionFinalDafp),
      nivelCriticidadDafp: nivelCriticidadDafp,
      cicloRotacionDafp: cicloRotacionDafp || 'No auditar',
      decisionFinal: datos.decisionFinal || 'INCLUIR_AUDITORIA_POSTERIOR',
      motivoDecision: datos.motivoDecision || '',
      prioridadRegla: Number(datos.prioridadRegla) || 5,
    };
    
    const result = await agregarEvaluacion(evaluacionData);
    // ✅ Siempre refetch para sincronizar la tabla (el hook ya gestiona el toast)
    await refetchEvaluaciones();
    if (!result) {
      // El hook ya mostró toast de error
      return;
    }
  };

  const handleEditarEvaluacion = async (datos: ProcesoAuditableData, evaluacionId: string) => {
    const riesgoExt = datos.riesgosExtremos || 0;
    const riesgoAlt = datos.riesgosAltos || 0;
    const riesgoMod = datos.riesgosModerados || 0;
    const riesgoBaj = datos.riesgosBajos || 0;
    const totalRiesgosCalc = riesgoExt + riesgoAlt + riesgoMod + riesgoBaj;
    
    // Calcular ponderación DAFP si tenemos todos los criterios
    const riCuan = riesgoExt >= 1 ? 5 : riesgoAlt >= 1 ? 4 : riesgoMod >= 1 ? 3 : riesgoBaj >= 1 ? 2 : 1;
    const tiempo = datos.tiempoUltimaAuditoria || 0;
    const ad = datos.temasAltaDireccion || 0;
    const obj = datos.objetivosEstrategicos || 0;
    const hall = datos.hallazgosAnteriores || 0;
    
    let ponderacionFinalDafp = Number(datos.ponderacionFinalDafp) || 0;
    let nivelCriticidadDafp = datos.nivelCriticidadDafp || '';
    let cicloRotacionDafp = datos.cicloRotacionDafp || '';

    if (tiempo > 0 && ad > 0 && obj > 0 && hall > 0 && (!ponderacionFinalDafp || !nivelCriticidadDafp || !cicloRotacionDafp)) {
      ponderacionFinalDafp = +(riCuan * 0.4 + tiempo * 0.1 + ad * 0.1 + obj * 0.1 + hall * 0.3).toFixed(1);
      const resultado = resolverResultadoDafp(ponderacionFinalDafp, datos.modoProcesoEspecial);
      nivelCriticidadDafp = resultado.nivel;
      cicloRotacionDafp = resultado.ciclo;
    }

    const evaluacionData: Partial<EvaluacionProcesoUI> = {
      vigencia: datos.vigencia || new Date().getFullYear(),
      fechaCorte: datos.fechaCorte,
      dependenciaResponsable: datos.dependenciaResponsable || '',
      riesgosExtremos: riesgoExt,
      riesgosAltos: riesgoAlt,
      riesgosModerados: riesgoMod,
      riesgosBajos: riesgoBaj,
      totalRiesgos: totalRiesgosCalc,
      requerimientoComite: datos.requerimientoComite || false,
      requerimientoEntesReg: datos.requerimientoEntesReg || false,
      fechaUltimaAuditoria: datos.fechaUltimaAuditoria ?? undefined,
      resultadoUltimaAuditoria: datos.resultadoUltimaAuditoria,
      criticidad: datos.criticidad || 0,
      exposicion: datos.exposicion || 0,
      mitigantes: datos.mitigantes || 0,
      scoreRiesgo: datos.scoreRiesgoCEM || 0,
      ponderacionRiesgo: datos.ponderacionRiesgo as any,
      // Criterios de priorización DAFP (migración 179)
      tiempoUltimaAuditoria: tiempo,
      temasAltaDireccion: ad,
      objetivosEstrategicos: obj,
      hallazgosAnteriores: hall,
      ponderacionFinalDafp: ponderacionFinalDafp,
      nivelCriticidadDafp: nivelCriticidadDafp,
      cicloRotacionDafp: cicloRotacionDafp,
      decisionFinal: datos.decisionFinal,
      motivoDecision: datos.motivoDecision,
      prioridadRegla: datos.prioridadRegla,
    };

    await editarEvaluacion(evaluacionId, evaluacionData);
    // ✅ Siempre refetch para sincronizar la tabla (el hook ya gestiona el toast)
    await refetchEvaluaciones();
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* INDICADOR DE ESTADO DE CONEXIÓN */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {error && (!error.includes('permisos') || (error.includes('auditoria') && tabActiva !== 'programa')) && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-sm transition-all">
          <div className="flex items-center gap-2 text-amber-700">
            <WifiOff className="w-4 h-4" />
            <span className="font-bold text-amber-700">Sin conexión al servidor</span>
            <span className="text-amber-600">— {error}</span>
          </div>
          <button
            onClick={() => { refetchProcesos(); refetchAuditorias(); refetchEvaluaciones(); }}
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
      <div className="flex-shrink-0 px-3 pt-3">
        <ModuleHeaderBar
          title={modoSeguimiento ? `Seguimiento y Evaluación — ${vigencia}` : `Programa de Auditoría ${vigencia}`}
          subtitle={modoSeguimiento
            ? 'Visualización y seguimiento de auditorías del Universo'
            : 'Gestión integral del universo auditable y programa anual'}
          icon={<Layers className="w-5 h-5 text-white" />}
          color="#003DA5"
          rightContent={
            onVolver ? (
              <button
                onClick={onVolver}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
              >
                Volver
              </button>
            ) : undefined
          }
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CONTENIDO */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Tabs - dentro del área de contenido, separados del título */}
        <div className="mb-3">
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-gray-100 border border-gray-200">
            <button
              onClick={() => setTabActiva('universo')}
              className={`px-4 py-2 rounded-md font-semibold text-sm transition-all flex items-center gap-1.5 ${
                tabActiva === 'universo'
                  ? 'bg-[#1e5da8] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              Universo Auditable
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                tabActiva === 'universo' ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {estadisticasEvaluaciones.totalProcesos}
              </span>
            </button>
            <button
              onClick={() => setTabActiva('programa')}
              className={`px-4 py-2 rounded-md font-semibold text-sm transition-all flex items-center gap-1.5 ${
                tabActiva === 'programa'
                  ? 'bg-[#1e5da8] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-white'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              Programa Anual
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                tabActiva === 'programa' ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {estadisticas.totalProgramadas}
              </span>
            </button>
            <button
              onClick={() => setTabActiva('profesionales')}
              className={`px-4 py-2 rounded-md font-semibold text-sm transition-all flex items-center gap-1.5 ${
                tabActiva === 'profesionales'
                  ? 'bg-[#1e5da8] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-white'
              }`}
            >
              <Users className="w-4 h-4" />
              Profesionales
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                tabActiva === 'profesionales' ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {loadingProfesionales ? '...' : profesionalesOCI.length}
              </span>
            </button>
          </div>
        </div>
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
                procesos={evaluacionesFiltradas}
                estadisticas={estadisticasEvaluaciones}
                vigencia={vigencia}
                filtroRiesgo={filtroNivelRiesgo}
                filtroTipo={filtroTipoProceso}
                busqueda={busqueda}
                onFiltroRiesgoChange={setFiltroNivelRiesgo}
                onFiltroTipoChange={setFiltroTipoProceso}
                onBusquedaChange={setBusqueda}
                onAgregarProceso={() => {
                  setProcesoSeleccionado(null);
                  setEvaluacionSeleccionada(null);
                  setMostrarFormularioProceso(true);
                }}
                onEditarProceso={(filaEvaluacion) => {
                  const procesoMaestro = procesosMap.get(filaEvaluacion._backendId || '');
                  if (procesoMaestro) setProcesoSeleccionado(procesoMaestro);
                  const evOriginal = evaluaciones.find(e => e.id === (filaEvaluacion as any).idEvaluacion);
                  if (evOriginal) setEvaluacionSeleccionada(evOriginal);
                  setMostrarFormularioProceso(true);
                }}
                onEliminarProceso={async (evaluacionId) => {
                  await eliminarEvaluacion(evaluacionId);
                }}
                onGuardarEvaluacion={async (evaluacionId, datos) => {
                  await editarEvaluacion(evaluacionId, datos);
                  return true;
                }}
                onRefresh={async () => {
                  await refetchProcesos();
                  await refetchEvaluaciones();
                }}
                puedeCrear={!modoSeguimiento && puedeCrearProceso}
                puedeEditar={!modoSeguimiento && puedeEditarProceso}
                puedeEliminar={!modoSeguimiento && puedeEliminarProceso}
              />
            )}
            {tabActiva === 'programa' && (
              <TabProgramaAnual
                key="programa"
                auditorias={auditoriasProgramadas}
                estadisticas={estadisticas}
                mostrarFormulario={mostrarFormulario}
                setMostrarFormulario={setMostrarFormulario}
                puedeCrear={!modoSeguimiento}
                puedeCrearAuditoria={puedeRealizar('auditorias', 'create')}
                error={errorAuditorias}
                onRefresh={refetchAuditorias}
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
      {mostrarFormulario && (
        <FormularioAuditoriaUnificado
          open={mostrarFormulario}
          onClose={() => setMostrarFormulario(false)}
          initialData={{
            vinculadaPlanAnual: true,
            planAnualId: planAnualId ?? '',
            planAnualAño: vigencia,
          }}
          onSubmit={async (data: AuditoriaUnificadaFormData) => {
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
              ...(data.responsableArea && {
                responsableAreaIdPersona: data.responsableArea.idPersona,
                responsableAreaNombre: data.responsableArea.nombre,
                responsableAreaCargo: data.responsableArea.cargo || 'Responsable de Área Auditada',
                responsableAreaEmail: data.responsableArea.email,
              }),
              fechaInicio: data.fechaInicioPlaneacion || data.fechaInicio || new Date().toISOString().split('T')[0],
              fechaFinPlaneacion: data.fechaFinPlaneacion,
              fechaInicioEjecucion: data.fechaInicioEjecucion,
              fechaFinEjecucion: data.fechaFinEjecucion,
              fechaInicioComunicacion: data.fechaInicioComunicacion,
              fechaFin: data.fechaFinComunicacion || data.fechaFin || new Date().toISOString().split('T')[0],
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
              vinculadaPlanAnual: data.vinculadaPlanAnual ?? true,
              planAnualId: data.planAnualId ?? planAnualId,
              planAnualAño: data.planAnualAño ?? vigencia,
              rolDecretoAsociado: data.rolDecretoAsociado,
              estadoKanban: data.estadoKanban || 'Plan Anual',
              incluirHallazgosPreliminares: data.incluirHallazgosPreliminares,
              hallazgos: data.hallazgos,
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
          key={evaluacionSeleccionada ? evaluacionSeleccionada.id : `nueva-${procesoSeleccionado?.id ?? 'p'}`}
          open={mostrarFormularioProceso}
          onClose={() => {
            setMostrarFormularioProceso(false);
            setProcesoSeleccionado(null);
            setEvaluacionSeleccionada(null);
          }}
          onSubmit={async (proceso, procesoIdSeleccionado) => {
            // ✅ FIX: Universo Auditable crea EVALUACIONES, no procesos
            // El proceso maestro viene del catálogo (Configuración → Procesos)
            // Aquí se crean evaluaciones DAFP del proceso seleccionado
            // ✅ CRÍTICO: await para que el guardado se complete ANTES de cerrar el modal
            if (evaluacionSeleccionada) {
              // Modo EDIT: actualizar evaluación existente
              await handleEditarEvaluacion(proceso, evaluacionSeleccionada.id);
            } else {
              // Modo CREATE: crear nueva evaluación para el proceso seleccionado
              await handleAgregarEvaluacion(proceso, procesoIdSeleccionado || procesoSeleccionado?.id);
            }
            setMostrarFormularioProceso(false);
            setProcesoSeleccionado(null);
            setEvaluacionSeleccionada(null);
          }}
          procesoInicial={convertirProcesoAFormulario(procesoSeleccionado, evaluacionSeleccionada)}
          mode={evaluacionSeleccionada ? 'edit' : 'create'}
          procesosCatalog={(() => {
                  const espIds = loadEspIds();
                  const tiposList = loadTipos();
                  const resolverLabel = (value: string) =>
                    tiposList.find(t => t.value === (value || '').toLowerCase())?.label || value;
                  return procesos.map(p => {
                    // Obtener TODAS las unidades auditables del proceso (no solo la primera)
                    const unidades = (p as any).unidadesAuditables || (p as any)._unidadesAuditables || [];
                    const unidadesStr = unidades.length > 0
                      ? unidades.map((u: any) => u.nombre || u).filter(Boolean).join('; ')
                      : p.macroproceso || p._macroproceso || '';
                    // Dependencia: usar el valor completo que viene de Configuración (ya separado por '; ')
                    const depStr = p._dependencia || p.dependenciaResponsable || '';
                    return {
                      id: p.id,
                      nombre: p.nombre,
                      codigo: p.codigo,
                      macroproceso: unidadesStr,
                      dependencia: depStr,
                      tipo: resolverLabel(p.tipo || ''),
                      esEspecial: espIds.has(p.id),
                    };
                  });
                })()}
          vigenciaPlan={vigencia}
          fechaCortePlan={`${vigencia}-12-31`}
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
  // ✅ Nueva prop para guardar evaluaciones DAFP directamente al backend
  onGuardarEvaluacion?: (id: string, datos: any) => Promise<boolean>;
  // ✅ Nueva prop para recargar datos
  onRefresh?: () => void;
  // ✅ PERMISOS - Control de visibilidad de acciones
  puedeCrear?: boolean;
  puedeEditar?: boolean;
  puedeEliminar?: boolean;
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
  onEliminarProceso,
  onGuardarEvaluacion,
  onRefresh,
  puedeCrear = true,
  puedeEditar = true,
  puedeEliminar = true
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
      onGuardarEvaluacion={onGuardarEvaluacion}
      onRefresh={onRefresh}
      puedeCrear={puedeCrear}
      puedeEditar={puedeEditar}
      puedeEliminar={puedeEliminar}
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
  /** Cuando false oculta el botón de crear nueva auditoría */
  puedeCrear?: boolean;
  /** Permiso específico para crear auditorías */
  puedeCrearAuditoria?: boolean;
  /** Error opcional para mostrar banner de acceso restringido */
  error?: string | null;
  /** Función para reintentar la carga */
  onRefresh?: () => void;
}

function TabProgramaAnual({ 
  auditorias, 
  estadisticas, 
  mostrarFormulario, 
  setMostrarFormulario, 
  puedeCrear = true,
  puedeCrearAuditoria = false,
  error = null,
  onRefresh
}: TabProgramaAnualProps) {
  const [vistaProgramaAnual, setVistaProgramaAnual] = useState<'lista' | 'cronograma'>('cronograma'); // 🆕 Estado para alternar vista
  
  const getColorEstado = (auditoria: AuditoriaProgramada) => {
    const kanban = (auditoria.estadoKanban || '').toLowerCase().trim();
    if (kanban === 'plan anual') return { bg: '#EDE9FE', text: '#5B21B6', icon: Clock, label: 'Plan Anual' };
    if (kanban === 'planeación' || kanban === 'planeacion') return { bg: '#DBEAFE', text: '#1E40AF', icon: Clock, label: 'Planeación' };
    if (kanban === 'ejecución' || kanban === 'ejecucion') return { bg: '#FEF08A', text: '#854D0E', icon: Activity, label: 'Ejecución' };
    if (kanban === 'comunicación' || kanban === 'comunicacion') return { bg: '#D1FAE5', text: '#065F46', icon: CheckCircle2, label: 'Comunicación' };
    if (kanban === 'seguimiento') return { bg: '#E0F2FE', text: '#075985', icon: TrendingUp, label: 'Seguimiento' };
    if (kanban === 'finalizada') return { bg: '#F0FDF4', text: '#166534', icon: CheckCircle2, label: 'Finalizada' };
    // Fallback por estado UI
    const colores: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      'PROGRAMADA': { bg: '#DBEAFE', text: '#1E40AF', icon: Clock, label: 'Planeación' },
      'EN_EJECUCION': { bg: '#FEF08A', text: '#854D0E', icon: Activity, label: 'Ejecución' },
      'COMPLETADA': { bg: '#D1FAE5', text: '#065F46', icon: CheckCircle2, label: 'Completada' },
      'CANCELADA': { bg: '#FEE2E2', text: '#991B1B', icon: X, label: 'Cancelada' }
    };
    return colores[auditoria.estado] || colores['PROGRAMADA'];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* 🚨 BANNER DE ERROR ESPECÍFICO DE PERMISOS PARA AUDITORÍAS */}
      {error && error.includes('permisos') && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3 flex items-center justify-between text-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-red-700">
            <div className="p-1.5 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-red-800 text-base">Acceso Restringido</p>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-bold transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </button>
          )}
        </div>
      )}
      {/* Estadísticas del programa */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border-2 border-blue-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-blue-700">Total de auditorías</span>
            <CalendarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-blue-700">{estadisticas.totalProgramadas}</p>
          <p className="mt-2 text-xs text-gray-600 leading-relaxed">
            Mismo universo que el tablero Kanban:{' '}
            <span className="font-semibold text-gray-800">
              {estadisticas.enPlanAnual + estadisticas.enPlaneacion} planeación
            </span>
            {' · '}
            <span className="font-semibold text-gray-800">{estadisticas.enEjecucion} ejecución</span>
            {' · '}
            <span className="font-semibold text-gray-800">{estadisticas.enComunicacion} comunicación</span>
            {' · '}
            <span className="font-semibold text-gray-800">{estadisticas.enSeguimiento} seguimiento</span>
            {' · '}
            <span className="font-semibold text-gray-800">{estadisticas.completadas} finalizadas</span>
          </p>
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
              
              {puedeCrear && (
                <button
                  onClick={() => {
                    if (puedeCrearAuditoria) {
                      setMostrarFormulario(true);
                    } else {
                      toast.error('No cuentas con los permisos necesarios para realizar esta acción.');
                    }
                  }}
                  className={`px-4 py-2 bg-gradient-to-r ${puedeCrearAuditoria ? 'from-blue-600 to-blue-700 hover:shadow-lg' : 'from-gray-400 to-gray-500 cursor-not-allowed'} text-white rounded-lg font-semibold flex items-center gap-2 transition-all`}
                >
                  {puedeCrearAuditoria ? <Plus className="w-4 h-4" /> : <Layers className="w-4 h-4 opacity-50" />}
                  {puedeCrearAuditoria ? 'Programar Auditoría' : 'Acceso Restringido'}
                </button>
              )}
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
                const colorEstado = getColorEstado(auditoria);
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
                            {colorEstado.label}
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
                            <span className="ml-2 font-semibold text-gray-900">{typeof auditoria.auditorLider === 'string' ? auditoria.auditorLider : (auditoria.auditorLider as any)?.nombre || 'No asignado'}</span>
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
                      {auditoria.auditoriaOCIId && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          Vinculada OCI
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
// TAB 3: PROFESIONALES (conectado con backend de configuración OCI)
// ════════════════════════════════════════════════════════════════════════════

interface TabProfesionalesProps {
  auditorias: AuditoriaProgramada[];
  estadisticas: Estadisticas;
}

function TabProfesionales({ auditorias, estadisticas }: TabProfesionalesProps) {
  // ✅ HOOK DE BACKEND - Carga profesionales configurados en OCI
  const {
    profesionalesOCI,
    estadisticasGlobales,
    loading: loadingProfesionales,
    error: errorProfesionales,
    cargarDatos: refetchProfesionales
  } = useConfiguracionProfesionales();

  // ✅ Calcular carga REAL de cada profesional a partir de las auditorías asignadas
  const profesionalesConCarga = useMemo(() => {
    // Helper para extraer nombre de un elemento del equipo (puede ser string u objeto)
    const extraerNombre = (e: unknown): string => {
      if (typeof e === 'string') return e.toLowerCase().trim();
      if (e && typeof e === 'object' && 'nombre' in e) return String((e as any).nombre).toLowerCase().trim();
      return '';
    };
    const extraerId = (e: unknown): string => {
      if (typeof e === 'string') return e;
      if (e && typeof e === 'object' && 'id' in e) return String((e as any).id);
      return '';
    };

    return profesionalesOCI.map(p => {
      const nombreBusqueda = p.usuario.nombre.toLowerCase().trim();
      const configId = String(p.configuracion.id || '').trim();
      const idTercero = String(p.configuracion.idTercero).trim();
      const identificacion = String(p.usuario.identificacion || '').trim();

      /**
       * Helper para verificar si un profesional coincide con los datos de una auditoría
       */
      const esMismoProfesional = (pId: string, pNombre: string): boolean => {
        // 1. Coincidencia por ID (UUID de tercero, ID de configuración o CC/Identificación)
        if (pId) {
          const idNorm = pId.trim();
          if (idNorm === idTercero || idNorm === configId || (identificacion && idNorm === identificacion)) {
            return true;
          }
        }

        // 2. Coincidencia por Nombre
        if (pNombre && nombreBusqueda) {
          const nombreNorm = pNombre.toLowerCase().trim();
          if (nombreNorm === nombreBusqueda) return true;
          
          // Coincidencias parciales significativas
          if (nombreNorm.includes(nombreBusqueda) || nombreBusqueda.includes(nombreNorm)) {
            return true;
          }

          // Coincidencia por tokens (ej: "Mario Bernal" coincide con "Mario Oswaldo Bernal Rodríguez")
          const tokensBusqueda = nombreBusqueda.split(/\s+/).filter(t => t.length > 2);
          const tokensNombre = nombreNorm.split(/\s+/).filter(t => t.length > 2);
          const comunes = tokensBusqueda.filter(t => tokensNombre.includes(t));
          
          if (comunes.length >= 2) return true;
        }

        return false;
      };

      // Auditorías donde este profesional es líder
      const comoLider = auditorias.filter(a => {
        const liderNombre = typeof a.auditorLider === 'string' ? a.auditorLider : (a.auditorLider as any)?.nombre || '';
        const liderId = typeof a.auditorLider === 'string' ? a.auditorLider : (a.auditorLider as any)?.id || (a.auditorLider as any)?.idTercero || '';
        
        return esMismoProfesional(liderId, liderNombre);
      });

      // Auditorías donde este profesional está en el equipo
      const comoEquipo = auditorias.filter(a => {
        if (comoLider.some(l => l.id === a.id)) return false; // No contar doble
        
        const equipo = a.equipo || [];
        return equipo.some(e => {
          const miembroNombre = extraerNombre(e);
          const miembroId = extraerId(e);
          return esMismoProfesional(miembroId, miembroNombre);
        });
      });

      // Auditorías donde este profesional es supervisor (Rol típico del Jefe OCI)
      const comoSupervisor = auditorias.filter(a => {
        if (comoLider.some(l => l.id === a.id) || comoEquipo.some(e => e.id === a.id)) return false;
        
        const supervisorNombre = (a as any).supervisorAsignado || '';
        const supervisorId = String((a as any).supervisorAsignadoId || '').trim();
        
        return esMismoProfesional(supervisorId, supervisorNombre);
      });

      const auditoriasTotales = comoLider.length + comoEquipo.length + comoSupervisor.length;
      const horasAsignadas = [...comoLider, ...comoEquipo, ...comoSupervisor].reduce((total, a) => {
        const horas = a.horasEstimadas || 40;
        return total + horas;
      }, 0);

      // ✅ FIX: El programa es ANUAL (Vigencia), pero la configuración es MENSUAL.
      // Debemos comparar totales anuales contra capacidad anual (mensual * 12).
      const MESES_VIGENCIA = 12;

      // Porcentaje de carga: auditorías asignadas vs capacidad máxima ANUAL
      const capacidadMensual = p.configuracion.capacidadMaximaAuditorias || 4;
      const capacidadAnual = capacidadMensual * MESES_VIGENCIA;
      const porcentajePorAuditorias = Math.round((auditoriasTotales / capacidadAnual) * 100);

      // También considerar horas: horasAsignadas vs horas ANUALES disponibles
      const horasMensualesDisponibles = p.configuracion.horasMensualesDisponibles || 150;
      const horasAnualesDisponibles = horasMensualesDisponibles * MESES_VIGENCIA;
      const porcentajePorHoras = horasAnualesDisponibles > 0 ? Math.round((horasAsignadas / horasAnualesDisponibles) * 100) : 0;

      // Usar el mayor de los dos porcentajes como indicador de carga
      const porcentajeCarga = Math.max(porcentajePorAuditorias, porcentajePorHoras);

      return {
        ...p,
        estadisticas: {
          auditoriasTotales,
          auditoriasComoLider: comoLider.length,
          auditoriasComoEquipo: comoEquipo.length,
          auditoriasComoSupervisor: comoSupervisor.length,
          cargaPonderada: (porcentajeCarga / 100) * capacidadMensual,
          porcentajeCarga,
          horasAsignadas,
          capacidadAnual,
          horasAnualesDisponibles,
        },
      };
    });
  }, [profesionalesOCI, auditorias]);

  // Calcular semáforo de carga para cada profesional
  const profesionalesConSemaforo = useMemo(() => {
    return profesionalesConCarga.map(p => {
      const porcentaje = p.estadisticas.porcentajeCarga;
      const semaforo = porcentaje > 90 ? 'rojo' : porcentaje >= 70 ? 'amarillo' : 'verde';
      return { ...p, semaforo, porcentaje };
    }).sort((a, b) => b.porcentaje - a.porcentaje);
  }, [profesionalesConCarga]);

  const totalProfesionales = profesionalesConCarga.length;
  const conCargaAlta = profesionalesConSemaforo.filter(p => p.semaforo === 'rojo').length;
  const conCargaMedia = profesionalesConSemaforo.filter(p => p.semaforo === 'amarillo').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-5"
    >
      {/* Estadísticas de profesionales — compactas, alineadas con Config */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-blue-700">Profesionales Activos</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700">{totalProfesionales}</p>
          <p className="text-[11px] text-blue-600 mt-0.5">con asignaciones en el programa</p>
        </div>

        <div className="bg-white rounded-xl border border-yellow-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-yellow-700">Carga Media</span>
            <Clock className="w-4 h-4 text-yellow-600" />
          </div>
          <p className="text-2xl font-black text-yellow-700">{conCargaMedia}</p>
          <p className="text-[11px] text-yellow-600 mt-0.5">profesionales en alerta</p>
        </div>

        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-red-700">Carga Alta</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-black text-red-700">{conCargaAlta}</p>
          <p className="text-[11px] text-red-600 mt-0.5">requieren balance de carga</p>
        </div>
      </div>

      {/* Estado de carga */}
      {loadingProfesionales && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-2" />
          <span className="text-gray-600">Cargando profesionales desde el servidor...</span>
        </div>
      )}

      {/* Error de carga */}
      {errorProfesionales && !loadingProfesionales && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{errorProfesionales}</span>
          </div>
          <button
            onClick={() => refetchProfesionales()}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-semibold flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        </div>
      )}

      {/* Lista de profesionales */}
      {!loadingProfesionales && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Equipo OCI Configurado
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Profesionales configurados con su rol, especialidades y carga real
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {profesionalesConSemaforo.map((p) => {
              const getColorCarga = (sem: string) => {
                if (sem === 'rojo') return { border: 'border-red-300', bg: 'bg-red-50', text: 'text-red-700', bar: 'from-red-400 to-red-500' };
                if (sem === 'amarillo') return { border: 'border-yellow-300', bg: 'bg-yellow-50', text: 'text-yellow-700', bar: 'from-yellow-400 to-amber-500' };
                return { border: 'border-green-300', bg: 'bg-green-50', text: 'text-green-700', bar: 'from-green-400 to-green-500' };
              };
              const color = getColorCarga(p.semaforo);

              return (
                <div
                  key={p.configuracion.id || p.usuario.id}
                  className={`border ${color.border} rounded-xl p-4 hover:shadow-md transition-all`}
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Info del profesional */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 bg-gradient-to-br ${
                        p.semaforo === 'rojo' ? 'from-red-500 to-red-600' :
                        p.semaforo === 'amarillo' ? 'from-yellow-500 to-amber-600' :
                        'from-blue-500 to-blue-600'
                      }`}>
                        {p.usuario.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{p.usuario.nombre}</p>
                        <p className="text-xs text-blue-700 font-semibold">{p.configuracion.rolOCI}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.configuracion.especialidades.slice(0, 2).map((esp, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                              {esp}
                            </span>
                          ))}
                          {p.configuracion.especialidades.length > 2 && (
                            <span className="px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded text-[10px]">
                              +{p.configuracion.especialidades.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Badges + carga */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {p.configuracion.puedeSerLider && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-200">
                          ★ Líder
                        </span>
                      )}
                      <div className="text-right">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${color.bg} ${color.text}`}>
                          {p.porcentaje}% carga
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de progreso + info */}
                  <div className="mt-3">
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all rounded-full bg-gradient-to-r ${color.bar}`}
                        style={{ width: `${Math.min(p.porcentaje, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[11px] text-gray-500">
                      <span>
                        <strong className="text-gray-700">{p.estadisticas.auditoriasTotales}</strong> auditoría(s) • <strong className="text-gray-700">{p.estadisticas.horasAsignadas}h</strong> asignadas en la vigencia
                      </span>
                      <span>
                        Meta Anual: {p.estadisticas.capacidadAnual} aud. • {p.estadisticas.horasAnualesDisponibles}h/año
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {profesionalesConSemaforo.length === 0 && !loadingProfesionales && (
              <div className="text-center py-10">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-semibold">No hay profesionales configurados en OCI</p>
                <p className="text-sm text-gray-400 mt-1">Configure profesionales en Configuraciones → Profesionales OCI</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Banner de enlace a Configuraciones */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Para editar perfiles, capacidades y roles del equipo OCI, ve a <strong>Configuraciones → Profesionales OCI</strong> (menú lateral).
        </p>
      </div>
    </motion.div>
  );
}

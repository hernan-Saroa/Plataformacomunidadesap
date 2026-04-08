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
// ✅ HOOK DE EVALUACIONES DAFP (nueva funcionalidad)
import { useEvaluacionesProcesoData, type EvaluacionProcesoUI } from './hooks/useEvaluacionesProcesoData';
// ✅ SERVICIO DE EXPORTACIÓN PDF
import { exportarUniversoAuditablePDF, exportarUniversoAuditableExcel } from './services/exportarUniversoAuditablePDF';
// ✅ UTILIDAD DE CONVERSIÓN (separada para reutilización)
import { convertirProcesoAFormularioDafp as convertirProcesoAFormulario } from './utils/procesoAuditableConverters';
// ✅ HOOK DE CONFIGURACIÓN DE PROFESIONALES OCI (backend)
import { useConfiguracionProfesionales, type ProfesionalOCI } from './services/useConfiguracionProfesionales';
// ✅ HOOK DE PERMISOS FLEXIBLE
import { useControlInternoPermissions } from './hooks/useControlInternoPermissions';

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
  /** Modo solo seguimiento: arranca en pestaña Programa y oculta botones de creación */
  modoSeguimiento?: boolean;
}

export function UniversoAuditableUnificado({ vigencia = 2026, onVolver, modoSeguimiento = false }: UniversoAuditableUnificadoProps) {
  const [tabActiva, setTabActiva] = useState<TabActiva>(modoSeguimiento ? 'programa' : 'universo');
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
  } = useProgramaAnualData({ vigencia, procesos });

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

  // ✅ MAPA de procesos por ID para lookup rápido
  const procesosMap = useMemo(() => {
    const map = new Map<string, ProcesoAuditable>();
    procesos.forEach(p => map.set(p.id, p));
    return map;
  }, [procesos]);

  // ✅ Convertir evaluaciones DAFP registradas a filas de la tabla.
  // Solo muestra procesos que hayan sido evaluados por el formulario DAFP.
  const evaluacionesComoFilas = useMemo((): ProcesoAuditable[] => {
    const nivelRiesgoMap: Record<string, NivelRiesgo> = {
      'Extremo': 'Crítico', 'Alto': 'Alto', 'Moderado': 'Medio', 'Bajo': 'Bajo',
    };
    const mapPonderacion: Record<string, NivelRiesgo> = {
      'EXTREMO': 'Crítico', 'ALTO': 'Alto', 'MODERADO': 'Medio', 'BAJO': 'Bajo', 'MUY BAJO': 'Bajo',
    };

    return evaluaciones.map(ev => {
      const proceso = procesosMap.get(ev.procesoId);
      const nivelRiesgo = nivelRiesgoMap[ev.nivelCriticidadDafp || ''] || mapPonderacion[ev.ponderacionRiesgo || ''] || 'Medio';
      const scoreCalculado = ev.ponderacionFinalDafp ? +(ev.ponderacionFinalDafp * 20).toFixed(0) : (ev.scoreRiesgo || 0);
      const frecuencia = ev.cicloRotacionDafp || ev.planRotacion || 'Anual';
      return {
        id: ev.id,
        nombre: proceso?.nombre || ev.nombreProceso || '',
        tipo: proceso?.tipo || 'Apoyo' as any,
        descripcion: `Vigencia ${ev.vigencia} — Corte ${ev.fechaCorte}`,
        responsable: ev.dependenciaResponsable || proceso?.responsable || '',
        nivelRiesgo,
        puntajeRiesgo: scoreCalculado,
        calificacionDafp: ev.prioridadRegla || 0,
        categoria: ev.decisionFinal || '',
        auditable: ev.decisionFinal === 'INCLUIR PLAN ANUAL',
        ultimaAuditoria: ev.fechaUltimaAuditoria,
        resultadoUltimaAuditoria: ev.resultadoUltimaAuditoria,
        frecuenciaAuditoria: frecuencia as any,
        activo: ev.activo ?? proceso?.activo,
        codigo: proceso?.codigo || '',
        macroproceso: proceso?.macroproceso || '',
        tipoProceso: proceso?.tipo || 'Apoyo' as any,
        dependenciaResponsable: ev.dependenciaResponsable || proceso?.dependenciaResponsable || '',
        scoreRiesgo: scoreCalculado,
        frecuenciaSugerida: frecuencia,
        horasEstimadas: 0,
        _backendId: ev.procesoId,
        _evaluacionRiesgo: {
          riesgosExtremos: ev.riesgosExtremos, riesgosAltos: ev.riesgosAltos,
          riesgosModerados: ev.riesgosModerados, riesgosBajos: ev.riesgosBajos,
          totalRiesgos: ev.totalRiesgos,
          requerimientoComite: ev.requerimientoComite, requerimientoEntesReg: ev.requerimientoEntesReg,
          fechaUltimaAuditoria: ev.fechaUltimaAuditoria, resultadoUltimaAuditoria: ev.resultadoUltimaAuditoria,
          ponderacionRiesgo: ev.ponderacionRiesgo,
          criticidad: ev.criticidad, exposicion: ev.exposicion, mitigantes: ev.mitigantes, scoreRiesgo: ev.scoreRiesgo,
          tiempoUltimaAuditoria: ev.tiempoUltimaAuditoria, temasAltaDireccion: ev.temasAltaDireccion,
          objetivosEstrategicos: ev.objetivosEstrategicos, hallazgosAnteriores: ev.hallazgosAnteriores,
          ponderacionFinalDafp: ev.ponderacionFinalDafp, nivelCriticidadDafp: ev.nivelCriticidadDafp,
          cicloRotacionDafp: ev.cicloRotacionDafp,
          decisionFinal: ev.decisionFinal, motivoDecision: ev.motivoDecision, prioridadRegla: ev.prioridadRegla,
          vigencia: ev.vigencia, fechaCorte: ev.fechaCorte,
        } as any,
      } as ProcesoAuditable;
    });
  }, [evaluaciones, procesosMap]);

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
    const riCuan = riesgoExt >= 1 ? 5 : riesgoAlt >= 1 ? 4 : riesgoMod >= 1 ? 3 : riesgoBaj >= 1 ? 2 : 0;
    const tiempo = datos.tiempoUltimaAuditoria || 0;
    const ad = datos.temasAltaDireccion || 0;
    const obj = datos.objetivosEstrategicos || 0;
    const hall = datos.hallazgosAnteriores || 0;
    
    let ponderacionFinalDafp = 0;
    let nivelCriticidadDafp = '';
    let cicloRotacionDafp = '';
    
    if (totalRiesgos > 0 && tiempo > 0 && ad > 0 && obj > 0 && hall > 0) {
      ponderacionFinalDafp = +(riCuan * 0.4 + tiempo * 0.1 + ad * 0.1 + obj * 0.1 + hall * 0.3).toFixed(2);
      if (ponderacionFinalDafp >= 4.0) nivelCriticidadDafp = 'Extremo';
      else if (ponderacionFinalDafp >= 3.5) nivelCriticidadDafp = 'Alto';
      else if (ponderacionFinalDafp >= 3.0) nivelCriticidadDafp = 'Moderado';
      else nivelCriticidadDafp = 'Bajo';
      
      if (nivelCriticidadDafp === 'Extremo') cicloRotacionDafp = 'Cada año';
      else if (nivelCriticidadDafp === 'Alto' || nivelCriticidadDafp === 'Moderado') cicloRotacionDafp = 'Cada 2 años';
      else cicloRotacionDafp = 'Cada 3 años';
    }

    console.log('[handleAgregarEvaluacion] Guardando evaluación con datos:', {
      procesoId,
      riesgos: { riesgosExtremos: riesgoExt, riesgosAltos: riesgoAlt, riesgosModerados: riesgoMod, riesgosBajos: riesgoBaj, totalRiesgos },
      criterios: { tiempoUltimaAuditoria: tiempo, temasAltaDireccion: ad, objetivosEstrategicos: obj, hallazgosAnteriores: hall },
      resultado: { ponderacionFinalDafp, nivelCriticidadDafp, cicloRotacionDafp }
    });

    const evaluacionData: Partial<EvaluacionProcesoUI> = {
      procesoId,
      vigencia: Number(datos.vigencia) || new Date().getFullYear(),
      fechaCorte: datos.fechaCorte || new Date().toISOString().split('T')[0],
      dependenciaResponsable: datos.dependenciaResponsable || proceso?.nombre || 'Sin dependencia',
      riesgosExtremos: Number(riesgoExt),
      riesgosAltos: Number(riesgoAlt),
      riesgosModerados: Number(riesgoMod),
      riesgosBajos: Number(riesgoBaj),
      totalRiesgos: Number(totalRiesgos),
      requerimientoComite: Boolean(datos.requerimientoComite),
      requerimientoEntesReg: Boolean(datos.requerimientoEntesReg),
      fechaUltimaAuditoria: datos.fechaUltimaAuditoria || null,
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
      cicloRotacionDafp: cicloRotacionDafp || 'Anual',
      decisionFinal: datos.decisionFinal || 'AUDITORÍA POSTERIOR',
      motivoDecision: datos.motivoDecision || '',
      prioridadRegla: Number(datos.prioridadRegla) || 5,
    };
    
    console.log('[handleAgregarEvaluacion] Evaluacion lista para guardar:', evaluacionData);

    const result = await agregarEvaluacion(evaluacionData);
    console.log('[handleAgregarEvaluacion] Resultado:', result);
    if (result) {
      console.log('[handleAgregarEvaluacion] Ejecutando refetchEvaluaciones...');
      await refetchEvaluaciones();
      console.log('[handleAgregarEvaluacion] Refetch completado');
      toast.success('Evaluación creada exitosamente');
    }
  };

  const handleEditarEvaluacion = async (datos: ProcesoAuditableData, evaluacionId: string) => {
    const riesgoExt = datos.riesgosExtremos || 0;
    const riesgoAlt = datos.riesgosAltos || 0;
    const riesgoMod = datos.riesgosModerados || 0;
    const riesgoBaj = datos.riesgosBajos || 0;
    const totalRiesgosCalc = riesgoExt + riesgoAlt + riesgoMod + riesgoBaj;
    
    // Calcular ponderación DAFP si tenemos todos los criterios
    const riCuan = riesgoExt >= 1 ? 5 : riesgoAlt >= 1 ? 4 : riesgoMod >= 1 ? 3 : riesgoBaj >= 1 ? 2 : 0;
    const tiempo = datos.tiempoUltimaAuditoria || 0;
    const ad = datos.temasAltaDireccion || 0;
    const obj = datos.objetivosEstrategicos || 0;
    const hall = datos.hallazgosAnteriores || 0;
    
    let ponderacionFinalDafp = 0;
    let nivelCriticidadDafp = '';
    let cicloRotacionDafp = '';
    
    if (totalRiesgosCalc > 0 && tiempo > 0 && ad > 0 && obj > 0 && hall > 0) {
      ponderacionFinalDafp = +(riCuan * 0.4 + tiempo * 0.1 + ad * 0.1 + obj * 0.1 + hall * 0.3).toFixed(2);
      if (ponderacionFinalDafp >= 4.0) nivelCriticidadDafp = 'Extremo';
      else if (ponderacionFinalDafp >= 3.5) nivelCriticidadDafp = 'Alto';
      else if (ponderacionFinalDafp >= 3.0) nivelCriticidadDafp = 'Moderado';
      else nivelCriticidadDafp = 'Bajo';
      
      if (nivelCriticidadDafp === 'Extremo') cicloRotacionDafp = 'Cada año';
      else if (nivelCriticidadDafp === 'Alto' || nivelCriticidadDafp === 'Moderado') cicloRotacionDafp = 'Cada 2 años';
      else cicloRotacionDafp = 'Cada 3 años';
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
      fechaUltimaAuditoria: datos.fechaUltimaAuditoria || undefined,
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
    await refetchEvaluaciones();
    toast.success('Evaluación actualizada');
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
                {modoSeguimiento ? `Seguimiento y Evaluación — Auditorías ${vigencia}` : `Programa de Auditoría ${vigencia}`}
              </h1>
              <p className="text-gray-600 text-lg">
                {modoSeguimiento
                  ? 'Visualización y seguimiento de auditorías del Universo — Rol 4: Evaluación y Seguimiento'
                  : 'Gestión integral del universo auditable y programa anual de auditorías'}
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
                {loadingProfesionales ? '...' : profesionalesOCI.length}
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
                procesos={evaluacionesFiltradas}
                estadisticas={estadisticasEvaluaciones}
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
                  // Buscar el proceso maestro para pre-llenar el formulario
                  const procesoMaestro = procesosMap.get(filaEvaluacion._backendId || '');
                  if (procesoMaestro) setProcesoSeleccionado(procesoMaestro);
                  // Guardar referencia a la evaluación que se edita
                  const evOriginal = evaluaciones.find(e => e.id === filaEvaluacion.id);
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
                onRefresh={refetchEvaluaciones}
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
            // ✅ Mapeo correcto de fechas: usar fechaInicioPlaneacion como fechaInicio
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
              // ✅ FECHAS: Usar los campos correctos del formulario con valores por defecto
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
              vinculadaPlanAnual: data.vinculadaPlanAnual,
              planAnualId: data.planAnualId,
              planAnualAño: data.planAnualAño,
              rolDecretoAsociado: data.rolDecretoAsociado,
              estadoKanban: data.estadoKanban || 'Plan Anual', // Crear en Plan Anual por defecto
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
          onSubmit={(proceso, procesoIdSeleccionado) => {
            // ✅ FIX: Universo Auditable crea EVALUACIONES, no procesos
            // El proceso maestro viene del catálogo (Configuración → Procesos)
            // Aquí se crean evaluaciones DAFP del proceso seleccionado
            if (evaluacionSeleccionada) {
              // Modo EDIT: actualizar evaluación existente
              handleEditarEvaluacion(proceso, evaluacionSeleccionada.id);
            } else {
              // Modo CREATE: crear nueva evaluación para el proceso seleccionado
              handleAgregarEvaluacion(proceso, procesoIdSeleccionado || procesoSeleccionado?.id);
            }
            setMostrarFormularioProceso(false);
            setProcesoSeleccionado(null);
            setEvaluacionSeleccionada(null);
          }}
          procesoInicial={convertirProcesoAFormulario(procesoSeleccionado, evaluacionSeleccionada)}
          mode={evaluacionSeleccionada ? 'edit' : 'create'}
          procesosCatalog={procesos.map(p => ({
                  id: p.id,
                  nombre: p.nombre,
                  codigo: p.codigo,
                  macroproceso: p.macroproceso || p._macroproceso,
                  dependencia: p.dependenciaResponsable || p._dependencia,
                  tipo: p._macroproceso === 'Territorial' || p.macroproceso === 'Territorial'
                    ? 'Territorial'
                    : (p.tipo || 'Apoyo'),
                }))}
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
}

function TabProgramaAnual({ auditorias, estadisticas, mostrarFormulario, setMostrarFormulario, puedeCrear = true }: TabProgramaAnualProps) {
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
                  onClick={() => setMostrarFormulario(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Programar Auditoría
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
      const nombre = p.usuario.nombre.toLowerCase().trim();
      const configId = p.configuracion.id || '';
      const idTercero = String(p.configuracion.idTercero);

      // Auditorías donde este profesional es líder (match por nombre, id config, o idTercero)
      const comoLider = auditorias.filter(a => {
        const lider = (a.auditorLider || '').toLowerCase().trim();
        return lider === nombre || a.auditorLider === configId || a.auditorLider === idTercero;
      });

      // Auditorías donde este profesional está en el equipo
      const comoEquipo = auditorias.filter(a => {
        if (comoLider.some(l => l.id === a.id)) return false; // No contar doble
        return a.equipo.some(e => {
          const miembroNombre = extraerNombre(e);
          const miembroId = extraerId(e);
          return miembroNombre === nombre || miembroId === configId || miembroId === idTercero;
        });
      });

      const auditoriasTotales = comoLider.length + comoEquipo.length;
      const horasLider = comoLider.reduce((sum, a) => sum + (a.horasEstimadas || 0), 0);
      const horasEquipo = comoEquipo.reduce((sum, a) => sum + (a.horasEstimadas || 0), 0);
      const horasAsignadas = horasLider + horasEquipo;

      // Porcentaje de carga: auditorías asignadas vs capacidad máxima
      const capacidad = p.configuracion.capacidadMaximaAuditorias || 4;
      const porcentajePorAuditorias = Math.round((auditoriasTotales / capacidad) * 100);

      // También considerar horas: horasAsignadas vs horasMensualesDisponibles
      const horasDisponibles = p.configuracion.horasMensualesDisponibles || 150;
      const porcentajePorHoras = horasDisponibles > 0 ? Math.round((horasAsignadas / horasDisponibles) * 100) : 0;

      // Usar el mayor de los dos porcentajes como indicador de carga
      const porcentajeCarga = Math.max(porcentajePorAuditorias, porcentajePorHoras);

      return {
        ...p,
        estadisticas: {
          auditoriasTotales,
          auditoriasComoLider: comoLider.length,
          auditoriasComoEquipo: comoEquipo.length,
          cargaPonderada: porcentajeCarga,
          porcentajeCarga,
          horasAsignadas,
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

      {/* Estado de carga */}
      {loadingProfesionales && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-2" />
          <span className="text-gray-600">Cargando profesionales desde el servidor...</span>
        </div>
      )}

      {/* Error de carga */}
      {errorProfesionales && !loadingProfesionales && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center justify-between">
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

      {/* Mapa de carga profesional */}
      {!loadingProfesionales && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <h2 className="text-xl font-black text-gray-900 mb-4">
            Equipo OCI Configurado
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Profesionales configurados en el módulo OCI con su rol, especialidades y capacidad.
          </p>

          <div className="space-y-4">
            {profesionalesConSemaforo.map((p) => (
              <div 
                key={p.configuracion.id || p.usuario.id} 
                className="border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all bg-gradient-to-r from-white to-gray-50/50"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar con inicial */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${
                      p.semaforo === 'rojo' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                      p.semaforo === 'amarillo' ? 'bg-gradient-to-br from-yellow-500 to-amber-600' :
                      'bg-gradient-to-br from-blue-500 to-blue-600'
                    }`}>
                      {p.usuario.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-base">{p.usuario.nombre}</p>
                      <p className="text-sm text-blue-700 font-semibold mt-0.5">
                        {p.configuracion.rolOCI}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.configuracion.especialidades.slice(0, 3).map((esp, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {esp}
                          </span>
                        ))}
                        {p.configuracion.especialidades.length > 3 && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-500 rounded text-xs">
                            +{p.configuracion.especialidades.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        p.semaforo === 'rojo'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : p.semaforo === 'amarillo'
                          ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                          : 'bg-green-100 text-green-700 border border-green-200'
                      }`}
                    >
                      {p.porcentaje}% carga
                    </span>
                    {p.configuracion.puedeSerLider && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200">
                        ★ Líder
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Barra de progreso mejorada */}
                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all rounded-full ${
                      p.semaforo === 'rojo'
                        ? 'bg-gradient-to-r from-red-400 to-red-500'
                        : p.semaforo === 'amarillo'
                        ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                        : 'bg-gradient-to-r from-green-400 to-green-500'
                    }`}
                    style={{ width: `${Math.min(p.porcentaje, 100)}%` }}
                  />
                </div>
                
                {/* Info de capacidad */}
                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                  <span>
                    <strong className="text-gray-700">{p.estadisticas.auditoriasTotales}</strong> auditoría(s) • <strong className="text-gray-700">{p.estadisticas.horasAsignadas}h</strong> asignadas
                  </span>
                  <span>
                    Cap: {p.configuracion.capacidadMaximaAuditorias} aud. • {p.configuracion.horasMensualesDisponibles}h/mes
                  </span>
                </div>
              </div>
            ))}
            {profesionalesConSemaforo.length === 0 && !loadingProfesionales && (
              <div className="text-center py-10">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-semibold">No hay profesionales configurados en OCI</p>
                <p className="text-sm text-gray-400 mt-1">Configure profesionales en el módulo de Configuración OCI</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          La configuración detallada de perfiles y capacidades puede gestionarse en <strong>Configuraciones → Profesionales OCI</strong>.
        </p>
      </div>
    </motion.div>
  );
}

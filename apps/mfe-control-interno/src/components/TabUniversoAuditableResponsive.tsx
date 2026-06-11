/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TAB UNIVERSO AUDITABLE - VERSIÓN RESPONSIVE WORLD-CLASS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Componente optimizado para todos los dispositivos:
 * - Mobile: Vista de cards touch-friendly
 * - Tablet/Desktop: Tabla completa
 * - 4K: Espaciado optimizado ESAP
 * 
 * Características:
 * ✅ ResponsiveTable con mobile cards
 * ✅ Filtros colapsables en mobile
 * ✅ Estadísticas adaptativas
 * ✅ Touch-friendly (44x44px mínimo)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useState, type MouseEvent } from 'react';
import { motion } from 'motion/react';
import {
  Layers, Search, AlertTriangle, CheckCircle2, AlertCircle, Clock,
  Plus, Edit2, Trash2, X, ChevronDown, ChevronUp, FileText, Eye, Target, Info, RefreshCw, Download, FileSpreadsheet, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { ResponsiveTable, MobileCard, MobileCardRow, type Column } from '@esap-mfe/shared-ui/responsive-table';
import { useResponsive } from '@/hooks/useResponsive';
import { ModalBaseWorldClass } from './ModalBaseWorldClass';
import { FormularioEvaluacionDafpCompleta } from './FormularioEvaluacionDafpCompleta';
import { VisualizadorResultadosDafp } from './VisualizadorResultadosDafp';
import type { ProcesoAuditable as ProcesoAuditableType, EvaluacionDafpCompleta } from '@/types/control-interno';
import { ETIQUETAS_RIESGO } from '@/lib/dafp/constants'; // Nuevo import
import { calcularPonderacionRiesgo } from './dafp-utils'; // Para recalcular ponderación
import { exportarUniversoAuditableExcel, exportarUniversoAuditablePDF } from './services/exportarUniversoAuditablePDF';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

type NivelRiesgo = 'Crítico' | 'Alto' | 'Medio' | 'Bajo';
type TipoProceso = 'Estratégico' | 'Misional' | 'Apoyo' | 'Evaluación';

interface ProcesoAuditable {
  id: string;
  codigo: string;
  nombre: string;
  macroproceso: string;
  tipoProceso: TipoProceso;
  dependenciaResponsable: string;
  nivelRiesgo: NivelRiesgo;
  scoreRiesgo: number;
  frecuenciaSugerida: string;
  horasEstimadas: number;
  auditable: boolean;
  auditableCalculado?: boolean;
  auditableManual?: boolean | null;
  idEvaluacion?: string;
  _evaluacionRiesgo?: {
    riesgosExtremos?: number;
    riesgosAltos?: number;
    riesgosModerados?: number;
    riesgosBajos?: number;
    totalRiesgos?: number;
    requerimientoComite?: boolean;
    requerimientoEntesReg?: boolean;
    fechaUltimaAuditoria?: string;
    resultadoUltimaAuditoria?: string;
    ponderacionRiesgo?: string;
    decisionFinal?: string;
    motivoDecision?: string;
    prioridadRegla?: number;
    // Criterios DAFP
    tiempoUltimaAuditoria?: number;
    temasAltaDireccion?: number;
    objetivosEstrategicos?: number;
    hallazgosAnteriores?: number;
    ponderacionFinalDafp?: number;
    nivelCriticidadDafp?: string;
    cicloRotacionDafp?: string;
    vigencia?: number;
    fechaCorte?: string;
    auditableCalculado?: boolean;
    auditableManual?: boolean | null;
  };
  ultimaAuditoria?: string;
  resultadoUltimaAuditoria?: string;
}

interface Estadisticas {
  totalProcesos: number;
  procesosAuditables: number;
  procesosCriticos: number;
  procesosAltos: number;
  procesosMedios: number;
  procesosBajos: number;
}

interface TabUniversoAuditableResponsiveProps {
  procesos: ProcesoAuditable[];
  estadisticas: Estadisticas;
  vigencia?: number;
  busqueda: string;
  filtroRiesgo: NivelRiesgo | 'TODOS';
  filtroTipo: TipoProceso | 'TODOS';
  onBusquedaChange: (valor: string) => void;
  onFiltroRiesgoChange: (valor: NivelRiesgo | 'TODOS') => void;
  onFiltroTipoChange: (valor: TipoProceso | 'TODOS') => void;
  onAgregarProceso: () => void;
  onEditarProceso: (proceso: ProcesoAuditable) => void;
  onEliminarProceso: (id: string) => void;
  // ✅ Nueva prop para guardar evaluaciones DAFP directamente al backend
  onGuardarEvaluacion?: (id: string, datos: any) => Promise<boolean>;
  // ✅ Nueva prop para recargar datos
  onRefresh?: () => void;
  /** Override manual de priorización (columna Aud.) */
  onCambiarAuditable?: (evaluacionId: string, auditableManual: boolean | null) => Promise<boolean>;
  // ✅ PERMISOS - Control de visibilidad de acciones
  puedeCrear?: boolean;
  puedeEditar?: boolean;
  puedeEliminar?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ════════════════════════════════════════════════════════════════════════════

function getColorRiesgo(nivel: NivelRiesgo) {
  const colores = {
    'Crítico': { bg: '#FEE2E2', text: '#991B1B', border: '#DC2626' },
    'Alto': { bg: '#FFEDD5', text: '#9A3412', border: '#EA580C' },
    'Medio': { bg: '#FEF9C3', text: '#854D0E', border: '#EAB308' },
    'Bajo': { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' }
  };
  return colores[nivel] || { bg: '#E5E7EB', text: '#374151', border: '#9CA3AF' }; // ✅ Fallback para valores undefined
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function TabUniversoAuditableResponsive({
  procesos,
  estadisticas,
  vigencia = new Date().getFullYear(),
  busqueda,
  filtroRiesgo,
  filtroTipo,
  onBusquedaChange,
  onFiltroRiesgoChange,
  onFiltroTipoChange,
  onAgregarProceso,
  onEditarProceso,
  onEliminarProceso,
  onGuardarEvaluacion,
  onRefresh,
  onCambiarAuditable,
  puedeCrear = true,
  puedeEditar = true,
  puedeEliminar = true
}: TabUniversoAuditableResponsiveProps) {
  
  const { isMobile, isTablet } = useResponsive();
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(!isMobile);
  const [refreshing, setRefreshing] = useState(false);
  const [mostrarMenuExportar, setMostrarMenuExportar] = useState(false);
  const [patchingAuditableId, setPatchingAuditableId] = useState<string | null>(null);
  const [evaluacionParaDesmarcar, setEvaluacionParaDesmarcar] = useState<{ id: string; actualValue: boolean } | null>(null);

  const estadisticasParaExportar = useMemo(() => {
    const total = procesos.length;
    const auditables = procesos.filter((p) => p.auditable).length;
    const criticos = procesos.filter((p) => p.nivelRiesgo === 'Crítico').length;
    const altos = procesos.filter((p) => p.nivelRiesgo === 'Alto').length;
    const medios = procesos.filter((p) => p.nivelRiesgo === 'Medio').length;
    const bajos = procesos.filter((p) => p.nivelRiesgo === 'Bajo').length;
    return {
      totalProcesos: total,
      procesosAuditables: auditables,
      procesosCriticos: criticos,
      procesosAltos: altos,
      procesosMedios: medios,
      procesosBajos: bajos,
    };
  }, [procesos]);
  
  // Handler para refresh manual
  const handleRefresh = async () => {
    if (!refreshing) {
      setRefreshing(true);
      try {
        if (onRefresh) {
          await onRefresh();
        }
      } finally {
        setTimeout(() => setRefreshing(false), 500);
      }
    }
  };

  const handleExportPdf = async () => {
    setMostrarMenuExportar(false);
    if (procesos.length === 0) {
      toast.info('No hay procesos registrados para exportar con los filtros actuales.');
      return;
    }
    try {
      const resultado = await exportarUniversoAuditablePDF(
        procesos as any,
        estadisticasParaExportar,
        { vigencia }
      );
      if (resultado.exito) toast.success('PDF exportado exitosamente');
      else toast.error(resultado.error || 'Error al exportar');
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      toast.error('Error al exportar el PDF');
    }
  };

  const handleExportExcel = async () => {
    setMostrarMenuExportar(false);
    if (procesos.length === 0) {
      toast.info('No hay procesos registrados para exportar con los filtros actuales.');
      return;
    }
    try {
      const resultado = await exportarUniversoAuditableExcel(
        procesos as any,
        estadisticasParaExportar,
        { vigencia }
      );
      if (resultado.exito) toast.success('Excel exportado exitosamente');
      else toast.error(resultado.error || 'Error al exportar');
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      toast.error('Error al exportar el Excel');
    }
  };
  
  // Estado para evaluación DAFP
  const [modalDafpAbierto, setModalDafpAbierto] = useState(false);
  const [procesoSeleccionadoDafp, setProcesoSeleccionadoDafp] = useState<ProcesoAuditable | null>(null);
  const [panelDafpAbierto, setPanelDafpAbierto] = useState(false);
  const [procesoVisualizandoDafp, setProcesoVisualizandoDafp] = useState<ProcesoAuditable | null>(null);
  
  const handleEvaluarDafp = (proceso: ProcesoAuditable) => {
    setProcesoSeleccionadoDafp(proceso);
    setModalDafpAbierto(true);
  };
  
  const handleVerDafp = (proceso: ProcesoAuditable) => {
    setProcesoVisualizandoDafp(proceso);
    setPanelDafpAbierto(true);
  };
  
  const handleGuardarEvaluacionDafp = async (evaluacion: Partial<EvaluacionDafpCompleta>) => {
    if (!procesoSeleccionadoDafp) return;
    
    const evRiesgo = procesoSeleccionadoDafp._evaluacionRiesgo as Record<string, unknown> | undefined;
    const criticidad = (evaluacion as any).criticidad ?? evRiesgo?.criticidad ?? 0;
    const exposicion = (evaluacion as any).exposicion ?? evRiesgo?.exposicion ?? 0;
    const mitigantes = (evaluacion as any).mitigantes ?? evRiesgo?.mitigantes ?? 0;
    const scoreRiesgo = (evaluacion as any).scoreRiesgo ?? evRiesgo?.scoreRiesgo ?? (Number(criticidad) + Number(exposicion) - Number(mitigantes));

    const datosActualizados = {
      nombre: procesoSeleccionadoDafp.nombre,
      codigo: procesoSeleccionadoDafp.codigo,
      macroproceso: procesoSeleccionadoDafp.macroproceso,
      tipoProceso: procesoSeleccionadoDafp.tipoProceso,
      dependenciaResponsable: procesoSeleccionadoDafp.dependenciaResponsable,
      riesgosExtremos: evaluacion.riesgosExtremos || 0,
      riesgosAltos: evaluacion.riesgosAltos || 0,
      riesgosModerados: evaluacion.riesgosModerados || 0,
      riesgosBajos: evaluacion.riesgosBajos || 0,
      totalRiesgos: (evaluacion.riesgosExtremos || 0) + (evaluacion.riesgosAltos || 0) + 
                    (evaluacion.riesgosModerados || 0) + (evaluacion.riesgosBajos || 0),
      requerimientoComite: evaluacion.requerimientoComite || false,
      requerimientoEntesReg: evaluacion.requerimientoEntesReg || false,
      fechaUltimaAuditoria: evaluacion.fechaUltimaAuditoria || null,
      resultadoUltimaAuditoria: evaluacion.resultadoUltimaAuditoria || 'SIN_AUDITORIA',
      ponderacionRiesgo: evaluacion.ponderacionRiesgo || 'BAJO',
      decisionFinal: (ev?.decisionFinal as any) || 'INCLUIR_AUDITORIA_POSTERIOR',
      motivoDecision: evaluacion.motivoDecision || '',
      prioridadRegla: evaluacion.prioridadRegla || 5,
      criticidad,
      exposicion,
      mitigantes,
      scoreRiesgo,
    };
    
    if (onGuardarEvaluacion) {
      await onGuardarEvaluacion(procesoSeleccionadoDafp.id, datosActualizados);
    } else {
      console.warn('[TabUniversoAuditableResponsive] onGuardarEvaluacion no está definido');
    }
    
    setModalDafpAbierto(false);
    setProcesoSeleccionadoDafp(null);
  };

  const convertirProceso = (proceso: ProcesoAuditable): ProcesoAuditableType => {
    const tieneEvaluacionDafp = proceso._evaluacionRiesgo && (
      (proceso._evaluacionRiesgo.totalRiesgos !== undefined && proceso._evaluacionRiesgo.totalRiesgos > 0) ||
      ((proceso._evaluacionRiesgo.riesgosExtremos ?? 0) + 
       (proceso._evaluacionRiesgo.riesgosAltos ?? 0) + 
       (proceso._evaluacionRiesgo.riesgosModerados ?? 0) + 
       (proceso._evaluacionRiesgo.riesgosBajos ?? 0)) > 0
    );
    
    const evaluacionDafp = tieneEvaluacionDafp && proceso._evaluacionRiesgo ? (() => {
      const extremos = proceso._evaluacionRiesgo.riesgosExtremos ?? 0;
      const altos = proceso._evaluacionRiesgo.riesgosAltos ?? 0;
      const moderados = proceso._evaluacionRiesgo.riesgosModerados ?? 0;
      const bajos = proceso._evaluacionRiesgo.riesgosBajos ?? 0;
      const total = proceso._evaluacionRiesgo.totalRiesgos ?? (extremos + altos + moderados + bajos);
      
      const ponderacionCalculada = calcularPonderacionRiesgo(extremos, altos, moderados, bajos, total);
      
      return {
        riesgosExtremos: extremos,
        riesgosAltos: altos,
        riesgosModerados: moderados,
        riesgosBajos: bajos,
        totalRiesgos: total,
        requerimientoComite: proceso._evaluacionRiesgo.requerimientoComite ?? false,
        requerimientoEntesReg: proceso._evaluacionRiesgo.requerimientoEntesReg ?? false,
        fechaUltimaAuditoria: proceso._evaluacionRiesgo.fechaUltimaAuditoria || proceso.ultimaAuditoria || '',
        resultadoUltimaAuditoria: proceso._evaluacionRiesgo.resultadoUltimaAuditoria || proceso.resultadoUltimaAuditoria || 'SIN_AUDITORIA',
        ponderacionRiesgo: ponderacionCalculada,
        criticidad: proceso._evaluacionRiesgo.criticidad ?? 0,
        exposicion: proceso._evaluacionRiesgo.exposicion ?? 0,
        mitigantes: proceso._evaluacionRiesgo.mitigantes ?? 0,
        scoreRiesgo: proceso._evaluacionRiesgo.scoreRiesgo ?? 0,
        tiempoUltimaAuditoria: proceso._evaluacionRiesgo.tiempoUltimaAuditoria ?? 0,
        temasAltaDireccion: proceso._evaluacionRiesgo.temasAltaDireccion ?? 0,
        objetivosEstrategicos: proceso._evaluacionRiesgo.objetivosEstrategicos ?? 0,
        hallazgosAnteriores: proceso._evaluacionRiesgo.hallazgosAnteriores ?? 0,
        ponderacionFinalDafp: proceso._evaluacionRiesgo.ponderacionFinalDafp ?? 0,
        nivelCriticidadDafp: proceso._evaluacionRiesgo.nivelCriticidadDafp ?? '',
        cicloRotacionDafp: proceso._evaluacionRiesgo.cicloRotacionDafp ?? '',
        decisionFinal: proceso._evaluacionRiesgo.decisionFinal ?? '',
        motivoDecision: proceso._evaluacionRiesgo.motivoDecision ?? '',
        prioridadRegla: proceso._evaluacionRiesgo.prioridadRegla ?? 0,
      };
    })() : undefined;
    
    return {
      id: proceso.id,
      codigo: proceso.codigo,
      nombre: proceso.nombre,
      descripcion: '',
      tipo: proceso.tipoProceso?.toLowerCase() as any || 'misional',
      macroproceso: proceso.macroproceso || '',
      responsable: '',
      dependencia: proceso.dependenciaResponsable || '',
      evaluacionInicial: {
        p1_cambiosNormativos: 0,
        p2_cambiosEstructurales: 0,
        p3_antecedentes: 0,
        p4_criticidad: 0,
        p5_presupuesto: 0,
        p6_impactoReputacional: 0,
        p7_interes: 0,
        scoreRiesgo: proceso.scoreRiesgo || 0,
        nivelRiesgo: proceso.nivelRiesgo || 'Bajo',
        frecuenciaSugerida: proceso.frecuenciaSugerida as any || 'Anual',
        horasEstimadas: proceso.horasEstimadas || 0,
        fechaEvaluacion: new Date().toISOString()
      },
      evaluacionDafp,
      auditable: proceso.auditable ?? true,
      frecuenciaAuditoria: proceso.frecuenciaSugerida || 'Anual',
      prioridad: 1
    };
  };

  const calcPriorizacionAnos = (ciclo?: string) => {
    if (!ciclo) return [];
    if (ciclo === 'Todos los años' || ciclo === 'Cada año') return [1, 2, 3, 4];
    if (ciclo === 'Cada 2 años') return [2, 4];
    if (ciclo === 'Cada 3 años') return [3];
    if (ciclo === 'Cada 4 años') return [4];
    return [];
  };

  const CRITICIDAD_COLORS: Record<string, { bg: string; text: string }> = {
    'Extremo':  { bg: '#FEE2E2', text: '#991B1B' },
    'Alto':     { bg: '#FFEDD5', text: '#9A3412' },
    'Moderado': { bg: '#FEF9C3', text: '#854D0E' },
    'Bajo':     { bg: '#DBEAFE', text: '#1E40AF' },
    'Bajo (Priorizado)': { bg: '#DBEAFE', text: '#1E40AF' },
  };

  const columns: Column<ProcesoAuditable>[] = [
    {
      key: 'codigo',
      label: 'Código',
      width: '70px',
      render: (value) => (
        <span className="font-mono text-[11px] font-bold text-gray-800">{value}</span>
      )
    },
    {
      key: 'nombre',
      label: 'Proceso',
      render: (_, p) => (
        <div>
          <p className="font-semibold text-gray-900 text-xs leading-tight">{p.nombre}</p>
          {p.macroproceso && (
            <p className="text-[10px] text-gray-400 mt-0.5">{p.macroproceso}</p>
          )}
        </div>
      )
    },
    {
      key: 'tipoProceso',
      label: 'Tipo',
      width: '80px',
      render: (value) => {
        const tipoColors: Record<string, string> = {
          'Misional': 'bg-blue-100 text-blue-700',
          'Estratégico': 'bg-purple-100 text-purple-700',
          'Apoyo': 'bg-gray-100 text-gray-700',
          'Evaluación': 'bg-orange-100 text-orange-700',
        };
        return (
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tipoColors[value as string] || 'bg-gray-100 text-gray-600'}`}>
            {value}
          </span>
        );
      }
    },
    {
      key: 'riesgoInherente',
      label: 'Riesgo',
      align: 'center',
      width: '85px',
      render: (_, p) => {
        const ev = p._evaluacionRiesgo;
        const e = ev?.riesgosExtremos ?? 0;
        const a = ev?.riesgosAltos ?? 0;
        const m = ev?.riesgosModerados ?? 0;
        const b = ev?.riesgosBajos ?? 0;
        const total = e + a + m + b;
        if (!total) return <span className="text-[10px] text-gray-400 font-medium italic">Pendiente</span>;

        let nivel: string;
        let style: { bg: string; text: string };
        if (e >= 1)      { nivel = 'Extremo';  style = { bg: '#FEE2E2', text: '#991B1B' }; }
        else if (a >= 1) { nivel = 'Alto';     style = { bg: '#FFEDD5', text: '#9A3412' }; }
        else if (m >= 1) { nivel = 'Moderado'; style = { bg: '#FEF9C3', text: '#854D0E' }; }
        else             { nivel = 'Bajo';     style = { bg: '#F3F4F6', text: '#6B7280' }; }

        return (
          <span
            className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
            style={{ backgroundColor: style.bg, color: style.text }}
          >
            {nivel}
          </span>
        );
      }
    },
    {
      key: 'ponderacionDafp',
      label: 'Pond. DAFP',
      align: 'center',
      width: '85px',
      render: (_, p) => {
        const pond = p._evaluacionRiesgo?.ponderacionFinalDafp;
        if (!pond) return <span className="text-[10px] text-gray-400 italic">Pendiente</span>;
        return (
          <div className="text-center">
            <span className="text-sm font-bold text-[#003DA5]">{Number(pond).toFixed(1)}</span>
            <span className="text-[9px] text-gray-400"> /5</span>
          </div>
        );
      }
    },
    {
      key: 'criticidad',
      label: 'Criticidad',
      align: 'center',
      width: '80px',
      render: (_, p) => {
        const nivel = p._evaluacionRiesgo?.nivelCriticidadDafp;
        if (!nivel) return <span className="text-[10px] text-gray-400 italic">Pendiente</span>;
        const c = CRITICIDAD_COLORS[nivel] || { bg: '#E5E7EB', text: '#374151' };
        return (
          <span
            className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
            style={{ backgroundColor: c.bg, color: c.text }}
          >
            {nivel}
          </span>
        );
      }
    },
    {
      key: 'ciclo',
      label: 'Ciclo',
      align: 'center',
      width: '75px',
      render: (_, p) => {
        const ciclo = p._evaluacionRiesgo?.cicloRotacionDafp;
        if (!ciclo) return <span className="text-[10px] text-gray-400 italic">Pendiente</span>;
        return <span className="text-[10px] font-medium text-gray-700">{ciclo}</span>;
      }
    },
    {
      key: 'horasEstimadas',
      label: 'Hrs',
      align: 'center',
      width: '50px',
      render: (value) => (
        <span className="text-xs font-bold text-gray-700">{value > 0 ? `${value}h` : '-'}</span>
      )
    },
    {
      key: 'auditable',
      label: 'Aud.',
      align: 'center',
      width: '52px',
      render: (value, p) => {
        if (!p._evaluacionRiesgo?.ponderacionFinalDafp) {
          return <Clock className="w-4 h-4 text-gray-400 mx-auto" title="Pendiente de evaluación DAFP" />;
        }
        const evalId = p.idEvaluacion || p.id;
        const esManual = p.auditableManual === true || p.auditableManual === false;
        const puedeCambiar = puedeEditar && !!onCambiarAuditable;
        const guardando = patchingAuditableId === evalId;

        const toggle = async (e: MouseEvent) => {
          e.stopPropagation();
          if (!puedeCambiar || guardando) return;
          
          if (value) {
            setEvaluacionParaDesmarcar({ id: evalId, actualValue: value });
            return;
          }
          
          setPatchingAuditableId(evalId);
          try {
            await onCambiarAuditable!(evalId, !value);
          } finally {
            setPatchingAuditableId(null);
          }
        };

        const restaurar = async (e: MouseEvent) => {
          e.stopPropagation();
          if (!puedeCambiar || guardando) return;
          setPatchingAuditableId(evalId);
          try {
            await onCambiarAuditable!(evalId, null);
          } finally {
            setPatchingAuditableId(null);
          }
        };

        return (
          <div className="flex flex-col items-center gap-0.5">
            {puedeCambiar ? (
              <button
                type="button"
                role="switch"
                aria-checked={value}
                onClick={toggle}
                disabled={guardando}
                className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${value ? 'bg-green-600' : 'bg-gray-300'} ${guardando ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-green-400'}`}
                title={
                  value
                    ? 'Priorizado (rotación/universo). Clic para excluir.'
                    : 'No priorizado. Clic para incluir en universo priorizado.'
                }
              >
                <span 
                  className="inline-block h-3 w-3 rounded-full bg-white transition-transform duration-200 ease-in-out" 
                  style={{ transform: `translateX(${value ? '16px' : '2px'})` }}
                />
              </button>
            ) : value ? (
              <div className="relative inline-flex h-4 w-8 items-center rounded-full bg-green-600 opacity-70" title="Priorizado">
                <span className="inline-block h-3 w-3 rounded-full bg-white" style={{ transform: 'translateX(16px)' }} />
              </div>
            ) : (
              <div className="relative inline-flex h-4 w-8 items-center rounded-full bg-gray-300 opacity-70" title="No priorizado">
                <span className="inline-block h-3 w-3 rounded-full bg-white" style={{ transform: 'translateX(2px)' }} />
              </div>
            )}
            {esManual && puedeCambiar && (
              <button
                type="button"
                onClick={restaurar}
                disabled={guardando}
                className="text-[9px] text-blue-600 hover:underline flex items-center gap-0.5"
                title="Restaurar valor calculado por DAFP"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        );
      }
    },
    {
      key: 'priorizacionAnos',
      label: 'Años',
      align: 'center',
      width: '100px',
      render: (_, p) => {
        const ciclo = p._evaluacionRiesgo?.cicloRotacionDafp;
        const anosActivos = calcPriorizacionAnos(ciclo);
        if (!ciclo) return <span className="text-[10px] text-gray-400 italic">N/A</span>;
        return (
          <div className="flex gap-0.5 justify-center">
            {[1, 2, 3, 4].map(ano => (
              <span
                key={ano}
                className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center border ${
                  anosActivos.includes(ano)
                    ? 'bg-[#003DA5] text-white border-[#003DA5]'
                    : 'bg-gray-50 text-gray-950 border-gray-400'
                }`}
              >
                {ano}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      key: 'id',
      label: 'Acciones',
      align: 'center',
      width: '70px',
      render: (_, proceso) => (
        <div className="flex items-center justify-center gap-0.5">
          {puedeEditar && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditarProceso(proceso); }}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title={proceso._evaluacionRiesgo?.ponderacionFinalDafp ? 'Editar evaluación DAFP' : 'Agregar evaluación DAFP'}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {puedeEliminar && proceso._evaluacionRiesgo?.ponderacionFinalDafp && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`¿Eliminar la evaluación de "${proceso.nombre}"?`)) {
                  onEliminarProceso((proceso as any).idEvaluacion || proceso.id);
                }
              }}
              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
              title="Eliminar evaluación"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    },
  ];

  const renderMobileCard = (proceso: ProcesoAuditable, index: number) => {
    const colorRiesgo = getColorRiesgo(proceso.nivelRiesgo);
    const procesoCompleto = convertirProceso(proceso);
    const tieneEvaluacionDafp = !!procesoCompleto.evaluacionDafp;

    return (
      <MobileCard
        title={proceso.nombre || 'Sin nombre'}
        subtitle={`${proceso.codigo || 'S/C'} • ${proceso.macroproceso || 'Sin macroproceso'}`}
      >
        <div className="space-y-2 mb-4">
          <MobileCardRow
            label="Tipo"
            value={
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                {proceso.tipoProceso || 'Sin tipo'}
              </span>
            }
          />
          <MobileCardRow label="Dependencia" value={proceso.dependenciaResponsable || 'Sin dependencia'} />
          <MobileCardRow
            label="Riesgo"
            value={
              <span
                className="px-2 py-1 rounded-full text-xs font-bold inline-block"
                style={{
                  backgroundColor: colorRiesgo.bg,
                  color: colorRiesgo.text,
                  border: `2px solid ${colorRiesgo.border}`
                }}
              >
                {proceso.nivelRiesgo || 'Bajo'}
              </span>
            }
          />
          <MobileCardRow label="Score DAFP" value={`${proceso.scoreRiesgo || 0}/100`} valueClassName="font-bold" />
          <MobileCardRow label="Frecuencia" value={proceso.frecuenciaSugerida || 'Anual'} />
          <MobileCardRow label="Horas Est." value={proceso.horasEstimadas > 0 ? `${proceso.horasEstimadas}h` : '-'} valueClassName="font-bold" />
          <MobileCardRow
            label="Priorizado"
            value={
              !proceso._evaluacionRiesgo?.ponderacionFinalDafp ? (
                <Clock className="w-4 h-4 text-gray-400" title="Pendiente de evaluación" />
              ) : (
                <div className="flex items-center gap-2">
                  {proceso.auditable ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <X className="w-5 h-5 text-red-500" />
                  )}
                  {puedeEditar && onCambiarAuditable && (
                    <button
                      type="button"
                      className="text-xs text-blue-600 font-medium"
                      onClick={async () => {
                        const evalId = proceso.idEvaluacion || proceso.id;
                        setPatchingAuditableId(evalId);
                        try {
                          await onCambiarAuditable(evalId, !proceso.auditable);
                        } finally {
                          setPatchingAuditableId(null);
                        }
                      }}
                    >
                      Cambiar
                    </button>
                  )}
                </div>
              )
            }
          />
        </div>

        <div className="mb-3 pb-3 border-b border-gray-200">
          {tieneEvaluacionDafp ? (
            <button
              onClick={() => handleVerDafp(proceso)}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold min-h-[44px] hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              <span>Ver Evaluación DAFP</span>
            </button>
          ) : (
            <button
              onClick={() => handleEvaluarDafp(proceso)}
              className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg font-semibold min-h-[44px] hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Target className="w-4 h-4" />
              <span>Evaluar con DAFP</span>
            </button>
          )}
        </div>

        {(puedeEditar || puedeEliminar) && (
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          {puedeEditar && (
          <button
            onClick={() => onEditarProceso(proceso)}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold min-h-[44px] hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            <span>Editar</span>
          </button>
          )}
          {puedeEliminar && (
          <button
            onClick={() => {
              if (confirm(`¿Eliminar "${proceso.nombre}"?`)) {
                onEliminarProceso((proceso as any).idEvaluacion || proceso.id);
              }
            }}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold min-h-[44px] hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar</span>
          </button>
          )}
        </div>
        )}
      </MobileCard>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-600">Total Procesos</span>
            <Layers className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-xl font-black text-gray-900">{estadisticas.totalProcesos}</p>
          <p className="text-xs text-gray-500 mt-1">{estadisticas.procesosAuditables} auditables</p>
        </div>

        <div className="bg-white rounded-lg border border-red-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-semibold text-red-700">Nivel Crítico</span>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-xl font-black text-red-700">{estadisticas.procesosCriticos}</p>
          <p className="text-xs text-red-600 mt-1">Requieren auditoría anual</p>
        </div>

        <div className="bg-white rounded-lg border border-orange-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-semibold text-orange-700">Nivel Alto</span>
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-xl font-black text-orange-700">{estadisticas.procesosAltos}</p>
          <p className="text-xs text-orange-600 mt-1">Auditoría anual o semestral</p>
        </div>

        <div className="bg-white rounded-lg border border-green-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-semibold text-green-700">Medio y Bajo</span>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-xl font-black text-green-700">
            {estadisticas.procesosMedios + estadisticas.procesosBajos}
          </p>
          <p className="text-xs text-green-600 mt-1">Auditoría bienal o trienal</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-300 rounded-lg p-2.5 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-bold text-gray-900 mb-1">{"¿Cómo se calcula el Score?"}</p>
          <p className="text-gray-800 mb-1">
            Puntaje de prioridad (0-100) basado en criterios del DAFP.
            <strong> {"Fórmula:"}</strong> {"(Ponderación Final DAFP × 20)"}
          </p>
          <p className="text-xs text-gray-700">
            <span className="inline-block mr-4">{"🔴 80-100: Prioridad alta"}</span>
            <span className="inline-block mr-4">{"🟡 40-79: Prioridad media"}</span>
            <span className="inline-block">{"🟢 0-39: Prioridad baja"}</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
            className="lg:hidden w-full flex items-center justify-between text-left min-h-[44px]"
          >
            <span className="text-sm font-bold text-gray-700">
              {"🔍 Filtros de búsqueda"}
            </span>
            {filtrosAbiertos ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          <div className="hidden lg:block">
            <span className="text-sm font-bold text-gray-700">{"🔍 Filtros de búsqueda"}</span>
          </div>
        </div>

        {filtrosAbiertos && (
          <div className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Buscar proceso
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => onBusquedaChange(e.target.value)}
                    placeholder={"Nombre, código o dependencia..."}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nivel de Riesgo
                </label>
                <select
                  value={filtroRiesgo}
                  onChange={(e) => onFiltroRiesgoChange(e.target.value as NivelRiesgo | 'TODOS')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none text-sm"
                >
                  <option value="TODOS">Todos los niveles</option>
                  <option value="Crítico">🔴 Crítico</option>
                  <option value="Alto">🟠 Alto</option>
                  <option value="Medio">🟡 Medio</option>
                  <option value="Bajo">🔵 Bajo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tipo de Proceso
                </label>
                <select
                  value={filtroTipo}
                  onChange={(e) => onFiltroTipoChange(e.target.value as TipoProceso | 'TODOS')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none text-sm"
                >
                  <option value="TODOS">Todos los tipos</option>
                  <option value="Estratégico">Estratégico</option>
                  <option value="Misional">Misional</option>
                  <option value="Apoyo">Apoyo</option>
                  <option value="Evaluación">Evaluación</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-black text-gray-900">
                Procesos Auditables ({procesos.length}) <span className="text-xs font-normal text-gray-500 ml-1">| {procesos.filter((p) => p.auditable).length} Priorizados</span>
              </h2>
              <p className="text-xs text-gray-600">
                Procesos del universo auditable institucional según el MECI
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {onRefresh && (
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden md:inline">Actualizar</span>
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setMostrarMenuExportar(!mostrarMenuExportar)}
                  onBlur={() => setTimeout(() => setMostrarMenuExportar(false), 150)}
                  className="w-full sm:w-auto px-3 py-2 bg-white border border-gray-300 hover:border-blue-600 text-gray-700 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all min-h-[44px] sm:min-h-0"
                >
                  <Download className="w-4 h-4" />
                  Exportar
                  <ChevronDown className={`w-4 h-4 transition-transform ${mostrarMenuExportar ? 'rotate-180' : ''}`} />
                </button>

                {mostrarMenuExportar && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={handleExportPdf}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-blue-50 flex items-center gap-3 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-red-600" />
                      Exportar a PDF
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-green-50 flex items-center gap-3 transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      Exportar a Excel
                    </button>
                  </div>
                )}
              </div>

              {puedeCrear && (
                <button
                  onClick={onAgregarProceso}
                  className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all min-h-[44px] sm:min-h-0"
                >
                  <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Agregar Proceso</span>
                  <span className="sm:hidden">Agregar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      {/* ═══════════════ TABLA RESPONSIVE ═══════════════ */}
        {/* Tabla con ResponsiveTable */}
        <ResponsiveTable
          data={procesos}
          columns={columns}
          keyExtractor={(p) => p.id}
          breakpoint="lg"
          renderMobileCard={renderMobileCard}
          emptyMessage="No hay procesos auditables registrados"
        />
      </div>

      {/* ═══════════════ MODAL: EVALUACIÓN DAFP ═══════════════ */}
      {modalDafpAbierto && procesoSeleccionadoDafp && (
        <FormularioEvaluacionDafpCompleta
          proceso={convertirProceso(procesoSeleccionadoDafp)}
          evaluacionExistente={convertirProceso(procesoSeleccionadoDafp).evaluacionDafp}
          onGuardar={handleGuardarEvaluacionDafp}
          onCancelar={() => {
            setModalDafpAbierto(false);
            setProcesoSeleccionadoDafp(null);
          }}
        />
      )}

      {/* ═══════════════ PANEL LATERAL: VISUALIZADOR DAFP ═══════════════ */}
      {panelDafpAbierto && procesoVisualizandoDafp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-end">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-white w-full md:w-[600px] lg:w-[800px] h-full overflow-y-auto shadow-2xl"
          >
            <div className="sticky top-0 bg-gradient-to-r from-[#2962FF] to-[#003DA5] text-white p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold">Resultados DAFP</h2>
              <button
                onClick={() => {
                  setPanelDafpAbierto(false);
                  setProcesoVisualizandoDafp(null);
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <VisualizadorResultadosDafp
                proceso={convertirProceso(procesoVisualizandoDafp)}
                showComparativa={true}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══════════════ MODAL: CONFIRMACIÓN DESMARCAR ═══════════════ */}
      <ModalBaseWorldClass
        isOpen={!!evaluacionParaDesmarcar}
        onClose={() => setEvaluacionParaDesmarcar(null)}
        title="Confirmar Exclusión del Universo Auditable"
        size="md"
        headerIcon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-900 mb-1">
                  <strong>¿Está seguro que desea excluir este proceso?</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Al desmarcar este proceso, dejará de formar parte del Universo Auditable.
                  Además, si ya existe una tarea asociada a este proceso en el <strong>Plan Anual (Rol 4)</strong>, esta será <strong>eliminada automáticamente</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setEvaluacionParaDesmarcar(null)}
              className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                if (evaluacionParaDesmarcar) {
                  const { id, actualValue } = evaluacionParaDesmarcar;
                  setEvaluacionParaDesmarcar(null);
                  setPatchingAuditableId(id);
                  try {
                    await onCambiarAuditable!(id, !actualValue);
                  } finally {
                    setPatchingAuditableId(null);
                  }
                }
              }}
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
            >
              Confirmar Exclusión
            </button>
          </div>
        </div>
      </ModalBaseWorldClass>
    </motion.div>
  );
}

export default TabUniversoAuditableResponsive;

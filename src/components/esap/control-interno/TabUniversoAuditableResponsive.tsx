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

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Layers, Search, AlertTriangle, CheckCircle2, AlertCircle,
  Plus, Edit2, Trash2, X, ChevronDown, ChevronUp, FileText, Eye, Target, Info
} from 'lucide-react';
import { ResponsiveTable, MobileCard, MobileCardRow, type Column } from '../../ui/responsive-table';
import { useResponsive } from '@/hooks/useResponsive';
import { FormularioEvaluacionDafpCompleta } from './FormularioEvaluacionDafpCompleta';
import { VisualizadorResultadosDafp } from './VisualizadorResultadosDafp';
import type { ProcesoAuditable as ProcesoAuditableType, EvaluacionDafpCompleta } from '@/types/control-interno';
import { ETIQUETAS_RIESGO } from '@/lib/dafp/constants'; // Nuevo import
import { calcularPonderacionRiesgo } from './dafp-utils'; // Para recalcular ponderación

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
  // ✅ Datos de evaluación del backend para cargar en el modal DAFP
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
  puedeCrear = true,
  puedeEditar = true,
  puedeEliminar = true
}: TabUniversoAuditableResponsiveProps) {
  
  const { isMobile, isTablet } = useResponsive();
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(!isMobile);
  
  // Estado para evaluación DAFP
  const [modalDafpAbierto, setModalDafpAbierto] = useState(false);
  const [procesoSeleccionadoDafp, setProcesoSeleccionadoDafp] = useState<ProcesoAuditable | null>(null);
  const [panelDafpAbierto, setPanelDafpAbierto] = useState(false);
  const [procesoVisualizandoDafp, setProcesoVisualizandoDafp] = useState<ProcesoAuditable | null>(null);
  
  // Handler para abrir modal de evaluación DAFP
  const handleEvaluarDafp = (proceso: ProcesoAuditable) => {
    setProcesoSeleccionadoDafp(proceso);
    setModalDafpAbierto(true);
  };
  
  // Handler para ver resultados DAFP
  const handleVerDafp = (proceso: ProcesoAuditable) => {
    setProcesoVisualizandoDafp(proceso);
    setPanelDafpAbierto(true);
  };
  
  // Handler para guardar evaluación DAFP
  // ✅ CONECTADO DIRECTAMENTE CON BACKEND via onGuardarEvaluacion
  const handleGuardarEvaluacionDafp = async (evaluacion: Partial<EvaluacionDafpCompleta>) => {
    if (!procesoSeleccionadoDafp) return;
    
    // Obtener C,E,M existentes o del formulario (FormularioEvaluacionDafpCompleta no los tiene, preservar los guardados)
    const evRiesgo = procesoSeleccionadoDafp._evaluacionRiesgo as Record<string, unknown> | undefined;
    const criticidad = (evaluacion as any).criticidad ?? evRiesgo?.criticidad ?? 0;
    const exposicion = (evaluacion as any).exposicion ?? evRiesgo?.exposicion ?? 0;
    const mitigantes = (evaluacion as any).mitigantes ?? evRiesgo?.mitigantes ?? 0;
    const scoreRiesgo = (evaluacion as any).scoreRiesgo ?? evRiesgo?.scoreRiesgo ?? (Number(criticidad) + Number(exposicion) - Number(mitigantes));

    // Convertir evaluación DAFP al formato del formulario que espera el backend
    const datosActualizados = {
      // Mantener datos básicos del proceso
      nombre: procesoSeleccionadoDafp.nombre,
      codigo: procesoSeleccionadoDafp.codigo,
      macroproceso: procesoSeleccionadoDafp.macroproceso,
      tipoProceso: procesoSeleccionadoDafp.tipoProceso,
      dependenciaResponsable: procesoSeleccionadoDafp.dependenciaResponsable,
      // Agregar campos de evaluación DAFP
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
      // Campos calculados
      ponderacionRiesgo: evaluacion.ponderacionRiesgo || 'BAJO',
      decisionFinal: evaluacion.decisionFinal || 'AUDITORÍA POSTERIOR',
      motivoDecision: evaluacion.motivoDecision || '',
      prioridadRegla: evaluacion.prioridadRegla || 5,
      // Score C+E-M para persistir en backend
      criticidad,
      exposicion,
      mitigantes,
      scoreRiesgo,
    };
    
    // ✅ Guardar directamente al backend usando la función editarProceso del hook
    if (onGuardarEvaluacion) {
      await onGuardarEvaluacion(procesoSeleccionadoDafp.id, datosActualizados);
    } else {
      console.warn('[TabUniversoAuditableResponsive] onGuardarEvaluacion no está definido');
    }
    
    // Cerrar modal
    setModalDafpAbierto(false);
    setProcesoSeleccionadoDafp(null);
  };

  /**
   * Convierte ProcesoAuditable (local) a ProcesoAuditableType (con evaluaciones)
   * TODO: Eliminar cuando se unifiquen los tipos
   */
  const convertirProceso = (proceso: ProcesoAuditable): ProcesoAuditableType => {
    // ✅ Solo crear evaluacionDafp si hay datos REALES de evaluación DAFP
    // Detectar si fue evaluado por: totalRiesgos > 0 o riesgos contados
    // Los campos ponderacionRiesgo y decisionFinal NO se persisten en backend
    const tieneEvaluacionDafp = proceso._evaluacionRiesgo && (
      // Tiene riesgos contados (indica que se hizo la evaluación DAFP)
      (proceso._evaluacionRiesgo.totalRiesgos !== undefined && proceso._evaluacionRiesgo.totalRiesgos > 0) ||
      // O tiene cualquier tipo de riesgo registrado
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
      
      // Recalcular ponderación ya que el backend no la guarda
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
        ponderacionRiesgo: ponderacionCalculada, // Recalculado desde los datos guardados
        decisionFinal: '', // No se guarda en backend
        motivoDecision: '',
        prioridadRegla: 0,
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
      evaluacionDafp, // ✅ Ahora se incluyen los datos de evaluación DAFP
      auditable: proceso.auditable ?? true,
      frecuenciaAuditoria: proceso.frecuenciaSugerida || 'Anual',
      prioridad: 1
    };
  };

  // ══════════════════════════════════════════════════════════════════════════
  // DEFINICIÓN DE COLUMNAS
  // ══════════════════════════════════════════════════════════════════════════

  const columns: Column<ProcesoAuditable>[] = [
    {
      key: 'codigo',
      label: 'Código',
      width: '120px',
      render: (value) => (
        <span className="font-mono text-sm font-bold text-gray-900">{value}</span>
      )
    },
    {
      key: 'nombre',
      label: 'Proceso',
      render: (_, proceso) => (
        <div>
          <p className="font-semibold text-gray-900">{proceso.nombre}</p>
          <p className="text-xs text-gray-500 mt-1">{proceso.macroproceso}</p>
        </div>
      )
    },
    {
      key: 'tipoProceso',
      label: 'Tipo',
      width: '140px',
      render: (value) => (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
          {value}
        </span>
      )
    },
    // {
    //   key: 'dependenciaResponsable',
    //   label: 'Dependencia',
    //   render: (value) => <span className="text-sm text-gray-700">{value}</span>
    // },
    {
      key: 'nivelRiesgo',
      label: 'Riesgo',
      align: 'center',
      width: '120px',
      render: (_, proceso) => {
        const color = getColorRiesgo(proceso.nivelRiesgo);
        return (
          <span
            className="px-3 py-1 rounded-full text-xs font-bold inline-block"
            style={{
              backgroundColor: color.bg,
              color: color.text,
              border: `2px solid ${color.border}`
            }}
          >
            {proceso.nivelRiesgo}
          </span>
        );
      }
    },
    {
      key: 'scoreRiesgo',
      label: 'Score',
      align: 'center',
      width: '120px',
      headerContent: (
        <div className="flex items-center gap-1.5">
          <span>Score</span>
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
        </div>
      ),
      render: (value) => (
        <div className="inline-flex items-center gap-1">
          <span className="font-bold text-gray-900">{value}</span>
          <span className="text-xs text-gray-500">/100</span>
        </div>
      )
    },
    {
      key: 'frecuenciaSugerida',
      label: 'Frecuencia',
      align: 'center',
      width: '120px',
      render: (value) => <span className="text-sm text-gray-700">{value}</span>
    },
    {
      key: 'horasEstimadas',
      label: 'Horas Est.',
      align: 'center',
      width: '100px',
      render: (value) => <span className="font-bold text-gray-900">{value}h</span>
    },
    {
      key: 'auditable',
      label: 'Auditable',
      align: 'center',
      width: '100px',
      render: (value) =>
        value ? (
          <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
        ) : (
          <X className="w-5 h-5 text-gray-400 mx-auto" />
        )
    },
    {
      key: 'evaluacionDafp',
      label: 'Evaluación DAFP',
      align: 'center',
      width: '160px',
      render: (_, proceso) => {
        // Convertir ProcesoAuditable a ProcesoAuditableType
        const procesoCompleto = convertirProceso(proceso);
        
        if (procesoCompleto.evaluacionDafp) {
          const ponderacion = procesoCompleto.evaluacionDafp.ponderacionRiesgo;
          const etiqueta = ponderacion ? ETIQUETAS_RIESGO[ponderacion] : null;
          
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleVerDafp(proceso);
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg hover:shadow-md transition-all"
              style={{
                background: etiqueta?.bgGradient || '#9CA3AF',
                color: '#FFFFFF'
              }}
              title="Ver resultados de evaluación DAFP"
            >
              <Eye className="w-4 h-4" />
              <span className="text-xs font-bold">
                {etiqueta?.label || 'Ver'}
              </span>
            </button>
          );
        }
        
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEvaluarDafp(proceso);
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg border-2 border-yellow-300 hover:bg-yellow-200 transition-colors"
            title="Realizar evaluación DAFP completa"
          >
            <Target className="w-4 h-4" />
            <span className="text-xs font-semibold">Evaluar</span>
          </button>
        );
      }
    },
    {
      key: 'id',
      label: 'Acciones',
      align: 'center',
      width: '120px',
      render: (_, proceso) => (
        <div className="flex items-center justify-center gap-2">
          {puedeEditar && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditarProceso(proceso);
            }}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Editar proceso"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          )}
          {puedeEliminar && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`¿Está seguro de eliminar el proceso "${proceso.nombre}"?`)) {
                onEliminarProceso(proceso.id);
              }
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar proceso"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          )}
        </div>
      )
    }
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // MOBILE CARD RENDERER
  // ══════════════════════════════════════════════════════════════════════════

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
          <MobileCardRow label="Horas Est." value={`${proceso.horasEstimadas || 0}h`} valueClassName="font-bold" />
          <MobileCardRow
            label="Auditable"
            value={
              proceso.auditable ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <X className="w-5 h-5 text-gray-400" />
              )
            }
          />
        </div>

        {/* Botones DAFP - Touch-friendly */}
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

        {/* Botones de acción - Touch-friendly */}
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
                onEliminarProceso(proceso.id);
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

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4 sm:space-y-6"
    >
      {/* ═══════════════ ESTADÍSTICAS - RESPONSIVE ═══════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Total Procesos */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-600">Total Procesos</span>
            <Layers className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900">{estadisticas.totalProcesos}</p>
          <p className="text-xs text-gray-500 mt-1">{estadisticas.procesosAuditables} auditables</p>
        </div>

        {/* Nivel Crítico */}
        <div className="bg-white rounded-xl border-2 border-red-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-semibold text-red-700">Nivel Crítico</span>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-red-700">{estadisticas.procesosCriticos}</p>
          <p className="text-xs text-red-600 mt-1">Requieren auditoría anual</p>
        </div>

        {/* Nivel Alto */}
        <div className="bg-white rounded-xl border-2 border-orange-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-semibold text-orange-700">Nivel Alto</span>
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-orange-700">{estadisticas.procesosAltos}</p>
          <p className="text-xs text-orange-600 mt-1">Auditoría anual o semestral</p>
        </div>

        {/* Medio y Bajo */}
        <div className="bg-white rounded-xl border-2 border-green-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-semibold text-green-700">Medio y Bajo</span>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-green-700">
            {estadisticas.procesosMedios + estadisticas.procesosBajos}
          </p>
          <p className="text-xs text-green-600 mt-1">Auditoría bienal o trienal</p>
        </div>
      </div>

      {/* ═══════════════ INFO CÁLCULO DEL SCORE ═══════════════ */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 flex items-start gap-3 shadow-sm">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold text-gray-900 mb-1">¿Cómo se calcula el Score?</p>
          <p className="text-gray-800 mb-2">
            Puntaje de prioridad (0-100) que ordena los procesos de mayor a menor urgencia.
            <strong> Fórmula:</strong> riesgoResidual = (Probabilidad × Impacto) ÷ Nivel de Control → score = (riesgoResidual ÷ 9) × 100
          </p>
          <p className="text-xs text-gray-700">
            <span className="inline-block mr-4">🔴 90-100: Prioridad alta (auditoría urgente)</span>
            <span className="inline-block mr-4">🟡 50-89: Prioridad media</span>
            <span className="inline-block">🟢 0-49: Prioridad baja (postergable)</span>
          </p>
        </div>
      </div>

      {/* ═══════════════ FILTROS - COLAPSABLES EN MOBILE ═══════════════ */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        {/* Header de filtros con botón collapse (solo mobile) */}
        <div className="p-4 sm:p-6 border-b-2 border-gray-200 bg-gray-50">
          <button
            onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
            className="lg:hidden w-full flex items-center justify-between text-left min-h-[44px]"
          >
            <span className="text-sm font-bold text-gray-700">
              🔍 Filtros de búsqueda
            </span>
            {filtrosAbiertos ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          <div className="hidden lg:block">
            <span className="text-sm font-bold text-gray-700">🔍 Filtros de búsqueda</span>
          </div>
        </div>

        {/* Contenido de filtros */}
        {filtrosAbiertos && (
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Búsqueda */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Buscar proceso
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => onBusquedaChange(e.target.value)}
                    placeholder="Nombre, código o dependencia..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none text-base"
                  />
                </div>
              </div>

              {/* Filtro Nivel de Riesgo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nivel de Riesgo
                </label>
                <select
                  value={filtroRiesgo}
                  onChange={(e) => onFiltroRiesgoChange(e.target.value as NivelRiesgo | 'TODOS')}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none text-base"
                >
                  <option value="TODOS">Todos los niveles</option>
                  <option value="Crítico">🔴 Crítico</option>
                  <option value="Alto">🟠 Alto</option>
                  <option value="Medio">🟡 Medio</option>
                  <option value="Bajo">🔵 Bajo</option>
                </select>
              </div>

              {/* Filtro Tipo de Proceso */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de Proceso
                </label>
                <select
                  value={filtroTipo}
                  onChange={(e) => onFiltroTipoChange(e.target.value as TipoProceso | 'TODOS')}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none text-base"
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

      {/* ═══════════════ TABLA RESPONSIVE ═══════════════ */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b-2 border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900">
                Procesos Auditables ({procesos.filter((p) => p.auditable).length})
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Procesos del universo auditable institucional según el MECI
              </p>
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
    </motion.div>
  );
}

export default TabUniversoAuditableResponsive;
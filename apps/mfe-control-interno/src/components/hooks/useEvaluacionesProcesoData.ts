/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOOK: useEvaluacionesProcesoData
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Hook para gestión de evaluaciones DAFP de procesos auditables.
 * Permite múltiples evaluaciones por proceso (diferentes vigencias/fechas).
 * 
 * Usa: controlInternoService
 * Backend: internal-institutional-control-service
 * Endpoints: /universo-auditorias/evaluaciones (CRUD)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { 
  controlInternoService, 
  type EvaluacionProceso, 
  type CreateEvaluacionProcesoDTO 
} from '../../services/api/controlInternoService';
import { calcularAuditableDesdeCiclo } from '../../utils/auditableEvaluacion';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS FRONTEND
// ════════════════════════════════════════════════════════════════════════════

export type PonderacionRiesgo = 'EXTREMO' | 'ALTO' | 'MODERADO' | 'BAJO' | 'MUY BAJO';
export type DecisionFinal = 'INCLUIR_PLAN_ANUAL' | 'INCLUIR_AUDITORIA_POSTERIOR';

export interface EvaluacionProcesoUI {
  id: string;
  procesoId: string;
  procesoNombre?: string;
  procesoCodigo?: string;
  // Encabezado
  vigencia: number;
  fechaCorte: string;
  dependenciaResponsable: string;
  // Riesgos
  riesgosExtremos: number;
  riesgosAltos: number;
  riesgosModerados: number;
  riesgosBajos: number;
  totalRiesgos: number;
  // Requerimientos
  requerimientoComite: boolean;
  requerimientoEntesReg: boolean;
  // Auditoría anterior
  fechaUltimaAuditoria?: string;
  resultadoUltimaAuditoria?: string;
  // Score
  criticidad: number;
  exposicion: number;
  mitigantes: number;
  scoreRiesgo: number;
  // Criterios de priorización DAFP (migración 179)
  tiempoUltimaAuditoria: number;
  temasAltaDireccion: number;
  objetivosEstrategicos: number;
  hallazgosAnteriores: number;
  ponderacionFinalDafp: number;
  nivelCriticidadDafp?: string;
  cicloRotacionDafp?: string;
  // DAFP legacy
  ponderacionRiesgo?: PonderacionRiesgo;
  diasTranscurridos?: number;
  planRotacion?: string;
  diasRotacion: number;
  decisionRotacion?: string;
  // Decisión
  decisionFinal?: DecisionFinal | string;
  motivoDecision?: string;
  prioridadRegla?: number;
  auditableCalculado?: boolean;
  auditableManual?: boolean | null;
  // Meta
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

// ════════════════════════════════════════════════════════════════════════════
// MAPPERS
// ════════════════════════════════════════════════════════════════════════════

function mapBackendToUI(backend: EvaluacionProceso): EvaluacionProcesoUI {
  return {
    id: backend.id,
    procesoId: backend.procesoId,
    procesoNombre: backend.proceso?.nombre,
    procesoCodigo: backend.proceso?.codigo,
    vigencia: backend.vigencia,
    fechaCorte: backend.fechaCorte,
    dependenciaResponsable: backend.dependenciaResponsable,
    riesgosExtremos: backend.riesgosExtremos ?? 0,
    riesgosAltos: backend.riesgosAltos ?? 0,
    riesgosModerados: backend.riesgosModerados ?? 0,
    riesgosBajos: backend.riesgosBajos ?? 0,
    totalRiesgos: backend.totalRiesgos ?? 0,
    requerimientoComite: backend.requerimientoComite ?? false,
    requerimientoEntesReg: backend.requerimientoEntesReg ?? false,
    fechaUltimaAuditoria: backend.fechaUltimaAuditoria,
    resultadoUltimaAuditoria: backend.resultadoUltimaAuditoria,
    criticidad: backend.criticidad ?? 0,
    exposicion: backend.exposicion ?? 0,
    mitigantes: backend.mitigantes ?? 0,
    scoreRiesgo: backend.scoreRiesgo ?? 0,
    tiempoUltimaAuditoria: backend.tiempoUltimaAuditoria ?? 0,
    temasAltaDireccion: backend.temasAltaDireccion ?? 0,
    objetivosEstrategicos: backend.objetivosEstrategicos ?? 0,
    hallazgosAnteriores: backend.hallazgosAnteriores ?? 0,
    ponderacionFinalDafp: backend.ponderacionFinalDafp ?? 0,
    nivelCriticidadDafp: backend.nivelCriticidadDafp,
    cicloRotacionDafp: backend.cicloRotacionDafp,
    ponderacionRiesgo: backend.ponderacionRiesgo as PonderacionRiesgo,
    diasTranscurridos: backend.diasTranscurridos,
    planRotacion: backend.planRotacion,
    diasRotacion: backend.diasRotacion ?? 360,
    decisionRotacion: backend.decisionRotacion,
    decisionFinal: backend.decisionFinal,
    motivoDecision: backend.motivoDecision,
    prioridadRegla: backend.prioridadRegla,
    auditableCalculado: backend.auditableCalculado,
    auditableManual: backend.auditableManual ?? null,
    activo: backend.activo,
    createdAt: backend.createdAt,
    updatedAt: backend.updatedAt,
  };
}

function mapUIToBackend(ui: Partial<EvaluacionProcesoUI>): Partial<CreateEvaluacionProcesoDTO> {
  const base: Partial<CreateEvaluacionProcesoDTO> = {
    procesoId: ui.procesoId || '',
    vigencia: ui.vigencia ?? new Date().getFullYear(),
    fechaCorte: ui.fechaCorte || new Date().toISOString().split('T')[0],
    dependenciaResponsable: ui.dependenciaResponsable || '',
    riesgosExtremos: ui.riesgosExtremos ?? 0,
    riesgosAltos: ui.riesgosAltos ?? 0,
    riesgosModerados: ui.riesgosModerados ?? 0,
    riesgosBajos: ui.riesgosBajos ?? 0,
    totalRiesgos: ui.totalRiesgos ?? ((ui.riesgosExtremos ?? 0) + (ui.riesgosAltos ?? 0) + (ui.riesgosModerados ?? 0) + (ui.riesgosBajos ?? 0)),
    requerimientoComite: ui.requerimientoComite ?? false,
    requerimientoEntesReg: ui.requerimientoEntesReg ?? false,
    fechaUltimaAuditoria: ui.fechaUltimaAuditoria,
    resultadoUltimaAuditoria: ui.resultadoUltimaAuditoria,
    criticidad: ui.criticidad ?? 0,
    exposicion: ui.exposicion ?? 0,
    mitigantes: ui.mitigantes ?? 0,
    tiempoUltimaAuditoria: ui.tiempoUltimaAuditoria ?? 0,
    temasAltaDireccion: ui.temasAltaDireccion ?? 0,
    objetivosEstrategicos: ui.objetivosEstrategicos ?? 0,
    hallazgosAnteriores: ui.hallazgosAnteriores ?? 0,
    ponderacionFinalDafp: ui.ponderacionFinalDafp ?? 0,
    nivelCriticidadDafp: ui.nivelCriticidadDafp,
    cicloRotacionDafp: ui.cicloRotacionDafp,
    decisionFinal: ui.decisionFinal,
    motivoDecision: ui.motivoDecision,
    prioridadRegla: ui.prioridadRegla,
    auditableCalculado:
      ui.auditableCalculado ??
      calcularAuditableDesdeCiclo(ui.cicloRotacionDafp),
  };
  // Incluir procesoId si existe y tiene formato válido
  if (ui.procesoId) {
    base.procesoId = ui.procesoId;
  }
  return base;
}

// ════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

interface UseEvaluacionesProcesoOptions {
  vigencia?: number;
  procesoId?: string;
  showToasts?: boolean;
  autoLoad?: boolean;
}

interface UseEvaluacionesProcesoReturn {
  evaluaciones: EvaluacionProcesoUI[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  agregarEvaluacion: (data: Partial<EvaluacionProcesoUI>) => Promise<EvaluacionProcesoUI | null>;
  editarEvaluacion: (id: string, data: Partial<EvaluacionProcesoUI>) => Promise<EvaluacionProcesoUI | null>;
  eliminarEvaluacion: (id: string) => Promise<boolean>;
  patchAuditableManual: (id: string, auditableManual: boolean | null) => Promise<EvaluacionProcesoUI | null>;
  getEstadisticas: (vigencia: number) => Promise<any>;
}

export function useEvaluacionesProcesoData(
  options: UseEvaluacionesProcesoOptions = {}
): UseEvaluacionesProcesoReturn {
  const { 
    vigencia, 
    procesoId, 
    showToasts = true, 
    autoLoad = true 
  } = options;
  
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionProcesoUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // ══════════════════════════════════════════════════════════════════════════
  // CARGAR EVALUACIONES
  // ══════════════════════════════════════════════════════════════════════════
  
  const fetchEvaluaciones = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('[useEvaluacionesProcesoData] Fetching with vigencia:', vigencia, 'procesoId:', procesoId);
        
        let data: EvaluacionProceso[];
        
        const validProcesoId = procesoId && procesoId !== 'undefined' ? procesoId : undefined;
        
        if (validProcesoId) {
          data = await controlInternoService.getEvaluacionesByProceso(validProcesoId);
        } else {
          data = await controlInternoService.getEvaluaciones(vigencia);
        }
        
        console.log('[useEvaluacionesProcesoData] API returned:', data.length, 'evaluaciones');
        
        if (!mountedRef.current) return;
        
        const mapped = data.map(mapBackendToUI);
        console.log('[useEvaluacionesProcesoData] Evaluaciones cargadas:', mapped.length);
        setEvaluaciones(mapped);
      
    } catch (err) {
      if (!mountedRef.current) return;
      
      const msg = err instanceof Error ? err.message : 'Error al cargar evaluaciones';
      setError(msg);
      console.error('[useEvaluacionesProcesoData] Error al cargar:', msg);
      
      if (showToasts) {
        toast.error('Error al cargar evaluaciones');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [vigencia, procesoId, showToasts]);

  // ══════════════════════════════════════════════════════════════════════════
  // AGREGAR EVALUACIÓN
  // ══════════════════════════════════════════════════════════════════════════
  
  const agregarEvaluacion = useCallback(async (
    data: Partial<EvaluacionProcesoUI>
  ): Promise<EvaluacionProcesoUI | null> => {
    try {
      const dto = mapUIToBackend(data);
      if (!dto.procesoId) {
        if (showToasts) toast.error('Falta el proceso asociado a la evaluación');
        console.error('[useEvaluacionesProcesoData] ERROR: procesoId es undefined o vacío');
        return null;
      }
      // Validar que los datos críticos estén presentes
      console.log('[useEvaluacionesProcesoData] ===== DATOS ENVIADOS AL BACKEND =====');
      console.log('procesoId:', dto.procesoId);
      console.log('riesgosExtremos:', dto.riesgosExtremos, 'riesgosAltos:', dto.riesgosAltos, 'riesgosModerados:', dto.riesgosModerados, 'riesgosBajos:', dto.riesgosBajos, 'totalRiesgos:', dto.totalRiesgos);
      console.log('tiempoUltimaAuditoria:', dto.tiempoUltimaAuditoria, 'temasAltaDireccion:', dto.temasAltaDireccion, 'objetivosEstrategicos:', dto.objetivosEstrategicos, 'hallazgosAnteriores:', dto.hallazgosAnteriores);
      console.log('ponderacionFinalDafp:', dto.ponderacionFinalDafp, 'nivelCriticidadDafp:', dto.nivelCriticidadDafp, 'cicloRotacionDafp:', dto.cicloRotacionDafp);
      console.log('========================================================');
      
      const created = await controlInternoService.createEvaluacion(dto as CreateEvaluacionProcesoDTO);
      console.log('[useEvaluacionesProcesoData] Respuesta del backend:', JSON.stringify(created, null, 2));
      const mapped = mapBackendToUI(created);
      console.log('[useEvaluacionesProcesoData] Mapeado a UI:', JSON.stringify(mapped, null, 2));
      
      // Forzar actualización del estado
      setEvaluaciones(prev => {
        const nuevo = [...prev, mapped];
        console.log('[useEvaluacionesProcesoData] Estado actualizado, total:', nuevo.length);
        return nuevo;
      });
      
      if (showToasts) {
        toast.success('Evaluación creada exitosamente');
      }
      
      return mapped;
      
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear evaluación';
      console.error('[useEvaluacionesProcesoData] Error al agregar:', msg);
      
      if (showToasts) {
        toast.error(msg);
      }
      
      return null;
    }
  }, [showToasts]);

  // ══════════════════════════════════════════════════════════════════════════
  // EDITAR EVALUACIÓN
  // ══════════════════════════════════════════════════════════════════════════
  
  const editarEvaluacion = useCallback(async (
    id: string,
    data: Partial<EvaluacionProcesoUI>
  ): Promise<EvaluacionProcesoUI | null> => {
    try {
      const dto = mapUIToBackend(data);
      console.log('[useEvaluacionesProcesoData] Actualizando evaluación:', id, dto);
      
      const updated = await controlInternoService.updateEvaluacion(id, dto);
      const mapped = mapBackendToUI(updated);
      
      setEvaluaciones(prev => 
        prev.map(e => e.id === id ? mapped : e)
      );
      
      if (showToasts) {
        toast.success('Evaluación actualizada');
      }
      
      return mapped;
      
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar evaluación';
      console.error('[useEvaluacionesProcesoData] Error al editar:', msg);
      
      if (showToasts) {
        toast.error(msg);
      }
      
      return null;
    }
  }, [showToasts]);

  // ══════════════════════════════════════════════════════════════════════════
  // ELIMINAR EVALUACIÓN
  // ══════════════════════════════════════════════════════════════════════════
  
  const eliminarEvaluacion = useCallback(async (id: string): Promise<boolean> => {
    try {
      await controlInternoService.deleteEvaluacion(id);
      
      setEvaluaciones(prev => prev.filter(e => e.id !== id));
      
      if (showToasts) {
        toast.success('Evaluación eliminada');
      }
      
      return true;
      
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar evaluación';
      console.error('[useEvaluacionesProcesoData] Error al eliminar:', msg);
      
      if (showToasts) {
        toast.error(msg);
      }
      
      return false;
    }
  }, [showToasts]);

  const patchAuditableManual = useCallback(async (
    id: string,
    auditableManual: boolean | null
  ): Promise<EvaluacionProcesoUI | null> => {
    try {
      const updated = await controlInternoService.patchAuditableManual(id, auditableManual);
      const ui = mapBackendToUI(updated);
      if (mountedRef.current) {
        setEvaluaciones((prev) => prev.map((e) => (e.id === id ? ui : e)));
      }
      if (showToasts) {
        toast.success(
          auditableManual === null
            ? 'Priorización restaurada al valor calculado (DAFP)'
            : auditableManual
              ? 'Proceso marcado como priorizado'
              : 'Proceso excluido de priorización'
        );
      }
      return ui;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar priorización';
      if (showToasts) toast.error(msg);
      return null;
    }
  }, [showToasts]);

  // ══════════════════════════════════════════════════════════════════════════
  // ESTADÍSTICAS
  // ══════════════════════════════════════════════════════════════════════════
  
  const getEstadisticas = useCallback(async (vigenciaParam: number): Promise<any> => {
    try {
      return await controlInternoService.getEstadisticasEvaluaciones(vigenciaParam);
    } catch (err) {
      console.error('[useEvaluacionesProcesoData] Error al obtener estadísticas:', err);
      return null;
    }
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // EFECTOS
  // ══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    mountedRef.current = true;
    
    if (autoLoad) {
      fetchEvaluaciones();
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [autoLoad, fetchEvaluaciones, vigencia]);

  return {
    evaluaciones,
    loading,
    error,
    refetch: fetchEvaluaciones,
    agregarEvaluacion,
    editarEvaluacion,
    eliminarEvaluacion,
    patchAuditableManual,
    getEstadisticas,
  };
}

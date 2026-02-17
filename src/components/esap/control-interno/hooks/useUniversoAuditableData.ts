/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOOK: useUniversoAuditableData
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Hook principal para integración con backend del módulo Universo Auditable.
 * Reemplaza TODOS los datos mock con llamadas reales al API.
 * 
 * Usa: controlInternoService (src/services/api/controlInternoService.ts)
 * Backend: internal-institutional-control-service
 * Endpoints: /universo-auditorias/procesos (CRUD)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner@2.0.3';
import { controlInternoService } from '@/services/api/controlInternoService';
import type { ProcesoAuditable as BackendProcesoAuditable } from '@/services/api/controlInternoService';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS FRONTEND (usados por el componente UniversoAuditableUnificado)
// ════════════════════════════════════════════════════════════════════════════

export type NivelRiesgo = 'Crítico' | 'Alto' | 'Medio' | 'Bajo';
export type TipoProceso = 'Estratégico' | 'Misional' | 'Apoyo' | 'Evaluación';

export interface ProcesoAuditableUI {
  id: string;
  nombre: string;
  tipo: TipoProceso;
  descripcion: string;
  responsable: string;
  nivelRiesgo: NivelRiesgo;
  puntajeRiesgo: number;       // 0-100
  calificacionDafp: number;    // 1-5
  categoria: string;
  auditable: boolean;
  ultimaAuditoria?: string;
  frecuenciaAuditoria: 'Anual' | 'Semestral' | 'Bienal' | 'Trienal';
  activo: boolean;
  // Campos del backend que mantenemos para el mapeo inverso
  _backendId?: string;
  _codigo?: string;
  _macroproceso?: string;
  _dependencia?: string;
  _territorial?: string;
  _evaluacionRiesgo?: BackendProcesoAuditable['evaluacionRiesgo'];
}

// ════════════════════════════════════════════════════════════════════════════
// MAPPERS: Backend ↔ Frontend
// ════════════════════════════════════════════════════════════════════════════

/** Mapea tipo del backend (lowercase) al tipo UI (capitalizado) */
function mapTipoProceso(tipo: string): TipoProceso {
  const map: Record<string, TipoProceso> = {
    'estrategico': 'Estratégico',
    'misional': 'Misional',
    'apoyo': 'Apoyo',
    'evaluacion': 'Evaluación',
  };
  return map[tipo?.toLowerCase()] || 'Apoyo';
}

/** Mapea tipo UI al tipo backend */
function mapTipoProcesoToBackend(tipo: TipoProceso): string {
  const map: Record<TipoProceso, string> = {
    'Estratégico': 'estrategico',
    'Misional': 'misional',
    'Apoyo': 'apoyo',
    'Evaluación': 'evaluacion',
  };
  return map[tipo] || 'apoyo';
}

/** Mapea nivel de riesgo del backend al UI */
function mapNivelRiesgo(evaluacionRiesgo: BackendProcesoAuditable['evaluacionRiesgo']): NivelRiesgo {
  if (!evaluacionRiesgo) return 'Medio';
  
  const { nivelRiesgo, riesgoInherente } = evaluacionRiesgo;
  
  // Si el riesgo inherente es >= 8 (de max 9), se considera Crítico
  if (riesgoInherente >= 8) return 'Crítico';
  
  const map: Record<string, NivelRiesgo> = {
    'alto': 'Alto',
    'medio': 'Medio',
    'bajo': 'Bajo',
  };
  return map[nivelRiesgo?.toLowerCase()] || 'Medio';
}

/** Calcula puntaje de riesgo (0-100) desde la evaluación del backend */
function calcularPuntajeRiesgo(evaluacionRiesgo: BackendProcesoAuditable['evaluacionRiesgo']): number {
  if (!evaluacionRiesgo) return 50;
  // riesgoInherente = probabilidad * impacto (max 9 si escala 1-3)
  const maxRiesgo = 9;
  return Math.round((evaluacionRiesgo.riesgoInherente / maxRiesgo) * 100);
}

/** Calcula calificación DAFP (1-5) en base al nivel de control */
function calcularCalificacionDafp(evaluacionRiesgo: BackendProcesoAuditable['evaluacionRiesgo']): number {
  if (!evaluacionRiesgo) return 3;
  // nivelControl alto (3) = mejor calificación, bajo (1) = peor
  const nivelControl = evaluacionRiesgo.nivelControl || 2;
  // Escalar de 1-3 a 1-5: (nivelControl / 3) * 4 + 1
  return Math.round((nivelControl / 3) * 4 * 10) / 10 + 1;
}

/** Mapea frecuencia de auditoría al tipo esperado */
function mapFrecuenciaAuditoria(frecuencia: string): 'Anual' | 'Semestral' | 'Bienal' | 'Trienal' {
  const f = frecuencia?.toLowerCase();
  if (f?.includes('semestral')) return 'Semestral';
  if (f?.includes('bienal') || f?.includes('bianual')) return 'Bienal';
  if (f?.includes('trienal') || f?.includes('trianual')) return 'Trienal';
  return 'Anual';
}

/** Convierte un proceso del backend al formato del UI */
export function mapBackendToUI(proceso: BackendProcesoAuditable): ProcesoAuditableUI {
  return {
    id: proceso.id,
    nombre: proceso.nombre,
    tipo: mapTipoProceso(proceso.tipo),
    descripcion: proceso.descripcion,
    responsable: proceso.responsable,
    nivelRiesgo: mapNivelRiesgo(proceso.evaluacionRiesgo),
    puntajeRiesgo: calcularPuntajeRiesgo(proceso.evaluacionRiesgo),
    calificacionDafp: calcularCalificacionDafp(proceso.evaluacionRiesgo),
    categoria: proceso.macroproceso || 'General',
    auditable: true,
    ultimaAuditoria: proceso.ultimaAuditoria || undefined,
    frecuenciaAuditoria: mapFrecuenciaAuditoria(proceso.frecuenciaAuditoria),
    activo: true,
    // Guardamos los campos backend para mapeo inverso
    _backendId: proceso.id,
    _codigo: proceso.codigo,
    _macroproceso: proceso.macroproceso,
    _dependencia: proceso.dependencia,
    _territorial: proceso.territorial,
    _evaluacionRiesgo: proceso.evaluacionRiesgo,
  };
}

/** Convierte un proceso del UI al formato del backend (para crear/actualizar) */
export function mapUIToBackend(proceso: ProcesoAuditableUI): Partial<BackendProcesoAuditable> {
  // Mapear nivel de riesgo UI a escala del backend
  const nivelRiesgoMap: Record<NivelRiesgo, 'bajo' | 'medio' | 'alto'> = {
    'Bajo': 'bajo',
    'Medio': 'medio',
    'Alto': 'alto',
    'Crítico': 'alto', // No existe 'critico' en backend, usar 'alto'
  };

  const probabilidad = proceso.puntajeRiesgo >= 80 ? 3 : proceso.puntajeRiesgo >= 50 ? 2 : 1;
  const impacto = proceso.puntajeRiesgo >= 80 ? 3 : proceso.puntajeRiesgo >= 50 ? 2 : 1;

  return {
    codigo: proceso._codigo || `PROC-${Date.now()}`,
    nombre: proceso.nombre,
    descripcion: proceso.descripcion,
    tipo: mapTipoProcesoToBackend(proceso.tipo) as any,
    macroproceso: proceso._macroproceso || proceso.categoria || 'General',
    responsable: proceso.responsable,
    dependencia: proceso._dependencia || 'Sin asignar',
    territorial: proceso._territorial,
    evaluacionRiesgo: proceso._evaluacionRiesgo || {
      probabilidad,
      impacto,
      nivelControl: Math.round(proceso.calificacionDafp / 5 * 3) || 2,
      riesgoInherente: probabilidad * impacto,
      riesgoResidual: probabilidad * impacto * (Math.round(proceso.calificacionDafp / 5 * 3) || 2),
      nivelRiesgo: nivelRiesgoMap[proceso.nivelRiesgo] || 'medio',
    },
    frecuenciaAuditoria: proceso.frecuenciaAuditoria,
    ultimaAuditoria: proceso.ultimaAuditoria,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

interface UseUniversoAuditableDataOptions {
  autoFetch?: boolean;
  showToasts?: boolean;
}

interface UseUniversoAuditableDataReturn {
  // Data
  procesos: ProcesoAuditableUI[];
  
  // Estado
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  
  // CRUD
  fetchProcesos: () => Promise<void>;
  agregarProceso: (proceso: any) => Promise<boolean>;
  editarProceso: (id: string, proceso: any) => Promise<boolean>;
  eliminarProceso: (id: string) => Promise<boolean>;
  
  // Utilitarios
  refetch: () => Promise<void>;
}

export function useUniversoAuditableData(
  options: UseUniversoAuditableDataOptions = {}
): UseUniversoAuditableDataReturn {
  const { autoFetch = true, showToasts = true } = options;
  
  const [procesos, setProcesos] = useState<ProcesoAuditableUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const fetchedRef = useRef(false);

  // ── Fetch procesos desde el backend ──
  const fetchProcesos = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const backendProcesos = await controlInternoService.getProcesosAuditables();
      
      if (Array.isArray(backendProcesos) && backendProcesos.length > 0) {
        const mapped = backendProcesos.map(mapBackendToUI);
        setProcesos(mapped);
        setIsOnline(true);
      } else if (Array.isArray(backendProcesos)) {
        // Array vacío — backend está disponible pero sin datos
        setProcesos([]);
        setIsOnline(true);
      } else {
        // Respuesta inesperada
        setProcesos([]);
        setIsOnline(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar procesos auditables';
      console.warn('[useUniversoAuditableData] Error al conectar con backend:', msg);
      setError(msg);
      setIsOnline(false);
      // No tocar procesos existentes si falla la recarga
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Auto-fetch al montar ──
  useEffect(() => {
    if (autoFetch && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchProcesos();
    }
  }, [autoFetch, fetchProcesos]);

  // ── CRUD: Agregar proceso ──
  const agregarProceso = useCallback(async (procesoData: any): Promise<boolean> => {
    try {
      const procesoUI: ProcesoAuditableUI = {
        ...procesoData,
        id: `temp-${Date.now()}`,
      };
      
      const backendData = mapUIToBackend(procesoUI);
      const created = await controlInternoService.createProceso(backendData);
      
      if (created && created.id) {
        const mappedProceso = mapBackendToUI(created);
        setProcesos(prev => [...prev, mappedProceso]);
        if (showToasts) toast.success('✅ Proceso agregado al Universo Auditable');
        return true;
      }
      
      throw new Error('Respuesta inválida del servidor');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al agregar proceso';
      console.error('[useUniversoAuditableData] Error al agregar:', msg);
      if (showToasts) toast.error(`❌ ${msg}`);
      setError(msg);
      return false;
    }
  }, [showToasts]);

  // ── CRUD: Editar proceso ──
  const editarProceso = useCallback(async (id: string, procesoData: any): Promise<boolean> => {
    try {
      const procesoUI: ProcesoAuditableUI = { ...procesoData, id };
      const backendData = mapUIToBackend(procesoUI);
      const updated = await controlInternoService.updateProceso(id, backendData);
      
      if (updated && updated.id) {
        const mappedProceso = mapBackendToUI(updated);
        setProcesos(prev => prev.map(p => p.id === id ? mappedProceso : p));
        if (showToasts) toast.success('✅ Proceso actualizado exitosamente');
        return true;
      }
      
      throw new Error('Respuesta inválida del servidor');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar proceso';
      console.error('[useUniversoAuditableData] Error al editar:', msg);
      if (showToasts) toast.error(`❌ ${msg}`);
      setError(msg);
      return false;
    }
  }, [showToasts]);

  // ── CRUD: Eliminar proceso ──
  const eliminarProceso = useCallback(async (id: string): Promise<boolean> => {
    try {
      await controlInternoService.deleteProceso(id);
      setProcesos(prev => prev.filter(p => p.id !== id));
      if (showToasts) toast.success('✅ Proceso eliminado del Universo Auditable');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar proceso';
      console.error('[useUniversoAuditableData] Error al eliminar:', msg);
      if (showToasts) toast.error(`❌ ${msg}`);
      setError(msg);
      return false;
    }
  }, [showToasts]);

  return {
    procesos,
    loading,
    error,
    isOnline,
    fetchProcesos,
    agregarProceso,
    editarProceso,
    eliminarProceso,
    refetch: fetchProcesos,
  };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOOK: usePlanesMejoramiento
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Hook para gestionar planes de mejoramiento conectado al backend
 * 
 * VERSIÓN: 1.0
 * ÚLTIMA ACTUALIZACIÓN: 18 Febrero 2026
 */

import { useState, useCallback, useEffect } from 'react';
import controlInternoService from '../../../../services/api/controlInternoService';
import { auditoriaCoincideVigenciaPlan } from './useAuditoriasKanban';
import { toast } from 'sonner';
import {
  PM_MAX_TITULO,
  textoCampoPlanMejoramiento,
} from '../../utils/planMejoramientoCampos';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

type EstadoPlan = 'FORMULACION' | 'APROBADO' | 'EN_EJECUCION' | 'CON_RETRASO' | 'COMPLETADO' | 'SUSPENDIDO';
type SemaforoPlan = 'verde' | 'amarillo' | 'rojo';

export interface PlanMejoramientoKanban {
  id: string;
  codigo: string;
  titulo?: string;
  auditoria: string;
  auditoriaId?: string;
  area: string;
  responsable: string;
  cargoResponsable: string;
  fechaCreacion: string;
  fechaAprobacion?: string;
  fechaInicio?: string;
  fechaFin: string;
  estado: EstadoPlan;
  semaforo: SemaforoPlan;
  totalHallazgos: number;
  totalAcciones: number;
  accionesCompletadas: number;
  accionesEnProceso: number;
  accionesPendientes: number;
  porcentajeAvance: number;
  hallazgosCriticos: number;
  hallazgosModerados: number;
  hallazgosLeves: number;
  ultimaActualizacion: string;
  alertas: number;
  diasRestantes: number;
  planAnualVigencia?: number;
  /** Metadatos de la auditoría vinculada (solo para filtro por vigencia) */
  auditoriaVigencia?: {
    planAnualVigencia?: number;
    planAnualAño?: number;
    vigencia?: number;
    codigo?: string;
    fechaInicio?: string;
  };
}

export interface PlanesMejoramientoFilters {
  planAnualVigencia?: number;
}

/** Filtro estricto por vigencia (cliente, respaldo del backend) */
export function planCoincideVigenciaPlan(
  plan: {
    codigo?: string;
    planAnualVigencia?: number;
    fechaInicio?: string;
    auditoriaVigencia?: {
      planAnualVigencia?: number;
      planAnualAño?: number;
      vigencia?: number;
      codigo?: string;
      fechaInicio?: string;
    };
  },
  vigencia: number,
): boolean {
  if (plan.planAnualVigencia != null && !Number.isNaN(Number(plan.planAnualVigencia))) {
    return Number(plan.planAnualVigencia) === vigencia;
  }
  if (plan.auditoriaVigencia) {
    return auditoriaCoincideVigenciaPlan(plan.auditoriaVigencia, vigencia);
  }
  if (plan.codigo?.includes(`PM-${vigencia}-`)) return true;
  if (plan.fechaInicio) {
    const y = new Date(plan.fechaInicio).getFullYear();
    if (!Number.isNaN(y) && y === vigencia) return true;
  }
  return false;
}

interface CreatePlanDto {
  // Campos requeridos por el backend
  areaResponsable: string;
  responsableImplementacion: string;
  fechaLimite: string; // ISO 8601 date
  // Campos opcionales
  auditoriaId?: string;
  titulo?: string;
  descripcion?: string;
  objetivos?: string[];
  hallazgoId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mapea estado del backend al formato del frontend (Kanban)
 * Incluye variantes de nomenclatura del backend para evitar planes en columna incorrecta
 */
function mapearEstado(estado: string): EstadoPlan {
  const e = String(estado || '').trim().toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
  const mapa: Record<string, EstadoPlan> = {
    // Formulación
    formulacion: 'FORMULACION',
    formulando: 'FORMULACION',
    borrador: 'FORMULACION',
    en_formulacion: 'FORMULACION',
    revision: 'FORMULACION',
    rechazado: 'FORMULACION',
    // Aprobado
    aprobado: 'APROBADO',
    aprobacion: 'APROBADO',
    aprobado_por_jefe: 'APROBADO',
    // En Ejecución
    en_ejecucion: 'EN_EJECUCION',
    en_progreso: 'EN_EJECUCION',
    en_seguimiento: 'EN_EJECUCION',
    abierto: 'EN_EJECUCION',
    vigente: 'EN_EJECUCION',
    activo: 'EN_EJECUCION',
    // Con Retraso
    con_retraso: 'CON_RETRASO',
    retrasado: 'CON_RETRASO',
    vencido: 'CON_RETRASO',
    // Completado
    completado: 'COMPLETADO',
    cumplido: 'COMPLETADO',
    cerrado: 'COMPLETADO',
    finalizado: 'COMPLETADO',
    implementado: 'COMPLETADO',
    // Suspendido
    suspendido: 'SUSPENDIDO',
    pausado: 'SUSPENDIDO',
  };
  return mapa[e] ?? 'FORMULACION';
}

/**
 * Calcula el semáforo basado en progreso y días restantes
 */
function calcularSemaforo(porcentajeAvance: number, diasRestantes: number): SemaforoPlan {
  if (porcentajeAvance >= 80 || diasRestantes > 30) return 'verde';
  if (porcentajeAvance >= 50 || diasRestantes > 15) return 'amarillo';
  return 'rojo';
}

/**
 * Calcula días restantes desde una fecha
 */
function calcularDiasRestantes(fechaFin: string): number {
  if (!fechaFin || String(fechaFin).trim() === '') return 0;
  const hoy = new Date();
  const fin = new Date(fechaFin);
  if (Number.isNaN(fin.getTime())) return 0;
  const diff = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  return Number.isFinite(diff) ? diff : 0;
}

/**
 * Transforma un plan del backend al formato del Kanban
 */
function esAccionCompletada(accion: any): boolean {
  const p = Number(accion?.porcentajeAvance ?? accion?.progreso ?? accion?.porcentaje_avance);
  if (Number.isFinite(p) && p >= 100) return true;
  const e = String(accion?.estado || '')
    .toLowerCase()
    .replace(/-/g, '_');
  return (
    e === 'completada' ||
    e === 'implementada' ||
    e === 'completado' ||
    e === 'implementado' ||
    e === 'finalizada' ||
    e === 'cerrada'
  );
}

/** Promedio del % de avance por acción (mismo criterio que el backend en listados) */
function promedioPorcentajeAvanceAcciones(acciones: any[]): number {
  if (!acciones.length) return 0;
  const sum = acciones.reduce((s, a) => {
    const p = Math.min(100, Math.max(0, Number(a?.porcentajeAvance ?? a?.porcentaje_avance ?? 0)));
    return s + (Number.isFinite(p) ? p : 0);
  }, 0);
  return Math.round(sum / acciones.length);
}

function transformarPlan(planBackend: any): PlanMejoramientoKanban {
  const fechaFinPlan =
    planBackend.fechaFin ||
    planBackend.fecha_fin ||
    planBackend.fechaLimite ||
    planBackend.fecha_limite ||
    '';
  const diasRestantes = calcularDiasRestantes(fechaFinPlan);
  
  // Calcular acciones (el backend puede enviar totales agregados sin depender del array)
  const acciones = planBackend.acciones || [];
  const accionesCompletadasCalc =
    acciones.length > 0 ? acciones.filter((a: any) => esAccionCompletada(a)).length : 0;
  const accionesCompletadasRaw =
    planBackend.accionesCompletadas ?? planBackend.acciones_completadas;
  const accionesCompletadas =
    accionesCompletadasRaw != null && accionesCompletadasRaw !== ''
      ? Number(accionesCompletadasRaw) || 0
      : accionesCompletadasCalc;
  const totalAccionesRaw = planBackend.totalAcciones ?? planBackend.total_acciones;
  const totalAccionesCalc =
    totalAccionesRaw != null && totalAccionesRaw !== ''
      ? Number(totalAccionesRaw) || 0
      : acciones.length || 0;
  const promedioDesdeAcciones = promedioPorcentajeAvanceAcciones(acciones);
  const rawPct = planBackend.porcentajeAvance ?? planBackend.porcentaje_avance;
  let porcentajeAvance: number;
  if (acciones.length > 0) {
    porcentajeAvance = promedioDesdeAcciones;
  } else if (rawPct != null && rawPct !== '' && !Number.isNaN(Number(rawPct))) {
    porcentajeAvance = Number(rawPct) || 0;
  } else if (totalAccionesCalc > 0) {
    porcentajeAvance = Math.round((accionesCompletadas / totalAccionesCalc) * 100);
  } else {
    porcentajeAvance = 0;
  }
  if (!Number.isFinite(porcentajeAvance)) porcentajeAvance = 0;
  porcentajeAvance = Math.min(100, Math.max(0, porcentajeAvance));
  const accionesEnProceso = acciones.filter((a: any) => {
    const e = String(a.estado || '').toLowerCase().replace(/-/g, '_');
    const p = Number(a.porcentajeAvance ?? a.porcentaje_avance ?? 0);
    if (e === 'en_progreso' || e === 'en_proceso' || e === 'en_ejecucion') return true;
    if ((e === 'programada' || e === 'pendiente') && p > 0 && p < 100) return true;
    return false;
  }).length;
  const accionesPendientes = acciones.filter((a: any) => {
    const e = String(a.estado || '').toLowerCase();
    const p = Number(a.porcentajeAvance ?? a.porcentaje_avance ?? 0);
    if ((e === 'programada' || e === 'pendiente') && p > 0 && p < 100) return false;
    return ['pendiente', 'programada', 'sin_iniciar', 'sin iniciar'].includes(e);
  }).length;

  const auditoriaObj = planBackend.auditoria;

  // Calcular hallazgos por gravedad
  const hallazgos = Array.isArray(planBackend.hallazgos)
    ? planBackend.hallazgos
    : planBackend.hallazgo
      ? [planBackend.hallazgo]
      : [];
  let totalHallazgosBackend =
    hallazgos.length ||
    Number(planBackend.totalHallazgos ?? planBackend.total_hallazgos ?? planBackend.numeroHallazgos ?? 0) ||
    0;
  if (totalHallazgosBackend === 0 && (planBackend.hallazgoId || planBackend.hallazgo_id)) {
    totalHallazgosBackend = 1;
  }
  if (totalHallazgosBackend === 0 && acciones.length > 0) {
    const ids = new Set(
      acciones
        .map((a: any) => a.hallazgoId ?? a.hallazgo_id)
        .filter((id: any) => typeof id === 'string' && id.length > 0)
    );
    if (ids.size > 0) totalHallazgosBackend = ids.size;
  }
  const hallazgosAuditoria = Number(
    typeof auditoriaObj === 'object' && auditoriaObj !== null
      ? (auditoriaObj as any).hallazgos
      : NaN
  );
  if (totalHallazgosBackend === 0 && Number.isFinite(hallazgosAuditoria) && hallazgosAuditoria > 0) {
    totalHallazgosBackend = hallazgosAuditoria;
  }
  const hallazgosCriticos = hallazgos.filter(
    (h: any) =>
      h.gravedad === 'GRAVE' ||
      String(h?.gravedad ?? '').toLowerCase() === 'critico' ||
      String(h?.categoria ?? '').toLowerCase() === 'critico'
  ).length;
  const hallazgosModerados = hallazgos.filter(
    (h: any) =>
      h.gravedad === 'MODERADO' ||
      String(h?.gravedad ?? '').toLowerCase() === 'moderado' ||
      String(h?.categoria ?? '').toLowerCase() === 'controversia'
  ).length;
  const hallazgosLeves = hallazgos.filter(
    (h: any) =>
      h.gravedad === 'LEVE' ||
      String(h?.gravedad ?? '').toLowerCase() === 'leve' ||
      String(h?.categoria ?? '').toLowerCase() === 'borrador'
  ).length;

  const nombreAuditoria = planBackend.nombreAuditoria || 
    planBackend.nombre_auditoria || 
    planBackend.titulo ||
    (typeof auditoriaObj === 'object' && auditoriaObj !== null 
      ? (auditoriaObj.nombre || auditoriaObj.titulo || auditoriaObj.codigo || 'Auditoría sin nombre')
      : auditoriaObj) ||
    'Sin auditoría';

  const planAnualVigenciaRaw =
    (typeof auditoriaObj === 'object' && auditoriaObj !== null
      ? auditoriaObj.planAnualVigencia ?? auditoriaObj.plan_anual_vigencia
      : undefined) ??
    planBackend.planAnualVigencia ??
    planBackend.plan_anual_vigencia;
  const planAnualVigencia =
    planAnualVigenciaRaw != null && !Number.isNaN(Number(planAnualVigenciaRaw))
      ? Number(planAnualVigenciaRaw)
      : undefined;

  /**
   * Estado Kanban por acciones y plazo. El backend suele dejar `borrador` aunque ya haya acciones:
   * solo FORMULACION si aún no hay acciones; si hay acciones, se distribuye en Aprobado / Ejecución / etc.
   */
  const estadoBackend = String(planBackend.estado || '').trim().toLowerCase().replace(/-/g, '_');
  const explicitamenteSuspendido = ['suspendido', 'pausado'].includes(estadoBackend);

  const estadoPlan = mapearEstado(planBackend.estado);

  return {
    id: planBackend.id,
    codigo: planBackend.codigo || `PM-${new Date().getFullYear()}-${planBackend.id?.substring(0, 4) || '001'}`,
    titulo: planBackend.titulo || planBackend.nombre,
    auditoria: nombreAuditoria,
    auditoriaId: planBackend.auditoriaId || planBackend.auditoria_id || (typeof auditoriaObj === 'object' ? auditoriaObj?.id : undefined),
    area: planBackend.area || planBackend.areaResponsable || '',
    responsable: planBackend.responsable || planBackend.responsableImplementacion || 'Por asignar',
    cargoResponsable: planBackend.cargoResponsable || planBackend.cargo_responsable || '',
    fechaCreacion: planBackend.fechaCreacion || planBackend.fecha_creacion || planBackend.createdAt?.split('T')[0] || '',
    fechaAprobacion: planBackend.fechaAprobacion || planBackend.fecha_aprobacion,
    fechaInicio: planBackend.fechaInicio || planBackend.fecha_inicio,
    fechaFin: planBackend.fechaFin || planBackend.fecha_fin || planBackend.fechaLimite || '',
    estado: estadoPlan,
    semaforo: (planBackend.semaforo as SemaforoPlan) || calcularSemaforo(porcentajeAvance, diasRestantes),
    totalHallazgos: totalHallazgosBackend,
    totalAcciones: totalAccionesCalc,
    accionesCompletadas,
    accionesEnProceso,
    accionesPendientes,
    porcentajeAvance,
    hallazgosCriticos,
    hallazgosModerados,
    hallazgosLeves,
    ultimaActualizacion: planBackend.updatedAt?.split('T')[0] || planBackend.ultimaActualizacion || '',
    alertas: planBackend.alertas || 0,
    diasRestantes,
    planAnualVigencia,
    auditoriaVigencia:
      typeof auditoriaObj === 'object' && auditoriaObj !== null
        ? {
            planAnualVigencia: auditoriaObj.planAnualVigencia ?? auditoriaObj.plan_anual_vigencia,
            planAnualAño: auditoriaObj.planAnualAño ?? auditoriaObj.plan_anual_año,
            vigencia: auditoriaObj.vigencia,
            codigo: auditoriaObj.codigo,
            fechaInicio: auditoriaObj.fechaInicio ?? auditoriaObj.fecha_inicio,
          }
        : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function usePlanesMejoramiento(filters?: PlanesMejoramientoFilters) {
  const vigencia = filters?.planAnualVigencia;
  const [planes, setPlanes] = useState<PlanMejoramientoKanban[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Cargar planes del backend
  // ─────────────────────────────────────────────────────────────────────────
  const fetchPlanes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 [usePlanesMejoramiento] Cargando planes del backend...');
      
      const response = await controlInternoService.getPlanesMejoramiento(
        vigencia != null ? { planAnualVigencia: vigencia } : undefined,
      );
      console.log('📦 [usePlanesMejoramiento] Respuesta:', response);
      
      if (Array.isArray(response)) {
        let planesTransformados = response.map(transformarPlan);
        if (vigencia != null) {
          planesTransformados = planesTransformados.filter((p) =>
            planCoincideVigenciaPlan(p, vigencia),
          );
        }
        console.log('🔄 [usePlanesMejoramiento] Planes transformados:', planesTransformados);
        setPlanes(planesTransformados);
      } else {
        setPlanes([]);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const msjOriginal = (err?.response?.data?.message) || err.message;
      
      // Manejar silenciosamente el error 403 para usuarios que sólo tienen permisos de lectura/aprobación a otros planes
      if (status === 403 || String(msjOriginal).includes('No tienes permisos')) {
        console.info('[usePlanesMejoramiento] Precarga omitida: El usuario actual no tiene el rol para visualizar el inventario global de planes de mejoramiento.');
      } else {
        const mensaje = err instanceof Error ? err.message : 'Error al cargar planes';
        console.error('[usePlanesMejoramiento] Error de carga:', mensaje, err);
        setError(mensaje);
      }
      setPlanes([]);
    } finally {
      setLoading(false);
    }
  }, [vigencia]);

  // ─────────────────────────────────────────────────────────────────────────
  // Crear plan de mejoramiento
  // ─────────────────────────────────────────────────────────────────────────
  const crearPlan = useCallback(async (data: CreatePlanDto): Promise<PlanMejoramientoKanban | null> => {
    try {
      setLoading(true);
      console.log('📝 [usePlanesMejoramiento] Creando plan:', data);
      
      // DTO según backend CreatePlanMejoramientoDto
      const planData = {
        areaResponsable: textoCampoPlanMejoramiento(data.areaResponsable, 'Sin área'),
        responsableImplementacion: textoCampoPlanMejoramiento(
          data.responsableImplementacion,
          'Sin responsable',
        ),
        fechaLimite: data.fechaLimite, // ISO 8601
        ...(data.auditoriaId && { auditoriaId: data.auditoriaId }),
        ...(data.titulo && {
          titulo: textoCampoPlanMejoramiento(data.titulo, 'Plan de Mejoramiento', PM_MAX_TITULO),
        }),
        ...(data.descripcion && {
          descripcion: textoCampoPlanMejoramiento(data.descripcion, '', 2000),
        }),
        ...(data.objetivos && { objetivos: data.objetivos }),
        ...(data.hallazgoId && { hallazgoId: data.hallazgoId })
      };
      
      const response = await controlInternoService.createPlanMejoramiento(planData);
      console.log('✅ [usePlanesMejoramiento] Plan creado:', response);
      
      const planTransformado = transformarPlan(response);
      
      // Refrescar lista completa para asegurar sincronización total con el backend
      await fetchPlanes();
      
      return planTransformado;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al crear plan';
      console.error('[usePlanesMejoramiento] Error:', mensaje, err);
      toast.error('Error al crear plan', { description: mensaje });
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchPlanes]);

  // ─────────────────────────────────────────────────────────────────────────
  // Actualizar estado de un plan
  // ─────────────────────────────────────────────────────────────────────────
  const actualizarEstadoPlan = useCallback(async (
    planId: string, 
    nuevoEstado: EstadoPlan
  ): Promise<boolean> => {
    try {
      console.log('🔄 [usePlanesMejoramiento] Actualizando estado:', { planId, nuevoEstado });
      
      await controlInternoService.updatePlanMejoramiento(planId, { estado: nuevoEstado });
      
      // Actualizar localmente
      setPlanes(prev => prev.map(p => 
        p.id === planId 
          ? { ...p, estado: nuevoEstado, ultimaActualizacion: new Date().toISOString().split('T')[0] }
          : p
      ));
      
      toast.success('Estado actualizado');
      return true;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al actualizar estado';
      toast.error('Error al actualizar estado', { description: mensaje });
      return false;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Aprobar plan
  // ─────────────────────────────────────────────────────────────────────────
  const aprobarPlan = useCallback(async (planId: string, observaciones?: string): Promise<boolean> => {
    try {
      console.log('✅ [usePlanesMejoramiento] Aprobando plan:', planId);
      
      await controlInternoService.aprobarPlanMejoramiento(planId, observaciones);
      
      setPlanes(prev => prev.map(p => 
        p.id === planId 
          ? { 
              ...p, 
              estado: 'APROBADO' as EstadoPlan, 
              fechaAprobacion: new Date().toISOString().split('T')[0],
              ultimaActualizacion: new Date().toISOString().split('T')[0]
            }
          : p
      ));
      
      toast.success('Plan aprobado exitosamente');
      return true;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al aprobar plan';
      toast.error('Error al aprobar plan', { description: mensaje });
      return false;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Rechazar plan
  // ─────────────────────────────────────────────────────────────────────────
  const rechazarPlan = useCallback(async (planId: string, motivo: string): Promise<boolean> => {
    try {
      console.log('❌ [usePlanesMejoramiento] Rechazando plan:', planId);
      
      await controlInternoService.rechazarPlanMejoramiento(planId, motivo);
      
      // Recargar para obtener estado actualizado
      await fetchPlanes();
      
      toast.success('Plan rechazado');
      return true;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al rechazar plan';
      toast.error('Error al rechazar plan', { description: mensaje });
      return false;
    }
  }, [fetchPlanes]);

  // ─────────────────────────────────────────────────────────────────────────
  // Registrar avance
  // ─────────────────────────────────────────────────────────────────────────
  const registrarAvance = useCallback(async (
    planId: string, 
    avanceData: { porcentaje: number; observaciones?: string }
  ): Promise<boolean> => {
    try {
      console.log('📊 [usePlanesMejoramiento] Registrando avance:', { planId, avanceData });
      
      await controlInternoService.registrarAvancePlanMejoramiento(planId, avanceData);
      
      setPlanes(prev => prev.map(p => 
        p.id === planId 
          ? { 
              ...p, 
              porcentajeAvance: avanceData.porcentaje,
              semaforo: calcularSemaforo(avanceData.porcentaje, p.diasRestantes),
              ultimaActualizacion: new Date().toISOString().split('T')[0]
            }
          : p
      ));
      
      toast.success('Avance registrado');
      return true;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al registrar avance';
      toast.error('Error al registrar avance', { description: mensaje });
      return false;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Crear acción
  // ─────────────────────────────────────────────────────────────────────────
  const crearAccion = useCallback(async (planId: string, accionData: any): Promise<boolean> => {
    try {
      console.log('➕ [usePlanesMejoramiento] Creando acción:', { planId, accionData });
      
      await controlInternoService.crearAccionPlanMejoramiento(planId, accionData);
      
      // Actualizar contador de acciones
      setPlanes(prev => prev.map(p => 
        p.id === planId 
          ? { ...p, totalAcciones: p.totalAcciones + 1, accionesPendientes: p.accionesPendientes + 1 }
          : p
      ));
      
      toast.success('Acción creada');
      return true;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al crear acción';
      toast.error('Error al crear acción', { description: mensaje });
      return false;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Efecto inicial
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPlanes();
  }, [fetchPlanes]);

  return {
    planes,
    loading,
    error,
    fetchPlanes,
    crearPlan,
    actualizarEstadoPlan,
    aprobarPlan,
    rechazarPlan,
    registrarAvance,
    crearAccion
  };
}

export default usePlanesMejoramiento;

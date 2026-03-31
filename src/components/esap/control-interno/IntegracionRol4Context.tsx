/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTEXTO DE INTEGRACIÓN ROL 4 - AUDITORÍAS Y PLANES DE MEJORAMIENTO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Sistema de sincronización bidireccional entre:
 * - Rol 4 del Plan Anual de Auditoría
 * - Programa de Auditorías
 * - Módulo de Auditorías OCIG
 * - Planes de Mejoramiento
 * 
 * FUNCIONALIDADES:
 * - Al crear una auditoría → Genera actividad automática en Rol 4
 * - Al actualizar avance de auditoría → Actualiza % de actividad
 * - Al crear plan de mejoramiento → Genera actividad de seguimiento
 * - Sincronización en tiempo real de estados y avances
 * - Trazabilidad completa de actividades vinculadas
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { toast } from 'sonner@2.0.3';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

type TipoActividadGenerada = 'AUDITORIA' | 'PLAN_MEJORAMIENTO' | 'SEGUIMIENTO_PLAN';
type EstadoAuditoria = 'PROGRAMADA' | 'EN_EJECUCION' | 'COMPLETADA' | 'CANCELADA';
type EstadoActividad = 'PENDIENTE' | 'EN_EJECUCION' | 'COMPLETADA';

interface AuditoriaVinculada {
  id: string;
  nombre: string;
  areaAuditable: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  auditorLider: string;
  estado: EstadoAuditoria;
  avance: number;
  horasEstimadas: number;
  horasReales: number;
  hallazgosCount: number;
}

interface PlanMejoramientoVinculado {
  id: string;
  nombre: string;
  auditoriaId?: string;
  auditoriaNombre?: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  accionesTotal: number;
  accionesCompletadas: number;
  avance: number;
}

interface ActividadGeneradaRol4 {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: TipoActividadGenerada;
  estado: EstadoActividad;
  porcentajeAvance: number;
  fechaCreacion: string;
  fechaInicio: string;
  fechaFin: string;
  responsable: string | null;
  // Vinculaciones
  auditoriaId?: string;
  planMejoramientoId?: string;
  // Datos adicionales
  datosAuditoria?: AuditoriaVinculada;
  datosPlanMejoramiento?: PlanMejoramientoVinculado;
  // Seguimiento
  control: string;
  evaluacion: string;
  seguimiento: string;
  evidencias: string[];
}

interface IntegracionRol4ContextType {
  // Estado
  actividadesGeneradas: ActividadGeneradaRol4[];
  
  // Funciones de creación
  generarActividadAuditoria: (auditoria: AuditoriaVinculada) => void;
  generarActividadPlanMejoramiento: (plan: PlanMejoramientoVinculado) => void;
  
  // Funciones de actualización
  actualizarAvanceAuditoria: (auditoriaId: string, avance: number, estado: EstadoAuditoria) => void;
  actualizarAvancePlanMejoramiento: (planId: string, avance: number) => void;
  
  // Funciones de consulta
  obtenerActividadPorAuditoria: (auditoriaId: string) => ActividadGeneradaRol4 | undefined;
  obtenerActividadPorPlan: (planId: string) => ActividadGeneradaRol4 | undefined;
  obtenerActividadesPorResponsable: (responsable: string) => ActividadGeneradaRol4[];
  
  // Funciones de eliminación
  eliminarActividadAuditoria: (auditoriaId: string) => void;
  eliminarActividadPlanMejoramiento: (planId: string) => void;
  
  // Estadísticas
  obtenerEstadisticasRol4: () => {
    totalActividades: number;
    actividadesPendientes: number;
    actividadesEnEjecucion: number;
    actividadesCompletadas: number;
    avancePromedio: number;
    auditoriasActivas: number;
    planesActivos: number;
  };
}

// ════════════════════════════════════════════════════════════════════════════
// CONTEXTO
// ════════════════════════════════════════════════════════════════════════════

const IntegracionRol4Context = createContext<IntegracionRol4ContextType | undefined>(undefined);

// ════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ════════════════════════════════════════════════════════════════════════════

export function IntegracionRol4Provider({ children }: { children: ReactNode }) {
  const [actividadesGeneradas, setActividadesGeneradas] = useState<ActividadGeneradaRol4[]>([]);

  // ═══════════════════ GENERAR ACTIVIDAD DESDE AUDITORÍA ═══════════════════

  const generarActividadAuditoria = useCallback((auditoria: AuditoriaVinculada) => {
    const nuevaActividad: ActividadGeneradaRol4 = {
      id: `act-aud-${auditoria.id}`,
      nombre: `Auditoría: ${auditoria.nombre}`,
      descripcion: `Ejecutar auditoría de ${auditoria.tipo} al área ${auditoria.areaAuditable}. Auditor líder: ${auditoria.auditorLider}`,
      tipo: 'AUDITORIA',
      estado: auditoria.estado === 'PROGRAMADA' ? 'PENDIENTE' : auditoria.estado === 'EN_EJECUCION' ? 'EN_EJECUCION' : 'COMPLETADA',
      porcentajeAvance: auditoria.avance,
      fechaCreacion: new Date().toISOString(),
      fechaInicio: auditoria.fechaInicio,
      fechaFin: auditoria.fechaFin,
      responsable: auditoria.auditorLider,
      auditoriaId: auditoria.id,
      datosAuditoria: auditoria,
      control: 'Seguimiento semanal durante ejecución',
      evaluacion: `${auditoria.avance}% completado - ${auditoria.hallazgosCount} hallazgos identificados`,
      seguimiento: `Horas: ${auditoria.horasReales}/${auditoria.horasEstimadas}h ejecutadas`,
      evidencias: []
    };

    setActividadesGeneradas(prev => {
      // Verificar si ya existe
      const existe = prev.some(act => act.auditoriaId === auditoria.id);
      if (existe) {
        toast.warning('La auditoría ya tiene una actividad en el Rol 4');
        return prev;
      }
      
      toast.success('Actividad generada en Rol 4', {
        description: `Se creó la actividad "${nuevaActividad.nombre}" automáticamente`
      });
      
      return [...prev, nuevaActividad];
    });
  }, []);

  // ═══════════ GENERAR ACTIVIDAD DESDE PLAN DE MEJORAMIENTO ═══════════

  const generarActividadPlanMejoramiento = useCallback((plan: PlanMejoramientoVinculado) => {
    const nuevaActividad: ActividadGeneradaRol4 = {
      id: `act-plan-${plan.id}`,
      nombre: `Plan de Mejoramiento: ${plan.nombre}`,
      descripcion: plan.auditoriaNombre 
        ? `Seguimiento al plan de mejoramiento derivado de la auditoría "${plan.auditoriaNombre}". Responsable: ${plan.responsable}`
        : `Seguimiento al plan de mejoramiento "${plan.nombre}". Responsable: ${plan.responsable}`,
      tipo: 'PLAN_MEJORAMIENTO',
      estado: plan.avance === 0 ? 'PENDIENTE' : plan.avance === 100 ? 'COMPLETADA' : 'EN_EJECUCION',
      porcentajeAvance: plan.avance,
      fechaCreacion: new Date().toISOString(),
      fechaInicio: plan.fechaInicio,
      fechaFin: plan.fechaFin,
      responsable: plan.responsable,
      planMejoramientoId: plan.id,
      auditoriaId: plan.auditoriaId,
      datosPlanMejoramiento: plan,
      control: 'Seguimiento trimestral con reporte en CICC',
      evaluacion: `${plan.accionesCompletadas}/${plan.accionesTotal} acciones completadas (${plan.avance}%)`,
      seguimiento: 'Verificar cumplimiento de acciones y evidencias presentadas',
      evidencias: []
    };

    setActividadesGeneradas(prev => {
      // Verificar si ya existe
      const existe = prev.some(act => act.planMejoramientoId === plan.id);
      if (existe) {
        toast.warning('El plan ya tiene una actividad en el Rol 4');
        return prev;
      }
      
      toast.success('Actividad de seguimiento generada en Rol 4', {
        description: `Se creó la actividad "${nuevaActividad.nombre}" automáticamente`
      });
      
      return [...prev, nuevaActividad];
    });
  }, []);

  // ═══════════════ ACTUALIZAR AVANCE DE AUDITORÍA ═══════════════

  const actualizarAvanceAuditoria = useCallback((auditoriaId: string, avance: number, estado: EstadoAuditoria) => {
    setActividadesGeneradas(prev => prev.map(actividad => {
      if (actividad.auditoriaId === auditoriaId) {
        const nuevoEstado: EstadoActividad = 
          estado === 'PROGRAMADA' ? 'PENDIENTE' :
          estado === 'EN_EJECUCION' ? 'EN_EJECUCION' :
          'COMPLETADA';
        
        return {
          ...actividad,
          porcentajeAvance: avance,
          estado: nuevoEstado,
          evaluacion: `${avance}% completado - ${actividad.datosAuditoria?.hallazgosCount || 0} hallazgos`,
          datosAuditoria: actividad.datosAuditoria ? {
            ...actividad.datosAuditoria,
            avance,
            estado
          } : undefined
        };
      }
      return actividad;
    }));
  }, []);

  // ═══════════ ACTUALIZAR AVANCE DE PLAN DE MEJORAMIENTO ═══════════

  const actualizarAvancePlanMejoramiento = useCallback((planId: string, avance: number) => {
    setActividadesGeneradas(prev => prev.map(actividad => {
      if (actividad.planMejoramientoId === planId) {
        const nuevoEstado: EstadoActividad = 
          avance === 0 ? 'PENDIENTE' :
          avance === 100 ? 'COMPLETADA' :
          'EN_EJECUCION';
        
        return {
          ...actividad,
          porcentajeAvance: avance,
          estado: nuevoEstado,
          evaluacion: `${actividad.datosPlanMejoramiento?.accionesCompletadas || 0}/${actividad.datosPlanMejoramiento?.accionesTotal || 0} acciones completadas (${avance}%)`,
          datosPlanMejoramiento: actividad.datosPlanMejoramiento ? {
            ...actividad.datosPlanMejoramiento,
            avance
          } : undefined
        };
      }
      return actividad;
    }));
  }, []);

  // ═══════════════ FUNCIONES DE CONSULTA ═══════════════

  const obtenerActividadPorAuditoria = useCallback((auditoriaId: string) => {
    return actividadesGeneradas.find(act => act.auditoriaId === auditoriaId);
  }, [actividadesGeneradas]);

  const obtenerActividadPorPlan = useCallback((planId: string) => {
    return actividadesGeneradas.find(act => act.planMejoramientoId === planId);
  }, [actividadesGeneradas]);

  const obtenerActividadesPorResponsable = useCallback((responsable: string) => {
    return actividadesGeneradas.filter(act => act.responsable === responsable);
  }, [actividadesGeneradas]);

  // ═══════════════ FUNCIONES DE ELIMINACIÓN ═══════════════

  const eliminarActividadAuditoria = useCallback((auditoriaId: string) => {
    setActividadesGeneradas(prev => prev.filter(act => act.auditoriaId !== auditoriaId));
    toast.info('Actividad eliminada del Rol 4');
  }, []);

  const eliminarActividadPlanMejoramiento = useCallback((planId: string) => {
    setActividadesGeneradas(prev => prev.filter(act => act.planMejoramientoId !== planId));
    toast.info('Actividad de seguimiento eliminada del Rol 4');
  }, []);

  // ═══════════════ ESTADÍSTICAS ═══════════════

  const obtenerEstadisticasRol4 = useCallback(() => {
    const totalActividades = actividadesGeneradas.length;
    const actividadesPendientes = actividadesGeneradas.filter(a => a.estado === 'PENDIENTE').length;
    const actividadesEnEjecucion = actividadesGeneradas.filter(a => a.estado === 'EN_EJECUCION').length;
    const actividadesCompletadas = actividadesGeneradas.filter(a => a.estado === 'COMPLETADA').length;
    const avancePromedio = totalActividades > 0
      ? actividadesGeneradas.reduce((sum, a) => sum + a.porcentajeAvance, 0) / totalActividades
      : 0;
    const auditoriasActivas = actividadesGeneradas.filter(a => a.tipo === 'AUDITORIA').length;
    const planesActivos = actividadesGeneradas.filter(a => a.tipo === 'PLAN_MEJORAMIENTO').length;

    return {
      totalActividades,
      actividadesPendientes,
      actividadesEnEjecucion,
      actividadesCompletadas,
      avancePromedio,
      auditoriasActivas,
      planesActivos
    };
  }, [actividadesGeneradas]);

  // ═══════════════ VALOR DEL CONTEXTO ═══════════════

  const value: IntegracionRol4ContextType = {
    actividadesGeneradas,
    generarActividadAuditoria,
    generarActividadPlanMejoramiento,
    actualizarAvanceAuditoria,
    actualizarAvancePlanMejoramiento,
    obtenerActividadPorAuditoria,
    obtenerActividadPorPlan,
    obtenerActividadesPorResponsable,
    eliminarActividadAuditoria,
    eliminarActividadPlanMejoramiento,
    obtenerEstadisticasRol4
  };

  return (
    <IntegracionRol4Context.Provider value={value}>
      {children}
    </IntegracionRol4Context.Provider>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HOOK PERSONALIZADO
// ════════════════════════════════════════════════════════════════════════════

export function useIntegracionRol4() {
  const context = useContext(IntegracionRol4Context);
  if (!context) {
    throw new Error('useIntegracionRol4 debe usarse dentro de IntegracionRol4Provider');
  }
  return context;
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORT DEFAULT
// ════════════════════════════════════════════════════════════════════════════

export default IntegracionRol4Context;

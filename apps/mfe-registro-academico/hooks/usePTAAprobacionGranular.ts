/**
 * HOOK: usePTAAprobacionGranular
 * 
 * Hook para gestionar aprobación granular de actividades PTA
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  PTAAprobacionGranularService,
  type EstadoActividadPTA,
  type ResumenAprobacionPTA,
  type AprobacionActividad
} from '../services/pta/ptaAprobacionGranularService';
import { usePTANotificationsSender } from './usePTANotifications';
import { toast } from 'sonner';
import type { NivelAprobacion } from '../data/ptaEstadosYFlujo';

interface UsePTAAprobacionGranularOptions {
  ptaId: string;
  actividadesIds: string[];
  nivel: NivelAprobacion;
  autoCargar?: boolean;
}

export function usePTAAprobacionGranular({
  ptaId,
  actividadesIds,
  nivel,
  autoCargar = true
}: UsePTAAprobacionGranularOptions) {
  
  const [estadosActividades, setEstadosActividades] = useState<Map<string, EstadoActividadPTA>>(new Map());
  const [resumen, setResumen] = useState<ResumenAprobacionPTA | null>(null);
  const [cargando, setCargando] = useState(false);
  
  // Cargar datos
  const cargar = useCallback(() => {
    setCargando(true);
    
    // Obtener estados de todas las actividades
    const nuevosEstados = new Map<string, EstadoActividadPTA>();
    actividadesIds.forEach(id => {
      const estado = PTAAprobacionGranularService.obtenerEstadoActividad(ptaId, id);
      if (estado) {
        nuevosEstados.set(id, estado);
      }
    });
    setEstadosActividades(nuevosEstados);
    
    // Obtener resumen
    const nuevoResumen = PTAAprobacionGranularService.obtenerResumenPTA(ptaId, actividadesIds);
    setResumen(nuevoResumen);
    
    setCargando(false);
  }, [ptaId, actividadesIds]);
  
  useEffect(() => {
    if (autoCargar) {
      cargar();
    }
  }, [autoCargar, cargar]);
  
  // Obtener estado de una actividad
  const obtenerEstado = useCallback((actividadId: string): EstadoActividadPTA | undefined => {
    return estadosActividades.get(actividadId);
  }, [estadosActividades]);
  
  // Verificar si una actividad está aprobada en el nivel actual
  const estaAprobada = useCallback((actividadId: string): boolean => {
    const estado = estadosActividades.get(actividadId);
    if (!estado) return false;
    
    if (nivel === 1) return estado.estado_nivel_1 === 'APROBADA';
    if (nivel === 2) return estado.estado_nivel_2 === 'APROBADA';
    if (nivel === 3) return estado.estado_nivel_3 === 'APROBADA';
    return false;
  }, [estadosActividades, nivel]);
  
  // Verificar si una actividad está devuelta en el nivel actual
  const estaDevuelta = useCallback((actividadId: string): boolean => {
    const estado = estadosActividades.get(actividadId);
    if (!estado) return false;
    
    if (nivel === 1) return estado.estado_nivel_1 === 'DEVUELTA';
    if (nivel === 2) return estado.estado_nivel_2 === 'DEVUELTA';
    if (nivel === 3) return estado.estado_nivel_3 === 'DEVUELTA';
    return false;
  }, [estadosActividades, nivel]);
  
  // Obtener actividades pendientes
  const actividadesPendientes = PTAAprobacionGranularService.obtenerActividadesPendientes(
    ptaId,
    actividadesIds,
    nivel
  );
  
  // Obtener actividades devueltas
  const actividadesDevueltas = PTAAprobacionGranularService.obtenerActividadesDevueltas(
    ptaId,
    actividadesIds,
    nivel
  );
  
  // Verificar si todas están aprobadas
  const todasAprobadas = PTAAprobacionGranularService.todasAprobadasEnNivel(
    ptaId,
    actividadesIds,
    nivel
  );
  
  // Estadísticas
  const stats = resumen ? {
    total: resumen.total_actividades,
    aprobadas: nivel === 1 ? resumen.nivel_1.aprobadas : 
               nivel === 2 ? resumen.nivel_2.aprobadas : 
               resumen.nivel_3.aprobadas,
    devueltas: nivel === 1 ? resumen.nivel_1.devueltas : 
               nivel === 2 ? resumen.nivel_2.devueltas : 
               resumen.nivel_3.devueltas,
    pendientes: nivel === 1 ? resumen.nivel_1.pendientes : 
                nivel === 2 ? resumen.nivel_2.pendientes : 
                resumen.nivel_3.pendientes,
    porcentaje: nivel === 1 ? resumen.nivel_1.porcentaje_avance : 
                nivel === 2 ? resumen.nivel_2.porcentaje_avance : 
                resumen.nivel_3.porcentaje_avance
  } : {
    total: 0,
    aprobadas: 0,
    devueltas: 0,
    pendientes: 0,
    porcentaje: 0
  };
  
  return {
    estadosActividades,
    resumen,
    cargando,
    obtenerEstado,
    estaAprobada,
    estaDevuelta,
    actividadesPendientes,
    actividadesDevueltas,
    todasAprobadas,
    stats,
    cargar
  };
}

/**
 * Hook para aprobar/devolver actividades
 */
export function useAprobarActividad(ptaId: string) {
  
  const { notificarPTADevuelto, notificarPTAAprobado } = usePTANotificationsSender();
  const [procesando, setProcesando] = useState(false);
  
  const aprobar = useCallback(async (
    actividadId: string,
    componente: string,
    nivel: NivelAprobacion,
    aprobador: {
      id: string;
      nombre: string;
      cargo: string;
    },
    observaciones?: string
  ): Promise<boolean> => {
    setProcesando(true);
    
    try {
      const aprobacion = PTAAprobacionGranularService.aprobarActividad(
        ptaId,
        actividadId,
        componente,
        nivel,
        aprobador,
        observaciones
      );
      
      console.log('[useAprobarActividad] Actividad aprobada:', aprobacion);
      
      setProcesando(false);
      return true;
      
    } catch (error) {
      console.error('[useAprobarActividad] Error:', error);
      toast.error('Error al aprobar la actividad');
      setProcesando(false);
      return false;
    }
  }, [ptaId]);
  
  const devolver = useCallback(async (
    actividadId: string,
    componente: string,
    nivel: NivelAprobacion,
    aprobador: {
      id: string;
      nombre: string;
      cargo: string;
    },
    observaciones: string,
    pta?: any // Para enviar notificación
  ): Promise<boolean> => {
    setProcesando(true);
    
    try {
      const aprobacion = PTAAprobacionGranularService.devolverActividad(
        ptaId,
        actividadId,
        componente,
        nivel,
        aprobador,
        observaciones
      );
      
      // Enviar notificación si tenemos datos del PTA
      if (pta && pta.docente_email) {
        await notificarPTADevuelto({
          docente: {
            id: pta.docente_id,
            nombre: pta.docente_nombre,
            email: pta.docente_email
          },
          aprobador_nombre: aprobador.nombre,
          aprobador_cargo: aprobador.cargo,
          observaciones: `Actividad "${componente}" devuelta: ${observaciones}`,
          periodo: pta.periodo,
          fecha_limite: pta.fecha_limite || '30 días',
          pta_id: ptaId
        });
      }
      
      console.log('[useAprobarActividad] Actividad devuelta:', aprobacion);
      
      setProcesando(false);
      return true;
      
    } catch (error) {
      console.error('[useAprobarActividad] Error:', error);
      toast.error('Error al devolver la actividad');
      setProcesando(false);
      return false;
    }
  }, [ptaId, notificarPTADevuelto]);
  
  const aprobarVarias = useCallback(async (
    actividadesIds: string[],
    componente: string,
    nivel: NivelAprobacion,
    aprobador: {
      id: string;
      nombre: string;
      cargo: string;
    },
    observaciones?: string
  ): Promise<number> => {
    setProcesando(true);
    
    let aprobadas = 0;
    
    for (const actividadId of actividadesIds) {
      const exito = await aprobar(actividadId, componente, nivel, aprobador, observaciones);
      if (exito) aprobadas++;
    }
    
    setProcesando(false);
    return aprobadas;
  }, [aprobar]);
  
  return {
    aprobar,
    devolver,
    aprobarVarias,
    procesando
  };
}

/**
 * Hook para gestionar el flujo completo de aprobación granular
 */
export function useGestionAprobacionGranular(
  ptaId: string,
  actividadesIds: string[],
  nivel: NivelAprobacion
) {
  
  const {
    todasAprobadas,
    stats,
    cargar
  } = usePTAAprobacionGranular({
    ptaId,
    actividadesIds,
    nivel
  });
  
  const { aprobar, devolver, aprobarVarias, procesando } = useAprobarActividad(ptaId);
  
  // Finalizar revisión del nivel
  const finalizarRevision = useCallback(async (
    aprobador: {
      id: string;
      nombre: string;
      cargo: string;
    }
  ): Promise<boolean> => {
    if (!todasAprobadas) {
      toast.error('Aún hay actividades pendientes de revisión');
      return false;
    }
    
    toast.success(`✅ Revisión Nivel ${nivel} completada`, {
      description: `Todas las ${stats.total} actividades han sido aprobadas`,
      duration: 5000
    });
    
    // TODO: Actualizar estado del PTA al siguiente nivel
    
    return true;
  }, [todasAprobadas, nivel, stats.total]);
  
  // Aprobar todo el componente
  const aprobarComponente = useCallback(async (
    componente: string,
    aprobador: {
      id: string;
      nombre: string;
      cargo: string;
    }
  ): Promise<boolean> => {
    const aprobaciones = PTAAprobacionGranularService.aprobarComponenteCompleto(
      ptaId,
      componente,
      actividadesIds,
      nivel,
      aprobador
    );
    
    toast.success(`Componente "${componente}" aprobado completamente`, {
      description: `${aprobaciones.length} actividades aprobadas`
    });
    
    cargar(); // Recargar datos
    return true;
  }, [ptaId, actividadesIds, nivel, cargar]);
  
  return {
    aprobar,
    devolver,
    aprobarVarias,
    aprobarComponente,
    finalizarRevision,
    procesando,
    todasAprobadas,
    stats,
    cargar
  };
}

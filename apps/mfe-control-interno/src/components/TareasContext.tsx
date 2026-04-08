/**
 * ============================================
 * CONTEXTO GLOBAL: GESTIÓN DE TAREAS/ACTIVIDADES
 * ============================================
 * 
 * Sistema de gestión de tareas y actividades de auditorías
 * CONECTADO AL BACKEND
 * 
 * FUNCIONALIDADES:
 * - CRUD completo de tareas por auditoría (persistido en BD)
 * - Asignación de responsables
 * - Seguimiento de progreso
 * - Contadores dinámicos para el Kanban
 * - Estados y prioridades
 * 
 * ÚLTIMA ACTUALIZACIÓN: 19 Febrero 2026
 */

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { toast } from 'sonner';
import { controlInternoService, type TareaAuditoria } from '../services/api/controlInternoService';

// ============ TIPOS ============

export type EstadoTarea = 'Pendiente' | 'En Progreso' | 'Completada' | 'Cancelada';
export type PrioridadTarea = 'Baja' | 'Media' | 'Alta' | 'Urgente';

export interface Tarea {
  id: string;
  auditoriaId: string;
  
  // Descripción
  titulo: string;
  descripcion?: string;
  
  // Clasificación
  estado: EstadoTarea;
  prioridad: PrioridadTarea;
  fase?: 'Planeación' | 'Ejecución' | 'Comunicación' | 'Seguimiento';
  
  // Asignación
  responsableId?: string;
  responsableNombre?: string;
  
  // Fechas
  fechaCreacion: string;
  fechaVencimiento?: string;
  fechaCompletado?: string;
  
  // Progreso
  progreso: number; // 0-100
  
  // Observaciones
  notas?: string;
}

interface TareasContextType {
  // Estado
  tareasPorAuditoria: { [auditoriaId: string]: Tarea[] };
  loading: boolean;
  
  // CRUD
  crearTarea: (auditoriaId: string, datos: Omit<Tarea, 'id' | 'fechaCreacion'>) => Promise<string>;
  editarTarea: (tareaId: string, datos: Partial<Tarea>) => Promise<void>;
  eliminarTarea: (tareaId: string) => Promise<void>;
  completarTarea: (tareaId: string) => Promise<void>;
  
  // Cargar datos
  cargarTareas: (auditoriaId: string) => Promise<void>;
  
  // Consultas
  obtenerTareasPorAuditoria: (auditoriaId: string) => Tarea[];
  obtenerTareaPorId: (tareaId: string) => Tarea | undefined;
  
  // Contadores (para el Kanban)
  contarTareas: (auditoriaId: string) => number;
  contarTareasPendientes: (auditoriaId: string) => number;
  contarTareasCompletadas: (auditoriaId: string) => number;
  calcularProgresoTareas: (auditoriaId: string) => number;
  
  // Validación de completitud por fase
  verificarFaseCompleta: (auditoriaId: string, fase: 'Planeación' | 'Ejecución' | 'Comunicación' | 'Seguimiento') => boolean;
  contarTareasPendientesPorFase: (auditoriaId: string, fase: 'Planeación' | 'Ejecución' | 'Comunicación' | 'Seguimiento') => number;
  
  // Filtros
  filtrarTareas: (auditoriaId: string, filtros: FiltrosTarea) => Tarea[];
}

export interface FiltrosTarea {
  estado?: EstadoTarea;
  prioridad?: PrioridadTarea;
  fase?: string;
  responsable?: string;
  busqueda?: string;
}

// ============ HELPERS ============

// Validar si es un UUID válido
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// Convertir TareaAuditoria del backend a Tarea del contexto
const convertirTarea = (tarea: TareaAuditoria): Tarea => ({
  id: tarea.id,
  auditoriaId: tarea.auditoriaId,
  titulo: tarea.titulo,
  descripcion: tarea.descripcion,
  estado: tarea.estado as EstadoTarea,
  prioridad: tarea.prioridad as PrioridadTarea,
  fase: tarea.fase as Tarea['fase'],
  responsableId: tarea.responsableId,
  responsableNombre: tarea.responsableNombre,
  fechaCreacion: tarea.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
  fechaVencimiento: tarea.fechaVencimiento?.split('T')[0],
  fechaCompletado: tarea.fechaCompletado?.split('T')[0],
  progreso: tarea.progreso || 0,
  notas: tarea.notas
});

// ============ CONTEXTO ============

const TareasContext = createContext<TareasContextType | undefined>(undefined);

export function TareasProvider({ children }: { children: ReactNode }) {
  const [tareasPorAuditoria, setTareasPorAuditoria] = useState<{
    [auditoriaId: string]: Tarea[];
  }>({});
  const [loading, setLoading] = useState(false);

  // ============ CARGAR TAREAS DEL BACKEND ============
  const cargarTareas = useCallback(async (auditoriaId: string) => {
    // Solo cargar si es UUID válido
    if (!isValidUUID(auditoriaId)) {
      console.log('[TareasContext] ID no es UUID válido, omitiendo carga:', auditoriaId);
      return;
    }

    try {
      setLoading(true);
      const tareasBackend = await controlInternoService.getTareasByAuditoria(auditoriaId);
      const tareasConvertidas = tareasBackend.map(convertirTarea);
      
      setTareasPorAuditoria(prev => ({
        ...prev,
        [auditoriaId]: tareasConvertidas
      }));
    } catch (err: any) {
      console.error('[TareasContext] Error cargando tareas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============ CREAR TAREA (BACKEND) ============
  const crearTarea = useCallback(async (
    auditoriaId: string,
    datos: Omit<Tarea, 'id' | 'fechaCreacion'>
  ): Promise<string> => {
    if (!isValidUUID(auditoriaId)) {
      toast.error('ID de auditoría no válido');
      throw new Error('ID de auditoría no válido');
    }

    try {
      const tareaCreada = await controlInternoService.createTarea({
        auditoriaId,
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        estado: datos.estado,
        prioridad: datos.prioridad,
        fase: datos.fase,
        responsableId: datos.responsableId,
        responsableNombre: datos.responsableNombre,
        fechaVencimiento: datos.fechaVencimiento,
        progreso: datos.progreso || 0,
        notas: datos.notas
      });

      const nuevaTarea = convertirTarea(tareaCreada);
      setTareasPorAuditoria(prev => ({
        ...prev,
        [auditoriaId]: [...(prev[auditoriaId] || []), nuevaTarea]
      }));

      toast.success('Tarea creada exitosamente');
      return tareaCreada.id;
    } catch (err: any) {
      toast.error(err.message || 'Error al crear tarea');
      throw err;
    }
  }, []);

  // ============ EDITAR TAREA (BACKEND) ============
  const editarTarea = useCallback(async (tareaId: string, datos: Partial<Tarea>) => {
    try {
      await controlInternoService.updateTarea(tareaId, {
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        estado: datos.estado,
        prioridad: datos.prioridad,
        fase: datos.fase,
        responsableId: datos.responsableId,
        responsableNombre: datos.responsableNombre,
        fechaVencimiento: datos.fechaVencimiento,
        progreso: datos.progreso,
        notas: datos.notas
      });

      setTareasPorAuditoria(prev => {
        const nuevoEstado = { ...prev };
        
        for (const auditoriaId in nuevoEstado) {
          const indice = nuevoEstado[auditoriaId].findIndex(t => t.id === tareaId);
          if (indice !== -1) {
            nuevoEstado[auditoriaId] = [...nuevoEstado[auditoriaId]];
            nuevoEstado[auditoriaId][indice] = {
              ...nuevoEstado[auditoriaId][indice],
              ...datos
            };
            break;
          }
        }
        
        return nuevoEstado;
      });

      toast.success('Tarea actualizada correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar tarea');
      throw err;
    }
  }, []);

  // ============ ELIMINAR TAREA (BACKEND) ============
  const eliminarTarea = useCallback(async (tareaId: string) => {
    try {
      await controlInternoService.deleteTarea(tareaId);

      setTareasPorAuditoria(prev => {
        const nuevoEstado = { ...prev };
        
        for (const auditoriaId in nuevoEstado) {
          nuevoEstado[auditoriaId] = nuevoEstado[auditoriaId].filter(t => t.id !== tareaId);
        }
        
        return nuevoEstado;
      });

      toast.success('Tarea eliminada correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar tarea');
      throw err;
    }
  }, []);

  // ============ COMPLETAR TAREA (BACKEND) ============
  const completarTarea = useCallback(async (tareaId: string) => {
    try {
      await controlInternoService.completarTarea(tareaId);

      setTareasPorAuditoria(prev => {
        const nuevoEstado = { ...prev };
        
        for (const auditoriaId in nuevoEstado) {
          const indice = nuevoEstado[auditoriaId].findIndex(t => t.id === tareaId);
          if (indice !== -1) {
            nuevoEstado[auditoriaId] = [...nuevoEstado[auditoriaId]];
            nuevoEstado[auditoriaId][indice] = {
              ...nuevoEstado[auditoriaId][indice],
              estado: 'Completada',
              progreso: 100,
              fechaCompletado: new Date().toISOString().split('T')[0]
            };
            break;
          }
        }
        
        return nuevoEstado;
      });

      toast.success('Tarea completada');
    } catch (err: any) {
      toast.error(err.message || 'Error al completar tarea');
      throw err;
    }
  }, []);

  // ============ CONSULTAS ============
  const obtenerTareasPorAuditoria = useCallback((auditoriaId: string): Tarea[] => {
    return tareasPorAuditoria[auditoriaId] || [];
  }, [tareasPorAuditoria]);

  const obtenerTareaPorId = useCallback((tareaId: string): Tarea | undefined => {
    for (const auditoriaId in tareasPorAuditoria) {
      const tarea = tareasPorAuditoria[auditoriaId].find(t => t.id === tareaId);
      if (tarea) return tarea;
    }
    return undefined;
  }, [tareasPorAuditoria]);

  // ============ CONTADORES ============
  const contarTareas = useCallback((auditoriaId: string): number => {
    return tareasPorAuditoria[auditoriaId]?.length || 0;
  }, [tareasPorAuditoria]);

  const contarTareasPendientes = useCallback((auditoriaId: string): number => {
    return tareasPorAuditoria[auditoriaId]?.filter(t => 
      t.estado === 'Pendiente' || t.estado === 'En Progreso'
    ).length || 0;
  }, [tareasPorAuditoria]);

  const contarTareasCompletadas = useCallback((auditoriaId: string): number => {
    return tareasPorAuditoria[auditoriaId]?.filter(t => t.estado === 'Completada').length || 0;
  }, [tareasPorAuditoria]);

  const calcularProgresoTareas = useCallback((auditoriaId: string): number => {
    const tareas = tareasPorAuditoria[auditoriaId];
    if (!tareas || tareas.length === 0) return 0;

    const totalProgreso = tareas.reduce((sum, tarea) => sum + tarea.progreso, 0);
    return Math.round(totalProgreso / tareas.length);
  }, [tareasPorAuditoria]);

  // ============ VALIDACIÓN DE COMPLETITUD POR FASE ============
  const verificarFaseCompleta = useCallback((auditoriaId: string, fase: 'Planeación' | 'Ejecución' | 'Comunicación' | 'Seguimiento'): boolean => {
    const tareas = tareasPorAuditoria[auditoriaId];
    if (!tareas || tareas.length === 0) return true;

    const tareasFase = tareas.filter(t => t.fase === fase);
    if (tareasFase.length === 0) return true;

    return tareasFase.every(t => t.estado === 'Completada');
  }, [tareasPorAuditoria]);

  const contarTareasPendientesPorFase = useCallback((auditoriaId: string, fase: 'Planeación' | 'Ejecución' | 'Comunicación' | 'Seguimiento'): number => {
    const tareas = tareasPorAuditoria[auditoriaId];
    if (!tareas || tareas.length === 0) return 0;

    const tareasFase = tareas.filter(t => t.fase === fase);
    if (tareasFase.length === 0) return 0;

    return tareasFase.filter(t => t.estado === 'Pendiente' || t.estado === 'En Progreso').length;
  }, [tareasPorAuditoria]);

  // ============ FILTROS ============
  const filtrarTareas = useCallback((auditoriaId: string, filtros: FiltrosTarea): Tarea[] => {
    let tareasFiltradas = obtenerTareasPorAuditoria(auditoriaId);

    if (filtros.estado) {
      tareasFiltradas = tareasFiltradas.filter(t => t.estado === filtros.estado);
    }

    if (filtros.prioridad) {
      tareasFiltradas = tareasFiltradas.filter(t => t.prioridad === filtros.prioridad);
    }

    if (filtros.fase) {
      tareasFiltradas = tareasFiltradas.filter(t => t.fase === filtros.fase);
    }

    if (filtros.responsable) {
      tareasFiltradas = tareasFiltradas.filter(t => 
        t.responsableNombre?.toLowerCase().includes(filtros.responsable!.toLowerCase())
      );
    }

    if (filtros.busqueda) {
      const busquedaLower = filtros.busqueda.toLowerCase();
      tareasFiltradas = tareasFiltradas.filter(t =>
        t.titulo.toLowerCase().includes(busquedaLower) ||
        t.descripcion?.toLowerCase().includes(busquedaLower)
      );
    }

    return tareasFiltradas;
  }, [obtenerTareasPorAuditoria]);

  // ============ PROVIDER ============
  return (
    <TareasContext.Provider
      value={{
        tareasPorAuditoria,
        loading,
        crearTarea,
        editarTarea,
        eliminarTarea,
        completarTarea,
        cargarTareas,
        obtenerTareasPorAuditoria,
        obtenerTareaPorId,
        contarTareas,
        contarTareasPendientes,
        contarTareasCompletadas,
        calcularProgresoTareas,
        verificarFaseCompleta,
        contarTareasPendientesPorFase,
        filtrarTareas
      }}
    >
      {children}
    </TareasContext.Provider>
  );
}

// ============ HOOK ============
export const useTareas = () => {
  const context = useContext(TareasContext);
  if (!context) {
    throw new Error('useTareas debe usarse dentro de TareasProvider');
  }
  return context;
};

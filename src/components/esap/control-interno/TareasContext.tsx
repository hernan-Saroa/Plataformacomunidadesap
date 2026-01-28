/**
 * ============================================
 * CONTEXTO GLOBAL: GESTIÓN DE TAREAS/ACTIVIDADES
 * ============================================
 * 
 * Sistema de gestión de tareas y actividades de auditorías
 * 
 * FUNCIONALIDADES:
 * - CRUD completo de tareas por auditoría
 * - Asignación de responsables
 * - Seguimiento de progreso
 * - Contadores dinámicos para el Kanban
 * - Estados y prioridades
 * 
 * ÚLTIMA ACTUALIZACIÓN: 23 Enero 2026
 */

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';

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
  responsableId: string;
  responsableNombre: string;
  
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
  
  // CRUD
  crearTarea: (auditoriaId: string, datos: Omit<Tarea, 'id' | 'fechaCreacion'>) => string;
  editarTarea: (tareaId: string, datos: Partial<Tarea>) => void;
  eliminarTarea: (tareaId: string) => void;
  completarTarea: (tareaId: string) => void;
  
  // Consultas
  obtenerTareasPorAuditoria: (auditoriaId: string) => Tarea[];
  obtenerTareaPorId: (tareaId: string) => Tarea | undefined;
  
  // Contadores (para el Kanban)
  contarTareas: (auditoriaId: string) => number;
  contarTareasPendientes: (auditoriaId: string) => number;
  contarTareasCompletadas: (auditoriaId: string) => number;
  calcularProgresoTareas: (auditoriaId: string) => number;
  
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

// ============ DATOS INICIALES MOCK ============

const TAREAS_MOCK: { [auditoriaId: string]: Tarea[] } = {
  'aud-004': [
    {
      id: 'tar-001',
      auditoriaId: 'aud-004',
      titulo: 'Revisar matriz de riesgos del área',
      descripcion: 'Analizar la matriz de riesgos de Talento Humano actualizada en 2024',
      estado: 'Completada',
      prioridad: 'Alta',
      fase: 'Planeación',
      responsableId: 'usr-002',
      responsableNombre: 'Catalina Rubio Silva',
      fechaCreacion: '01/02/2025 08:00',
      fechaVencimiento: '05/02/2025',
      fechaCompletado: '04/02/2025 16:30',
      progreso: 100
    },
    {
      id: 'tar-002',
      auditoriaId: 'aud-004',
      titulo: 'Solicitar información de contratos 2024',
      descripcion: 'Pedir al área listado de contratos laborales firmados en 2024',
      estado: 'Completada',
      prioridad: 'Media',
      fase: 'Planeación',
      responsableId: 'usr-004',
      responsableNombre: 'William Alonso Pérez',
      fechaCreacion: '01/02/2025 09:00',
      fechaVencimiento: '06/02/2025',
      fechaCompletado: '05/02/2025 11:00',
      progreso: 100
    },
    {
      id: 'tar-003',
      auditoriaId: 'aud-004',
      titulo: 'Realizar reunión de apertura',
      descripcion: 'Reunión con Jefe de Talento Humano para presentar alcance de la auditoría',
      estado: 'Completada',
      prioridad: 'Alta',
      fase: 'Planeación',
      responsableId: 'usr-002',
      responsableNombre: 'Catalina Rubio Silva',
      fechaCreacion: '01/02/2025 10:00',
      fechaVencimiento: '08/02/2025',
      fechaCompletado: '07/02/2025 14:00',
      progreso: 100
    },
    {
      id: 'tar-004',
      auditoriaId: 'aud-004',
      titulo: 'Aplicar lista de chequeo de procesos',
      descripcion: 'Aplicar lista de chequeo de procesos de selección y contratación',
      estado: 'En Progreso',
      prioridad: 'Alta',
      fase: 'Ejecución',
      responsableId: 'usr-002',
      responsableNombre: 'Catalina Rubio Silva',
      fechaCreacion: '09/02/2025 08:00',
      fechaVencimiento: '15/02/2025',
      progreso: 65
    },
    {
      id: 'tar-005',
      auditoriaId: 'aud-004',
      titulo: 'Revisar expedientes de personal',
      descripcion: 'Verificar que los expedientes de personal contengan toda la documentación requerida',
      estado: 'En Progreso',
      prioridad: 'Media',
      fase: 'Ejecución',
      responsableId: 'usr-004',
      responsableNombre: 'William Alonso Pérez',
      fechaCreacion: '09/02/2025 09:00',
      fechaVencimiento: '16/02/2025',
      progreso: 40
    },
    {
      id: 'tar-006',
      auditoriaId: 'aud-004',
      titulo: 'Entrevistar a funcionarios del área',
      descripcion: 'Realizar entrevistas a 5 funcionarios clave del área de Talento Humano',
      estado: 'Pendiente',
      prioridad: 'Media',
      fase: 'Ejecución',
      responsableId: 'usr-005',
      responsableNombre: 'Alexandra Gómez López',
      fechaCreacion: '10/02/2025 08:00',
      fechaVencimiento: '18/02/2025',
      progreso: 0
    },
    {
      id: 'tar-007',
      auditoriaId: 'aud-004',
      titulo: 'Documentar hallazgos identificados',
      descripcion: 'Consolidar y documentar todos los hallazgos encontrados durante la ejecución',
      estado: 'Pendiente',
      prioridad: 'Alta',
      fase: 'Ejecución',
      responsableId: 'usr-002',
      responsableNombre: 'Catalina Rubio Silva',
      fechaCreacion: '12/02/2025 08:00',
      fechaVencimiento: '20/02/2025',
      progreso: 0
    },
    {
      id: 'tar-008',
      auditoriaId: 'aud-004',
      titulo: 'Reunión de cierre con el área',
      descripcion: 'Presentar hallazgos preliminares al Jefe de Talento Humano',
      estado: 'Pendiente',
      prioridad: 'Alta',
      fase: 'Ejecución',
      responsableId: 'usr-002',
      responsableNombre: 'Catalina Rubio Silva',
      fechaCreacion: '13/02/2025 08:00',
      fechaVencimiento: '22/02/2025',
      progreso: 0
    },
    {
      id: 'tar-009',
      auditoriaId: 'aud-004',
      titulo: 'Elaborar informe preliminar',
      descripcion: 'Redactar el informe preliminar con todos los hallazgos y evidencias',
      estado: 'Pendiente',
      prioridad: 'Urgente',
      fase: 'Comunicación',
      responsableId: 'usr-002',
      responsableNombre: 'Catalina Rubio Silva',
      fechaCreacion: '14/02/2025 08:00',
      fechaVencimiento: '25/02/2025',
      progreso: 0
    },
    {
      id: 'tar-010',
      auditoriaId: 'aud-004',
      titulo: 'Revisar descargos del área (si aplica)',
      descripcion: 'Analizar los descargos presentados por el área auditada',
      estado: 'Pendiente',
      prioridad: 'Media',
      fase: 'Comunicación',
      responsableId: 'usr-002',
      responsableNombre: 'Catalina Rubio Silva',
      fechaCreacion: '15/02/2025 08:00',
      fechaVencimiento: '26/02/2025',
      progreso: 0
    },
    {
      id: 'tar-011',
      auditoriaId: 'aud-004',
      titulo: 'Elaborar informe final',
      descripcion: 'Redactar el informe final incorporando respuestas del área',
      estado: 'Pendiente',
      prioridad: 'Urgente',
      fase: 'Comunicación',
      responsableId: 'usr-002',
      responsableNombre: 'Catalina Rubio Silva',
      fechaCreacion: '16/02/2025 08:00',
      fechaVencimiento: '28/02/2025',
      progreso: 0
    },
    {
      id: 'tar-012',
      auditoriaId: 'aud-004',
      titulo: 'Generar plan de mejoramiento',
      descripcion: 'Crear el plan de mejoramiento con las acciones correctivas',
      estado: 'Pendiente',
      prioridad: 'Alta',
      fase: 'Comunicación',
      responsableId: 'usr-002',
      responsableNombre: 'Catalina Rubio Silva',
      fechaCreacion: '17/02/2025 08:00',
      fechaVencimiento: '28/02/2025',
      progreso: 0
    }
  ],
  'aud-001': [
    {
      id: 'tar-013',
      auditoriaId: 'aud-001',
      titulo: 'Revisar procedimiento de compras',
      estado: 'En Progreso',
      prioridad: 'Alta',
      fase: 'Planeación',
      responsableId: 'usr-002',
      responsableNombre: 'Catalina Rubio Silva',
      fechaCreacion: '02/02/2025 08:00',
      fechaVencimiento: '10/02/2025',
      progreso: 50
    },
    {
      id: 'tar-014',
      auditoriaId: 'aud-001',
      titulo: 'Solicitar registros de compras 2024',
      estado: 'Pendiente',
      prioridad: 'Media',
      fase: 'Planeación',
      responsableId: 'usr-003',
      responsableNombre: 'Lucila Villamil Torres',
      fechaCreacion: '02/02/2025 09:00',
      fechaVencimiento: '12/02/2025',
      progreso: 0
    }
  ]
};

// ============ CONTEXTO ============

const TareasContext = createContext<TareasContextType | undefined>(undefined);

export function TareasProvider({ children }: { children: ReactNode }) {
  const [tareasPorAuditoria, setTareasPorAuditoria] = useState<{
    [auditoriaId: string]: Tarea[];
  }>(TAREAS_MOCK);

  // ============ CREAR TAREA ============
  const crearTarea = useCallback((
    auditoriaId: string,
    datos: Omit<Tarea, 'id' | 'fechaCreacion'>
  ): string => {
    const nuevoId = `tar-${Date.now()}`;
    
    const fechaCreacion = new Date().toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const nuevaTarea: Tarea = {
      ...datos,
      id: nuevoId,
      auditoriaId,
      fechaCreacion
    };

    setTareasPorAuditoria(prev => ({
      ...prev,
      [auditoriaId]: [...(prev[auditoriaId] || []), nuevaTarea]
    }));

    toast.success(`✅ Tarea "${datos.titulo}" creada exitosamente`);
    
    return nuevoId;
  }, []);

  // ============ EDITAR TAREA ============
  const editarTarea = useCallback((tareaId: string, datos: Partial<Tarea>) => {
    setTareasPorAuditoria(prev => {
      const nuevoEstado = { ...prev };
      
      for (const auditoriaId in nuevoEstado) {
        const indice = nuevoEstado[auditoriaId].findIndex(t => t.id === tareaId);
        if (indice !== -1) {
          nuevoEstado[auditoriaId][indice] = {
            ...nuevoEstado[auditoriaId][indice],
            ...datos
          };
          break;
        }
      }
      
      return nuevoEstado;
    });

    toast.success('✅ Tarea actualizada correctamente');
  }, []);

  // ============ ELIMINAR TAREA ============
  const eliminarTarea = useCallback((tareaId: string) => {
    setTareasPorAuditoria(prev => {
      const nuevoEstado = { ...prev };
      
      for (const auditoriaId in nuevoEstado) {
        nuevoEstado[auditoriaId] = nuevoEstado[auditoriaId].filter(t => t.id !== tareaId);
      }
      
      return nuevoEstado;
    });

    toast.success('✅ Tarea eliminada correctamente');
  }, []);

  // ============ COMPLETAR TAREA ============
  const completarTarea = useCallback((tareaId: string) => {
    const fechaCompletado = new Date().toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    editarTarea(tareaId, {
      estado: 'Completada',
      progreso: 100,
      fechaCompletado
    });
  }, [editarTarea]);

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
        t.responsableNombre.toLowerCase().includes(filtros.responsable!.toLowerCase())
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
        crearTarea,
        editarTarea,
        eliminarTarea,
        completarTarea,
        obtenerTareasPorAuditoria,
        obtenerTareaPorId,
        contarTareas,
        contarTareasPendientes,
        contarTareasCompletadas,
        calcularProgresoTareas,
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

/**
 * Hook personalizado para gestionar Tableros Kanban
 * Maneja la conexión con el backend y el estado de los datos
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  tablerosKanbanService,
  TableroKanban,
  EtapaKanban,
  TipoTablero,
  CreateEtapaKanbanDto,
  UpdateEtapaKanbanDto,
} from '../services/api/tablerosKanbanService';

interface UseTablerosKanbanReturn {
  tableros: TableroKanban[];
  tableroSeleccionado: TableroKanban | null;
  loading: boolean;
  error: string | null;
  setTableroSeleccionado: (tablero: TableroKanban | null) => void;
  crearEtapa: (tableroId: string, data: CreateEtapaKanbanDto) => Promise<void>;
  actualizarEtapa: (tableroId: string, etapaId: string, data: UpdateEtapaKanbanDto) => Promise<void>;
  eliminarEtapa: (tableroId: string, etapaId: string) => Promise<void>;
  reordenarEtapas: (tableroId: string, etapasIds: string[]) => Promise<void>;
  recargarTableros: () => Promise<void>;
}

export function useTablerosKanban(): UseTablerosKanbanReturn {
  const [tableros, setTableros] = useState<TableroKanban[]>([]);
  const [tableroSeleccionado, setTableroSeleccionado] = useState<TableroKanban | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cargar todos los tableros desde el backend
   */
  const cargarTableros = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar ambos tipos de tablero
      // Usar Promise.allSettled para manejar casos donde un tablero no existe
      const resultados = await Promise.allSettled([
        tablerosKanbanService.getByTipo(TipoTablero.AUDITORIAS),
        tablerosKanbanService.getByTipo(TipoTablero.PLANES_MEJORAMIENTO),
      ]);

      const tablerosCargados: TableroKanban[] = [];
      
      resultados.forEach((resultado) => {
        if (resultado.status === 'fulfilled' && resultado.value) {
          tablerosCargados.push(resultado.value);
        }
      });

      setTableros(tablerosCargados);

      // Si no hay tablero seleccionado, seleccionar el primero
      if (!tableroSeleccionado && tablerosCargados.length > 0) {
        setTableroSeleccionado(tablerosCargados[0]);
      } else if (tableroSeleccionado) {
        // Actualizar el tablero seleccionado con los datos frescos
        const actualizado = tablerosCargados.find(t => t.id === tableroSeleccionado.id);
        if (actualizado) {
          setTableroSeleccionado(actualizado);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar los tableros';
      setError(errorMessage);
      console.error('Error al cargar tableros:', err);
      toast.error('Error al cargar los tableros Kanban');
    } finally {
      setLoading(false);
    }
  }, [tableroSeleccionado]);

  /**
   * Cargar tableros al montar el componente
   */
  useEffect(() => {
    cargarTableros();
  }, []);

  /**
   * Crear una nueva etapa
   */
  const crearEtapa = useCallback(async (tableroId: string, data: CreateEtapaKanbanDto) => {
    try {
      setError(null);
      const nuevaEtapa = await tablerosKanbanService.createEtapa(tableroId, data);
      
      // Recargar los tableros para obtener los datos actualizados
      await cargarTableros();
      
      toast.success('Etapa creada exitosamente');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear la etapa';
      setError(errorMessage);
      console.error('Error al crear etapa:', err);
      toast.error('Error al crear la etapa');
      throw err;
    }
  }, [cargarTableros]);

  /**
   * Actualizar una etapa existente
   */
  const actualizarEtapa = useCallback(async (
    tableroId: string,
    etapaId: string,
    data: UpdateEtapaKanbanDto
  ) => {
    try {
      setError(null);
      await tablerosKanbanService.updateEtapa(tableroId, etapaId, data);
      
      // Recargar los tableros para obtener los datos actualizados
      await cargarTableros();
      
      toast.success('Etapa actualizada exitosamente');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar la etapa';
      setError(errorMessage);
      console.error('Error al actualizar etapa:', err);
      toast.error('Error al actualizar la etapa');
      throw err;
    }
  }, [cargarTableros]);

  /**
   * Eliminar una etapa
   */
  const eliminarEtapa = useCallback(async (tableroId: string, etapaId: string) => {
    try {
      setError(null);
      await tablerosKanbanService.deleteEtapa(tableroId, etapaId);
      
      // Recargar los tableros para obtener los datos actualizados
      await cargarTableros();
      
      toast.success('Etapa eliminada exitosamente');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar la etapa';
      setError(errorMessage);
      console.error('Error al eliminar etapa:', err);
      toast.error('Error al eliminar la etapa');
      throw err;
    }
  }, [cargarTableros]);

  /**
   * Reordenar etapas
   */
  const reordenarEtapas = useCallback(async (tableroId: string, etapasIds: string[]) => {
    try {
      setError(null);
      await tablerosKanbanService.reordenarEtapas(tableroId, etapasIds);
      
      // Recargar los tableros para obtener los datos actualizados
      await cargarTableros();
      
      toast.success('Etapas reordenadas exitosamente');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al reordenar las etapas';
      setError(errorMessage);
      console.error('Error al reordenar etapas:', err);
      toast.error('Error al reordenar las etapas');
      throw err;
    }
  }, [cargarTableros]);

  /**
   * Recargar tableros manualmente
   */
  const recargarTableros = useCallback(async () => {
    await cargarTableros();
  }, [cargarTableros]);

  return {
    tableros,
    tableroSeleccionado,
    loading,
    error,
    setTableroSeleccionado,
    crearEtapa,
    actualizarEtapa,
    eliminarEtapa,
    reordenarEtapas,
    recargarTableros,
  };
}


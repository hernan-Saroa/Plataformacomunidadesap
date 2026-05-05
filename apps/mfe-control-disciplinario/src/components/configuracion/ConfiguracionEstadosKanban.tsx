/**
 * CONFIGURACIÓN DE ESTADOS KANBAN
 * Componente modular para gestionar estados del tablero Kanban
 * Control Interno Disciplinario
 */

import { useState, useEffect } from 'react';
import { Plus, AlertCircle, Trash2, GripVertical, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { disciplinaryService } from '../../../../services/api/disciplinary.service';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface EstadoKanban {
  id: string;
  nombre: string;
  color: string;
  dias: number;
  alertaDias: number;
  orden: number;
  activo: boolean;
}

const ESTADOS_KANBAN_DEFECTO: EstadoKanban[] = [
  { id: 'recepcion', nombre: 'Recepción', color: '#3B82F6', dias: 3, alertaDias: 1, orden: 1, activo: true },
  { id: 'valoracion', nombre: 'Valoración', color: '#F59E0B', dias: 10, alertaDias: 3, orden: 2, activo: true },
  { id: 'indagacion', nombre: 'Indagación', color: '#8B5CF6', dias: 40, alertaDias: 10, orden: 3, activo: true },
  { id: 'investigacion', nombre: 'Investigación', color: '#EC4899', dias: 60, alertaDias: 15, orden: 4, activo: true },
  { id: 'juzgamiento', nombre: 'Juzgamiento', color: '#06B6D4', dias: 50, alertaDias: 10, orden: 5, activo: true },
  { id: 'fallo', nombre: 'Fallo', color: '#10B981', dias: 10, alertaDias: 3, orden: 6, activo: true },
];

export function ConfiguracionEstadosKanban() {
  const [estadosKanban, setEstadosKanban] = useState<EstadoKanban[]>(ESTADOS_KANBAN_DEFECTO);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cargar configuración del backend al montar
  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      const response = await disciplinaryService.getStageConfiguration();
      console.log('📥 Respuesta del backend al cargar:', response);

      if (response && Array.isArray(response) && response.length > 0) {
        // Mapear la respuesta del backend al formato del componente
        const estadosMapeados: EstadoKanban[] = response.map((stage: any, index: number) => ({
          id: stage.id || `estado-${index}`,
          nombre: stage.etapa || stage.nombre || 'Sin nombre',
          color: stage.color || '#3B82F6',
          dias: stage.diasHabiles || stage.dias || 10,
          alertaDias: stage.alertaDias || 3,
          orden: stage.orden || index + 1,
          activo: stage.activo !== false
        }));
        setEstadosKanban(estadosMapeados);
      } else {
        // Si no hay datos en el backend, usar los valores por defecto
        setEstadosKanban(ESTADOS_KANBAN_DEFECTO);
      }
    } catch (error) {
      console.error('Error cargando configuración de estados:', error);
      toast.error('Error al cargar configuración', {
        description: 'Se usarán valores por defecto'
      });
      // Usar valores por defecto en caso de error
      setEstadosKanban(ESTADOS_KANBAN_DEFECTO);
    } finally {
      setLoading(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = estadosKanban.findIndex(e => e.id === active.id);
    const newIndex = estadosKanban.findIndex(e => e.id === over.id);

    const reorderedEstados = arrayMove(estadosKanban, oldIndex, newIndex);
    setEstadosKanban(reorderedEstados.map((e, i) => ({ ...e, orden: i + 1 })));
    setCambiosPendientes(true);
  };

  const agregarEstado = () => {
    const nuevoEstado: EstadoKanban = {
      id: `estado-${Date.now()}`,
      nombre: 'Nuevo Estado',
      color: '#3B82F6',
      dias: 10,
      alertaDias: 3,
      orden: estadosKanban.length + 1,
      activo: true,
    };

    setEstadosKanban([...estadosKanban, nuevoEstado]);
    setCambiosPendientes(true);
    toast.success('Estado agregado correctamente');
  };

  const eliminarEstado = async (estadoId: string) => {
    const estadoAEliminar = estadosKanban.find(e => e.id === estadoId);
    
    if (!window.confirm(`¿Está seguro de eliminar el estado "${estadoAEliminar?.nombre}"? Esta acción puede afectar procesos existentes.`)) {
      return;
    }

    // Eliminar localmente
    const estadosActualizados = estadosKanban.filter(e => e.id !== estadoId);
    setEstadosKanban(estadosActualizados);
    
    try {
      // Guardar inmediatamente en el backend
      const stagesPayload = estadosActualizados.map(e => ({
        id: e.id,
        etapa: e.nombre,
        diasHabiles: e.dias,
        alertaDias: e.alertaDias,
        color: e.color,
        orden: e.orden,
        activo: e.activo,
        descripcion: `Etapa de ${e.nombre}`
      }));
      
      console.log('🗑️ Eliminando estado:', { idEliminado: estadoId, nombre: estadoAEliminar?.nombre, payload: stagesPayload });
      
      await disciplinaryService.updateStageConfiguration(stagesPayload);
      
      toast.success('Estado eliminado', {
        description: `El estado "${estadoAEliminar?.nombre}" ha sido eliminado`
      });
    } catch (error) {
      console.error('❌ Error al eliminar estado:', error);
      toast.error('Error al eliminar estado', {
        description: 'No se pudo eliminar el estado en el servidor'
      });
      // Revertir el cambio local si hay error
      setEstadosKanban(estadosKanban);
    }
  };

  const actualizarEstado = (estadoId: string, cambios: Partial<EstadoKanban>) => {
    setEstadosKanban(estadosKanban.map(e => 
      e.id === estadoId ? { ...e, ...cambios } : e
    ));
    setCambiosPendientes(true);
  };

  const guardarConfiguraciones = async () => {
    console.log('🔵 Guardando configuración de estados Kanban...');
    console.log('🔵 Estados a guardar:', estadosKanban);

    try {

      // Preparar payload para el backend
      const stagesPayload = estadosKanban.map(e => ({
        id: e.id,
        etapa: e.nombre,
        diasHabiles: e.dias,
        alertaDias: e.alertaDias,
        color: e.color,
        orden: e.orden,
        activo: e.activo,
        descripcion: `Etapa de ${e.nombre}`
      }));

      console.log('🔵 Payload para backend:', stagesPayload);

      // Guardar en el backend
      await disciplinaryService.updateStageConfiguration(stagesPayload);

      console.log('✅ Configuración guardada en el backend');
      setCambiosPendientes(false);
      toast.success('Configuración guardada exitosamente', {
        description: 'Los cambios se han guardado en el servidor'
      });
    } catch (error) {
      console.error('❌ Error al guardar configuración:', error);
      toast.error('Error al guardar configuración', {
        description: 'No se pudieron guardar los cambios en el servidor'
      });
    }
  };

  const restablecerDefecto = () => {
    if (window.confirm('¿Está seguro de restablecer a valores por defecto?')) {
      setEstadosKanban(ESTADOS_KANBAN_DEFECTO);
      setCambiosPendientes(true);
      toast.success('Configuraciones restablecidas');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header con acciones */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Estados del Tablero Kanban</h3>
          <p className="text-sm text-gray-600 mt-1">
            Define las columnas que aparecerán en el tablero Kanban del módulo disciplinario
          </p>
        </div>
        <div className="flex items-center gap-3">
          {cambiosPendientes && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
              <AlertCircle className="w-3 h-3 mr-1" />
              Sin guardar
            </span>
          )}
          {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_RESET) && (
          <button
            onClick={restablecerDefecto}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Restablecer
          </button>
          )}
          {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIG_KANBAN_GUARDAR) && (
          <button
            onClick={guardarConfiguraciones}
            disabled={!cambiosPendientes}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              background: cambiosPendientes ? 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' : '#9CA3AF',
            }}
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
          )}
        </div>
      </div>

      {/* Botón agregar */}
      <div className="flex justify-end">
        {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_ETAPA_CREATE) && (
        <button
          onClick={agregarEstado}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
          style={{ 
            background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
            boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
          }}
        >
          <Plus className="w-4 h-4" />
          Agregar Estado
        </button>
        )}
      </div>

      {/* Lista de estados con drag and drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={estadosKanban.map(e => e.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {estadosKanban.map((estado) => (
              <EstadoSortable 
                key={estado.id} 
                estado={estado} 
                onUpdate={actualizarEstado}
                onDelete={eliminarEstado}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// Componente sortable para cada estado
function EstadoSortable({ estado, onUpdate, onDelete }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: estado.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-4 rounded-lg border-2 border-gray-200 bg-white hover:border-blue-300 transition-all"
    >
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <button 
          {...attributes} 
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <GripVertical className="w-5 h-5 text-gray-400" />
        </button>

        {/* Color Picker */}
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={estado.color}
            onChange={(e) => onUpdate(estado.id, { color: e.target.value })}
            className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
          />
        </div>

        {/* Nombre */}
        <div className="flex-1">
          <input
            type="text"
            value={estado.nombre}
            onChange={(e) => onUpdate(estado.id, { nombre: e.target.value })}
            className="w-full px-3 py-2 text-sm font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre del estado"
          />
        </div>

        {/* Días */}
        <div className="w-24">
          <label className="text-xs font-semibold text-gray-700 mb-1 block">Días</label>
          <input
            type="number"
            min="1"
            max="180"
            value={estado.dias}
            onChange={(e) => onUpdate(estado.id, { dias: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Alerta */}
        <div className="w-24">
          <label className="text-xs font-semibold text-gray-700 mb-1 block">Alerta</label>
          <input
            type="number"
            min="1"
            max="30"
            value={estado.alertaDias}
            onChange={(e) => onUpdate(estado.id, { alertaDias: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Activo */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={estado.activo}
            onChange={(e) => onUpdate(estado.id, { activo: e.target.checked })}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-semibold text-gray-700">Activo</span>
        </label>

        {/* Eliminar */}
        {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_ETAPA_DELETE) && (
        <button
          onClick={() => onDelete(estado.id)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Eliminar estado"
        >
          <Trash2 className="w-5 h-5" />
        </button>
        )}
      </div>
    </div>
  );
}

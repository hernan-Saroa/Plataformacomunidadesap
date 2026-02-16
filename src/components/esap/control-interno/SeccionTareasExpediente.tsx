/**
 * ============================================
 * SECCIÓN: TAREAS EN EXPEDIENTE
 * ============================================
 * 
 * Componente para gestionar tareas dentro del expediente de auditoría
 * 
 * FUNCIONALIDADES:
 * - Lista de tareas con progreso
 * - Marcar tareas como completadas
 * - Filtros por fase, estado, prioridad
 * - Crear nueva tarea
 * 
 * ÚLTIMA ACTUALIZACIÓN: 23 Enero 2026
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle, Clock, AlertCircle, Plus, CheckSquare, Square
} from 'lucide-react';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { useTareas, type Tarea, type EstadoTarea, type PrioridadTarea } from './TareasContext';
import { toast } from 'sonner@2.0.3';

interface Props {
  auditoriaId: string;
}

export function SeccionTareasExpediente({ auditoriaId }: Props) {
  const {
    obtenerTareasPorAuditoria,
    contarTareas,
    contarTareasPendientes,
    contarTareasCompletadas,
    calcularProgresoTareas,
    completarTarea
  } = useTareas();

  const [filtroEstado, setFiltroEstado] = useState<EstadoTarea | 'Todas'>('Todas');
  const [filtroFase, setFiltroFase] = useState<string>('Todas');

  const tareas = obtenerTareasPorAuditoria(auditoriaId);

  // Filtrar tareas
  const tareasFiltradas = tareas.filter((tarea) => {
    if (filtroEstado !== 'Todas' && tarea.estado !== filtroEstado) return false;
    if (filtroFase !== 'Todas' && tarea.fase !== filtroFase) return false;
    return true;
  });

  const getColorPrioridad = (prioridad: PrioridadTarea): string => {
    switch (prioridad) {
      case 'Urgente':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Alta':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Media':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Baja':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getIconoEstado = (estado: EstadoTarea) => {
    switch (estado) {
      case 'Completada':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'En Progreso':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'Pendiente':
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      case 'Cancelada':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const handleToggleCompletada = (tarea: Tarea) => {
    if (tarea.estado === 'Completada') {
      toast.info('La tarea ya está completada');
      return;
    }
    completarTarea(tarea.id);
  };

  return (
    <div className="space-y-4">
      {/* Header con estadísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Tareas y Actividades
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {contarTareasCompletadas(auditoriaId)} de {contarTareas(auditoriaId)} completadas
            <span className="ml-2 text-gray-500">
              • {calcularProgresoTareas(auditoriaId)}% de progreso
            </span>
          </p>
        </div>
        <ButtonSIGL
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            toast.info('Funcionalidad de creación en desarrollo');
          }}
        >
          Nueva Tarea
        </ButtonSIGL>
      </div>

      {/* Barra de progreso general */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-900">
            Progreso General
          </span>
          <span className="text-sm font-bold" style={{ color: '#003DA5' }}>
            {calcularProgresoTareas(auditoriaId)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all duration-300"
            style={{
              width: `${calcularProgresoTareas(auditoriaId)}%`,
              background: 'linear-gradient(90deg, #003DA5 0%, #2962FF 100%)'
            }}
          />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-3">
          <div>
            <p className="text-xs text-gray-500">Completadas</p>
            <p className="text-sm font-bold text-green-600">
              {contarTareasCompletadas(auditoriaId)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pendientes</p>
            <p className="text-sm font-bold text-amber-600">
              {contarTareasPendientes(auditoriaId)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-sm font-bold text-gray-900">
              {contarTareas(auditoriaId)}
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Estado
          </label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as EstadoTarea | 'Todas')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todas">Todas</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En Progreso">En Progreso</option>
            <option value="Completada">Completada</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Fase
          </label>
          <select
            value={filtroFase}
            onChange={(e) => setFiltroFase(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todas">Todas</option>
            <option value="Planeación">Planeación</option>
            <option value="Ejecución">Ejecución</option>
            <option value="Comunicación">Comunicación</option>
            <option value="Seguimiento">Seguimiento</option>
          </select>
        </div>
      </div>

      {/* Lista de tareas */}
      <div className="space-y-3">
        {tareasFiltradas.length === 0 ? (
          <CardSIGL variant="secondary">
            <div className="text-center py-8">
              <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">
                {contarTareas(auditoriaId) === 0
                  ? 'No hay tareas registradas en esta auditoría'
                  : 'No se encontraron tareas con los filtros aplicados'}
              </p>
            </div>
          </CardSIGL>
        ) : (
          tareasFiltradas.map((tarea) => (
            <motion.div
              key={tarea.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardSIGL hover>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleCompletada(tarea)}
                      className="mt-0.5 flex-shrink-0"
                      disabled={tarea.estado === 'Completada'}
                    >
                      {tarea.estado === 'Completada' ? (
                        <CheckSquare className="w-5 h-5 text-green-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400 hover:text-blue-600 transition-colors" />
                      )}
                    </button>

                    {/* Contenido */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4
                            className={`font-bold text-sm mb-1 ${
                              tarea.estado === 'Completada'
                                ? 'line-through text-gray-500'
                                : 'text-gray-900'
                            }`}
                          >
                            {tarea.titulo}
                          </h4>
                          {tarea.descripcion && (
                            <p className="text-xs text-gray-600 mb-2">
                              {tarea.descripcion}
                            </p>
                          )}
                        </div>
                        {getIconoEstado(tarea.estado)}
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs px-2 py-1 rounded border font-semibold ${getColorPrioridad(tarea.prioridad)}`}>
                          {tarea.prioridad}
                        </span>
                        {tarea.fase && (
                          <span className="text-xs px-2 py-1 rounded border bg-purple-50 text-purple-700 border-purple-200 font-semibold">
                            {tarea.fase}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded border font-semibold ${
                          tarea.estado === 'Completada'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : tarea.estado === 'En Progreso'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {tarea.estado}
                        </span>
                      </div>

                      {/* Barra de progreso (solo si está en progreso) */}
                      {tarea.estado === 'En Progreso' && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600">Progreso</span>
                            <span className="text-xs font-semibold text-blue-600">
                              {tarea.progreso}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${tarea.progreso}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-gray-500">Responsable:</p>
                          <p className="font-semibold text-gray-900">
                            {tarea.responsableNombre}
                          </p>
                        </div>
                        {tarea.fechaVencimiento && (
                          <div>
                            <p className="text-gray-500">Vence:</p>
                            <p className="font-semibold text-gray-900">
                              {tarea.fechaVencimiento}
                            </p>
                          </div>
                        )}
                      </div>

                      {tarea.fechaCompletado && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-green-700">
                            ✅ Completada el {tarea.fechaCompletado}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardSIGL>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

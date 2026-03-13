/**
 * TabTareasExpediente - Tab de Tareas COMPARTIDA
 * ✅ Usada por ModalExpediente.tsx y ModalProcesoDisciplinario.tsx
 */

import { useState } from 'react';
import { Plus, Target, Calendar, User, CheckCircle, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card } from '../../../ui/card';
import { getSemaforoColor, type TareaExpediente } from './expedienteShared';

interface TabTareasExpedienteProps {
  tareas: TareaExpediente[];
  setTareas: React.Dispatch<React.SetStateAction<TareaExpediente[]>>;
  expedienteId: string;
  onCrearTarea: () => void;
  onEditarTarea: (tarea: TareaExpediente) => void;
  onMarcarCompletada?: (tareaId: string | number) => void;
}

export function TabTareasExpediente({
  tareas,
  setTareas,
  expedienteId,
  onCrearTarea,
  onEditarTarea,
  onMarcarCompletada
}: TabTareasExpedienteProps) {

  const handleMarcarCompletada = (tareaId: string | number) => {
    if (onMarcarCompletada) {
      onMarcarCompletada(tareaId);
      return;
    }

    const tarea = tareas.find(t => t.id === tareaId);
    if (!tarea) return;

    toast.loading('⏳ Actualizando estado de la tarea...', {
      id: 'marcar-completada',
      duration: 1500
    });

    setTimeout(() => {
      setTareas(prev => prev.map(t =>
        t.id === tareaId
          ? { ...t, estado: 'Completado' }
          : t
      ));

      toast.success('✅ Tarea marcada como completada', {
        id: 'marcar-completada',
        description: `"${tarea.titulo}" ha sido completada exitosamente`,
        duration: 4000
      });
    }, 1500);
  };

  return (
    <div className="space-y-3">
      <Card className="p-4 bg-gradient-to-r from-orange-50 to-white border-orange-200">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-600" />
            Tareas y Pendientes del Expediente
          </h4>
          <Button
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
            onClick={onCrearTarea}
          >
            <Plus className="w-3 h-3 mr-1" />
            Nueva Tarea
          </Button>
        </div>
      </Card>

      {tareas.length === 0 ? (
        <Card className="p-8 text-center border-2 border-dashed border-gray-300">
          <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h4 className="font-bold text-lg text-gray-600 mb-2">Sin tareas</h4>
          <p className="text-sm text-gray-500">
            Crea la primera tarea para este expediente
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tareas.map((tarea) => {
            const semaforoTarea = getSemaforoColor(tarea.diasRestantes);

            return (
              <Card
                key={tarea.id}
                className="p-4 border-l-4 hover:shadow-md transition-shadow"
                style={{ borderLeftColor: semaforoTarea.color }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h5 className="text-sm font-bold text-gray-900 mb-1">{tarea.titulo}</h5>
                    <p className="text-xs text-gray-600">{tarea.descripcion}</p>
                  </div>
                  <Badge
                    className="ml-3 font-bold text-xs"
                    style={{
                      background: tarea.prioridad === 'Alta' ? '#FEE2E2' : '#FEF3C7',
                      color: tarea.prioridad === 'Alta' ? '#DC2626' : '#F59E0B',
                      border: `1px solid ${tarea.prioridad === 'Alta' ? '#DC2626' : '#F59E0B'}`
                    }}
                  >
                    {tarea.prioridad}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Vencimiento</p>
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {tarea.vencimiento}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Días restantes</p>
                    <Badge
                      className="text-xs font-bold"
                      style={{
                        background: semaforoTarea.bg,
                        color: semaforoTarea.color,
                        border: `1px solid ${semaforoTarea.color}`
                      }}
                    >
                      {tarea.diasRestantes} días
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Responsable</p>
                    <p className="text-xs font-bold text-gray-900 truncate flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {tarea.responsable}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Estado</p>
                    <Badge
                      className="text-xs font-semibold"
                      style={{
                        background: tarea.estado === 'Completado' ? '#D1FAE5' : (tarea.estado === 'En proceso' ? '#DBEAFE' : '#FEF3C7'),
                        color: tarea.estado === 'Completado' ? '#065F46' : (tarea.estado === 'En proceso' ? '#1E40AF' : '#92400E')
                      }}
                    >
                      {tarea.estado}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs flex-1 font-bold"
                    onClick={() => handleMarcarCompletada(tarea.id)}
                    disabled={tarea.estado === 'Completado'}
                    style={{
                      opacity: tarea.estado === 'Completado' ? 0.5 : 1,
                      cursor: tarea.estado === 'Completado' ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {tarea.estado === 'Completado' ? 'Completada' : 'Marcar Completada'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs font-bold"
                    onClick={() => onEditarTarea(tarea)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

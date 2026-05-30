/**
 * TabTareasExpediente - Tab de Tareas COMPARTIDA
 * ✅ Usada por ModalExpediente.tsx y ModalProcesoDisciplinario.tsx
 */

import { useState } from 'react';
import { Plus, Target, Calendar, User, CheckCircle, Edit, Check, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Card } from '@esap-mfe/shared-ui/card';
import { getSemaforoColor, type TareaExpediente } from './expedienteShared';

interface TabTareasExpedienteProps {
  tareas: TareaExpediente[];
  setTareas: React.Dispatch<React.SetStateAction<TareaExpediente[]>>;
  expedienteId: string;
  onCrearTarea?: () => void;
  onEditarTarea?: (tarea: TareaExpediente) => void;
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
      {/* Header removido porque ahora la acción principal está en las pestañas principales */}

      {tareas.length === 0 ? (
        <Card className="p-8 text-center border-2 border-dashed border-gray-300">
          <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h4 className="font-bold text-lg text-gray-600 mb-2">Sin tareas</h4>
          <p className="text-sm text-gray-500">
            Crea la primera tarea para este expediente
          </p>
        </Card>
      ) : (
        <div className="relative mt-4">
          {/* Línea vertical eliminada */}
          <div className="space-y-0">
            {tareas.map((tarea) => {
              const semaforoTarea = getSemaforoColor(tarea.diasRestantes);

              return (
                <div 
                  key={tarea.id}
                  className="group flex items-start gap-3 w-full p-3 mb-2 bg-white border border-gray-100 rounded-xl hover:border-indigo-100 hover:shadow-sm transition-all"
                >
                  {/* Left: Checkbox (Complete action) */}
                  <div className="pt-0.5 shrink-0">
                    <button
                      onClick={() => onMarcarCompletada && onMarcarCompletada(tarea.id)}
                      disabled={tarea.estado === 'Completado' || !onMarcarCompletada}
                      className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-colors ${
                        tarea.estado === 'Completado' 
                          ? 'bg-emerald-500 border-emerald-500 text-white cursor-default' 
                          : 'border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 text-transparent hover:text-emerald-500 cursor-pointer'
                      }`}
                      title={tarea.estado === 'Completado' ? 'Tarea completada' : 'Marcar como completada'}
                    >
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </button>
                  </div>

                  {/* Middle: Content */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-semibold truncate ${tarea.estado === 'Completado' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {tarea.titulo}
                      </h4>
                      {tarea.prioridad === 'Alta' && (
                        <Badge className="text-[9px] uppercase px-1.5 py-0 h-4 bg-red-50 text-red-600 border-red-100 font-bold shadow-none">
                          Urgente
                        </Badge>
                      )}
                    </div>
                    {tarea.descripcion && (
                      <p className={`text-xs line-clamp-1 ${tarea.estado === 'Completado' ? 'text-gray-400' : 'text-gray-500'}`} title={tarea.descripcion}>
                        {tarea.descripcion}
                      </p>
                    )}
                    
                    {/* Metadata Footer */}
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className={tarea.diasRestantes < 0 && tarea.estado !== 'Completado' ? 'text-red-600 font-bold' : ''}>
                          {tarea.vencimiento}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                        <User className="w-3 h-3 text-gray-400" />
                        {tarea.responsable}
                      </div>
                      <Badge
                          className="text-[9px] px-1.5 py-0 h-4 border-transparent font-medium shadow-none"
                          style={{
                            background: tarea.estado === 'Completado' ? '#D1FAE5' : (tarea.estado === 'En proceso' ? '#DBEAFE' : '#F3F4F6'),
                            color: tarea.estado === 'Completado' ? '#065F46' : (tarea.estado === 'En proceso' ? '#1E40AF' : '#4B5563')
                          }}
                      >
                        {tarea.estado}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Right: Actions (Visible on hover) */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 pt-0.5">
                    {onEditarTarea && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
                        onClick={() => onEditarTarea(tarea)}
                        title="Editar tarea"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

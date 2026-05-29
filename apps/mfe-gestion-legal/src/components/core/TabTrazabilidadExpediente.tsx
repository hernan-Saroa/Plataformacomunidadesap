import { useState, useEffect } from 'react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Avatar, AvatarFallback } from '@esap-mfe/shared-ui/avatar';
import { Clock, MessageSquare, CheckSquare, Gavel, Calendar, User } from 'lucide-react';
import { legalService } from '../../services/api/legal.service';

interface TabTrazabilidadExpedienteProps {
  expedienteId: string;
  actuaciones: any[];
  tareas: any[];
  notas: any[];
  profesionalAsignado?: string;
  readOnly?: boolean;
  onActionClick?: (type: 'ACTUACION' | 'TAREA' | 'COMENTARIO', id: string) => void;
}

interface TimelineEvent {
  id: string;
  date: Date;
  type: 'ACTUACION' | 'TAREA' | 'COMENTARIO';
  title: string;
  description: string;
  user: string;
  status?: string;
  rawDateStr: string;
}

export function TabTrazabilidadExpediente({ 
  expedienteId, 
  actuaciones = [], 
  tareas = [], 
  notas = [],
  profesionalAsignado,
  readOnly = true,
  onActionClick
}: TabTrazabilidadExpedienteProps) {
  
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  const fetchComentarios = async () => {
    try {
      const data = await legalService.getComentariosExpediente(expedienteId);
      setComentarios(data || []);
    } catch (err) {
      console.error('Error fetching comentarios para trazabilidad:', err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (expedienteId) {
      fetchComentarios();
    }
  }, [expedienteId]);

  // Construir el timeline consolidado
  const timeline: TimelineEvent[] = [];

  // Función segura para parsear fechas
  const safeDate = (dateStr1: string, dateStr2?: string): Date => {
    const parse = (s: string) => {
      if (!s) return null;
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d;
      if (s.includes('/')) {
        const p = s.split(/[\s/:]+/);
        if (p.length >= 3) {
          const pd = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
          if (!isNaN(pd.getTime())) return pd;
        }
      }
      return null;
    };
    return parse(dateStr1) || (dateStr2 ? parse(dateStr2) : null) || new Date();
  };

  // 1. Actuaciones
  actuaciones.forEach(act => {
    const d = safeDate(act.fechaActuacion, act.createdAt);
    timeline.push({
      id: `act_${act.id}`,
      date: d,
      rawDateStr: act.fechaActuacion || act.createdAt,
      type: 'ACTUACION',
      title: act.tipoActuacion || 'Actuación Procesal',
      description: act.descripcion || 'Sin descripción',
      user: act.responsable || 'Sistema',
      status: act.estado
    });
  });

  // 2. Tareas
  tareas.forEach(tar => {
    const d = safeDate(tar.createdAt, tar.fechaVencimiento);
    timeline.push({
      id: `tar_${tar.id}`,
      date: d,
      rawDateStr: tar.createdAt || tar.fechaVencimiento,
      type: 'TAREA',
      title: tar.titulo || 'Tarea Asignada',
      description: tar.descripcion || 'Sin descripción',
      user: tar.responsable || 'Sistema',
      status: tar.estado
    });
  });

  // 3. Comentarios / Historial
  comentarios.forEach(com => {
    const d = safeDate(com.createdAt);
    timeline.push({
      id: `com_${com.id}`,
      date: d,
      rawDateStr: com.createdAt,
      type: 'COMENTARIO',
      title: 'Nota de Historial',
      description: com.contenido || '',
      user: com.usuarioNombre || com.autorNombre || 'Usuario',
    });
  });

  // 4. Notas del Expediente
  notas.forEach(nota => {
    const d = safeDate(nota.createdAt, nota.fecha);
    timeline.push({
      id: `nota_${nota.id}`,
      date: d,
      rawDateStr: nota.createdAt || nota.fecha,
      type: 'COMENTARIO',
      title: 'Nota / Observación',
      description: nota.contenido || nota.descripcion || '',
      user: nota.autorNombre || nota.usuarioNombre || 'Usuario',
    });
  });

  // Ordenar de más reciente a más antiguo
  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  const getIconForType = (type: string) => {
    switch (type) {
      case 'ACTUACION': return <Gavel className="w-3 h-3 text-indigo-600" />;
      case 'TAREA': return <CheckSquare className="w-3 h-3 text-emerald-600" />;
      case 'COMENTARIO': return <MessageSquare className="w-3 h-3 text-blue-600" />;
      default: return <Clock className="w-3 h-3 text-gray-600" />;
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'ACTUACION': return 'bg-indigo-100 border-indigo-200';
      case 'TAREA': return 'bg-emerald-100 border-emerald-200';
      case 'COMENTARIO': return 'bg-blue-100 border-blue-200';
      default: return 'bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className="space-y-3">
      {/* Header removido porque ahora la acción principal está en las pestañas principales */}

      {/* Timeline Scrollable Area */}
      <div className="overflow-y-auto max-h-[500px] px-2 py-2">
        {isFetching ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Clock className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm">Cargando trazabilidad...</p>
          </div>
        ) : timeline.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-gray-900 font-bold mb-1">Sin historial registrado</h4>
            <p className="text-gray-500 text-sm max-w-md mx-auto">No hay actuaciones, tareas ni registros en este expediente aún.</p>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            {timeline.map((event) => {
              const isValidDate = !isNaN(event.date.getTime());
              
              return (
                <div 
                  key={event.id} 
                  className={`group flex items-start gap-3 w-full p-3 bg-white border border-gray-100 rounded-xl transition-all ${onActionClick ? 'cursor-pointer hover:border-indigo-200 hover:shadow-sm' : ''}`}
                  onClick={() => onActionClick && onActionClick(event.type, event.id)}
                >
                  
                  {/* Icono a la izquierda */}
                  <div className="pt-0.5 shrink-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getColorForType(event.type)}`}>
                      {getIconForType(event.type)}
                    </div>
                  </div>
                  
                  {/* Contenido */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[9px] font-bold uppercase px-1.5 py-0 h-4 border-transparent shadow-none ${
                        event.type === 'ACTUACION' ? 'text-indigo-700 bg-indigo-50' : 
                        event.type === 'TAREA' ? 'text-emerald-700 bg-emerald-50' : 
                        'text-blue-700 bg-blue-50'
                      }`}>
                        {event.type}
                      </Badge>
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{event.title}</h4>
                    </div>
                    {event.description && (
                      <p className="text-xs text-gray-500 line-clamp-1" title={event.description}>{event.description}</p>
                    )}
                    
                    {/* Meta-datos: Fecha, Usuario, Estado */}
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>
                          {isValidDate ? event.date.toLocaleString('es-CO', { 
                            day: '2-digit', month: 'short', year: 'numeric', 
                            hour: '2-digit', minute: '2-digit'
                          }) : event.rawDateStr}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                        <User className="w-3 h-3 text-gray-400" />
                        {event.user}
                      </div>
                      {event.status && (
                        <Badge className="bg-gray-50 text-gray-600 border-gray-200 shadow-none font-medium text-[9px] px-1.5 py-0 h-4">
                          {event.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import { Clock, MessageSquare, FileText, AlertTriangle } from 'lucide-react';

export interface ActividadCaso {
  id: string;
  fecha: Date;
  tipo: 'actualizacion' | 'documento' | 'comentario' | 'alerta';
  titulo: string;
  descripcion: string;
  usuario: {
    nombre: string;
    iniciales: string;
    color: string;
  };
}

export const generarActividadesMock = (): ActividadCaso[] => [
  {
    id: 'act-1',
    fecha: new Date('2024-12-01T10:00:00'),
    tipo: 'actualizacion',
    titulo: 'Caso creado',
    descripcion: 'Se radica el caso y se asigna prioridad alta.',
    usuario: { nombre: 'Pedro Sánchez', iniciales: 'PS', color: '#20B2AA' },
  },
  {
    id: 'act-2',
    fecha: new Date('2024-12-02T14:30:00'),
    tipo: 'documento',
    titulo: 'Auto admisorio cargado',
    descripcion: 'Se adjunta auto admisorio y se notifica a las partes.',
    usuario: { nombre: 'Luis Rodríguez', iniciales: 'LR', color: '#4A90E2' },
  },
  {
    id: 'act-3',
    fecha: new Date('2024-12-05T09:15:00'),
    tipo: 'comentario',
    titulo: 'Observación del analista',
    descripcion: 'Se requiere consolidar pruebas adicionales antes del vencimiento.',
    usuario: { nombre: 'Ana Gómez', iniciales: 'AG', color: '#7C3AED' },
  },
  {
    id: 'act-4',
    fecha: new Date('2024-12-08T17:45:00'),
    tipo: 'alerta',
    titulo: 'Vencimiento próximo',
    descripcion: 'El caso vence en 3 días. Priorizar acciones.',
    usuario: { nombre: 'Sistema', iniciales: 'SYS', color: '#F97316' },
  },
];

interface TimelineActividadProps {
  actividades: ActividadCaso[];
  mostrarTodo?: boolean;
}

export function TimelineActividad({ actividades, mostrarTodo = false }: TimelineActividadProps) {
  const ordered = [...actividades].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  const visibles = mostrarTodo ? ordered : ordered.slice(0, 5);

  const iconForType = (tipo: ActividadCaso['tipo']) => {
    switch (tipo) {
      case 'documento':
        return FileText;
      case 'comentario':
        return MessageSquare;
      case 'alerta':
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  return (
    <div className="space-y-3">
      {visibles.map((act) => {
        const Icon = iconForType(act.tipo);
        const isWarning = act.tipo === 'alerta';
        return (
          <div
            key={act.id}
            className={`flex items-start gap-3 rounded-lg border p-3 ${
              isWarning ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-white'
            }`}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
              style={{ backgroundColor: act.usuario.color }}
            >
              {act.usuario.iniciales}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900">{act.titulo}</span>
                <span className="text-xs text-gray-500">{act.fecha.toLocaleString()}</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                    isWarning ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {act.tipo}
                </span>
              </div>
              <p className="text-sm text-gray-700">{act.descripcion}</p>
              <p className="text-xs text-gray-500">Responsable: {act.usuario.nombre}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

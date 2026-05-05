import { useState } from 'react';
import { 
  Clock, Calendar, UserPlus, Shield, FileText, 
  Mail, LogIn, Edit, Trash2, CheckCircle,
  AlertCircle, Info, Award, Upload, Download
} from 'lucide-react';
import { motion } from 'motion/react';

interface TimelineEvent {
  id: string;
  type: 'login' | 'edit' | 'document' | 'role' | 'status' | 'achievement';
  title: string;
  description: string;
  timestamp: string;
  user: string;
  metadata?: Record<string, any>;
}

interface PersonTimelineProps {
  personId: string;
}

const mockEvents: TimelineEvent[] = [
  {
    id: '1',
    type: 'login',
    title: 'Inicio de sesión',
    description: 'Usuario inició sesión desde Chrome en Windows',
    timestamp: '2024-11-13 10:30:00',
    user: 'Sistema'
  },
  {
    id: '2',
    type: 'edit',
    title: 'Perfil actualizado',
    description: 'Se actualizó la información de contacto',
    timestamp: '2024-11-12 15:45:00',
    user: 'Héctor Admin'
  },
  {
    id: '3',
    type: 'document',
    title: 'Documento subido',
    description: 'Se subió el archivo "Certificado de Estudios.pdf"',
    timestamp: '2024-11-11 09:20:00',
    user: 'Usuario'
  },
  {
    id: '4',
    type: 'role',
    title: 'Rol modificado',
    description: 'Se cambió el rol de "Estudiante" a "Estudiante Avanzado"',
    timestamp: '2024-11-10 14:15:00',
    user: 'Coordinador Académico'
  },
  {
    id: '5',
    type: 'achievement',
    title: 'Logro desbloqueado',
    description: 'Completó el semestre con promedio superior a 4.5',
    timestamp: '2024-11-08 16:00:00',
    user: 'Sistema'
  },
  {
    id: '6',
    type: 'status',
    title: 'Estado cambiado',
    description: 'Estado actualizado de "Pendiente" a "Activo"',
    timestamp: '2024-11-05 11:30:00',
    user: 'Administrador'
  },
  {
    id: '7',
    type: 'document',
    title: 'Documento verificado',
    description: 'Se verificó el documento "Documento de Identidad.pdf"',
    timestamp: '2024-11-03 08:45:00',
    user: 'Sistema'
  },
  {
    id: '8',
    type: 'login',
    title: 'Primer inicio de sesión',
    description: 'Usuario accedió al sistema por primera vez',
    timestamp: '2024-11-01 09:00:00',
    user: 'Sistema'
  }
];

export function PersonTimeline({ personId }: PersonTimelineProps) {
  const [events] = useState<TimelineEvent[]>(mockEvents);
  const [filter, setFilter] = useState<string>('all');

  const eventTypes = [
    { value: 'all', label: 'Todos los eventos' },
    { value: 'login', label: 'Inicios de sesión' },
    { value: 'edit', label: 'Ediciones' },
    { value: 'document', label: 'Documentos' },
    { value: 'role', label: 'Roles' },
    { value: 'status', label: 'Estados' },
    { value: 'achievement', label: 'Logros' }
  ];

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(event => event.type === filter);

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'login':
        return { icon: LogIn, color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'edit':
        return { icon: Edit, color: 'text-purple-600', bg: 'bg-purple-100' };
      case 'document':
        return { icon: FileText, color: 'text-orange-600', bg: 'bg-orange-100' };
      case 'role':
        return { icon: Shield, color: 'text-green-600', bg: 'bg-green-100' };
      case 'status':
        return { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100' };
      case 'achievement':
        return { icon: Award, color: 'text-pink-600', bg: 'bg-pink-100' };
      default:
        return { icon: Info, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 24) {
      return hours === 0 ? 'Hace unos minutos' : `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    } else if (days < 7) {
      return `Hace ${days} día${days > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-[--esap-gray-900]">Línea de tiempo</h3>
          <p className="text-sm text-[--esap-gray-600]">
            {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''} registrado{filteredEvents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border-2 border-[--esap-gray-200] focus:border-[--esap-primary] focus:outline-none transition-colors"
        >
          {eventTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      {filteredEvents.length === 0 ? (
        <div className="py-12 text-center">
          <Clock className="w-16 h-16 text-[--esap-gray-300] mx-auto mb-4" />
          <p className="text-[--esap-gray-600]">No hay eventos para mostrar</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[--esap-gray-200]" />

          {/* Events */}
          <div className="space-y-6">
            {filteredEvents.map((event, index) => {
              const iconConfig = getEventIcon(event.type);
              const EventIcon = iconConfig.icon;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative flex gap-4"
                >
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-full ${iconConfig.bg} border-4 border-white flex items-center justify-center z-10 flex-shrink-0`}>
                    <EventIcon className={`w-5 h-5 ${iconConfig.color}`} strokeWidth={2} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-white rounded-xl p-4 border-2 border-[--esap-gray-200] hover:border-[--esap-primary]/40 transition-all">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h4 className="font-bold text-[--esap-gray-900]">
                        {event.title}
                      </h4>
                      <span className="text-xs text-[--esap-gray-500] whitespace-nowrap">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-[--esap-gray-600] mb-3">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-[--esap-gray-500]">
                        <Calendar className="w-3 h-3" />
                        {new Date(event.timestamp).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <span className="text-[--esap-gray-400]">•</span>
                      <span className="text-xs text-[--esap-gray-500]">
                        Por: {event.user}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <LogIn className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-blue-700 font-semibold">Inicios</span>
          </div>
          <p className="text-xl font-extrabold text-blue-900">
            {events.filter(e => e.type === 'login').length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <Edit className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-purple-700 font-semibold">Ediciones</span>
          </div>
          <p className="text-xl font-extrabold text-purple-900">
            {events.filter(e => e.type === 'edit').length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 border border-orange-200">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-orange-600" />
            <span className="text-xs text-orange-700 font-semibold">Documentos</span>
          </div>
          <p className="text-xl font-extrabold text-orange-900">
            {events.filter(e => e.type === 'document').length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-3 border border-pink-200">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-pink-600" />
            <span className="text-xs text-pink-700 font-semibold">Logros</span>
          </div>
          <p className="text-xl font-extrabold text-pink-900">
            {events.filter(e => e.type === 'achievement').length}
          </p>
        </div>
      </div>
    </div>
  );
}

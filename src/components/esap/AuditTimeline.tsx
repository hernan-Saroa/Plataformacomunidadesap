import React from 'react';
import { motion } from 'motion/react';
import { Clock, User, Activity, AlertCircle, CheckCircle, Info, MapPin, Monitor } from 'lucide-react';

interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  userId: string;
  action: string;
  module: string;
  severity: string;
  status: string;
  ipAddress: string;
  device: string;
  location: string;
  details: string;
}

interface AuditTimelineProps {
  events: AuditEvent[];
  onEventClick: (event: AuditEvent) => void;
}

export function AuditTimeline({ events, onEventClick }: AuditTimelineProps) {
  // Agrupar eventos por fecha
  const eventsByDate = events.reduce((acc, event) => {
    const date = event.timestamp.split(' ')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, AuditEvent[]>);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return { Icon: AlertCircle, color: '#DC2626', bg: '#FEE2E2' };
      case 'medium':
        return { Icon: Info, color: '#3B82F6', bg: '#DBEAFE' };
      case 'low':
      case 'info':
        return { Icon: CheckCircle, color: '#10B981', bg: '#D1FAE5' };
      default:
        return { Icon: Info, color: '#6B7280', bg: '#F3F4F6' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return { bg: '#D1FAE5', color: '#065F46', label: 'Éxito' };
      case 'failed':
        return { bg: '#FEE2E2', color: '#991B1B', label: 'Fallo' };
      case 'warning':
        return { bg: '#FEF3C7', color: '#92400E', label: 'Alerta' };
      default:
        return { bg: '#F3F4F6', color: '#1F2937', label: 'N/A' };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
          <Activity className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Línea de Tiempo</h3>
          <p className="text-sm text-gray-600">Vista cronológica de eventos</p>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(eventsByDate).map(([date, dateEvents], dateIndex) => (
          <div key={date}>
            {/* Date Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-blue-600 rounded-xl shadow-md">
                <Clock className="w-4 h-4 text-white" strokeWidth={2} />
                <span className="font-bold text-white capitalize">
                  {formatDate(date)}
                </span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent" />
            </div>

            {/* Events Timeline */}
            <div className="relative pl-8 space-y-6">
              {/* Vertical Line */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#1e5da8] to-gray-200" />

              {dateEvents.map((event, eventIndex) => {
                const { Icon, color, bg } = getSeverityIcon(event.severity);
                const statusBadge = getStatusBadge(event.status);

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (dateIndex * 0.1) + (eventIndex * 0.05) }}
                    className="relative"
                  >
                    {/* Timeline Dot */}
                    <div 
                      className="absolute -left-8 top-3 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: bg }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color }} strokeWidth={2.5} />
                    </div>

                    {/* Event Card */}
                    <motion.div
                      whileHover={{ scale: 1.01, x: 4 }}
                      onClick={() => onEventClick(event)}
                      className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-4 border-2 border-gray-200 hover:border-[#1e5da8] transition-all cursor-pointer shadow-sm hover:shadow-lg"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-gray-500">
                              {event.timestamp.split(' ')[1]}
                            </span>
                            <span 
                              className="px-2 py-0.5 rounded-full text-xs font-bold"
                              style={{ 
                                backgroundColor: statusBadge.bg, 
                                color: statusBadge.color 
                              }}
                            >
                              {statusBadge.label}
                            </span>
                          </div>
                          <h4 className="font-bold text-gray-900 text-sm mb-1">
                            {event.action}
                          </h4>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {event.details}
                          </p>
                        </div>
                      </div>

                      {/* Meta Information */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#1e5da8]" />
                          <span className="font-semibold">{event.user}</span>
                          <span className="text-gray-400">({event.userId})</span>
                        </div>
                        <span className="text-gray-300">•</span>
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-purple-500" />
                          <span className="font-medium">{event.module}</span>
                        </div>
                        <span className="text-gray-300">•</span>
                        <div className="flex items-center gap-1.5">
                          <Monitor className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-medium">{event.device}</span>
                        </div>
                        <span className="text-gray-300">•</span>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-green-500" />
                          <span className="font-medium">{event.location}</span>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {Object.keys(eventsByDate).length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-900 mb-1">No hay eventos</p>
          <p className="text-sm text-gray-600">
            No se encontraron eventos con los filtros aplicados
          </p>
        </div>
      )}
    </div>
  );
}

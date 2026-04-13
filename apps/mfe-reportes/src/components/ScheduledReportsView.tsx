/**
 * Vista de Gestión de Reportes Programados
 * Muestra y administra programaciones de reportes automáticos
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Clock, Mail, FileText, Play, Pause, Edit, Trash2,
  CheckCircle, XCircle, AlertCircle, Users, Download, Eye,
  ChevronDown, ChevronUp, MoreVertical, Send, History,
  PlayCircle, PauseCircle, Ban
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { toast } from 'sonner';

interface ScheduledReport {
  id: string;
  name: string;
  description: string;
  reportId: string;
  reportName: string;
  frequency: string;
  config: any;
  exportFormat: string;
  recipients: string[];
  sendToMe: boolean;
  saveToHistory: boolean;
  notifications: {
    onSuccess: boolean;
    onError: boolean;
  };
  status: 'active' | 'paused' | 'error';
  nextExecution: string;
  lastExecution?: {
    date: string;
    status: 'success' | 'failed';
    size?: string;
    error?: string;
  };
  executionHistory?: Array<{
    id: string;
    date: string;
    status: 'success' | 'failed';
    size?: string;
    recipients: number;
  }>;
  createdAt: string;
}

interface ScheduledReportsViewProps {
  schedules: ScheduledReport[];
  onToggleStatus: (scheduleId: string) => void;
  onEdit: (scheduleId: string) => void;
  onDelete: (scheduleId: string) => void;
  onRunNow: (scheduleId: string) => void;
  onViewHistory: (scheduleId: string) => void;
}

export function ScheduledReportsView({
  schedules,
  onToggleStatus,
  onEdit,
  onDelete,
  onRunNow,
  onViewHistory,
}: ScheduledReportsViewProps) {
  const [expandedSchedules, setExpandedSchedules] = useState<Set<string>>(new Set());

  const toggleExpand = (scheduleId: string) => {
    const newExpanded = new Set(expandedSchedules);
    if (newExpanded.has(scheduleId)) {
      newExpanded.delete(scheduleId);
    } else {
      newExpanded.add(scheduleId);
    }
    setExpandedSchedules(newExpanded);
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      daily: 'Diario',
      weekly: 'Semanal',
      monthly: 'Mensual',
      semester: 'Semestral',
      yearly: 'Anual',
    };
    return labels[frequency] || frequency;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          label: 'Activo',
          color: '#10b981',
          bgColor: '#f0fdf4',
          icon: PlayCircle,
        };
      case 'paused':
        return {
          label: 'Pausado',
          color: '#f59e0b',
          bgColor: '#fffbeb',
          icon: PauseCircle,
        };
      case 'error':
        return {
          label: 'Error',
          color: '#ef4444',
          bgColor: '#fef2f2',
          icon: Ban,
        };
      default:
        return {
          label: status,
          color: '#6b7280',
          bgColor: '#f9fafb',
          icon: AlertCircle,
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `En ${days} día${days !== 1 ? 's' : ''}`;
    if (hours > 0) return `En ${hours} hora${hours !== 1 ? 's' : ''}`;
    if (diff > 0) return 'Próximamente';
    return 'Atrasado';
  };

  if (schedules.length === 0) {
    return (
      <Card className="p-12 text-center border-2 border-dashed">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
          <Calendar className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          No hay reportes programados
        </h3>
        <p className="text-gray-600">
          Crea tu primera programación para generar reportes automáticamente
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {schedules.map((schedule) => {
        const statusConfig = getStatusConfig(schedule.status);
        const StatusIcon = statusConfig.icon;
        const isExpanded = expandedSchedules.has(schedule.id);

        return (
          <motion.div
            key={schedule.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-2 border-gray-200 hover:border-[#1e5da8] transition-all overflow-hidden">
              {/* Header */}
              <div className="p-5 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Status Badge */}
                    <Badge
                      variant="secondary"
                      className="mb-2 font-bold"
                      style={{
                        backgroundColor: statusConfig.bgColor,
                        color: statusConfig.color,
                      }}
                    >
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig.label}
                    </Badge>

                    {/* Name */}
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {schedule.name}
                    </h3>

                    {/* Report Name */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <FileText className="w-4 h-4" />
                      <span>{schedule.reportName}</span>
                    </div>

                    {/* Description */}
                    {schedule.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {schedule.description}
                      </p>
                    )}

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Frecuencia</p>
                          <p className="text-sm font-medium">
                            {getFrequencyLabel(schedule.frequency)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Hora</p>
                          <p className="text-sm font-medium">{schedule.config.time}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Formato</p>
                          <p className="text-sm font-medium uppercase">
                            {schedule.exportFormat}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-500">Destinatarios</p>
                          <p className="text-sm font-medium">
                            {(schedule.sendToMe ? 1 : 0) + schedule.recipients.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex-shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onRunNow(schedule.id)}>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Ejecutar Ahora
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleStatus(schedule.id)}>
                        {schedule.status === 'active' ? (
                          <>
                            <Pause className="w-4 h-4 mr-2" />
                            Pausar
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Reanudar
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(schedule.id)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(schedule.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Next Execution */}
              <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: statusConfig.bgColor }}
                    >
                      <Calendar className="w-5 h-5" style={{ color: statusConfig.color }} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Próxima Ejecución</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatDate(schedule.nextExecution)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatRelativeTime(schedule.nextExecution)}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(schedule.id)}
                  >
                    {isExpanded ? (
                      <>
                        Ocultar
                        <ChevronUp className="w-4 h-4 ml-1" />
                      </>
                    ) : (
                      <>
                        Ver Detalles
                        <ChevronDown className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Last Execution */}
              {schedule.lastExecution && (
                <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {schedule.lastExecution.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <p className="text-xs text-gray-500">Última Ejecución</p>
                        <p className="text-sm font-medium">
                          {formatDate(schedule.lastExecution.date)}
                        </p>
                        {schedule.lastExecution.status === 'success' && schedule.lastExecution.size && (
                          <p className="text-xs text-green-600">
                            ✓ Éxito ({schedule.lastExecution.size})
                          </p>
                        )}
                        {schedule.lastExecution.status === 'failed' && (
                          <p className="text-xs text-red-600">
                            ✗ {schedule.lastExecution.error || 'Error al generar'}
                          </p>
                        )}
                      </div>
                    </div>

                    {schedule.executionHistory && schedule.executionHistory.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewHistory(schedule.id)}
                      >
                        <History className="w-4 h-4 mr-1" />
                        Historial
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Expanded Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="p-5 space-y-4">
                      {/* Email Recipients */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                          Destinatarios de Email
                        </h4>
                        <div className="space-y-2">
                          {schedule.sendToMe && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-gray-500" />
                              <span>usuario.actual@esap.edu.co</span>
                              <Badge variant="outline" className="text-xs">
                                Yo
                              </Badge>
                            </div>
                          )}
                          {schedule.recipients.map((email) => (
                            <div key={email} className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-gray-500" />
                              <span>{email}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Notifications */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                          Notificaciones
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            {schedule.notifications.onSuccess ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-400" />
                            )}
                            <span>Notificar cuando se genere exitosamente</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {schedule.notifications.onError ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-400" />
                            )}
                            <span>Notificar si hay un error</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {schedule.saveToHistory ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-400" />
                            )}
                            <span>Guardar en historial</span>
                          </div>
                        </div>
                      </div>

                      {/* Execution History Preview */}
                      {schedule.executionHistory && schedule.executionHistory.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                            Últimas Ejecuciones
                          </h4>
                          <div className="space-y-2">
                            {schedule.executionHistory.slice(0, 3).map((execution) => (
                              <div
                                key={execution.id}
                                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded-lg"
                              >
                                <div className="flex items-center gap-2">
                                  {execution.status === 'success' ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  )}
                                  <span className="text-sm">
                                    {formatDate(execution.date)}
                                  </span>
                                </div>
                                {execution.status === 'success' && execution.size && (
                                  <span className="text-xs text-gray-600">
                                    {execution.size} • {execution.recipients} destinatarios
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

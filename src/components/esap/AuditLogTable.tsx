import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, Download, Filter, AlertCircle, CheckCircle, Info, Clock, User, FileDown } from 'lucide-react';
import { AuditEvent } from './AuditEventDetail';

interface AuditLogTableProps {
  events: AuditEvent[];
  onEventClick: (event: AuditEvent) => void;
  searchQuery?: string;
  onExportEvent?: (event: AuditEvent, format: 'csv' | 'excel' | 'pdf') => void;
}

export function AuditLogTable({ events, onEventClick, searchQuery = '', onExportEvent }: AuditLogTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Filter events based on search query
  const filteredEvents = events.filter(event => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      event.user.toLowerCase().includes(searchLower) ||
      event.action.toLowerCase().includes(searchLower) ||
      event.module.toLowerCase().includes(searchLower) ||
      event.userId.toLowerCase().includes(searchLower)
    );
  });
  
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEvents = filteredEvents.slice(startIndex, endIndex);

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { bg: '#FEE2E2', color: '#991B1B', label: 'Crítico', icon: AlertCircle };
      case 'high':
        return { bg: '#FEF3C7', color: '#92400E', label: 'Alto', icon: AlertCircle };
      case 'medium':
        return { bg: '#DBEAFE', color: '#1E40AF', label: 'Medio', icon: Info };
      case 'low':
        return { bg: '#D1FAE5', color: '#065F46', label: 'Bajo', icon: CheckCircle };
      case 'info':
        return { bg: '#F3F4F6', color: '#1F2937', label: 'Info', icon: Info };
      default:
        return { bg: '#F3F4F6', color: '#1F2937', label: 'Info', icon: Info };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'success':
        return { bg: '#D1FAE5', color: '#065F46', label: 'Éxito', icon: CheckCircle };
      case 'failed':
        return { bg: '#FEE2E2', color: '#991B1B', label: 'Fallo', icon: AlertCircle };
      case 'warning':
        return { bg: '#FEF3C7', color: '#92400E', label: 'Alerta', icon: AlertCircle };
      default:
        return { bg: '#F3F4F6', color: '#1F2937', label: 'N/A', icon: Info };
    }
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--esap-shadow-lg)' }}>
      {/* Table Header */}
      <div className="px-4 md:px-6 py-4 md:py-5 border-b border-[--esap-gray-200] bg-gradient-to-r from-[--esap-gray-50] to-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base md:text-lg font-bold text-[--esap-gray-900]">
              Registro de Auditoría
            </h2>
            <p className="text-xs text-[--esap-gray-600] mt-1">
              {events.length} eventos registrados
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 px-3 md:px-4 py-2 border-2 border-[--esap-gray-400] bg-white text-[--esap-gray-700] rounded-lg text-xs md:text-sm font-semibold hover:bg-[--esap-gray-50] hover:border-[--esap-gray-500] transition-all active:scale-95"
            >
              <Filter className="w-3 md:w-4 h-3 md:h-4" strokeWidth={2} />
              <span className="hidden sm:inline">Filtrar</span>
            </button>
            <button
              className="inline-flex items-center gap-2 px-3 md:px-4 py-2 border-2 border-[--esap-gray-400] bg-white text-[--esap-gray-700] rounded-lg text-xs md:text-sm font-semibold hover:bg-[--esap-gray-50] hover:border-[--esap-gray-500] transition-all active:scale-95"
            >
              <Download className="w-3 md:w-4 h-3 md:h-4" strokeWidth={2} />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table - Desktop View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[--esap-gray-50] border-b border-[--esap-gray-200]">
              <th className="px-4 xl:px-6 py-3 xl:py-4 text-left text-xs font-bold text-[--esap-gray-700] uppercase tracking-wider">
                Fecha/Hora
              </th>
              <th className="px-4 xl:px-6 py-3 xl:py-4 text-left text-xs font-bold text-[--esap-gray-700] uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-4 xl:px-6 py-3 xl:py-4 text-left text-xs font-bold text-[--esap-gray-700] uppercase tracking-wider">
                Acción
              </th>
              <th className="px-4 xl:px-6 py-3 xl:py-4 text-left text-xs font-bold text-[--esap-gray-700] uppercase tracking-wider">
                Submódulo
              </th>
              <th className="px-4 xl:px-6 py-3 xl:py-4 text-left text-xs font-bold text-[--esap-gray-700] uppercase tracking-wider">
                Severidad
              </th>
              <th className="px-4 xl:px-6 py-3 xl:py-4 text-left text-xs font-bold text-[--esap-gray-700] uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 xl:px-6 py-3 xl:py-4 text-center text-xs font-bold text-[--esap-gray-700] uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[--esap-gray-200]">{currentEvents.map((event, index) => {
              const severityConfig = getSeverityConfig(event.severity);
              const statusConfig = getStatusConfig(event.status);
              const SeverityIcon = severityConfig.icon;
              const StatusIcon = statusConfig.icon;

              return (
                <motion.tr
                  key={event.id}
                  className="hover:bg-[--esap-gray-50] transition-colors cursor-pointer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onEventClick(event)}
                >
                  <td className="px-4 xl:px-6 py-3 xl:py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[--esap-gray-400]" strokeWidth={2} />
                      <div>
                        <p className="text-xs xl:text-sm font-semibold text-[--esap-gray-900]">
                          {event.timestamp.split(' ')[0]}
                        </p>
                        <p className="text-xs text-[--esap-gray-600]">
                          {event.timestamp.split(' ')[1]}
                        </p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-4 xl:px-6 py-3 xl:py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 xl:w-8 h-7 xl:h-8 rounded-lg bg-gradient-to-br from-[--esap-primary] to-[--esap-primary-light] flex items-center justify-center">
                        <User className="w-3 xl:w-4 h-3 xl:h-4 text-white" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs xl:text-sm font-semibold text-[--esap-gray-900] truncate">
                          {event.user}
                        </p>
                        <p className="text-xs text-[--esap-gray-600]">
                          {event.userId}
                        </p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-4 xl:px-6 py-3 xl:py-4 max-w-xs">
                    <p className="text-xs xl:text-sm font-semibold text-[--esap-gray-900] truncate">
                      {event.action}
                    </p>
                  </td>
                  
                  <td className="px-4 xl:px-6 py-3 xl:py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-[--esap-gray-100] text-[--esap-gray-800]">
                      {event.module}
                    </span>
                  </td>
                  
                  <td className="px-4 xl:px-6 py-3 xl:py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: severityConfig.bg }}>
                        <SeverityIcon className="w-3.5 h-3.5" style={{ color: severityConfig.color }} strokeWidth={2} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: severityConfig.color }}>
                        {severityConfig.label}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-4 xl:px-6 py-3 xl:py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: statusConfig.bg }}>
                        <StatusIcon className="w-3.5 h-3.5" style={{ color: statusConfig.color }} strokeWidth={2} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: statusConfig.color }}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-4 xl:px-6 py-3 xl:py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[--esap-primary] text-white rounded-lg text-xs font-semibold hover:bg-[--esap-primary-dark] transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5" strokeWidth={2} />
                        Ver
                      </button>
                      {onExportEvent && (
                        <div className="relative group">
                          <button
                            className="inline-flex items-center gap-1 px-2 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onExportEvent(event, 'excel');
                            }}
                            title="Exportar esta fila a Excel"
                          >
                            <FileDown className="w-3.5 h-3.5" strokeWidth={2} />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Card View - Mobile/Tablet */}
      <div className="lg:hidden divide-y divide-[--esap-gray-200]">
        {currentEvents.map((event, index) => {
          const severityConfig = getSeverityConfig(event.severity);
          const statusConfig = getStatusConfig(event.status);
          const SeverityIcon = severityConfig.icon;
          const StatusIcon = statusConfig.icon;

          return (
            <motion.div
              key={event.id}
              className="p-4 hover:bg-[--esap-gray-50] transition-colors cursor-pointer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onEventClick(event)}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[--esap-primary] to-[--esap-primary-light] flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[--esap-gray-900] truncate">
                      {event.user}
                    </p>
                    <p className="text-xs text-[--esap-gray-600]">
                      {event.userId}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Clock className="w-3 h-3 text-[--esap-gray-400]" />
                  <span className="text-xs text-[--esap-gray-600] whitespace-nowrap">
                    {event.timestamp.split(' ')[1]}
                  </span>
                </div>
              </div>

              {/* Action */}
              <p className="text-sm font-semibold text-[--esap-gray-900] mb-2">
                {event.action}
              </p>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-[--esap-gray-100] text-[--esap-gray-800]">
                  {event.module}
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: severityConfig.bg }}>
                    <SeverityIcon className="w-3 h-3" style={{ color: severityConfig.color }} strokeWidth={2} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: severityConfig.color }}>
                    {severityConfig.label}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: statusConfig.bg }}>
                    <StatusIcon className="w-3 h-3" style={{ color: statusConfig.color }} strokeWidth={2} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: statusConfig.color }}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[--esap-primary] text-white rounded-lg text-sm font-semibold hover:bg-[--esap-primary-dark] transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                >
                  <Eye className="w-4 h-4" strokeWidth={2} />
                  Ver Detalles
                </button>
                {onExportEvent && (
                  <button
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExportEvent(event, 'excel');
                    }}
                    title="Exportar a Excel"
                  >
                    <FileDown className="w-4 h-4" strokeWidth={2} />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="px-6 py-5 border-t border-[--esap-gray-200] bg-[--esap-gray-50]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[--esap-gray-700]">
            Mostrando <span className="font-bold">{startIndex + 1}</span> a{' '}
            <span className="font-bold">{Math.min(endIndex, events.length)}</span> de{' '}
            <span className="font-bold">{events.length}</span> eventos
          </p>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2.5 border-2 border-[--esap-gray-400] bg-white text-[--esap-gray-700] rounded-lg font-semibold hover:bg-[--esap-gray-50] hover:border-[--esap-gray-500] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              Anterior
            </button>
            
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                const isActive = currentPage === pageNum;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold transition-all ${
                      isActive
                        ? 'text-white shadow-md scale-105'
                        : 'bg-white text-[--esap-gray-700] border-2 border-[--esap-gray-400] hover:bg-[--esap-gray-50] hover:border-[--esap-gray-500] hover:scale-105'
                    }`}
                    style={isActive ? {
                      background: 'linear-gradient(135deg, #1e5da8 0%, #2a6dbd 100%)',
                      boxShadow: '0 4px 6px -1px rgba(30, 93, 168, 0.3), 0 2px 4px -1px rgba(30, 93, 168, 0.2)'
                    } : undefined}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2.5 border-2 border-[--esap-gray-400] bg-white text-[--esap-gray-700] rounded-lg font-semibold hover:bg-[--esap-gray-50] hover:border-[--esap-gray-500] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
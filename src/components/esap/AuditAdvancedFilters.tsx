import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, X, Calendar, User, Activity, AlertCircle, CheckCircle, MapPin, ChevronDown } from 'lucide-react';

interface FilterOptions {
  dateRange: string;
  startDate: string;
  endDate: string;
  severities: string[];
  modules: string[];
  statuses: string[];
  userSearch: string;
  ipAddress: string;
}

interface AuditAdvancedFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  availableModules: string[];
  onClearFilters: () => void;
}

export function AuditAdvancedFilters({ 
  filters, 
  onFiltersChange, 
  availableModules,
  onClearFilters 
}: AuditAdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const dateRangeOptions = [
    { value: 'last1h', label: 'Última hora' },
    { value: 'last24h', label: 'Últimas 24 horas' },
    { value: 'last7d', label: 'Últimos 7 días' },
    { value: 'last30d', label: 'Últimos 30 días' },
    { value: 'last90d', label: 'Últimos 90 días' },
    { value: 'custom', label: 'Personalizado' }
  ];

  const severityOptions = [
    { value: 'critical', label: 'Crítico', color: '#DC2626' },
    { value: 'high', label: 'Alto', color: '#F59E0B' },
    { value: 'medium', label: 'Medio', color: '#3B82F6' },
    { value: 'low', label: 'Bajo', color: '#10B981' },
    { value: 'info', label: 'Info', color: '#6B7280' }
  ];

  const statusOptions = [
    { value: 'success', label: 'Éxito', icon: CheckCircle, color: '#10B981' },
    { value: 'failed', label: 'Fallo', icon: AlertCircle, color: '#DC2626' },
    { value: 'warning', label: 'Alerta', icon: AlertCircle, color: '#F59E0B' }
  ];

  const handleSeverityToggle = (severity: string) => {
    const newSeverities = filters.severities.includes(severity)
      ? filters.severities.filter(s => s !== severity)
      : [...filters.severities, severity];
    onFiltersChange({ ...filters, severities: newSeverities });
  };

  const handleModuleToggle = (module: string) => {
    const newModules = filters.modules.includes(module)
      ? filters.modules.filter(m => m !== module)
      : [...filters.modules, module];
    onFiltersChange({ ...filters, modules: newModules });
  };

  const handleStatusToggle = (status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const activeFiltersCount = 
    filters.severities.length + 
    filters.modules.length + 
    filters.statuses.length + 
    (filters.userSearch ? 1 : 0) + 
    (filters.ipAddress ? 1 : 0);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-3 flex-1"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-[#1e5da8] to-blue-600 rounded-xl flex items-center justify-center">
              <Filter className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                Filtros Avanzados
                {activeFiltersCount > 0 && (
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-600">
                {isExpanded ? 'Ocultar opciones' : 'Mostrar opciones de filtrado'}
              </p>
            </div>
          </button>
          
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={onClearFilters}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-semibold text-sm hover:bg-red-100 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Limpiar
              </motion.button>
            )}
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              animate={{ rotate: isExpanded ? 180 : 0 }}
              className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ChevronDown className="w-5 h-5 text-gray-600" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Filters Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-6 space-y-6">
              {/* Date Range */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                  <Calendar className="w-4 h-4 text-[#1e5da8]" />
                  Rango de Fechas
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {dateRangeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => onFiltersChange({ ...filters, dateRange: option.value })}
                      className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        filters.dateRange === option.value
                          ? 'bg-[#1e5da8] text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                
                {filters.dateRange === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3"
                  >
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                        Fecha Inicio
                      </label>
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:border-[#1e5da8] focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                        Fecha Fin
                      </label>
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:border-[#1e5da8] focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Severity Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                  <AlertCircle className="w-4 h-4 text-[#1e5da8]" />
                  Severidad
                </label>
                <div className="flex flex-wrap gap-2">
                  {severityOptions.map((option) => {
                    const isSelected = filters.severities.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleSeverityToggle(option.value)}
                        className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                          isSelected
                            ? 'ring-2 ring-offset-2'
                            : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: isSelected ? option.color : `${option.color}20`,
                          color: isSelected ? '#fff' : option.color,
                          ringColor: option.color
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modules Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                  <Activity className="w-4 h-4 text-[#1e5da8]" />
                  Módulos
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableModules.map((module) => {
                    const isSelected = filters.modules.includes(module);
                    return (
                      <button
                        key={module}
                        onClick={() => handleModuleToggle(module)}
                        className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                          isSelected
                            ? 'bg-[#1e5da8] text-white shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {module}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                  <CheckCircle className="w-4 h-4 text-[#1e5da8]" />
                  Estado
                </label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => {
                    const isSelected = filters.statuses.includes(option.value);
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleStatusToggle(option.value)}
                        className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'ring-2 ring-offset-2'
                            : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: isSelected ? option.color : `${option.color}20`,
                          color: isSelected ? '#fff' : option.color,
                          ringColor: option.color
                        }}
                      >
                        <Icon className="w-4 h-4" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
                    <User className="w-4 h-4 text-[#1e5da8]" />
                    Buscar Usuario
                  </label>
                  <input
                    type="text"
                    value={filters.userSearch}
                    onChange={(e) => onFiltersChange({ ...filters, userSearch: e.target.value })}
                    placeholder="Nombre o ID de usuario..."
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:border-[#1e5da8] focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
                    <MapPin className="w-4 h-4 text-[#1e5da8]" />
                    Dirección IP
                  </label>
                  <input
                    type="text"
                    value={filters.ipAddress}
                    onChange={(e) => onFiltersChange({ ...filters, ipAddress: e.target.value })}
                    placeholder="Ej: 192.168.1.1"
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:border-[#1e5da8] focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

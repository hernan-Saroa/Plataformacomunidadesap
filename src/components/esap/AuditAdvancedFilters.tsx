import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, Calendar, ChevronDown } from 'lucide-react';

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
  onFiltersChange
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
              </h3>
              <p className="text-sm text-gray-600">
                {isExpanded ? 'Ocultar opciones' : 'Mostrar opciones de filtrado'}
              </p>
            </div>
          </button>
          
          <div className="flex items-center gap-2">
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
            <div className="p-6">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

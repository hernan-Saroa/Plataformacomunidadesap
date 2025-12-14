import React, { useState } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';
import { toast } from 'sonner';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(value);

  const handleSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    
    if (range?.from && range?.to) {
      onChange?.(range);
      const fromStr = range.from.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
      const toStr = range.to.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
      toast.success('Rango de fechas aplicado', {
        description: `${fromStr} - ${toStr}`,
      });
      setOpen(false);
    } else if (range?.from) {
      onChange?.(range);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDateRange(undefined);
    onChange?.(undefined);
    toast.info('Filtro de fechas limpiado', {
      description: 'Mostrando todos los datos disponibles',
    });
  };

  const formatDateRange = () => {
    if (!dateRange?.from) return 'Seleccionar fechas';
    
    if (!dateRange.to) {
      return dateRange.from.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    
    if (dateRange.from.getTime() === dateRange.to.getTime()) {
      return dateRange.from.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    
    const fromStr = dateRange.from.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    const toStr = dateRange.to.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${fromStr} - ${toStr}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal group relative',
            !dateRange && 'text-gray-600',
            'hover:bg-gray-50 hover:border-[#1e5da8] transition-all',
            'h-9 px-3',
            className
          )}
        >
          <CalendarIcon className="w-4 h-4 mr-2 text-gray-600 group-hover:text-[#1e5da8] transition-colors" />
          <span className="text-sm font-medium truncate max-w-[150px]">
            {formatDateRange()}
          </span>
          {dateRange?.from && (
            <button
              onClick={handleClear}
              className="ml-2 p-0.5 rounded-sm hover:bg-gray-200 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end" side="bottom">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <h4 className="font-semibold text-sm text-gray-900">Seleccionar Rango de Fechas</h4>
            <p className="text-xs text-gray-600 mt-0.5">
              Filtra las métricas del dashboard por período personalizado
            </p>
          </div>

          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleSelect}
              numberOfMonths={2}
              className="rounded-md"
              disabled={(date) => date > new Date() || date < new Date('2020-01-01')}
            />
          </div>

          {/* Footer con acciones rápidas */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-xs font-semibold text-gray-700 mb-2">Accesos Rápidos:</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const today = new Date();
                  const sevenDaysAgo = new Date(today);
                  sevenDaysAgo.setDate(today.getDate() - 7);
                  handleSelect({ from: sevenDaysAgo, to: today });
                }}
                className="px-2 py-1 text-xs rounded-md bg-white border border-gray-300 hover:border-[#1e5da8] hover:bg-blue-50 transition-colors"
              >
                Últimos 7 días
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const thirtyDaysAgo = new Date(today);
                  thirtyDaysAgo.setDate(today.getDate() - 30);
                  handleSelect({ from: thirtyDaysAgo, to: today });
                }}
                className="px-2 py-1 text-xs rounded-md bg-white border border-gray-300 hover:border-[#1e5da8] hover:bg-blue-50 transition-colors"
              >
                Últimos 30 días
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const ninetyDaysAgo = new Date(today);
                  ninetyDaysAgo.setDate(today.getDate() - 90);
                  handleSelect({ from: ninetyDaysAgo, to: today });
                }}
                className="px-2 py-1 text-xs rounded-md bg-white border border-gray-300 hover:border-[#1e5da8] hover:bg-blue-50 transition-colors"
              >
                Últimos 90 días
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                  handleSelect({ from: firstDayOfMonth, to: today });
                }}
                className="px-2 py-1 text-xs rounded-md bg-white border border-gray-300 hover:border-[#1e5da8] hover:bg-blue-50 transition-colors"
              >
                Este mes
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
                  handleSelect({ from: firstDayOfYear, to: today });
                }}
                className="px-2 py-1 text-xs rounded-md bg-white border border-gray-300 hover:border-[#1e5da8] hover:bg-blue-50 transition-colors"
              >
                Este año
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

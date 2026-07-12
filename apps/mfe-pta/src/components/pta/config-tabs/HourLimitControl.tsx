import React from 'react';
import { ArrowRight, Clock3, Equal, Gauge } from 'lucide-react';

type HourLimitType = 'fija' | 'hasta' | 'intervalo';

interface HourLimitControlProps {
  type: string;
  hours: number | string | undefined;
  minHours?: number | string;
  onTypeChange: (type: HourLimitType) => void;
  onHoursChange: (hours: string) => void;
  onMinHoursChange?: (hours: string) => void;
  compact?: boolean;
}

const toneByType: Record<HourLimitType, string> = {
  fija: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  hasta: 'border-amber-200 bg-amber-50 text-amber-800',
  intervalo: 'border-blue-200 bg-blue-50 text-blue-800',
};

export function HourLimitControl({
  type,
  hours,
  minHours,
  onTypeChange,
  onHoursChange,
  onMinHoursChange,
  compact = false,
}: HourLimitControlProps) {
  const normalizedType: HourLimitType = type === 'fija' || type === 'intervalo' ? type : 'hasta';
  const isInterval = normalizedType === 'intervalo';

  return (
    <div className={`hour-limit-control flex shrink-0 items-center gap-2 rounded-xl border p-1.5 shadow-sm ${toneByType[normalizedType]}`}>
      <div className="relative">
        {!compact && <span className="mb-1 block px-1 text-[8px] font-black uppercase tracking-wider opacity-65">Tipo de límite</span>}
        <div className="flex items-center gap-1 rounded-lg border border-current/15 bg-white/85 px-2">
          {normalizedType === 'fija' ? <Equal className="h-3.5 w-3.5" /> : normalizedType === 'intervalo' ? <Gauge className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
          <select
            value={normalizedType}
            onChange={event => onTypeChange(event.target.value as HourLimitType)}
            className="h-8 min-w-[82px] cursor-pointer border-none bg-transparent px-0 text-[11px] font-black text-current shadow-none outline-none focus:ring-0"
            title="Tipo de reconocimiento de horas"
          >
            <option value="fija">Fija · exacta</option>
            <option value="hasta">Hasta · máximo</option>
            <option value="intervalo">Intervalo</option>
          </select>
        </div>
      </div>

      {isInterval ? (
        <div className="flex items-center gap-1">
          <label className="rounded-lg border border-blue-200 bg-white px-1.5 py-1 text-center shadow-sm">
            <span className="block text-[8px] font-black uppercase text-blue-500">Mín.</span>
            <input
              type="number"
              min={0}
              value={minHours ?? ''}
              onChange={event => onMinHoursChange?.(event.target.value)}
              className="h-5 w-12 border-none bg-transparent p-0 text-center text-xs font-black text-blue-800 shadow-none outline-none focus:ring-0"
            />
          </label>
          <ArrowRight className="h-3.5 w-3.5 text-blue-400" />
          <label className="rounded-lg border border-blue-200 bg-white px-1.5 py-1 text-center shadow-sm">
            <span className="block text-[8px] font-black uppercase text-blue-500">Máx.</span>
            <input
              type="number"
              min={0}
              value={hours ?? ''}
              onChange={event => onHoursChange(event.target.value)}
              className="h-5 w-12 border-none bg-transparent p-0 text-center text-xs font-black text-blue-800 shadow-none outline-none focus:ring-0"
            />
          </label>
        </div>
      ) : (
        <label className="rounded-lg border border-current/20 bg-white px-2 py-1 text-center shadow-sm">
          <span className="block text-[8px] font-black uppercase opacity-60">{normalizedType === 'fija' ? 'Horas exactas' : 'Máximo'}</span>
          <span className="flex items-center justify-center gap-1">
            <input
              type="number"
              min={0}
              value={hours ?? ''}
              onChange={event => onHoursChange(event.target.value)}
              className="h-5 w-12 border-none bg-transparent p-0 text-center text-xs font-black text-current shadow-none outline-none focus:ring-0"
            />
            <span className="text-[9px] font-black opacity-60">h</span>
          </span>
        </label>
      )}
    </div>
  );
}

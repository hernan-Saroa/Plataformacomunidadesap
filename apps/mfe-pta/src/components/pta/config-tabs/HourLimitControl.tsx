import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';

export type HourLimitType = 'sin_horas' | 'fija' | 'hasta' | 'intervalo' | 'porcentaje';

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
  sin_horas: 'border-slate-200 bg-slate-50 text-slate-600',
  fija: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  hasta: 'border-amber-200 bg-amber-50 text-amber-800',
  intervalo: 'border-blue-200 bg-blue-50 text-blue-800',
  porcentaje: 'border-violet-200 bg-violet-50 text-violet-800',
};

type LimitTypeOption = {
  value: HourLimitType;
  label: string;
  description: string;
  icon: string;
  iconClassName: string;
  activeClassName: string;
};

const limitTypeOptions: LimitTypeOption[] = [
  {
    value: 'sin_horas',
    label: 'Sin horas',
    description: 'Opción informativa: se puede elegir y suma 0h',
    icon: '—',
    iconClassName: 'border-slate-200 bg-slate-50 text-slate-500',
    activeClassName: 'border-slate-300 bg-slate-50',
  },
  {
    value: 'fija',
    label: 'Fija (exacta)',
    description: 'Reconoce exactamente las horas definidas',
    icon: '🟢',
    iconClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    activeClassName: 'border-emerald-200 bg-emerald-50/80',
  },
  {
    value: 'hasta',
    label: 'Hasta (máximo)',
    description: 'Permite registrar hasta el límite indicado',
    icon: '🕒',
    iconClassName: 'border-amber-200 bg-amber-50 text-amber-700',
    activeClassName: 'border-amber-200 bg-amber-50/80',
  },
  {
    value: 'intervalo',
    label: 'Intervalo (min—máx)',
    description: 'Define un valor mínimo y uno máximo',
    icon: '📊',
    iconClassName: 'border-blue-200 bg-blue-50 text-blue-700',
    activeClassName: 'border-blue-200 bg-blue-50/80',
  },
  {
    value: 'porcentaje',
    label: 'Porcentaje del PTA',
    description: 'Calcula las horas sobre el total programable',
    icon: '%',
    iconClassName: 'border-violet-200 bg-violet-50 text-violet-700',
    activeClassName: 'border-violet-200 bg-violet-50/80',
  },
];

function LimitTypeSelect({
  value,
  onChange,
}: {
  value: HourLimitType;
  onChange: (value: HourLimitType) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 224 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = limitTypeOptions.find(option => option.value === value) || limitTypeOptions[0];

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === 'undefined') return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.max(224, rect.width);
    const estimatedMenuHeight = 292;
    const viewportGap = 8;
    const showAbove = window.innerHeight - rect.bottom < estimatedMenuHeight && rect.top > estimatedMenuHeight;
    setPosition({
      top: showAbove ? Math.max(viewportGap, rect.top - estimatedMenuHeight - 6) : rect.bottom + 6,
      left: Math.min(Math.max(viewportGap, rect.left), Math.max(viewportGap, window.innerWidth - width - viewportGap)),
      width,
    });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        draggable={false}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Tipo de reconocimiento de horas"
        onPointerDown={event => event.stopPropagation()}
        onClick={() => {
          updatePosition();
          setOpen(current => !current);
        }}
        onKeyDown={event => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            updatePosition();
            setOpen(true);
          }
        }}
        className="flex h-8 min-w-[126px] items-center gap-2 rounded-lg border border-current/15 bg-white/90 px-2 text-left text-[11px] font-bold text-current shadow-sm outline-none transition-colors hover:bg-white focus:ring-2 focus:ring-current/15"
      >
        <span className="shrink-0 text-[13px] leading-none" aria-hidden="true">{selected.icon}</span>
        <span className="flex-1 whitespace-nowrap">{selected.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label="Tipo de límite de horas"
          className="fixed z-[10050] rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_14px_35px_rgba(15,23,42,0.2)]"
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          <div className="px-2 pb-1.5 pt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Forma de reconocimiento
          </div>
          <div className="space-y-1">
            {limitTypeOptions.map(option => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg border px-2 py-2 text-left transition-colors ${isSelected ? option.activeClassName : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[13px] ${option.iconClassName}`} aria-hidden="true">
                    {option.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold text-slate-700">{option.label}</span>
                    <span className="block truncate text-[9px] text-slate-400">{option.description}</span>
                  </span>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isSelected ? 'bg-[#003DA5] text-white' : 'text-transparent'}`}>
                    <Check className="h-3 w-3" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export function HourLimitControl({
  type,
  hours,
  minHours,
  onTypeChange,
  onHoursChange,
  onMinHoursChange,
  compact = false,
}: HourLimitControlProps) {
  const normalizedType: HourLimitType = type === 'sin_horas' || type === 'fija' || type === 'hasta' || type === 'intervalo' || type === 'porcentaje'
    ? type
    : 'hasta';
  const hasHours = normalizedType !== 'sin_horas';
  const isInterval = normalizedType === 'intervalo';
  const isPercentage = normalizedType === 'porcentaje';

  return (
    <div className={`hour-limit-control flex max-w-full shrink-0 flex-wrap items-center gap-2 rounded-xl border p-1.5 shadow-sm ${compact ? 'w-full sm:w-auto' : ''} ${toneByType[normalizedType]}`}>
      <div className="relative">
        {!compact && <span className="mb-1 block px-1 text-[8px] font-black uppercase tracking-wider opacity-65">Tipo de límite</span>}
        <LimitTypeSelect value={normalizedType} onChange={onTypeChange} />
      </div>

      {!hasHours && !compact ? (
        <div className="flex h-[42px] min-w-[92px] items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-center shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-wide text-slate-400">No suma horas</span>
        </div>
      ) : hasHours && isInterval ? (
        <div className="flex items-center gap-1">
          <label className="rounded-lg border border-blue-200 bg-white px-1.5 py-1 text-center shadow-sm">
            <span className="block text-[8px] font-black uppercase text-blue-500">Mín.</span>
            <input
              type="number"
              min={1}
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
              min={2}
              value={hours ?? ''}
              onChange={event => onHoursChange(event.target.value)}
              className="h-5 w-12 border-none bg-transparent p-0 text-center text-xs font-black text-blue-800 shadow-none outline-none focus:ring-0"
            />
          </label>
        </div>
      ) : hasHours ? (
        <label className="rounded-lg border border-current/20 bg-white px-2 py-1 text-center shadow-sm">
          <span className="block text-[8px] font-black uppercase opacity-60">
            {normalizedType === 'fija' ? 'Horas exactas' : isPercentage ? '% del PTA' : 'Máximo'}
          </span>
          <span className="flex items-center justify-center gap-1">
            <input
              type="number"
              min={1}
              max={isPercentage ? 100 : undefined}
              value={hours ?? ''}
              onChange={event => onHoursChange(event.target.value)}
              className="h-5 w-12 border-none bg-transparent p-0 text-center text-xs font-black text-current shadow-none outline-none focus:ring-0"
            />
            <span className="text-[9px] font-black opacity-60">{isPercentage ? '%' : 'h'}</span>
          </span>
        </label>
      ) : null}
    </div>
  );
}

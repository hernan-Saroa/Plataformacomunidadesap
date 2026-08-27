import React, { useEffect, useMemo, useRef } from 'react';
import { Columns3, Info, Lock, Plus, Tag, X } from 'lucide-react';

interface DetailColumnModalProps {
  open: boolean;
  value: string;
  existingColumns: string[];
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const suggestions = ['Línea', 'Subcomponente', 'Evidencia', 'Rol', 'Producto', 'Requisitos', 'Responsable', 'Observaciones'];

export function DetailColumnModal({
  open,
  value,
  existingColumns,
  onChange,
  onClose,
  onConfirm,
}: DetailColumnModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const normalized = value.trim().toLocaleLowerCase('es');
  const duplicate = useMemo(
    () => !!normalized && existingColumns.some(column => column.trim().toLocaleLowerCase('es') === normalized),
    [existingColumns, normalized],
  );
  const canConfirm = !!value.trim() && !duplicate;

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" />
      <div
        className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-column-modal-title"
      >
        <div className="flex shrink-0 items-start gap-3 bg-[#003DA5] px-5 py-4 text-white">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
            <Columns3 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 id="detail-column-modal-title" className="text-[15px] font-bold leading-5">
              Nueva columna
            </h3>
            <p className="mt-0.5 text-[11px] leading-4 text-blue-100">
              Añade un nivel de agrupación o un detalle a la tabla normativa.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-blue-100 transition-colors hover:bg-white/15 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className="flex gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#003DA5]" />
            <p className="text-[11px] leading-4 text-slate-700">
              <span className="font-bold text-[#003DA5]">El orden de la jerarquía es fijo.</span>{' '}
              La columna nueva se agrega al final como detalle del nivel anterior. Después de crearla puede renombrarse, pero no cambiarse de posición.
            </p>
          </div>

          {existingColumns.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600">Columnas actuales</span>
                <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400"><Lock className="h-3 w-3" /> Orden protegido</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                {existingColumns.map((column, index) => (
                  <div key={`${column}-${index}`} className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-600">
                    <Lock className="h-3 w-3 text-slate-400" />
                    <span className="flex h-4 min-w-4 items-center justify-center rounded bg-blue-50 px-1 text-[9px] font-bold text-[#003DA5]">{index + 1}</span>
                    {column}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="detail-column-name" className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600">
              Nombre de la nueva columna
            </label>
            <input
              id="detail-column-name"
              ref={inputRef}
              type="text"
              value={value}
              onChange={event => onChange(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && canConfirm) onConfirm();
                if (event.key === 'Escape') onClose();
              }}
              aria-invalid={duplicate}
              aria-describedby={duplicate ? 'detail-column-error' : undefined}
              placeholder="Ej. Evidencia, Línea, Rol o Producto"
              className={`h-11 w-full rounded-lg border bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-colors placeholder:font-normal placeholder:text-slate-400 ${duplicate ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100' : 'border-slate-300 hover:border-slate-400 focus:border-[#2962FF] focus:ring-2 focus:ring-blue-100'}`}
            />
            {duplicate && <p id="detail-column-error" className="mt-1.5 text-[11px] font-medium text-red-600">Esta columna ya existe. Usa otro nombre.</p>}
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600">Sugerencias rápidas</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map(suggestion => {
                const used = existingColumns.some(column => column.trim().toLocaleLowerCase('es') === suggestion.toLocaleLowerCase('es'));
                return (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={used}
                    onClick={() => onChange(suggestion)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${value === suggestion ? 'border-[#003DA5] bg-[#003DA5] text-white' : used ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-[#003DA5]'}`}
                  >
                    <Tag className="h-3 w-3" /> {suggestion}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={!canConfirm} className="flex h-9 items-center gap-2 rounded-lg bg-[#003DA5] px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#002D7A] disabled:cursor-not-allowed disabled:opacity-40">
            <Plus className="h-4 w-4" /> Crear columna
          </button>
        </div>
      </div>
    </div>
  );
}

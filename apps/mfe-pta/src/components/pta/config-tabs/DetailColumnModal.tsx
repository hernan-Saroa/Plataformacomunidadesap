import React, { useEffect, useMemo, useRef } from 'react';
import { Columns3, GripVertical, Info, Plus, Sparkles, Tag, X } from 'lucide-react';

interface DetailColumnModalProps {
  open: boolean;
  value: string;
  existingColumns: string[];
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const suggestions = ['Evidencia', 'Línea', 'Rol', 'Producto', 'Requisitos', 'Responsable', 'Definición', 'Observaciones'];

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
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]"
        onClick={event => event.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-[#003DA5] via-[#0758d7] to-[#5b21b6] px-6 py-5 text-white">
          <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-inner">
              <Columns3 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-base font-black">Nueva columna de detalle</h3>
                <Sparkles className="h-4 w-4 text-blue-100" />
              </div>
              <p className="text-xs leading-relaxed text-blue-100">
                Añade una dimensión a la tabla sin modificar las actividades ni los valores existentes.
              </p>
            </div>
            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-3.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <p className="text-[11px] leading-relaxed text-blue-900">
              <b>Actividad / Ítem ya está incluida.</b> Esta nueva columna se aplicará dinámicamente a todos los bloques. Después podrás arrastrarla para ubicarla en cualquier posición.
            </p>
          </div>

          {existingColumns.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Orden actual</span>
                <span className="text-[10px] text-slate-400">Arrastrable en el constructor</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                {existingColumns.map((column, index) => (
                  <div key={`${column}-${index}`} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-bold text-slate-600 shadow-sm">
                    <GripVertical className="h-3 w-3 text-slate-300" />
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-50 text-[9px] text-blue-700">{index + 1}</span>
                    {column}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-600">Nombre de la nueva columna</label>
            <div className={`rounded-2xl border-2 bg-slate-50 p-1.5 transition ${duplicate ? 'border-red-300 ring-4 ring-red-50' : 'border-slate-200 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100'}`}>
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={event => onChange(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && canConfirm) onConfirm();
                  if (event.key === 'Escape') onClose();
                }}
                placeholder="Ej. Evidencia, Línea, Rol o Producto"
                className="w-full border-none bg-transparent px-3 py-2 text-sm font-bold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
              />
            </div>
            {duplicate && <p className="mt-1.5 text-[11px] font-semibold text-red-600">Esta columna ya existe. Usa otro nombre.</p>}
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Sugerencias rápidas</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map(suggestion => {
                const used = existingColumns.some(column => column.trim().toLocaleLowerCase('es') === suggestion.toLocaleLowerCase('es'));
                return (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={used}
                    onClick={() => onChange(suggestion)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold transition ${value === suggestion ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-200' : used ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through' : 'border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm'}`}
                  >
                    <Tag className="h-3 w-3" /> {suggestion}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl px-5 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-200 hover:text-slate-700">Cancelar</button>
          <button type="button" onClick={onConfirm} disabled={!canConfirm} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#003DA5] to-[#0758d7] px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0">
            <Plus className="h-4 w-4" /> Crear columna
          </button>
        </div>
      </div>
    </div>
  );
}

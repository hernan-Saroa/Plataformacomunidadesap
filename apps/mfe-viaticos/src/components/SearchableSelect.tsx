import { useState, useRef, useEffect } from 'react';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface Props {
  options: SearchableSelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  emptyText?: string;
  id?: string;
  error?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccione...',
  disabled = false,
  loading = false,
  emptyText = 'Sin resultados',
  id,
  error,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find(
    (o) => o.value === value || (Boolean(value) && o.value?.trim().toLowerCase() === value?.trim().toLowerCase())
  );
  const displayLabel = selected ? selected.label : (value || placeholder);

  const filtered = options.filter((o) =>
    (o.label || '').toLowerCase().includes(query.toLowerCase()) ||
    (o.value || '').toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={`${inputCls} flex items-center justify-between ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'} ${error ? 'border-red-300 bg-red-50' : ''}`}
      >
        <span className={`truncate text-left ${selected || value ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
          {displayLabel}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {loading && (
            <div className="w-3 h-3 border-2 border-slate-300 border-t-[#003DA5] rounded-full animate-spin" />
          )}
          <ChevronIcon open={open} />
        </div>
      </button>

      {open && !disabled && !loading && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400">{emptyText}</div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(option.value); }} onClick={() => handleSelect(option.value)}
                  className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-blue-50 transition-colors ${option.value === value ? 'bg-blue-50 text-[#003DA5] font-bold' : 'text-slate-700'}`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {error && <p className="text-[9px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

const inputCls =
  'w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-[#003DA5] focus:bg-white transition-all shadow-xs';

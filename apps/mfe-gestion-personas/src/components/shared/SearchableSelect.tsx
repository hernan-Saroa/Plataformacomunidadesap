import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X, Loader2 } from 'lucide-react';

export interface SearchableSelectOption {
  value: string | number;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string | number | null;
  onChange: (value: any) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  emptyText?: string;
  id?: string;
  hasError?: boolean;
  error?: string;
  allowClear?: boolean;
  className?: string;
}

export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Seleccionar...',
  disabled = false,
  loading = false,
  emptyText = 'No se encontraron resultados',
  id,
  hasError = false,
  error,
  allowClear = false,
  className = '',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const validOptions = (options || []).filter((o) => o != null);

  const selectedOption = validOptions.find(
    (o) => String(o.value) === String(value)
  );

  const filteredOptions = validOptions.filter((o) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    const labelMatch = (o.label || '').toLowerCase().includes(q);
    const sublabelMatch = (o.sublabel || '').toLowerCase().includes(q);
    const valueMatch = String(o.value || '').toLowerCase().includes(q);
    return labelMatch || sublabelMatch || valueMatch;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
  };

  const baseInputClass = `w-full px-3 py-2 text-[13px] border rounded-xl outline-none transition-all shadow-sm flex items-center justify-between text-left ${
    hasError || error
      ? 'border-red-300 bg-red-50 focus:ring-red-100 text-red-900'
      : disabled
      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
      : open
      ? 'border-blue-500 bg-white ring-4 ring-blue-500/10'
      : 'border-gray-200 bg-gray-50 hover:bg-white text-gray-800 cursor-pointer'
  }`;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen(!open);
        }}
        className={baseInputClass}
      >
        <span className="truncate pr-2">
          {selectedOption ? (
            <span className="text-gray-900 font-medium">
              {selectedOption.label}
              {selectedOption.sublabel && (
                <span className="ml-1.5 text-xs text-gray-500 font-normal">
                  ({selectedOption.sublabel})
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </span>

        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {loading && <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />}
          {allowClear && selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
              open ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </div>
      </button>

      {open && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-gray-100 bg-gray-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Escribe para buscar..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-800"
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(opt.value);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-blue-50/80 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-[11px] text-gray-400 font-normal truncate">
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-red-500 mt-1 font-medium">{error}</p>}
    </div>
  );
}

export default SearchableSelect;

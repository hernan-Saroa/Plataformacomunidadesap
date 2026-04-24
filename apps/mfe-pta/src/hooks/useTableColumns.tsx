import React, { useState, useEffect, useRef } from 'react';
import { Columns3, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface ColumnDefinition {
  key: string;
  label: string;
  default?: boolean; // If true, it's visible by default
}

export function useTableColumns(storageKey: string, allColumns: ColumnDefinition[]) {
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`esap_cols_${storageKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return new Set(parsed);
        }
      }
    } catch (e) {
      console.warn('Error reading columns from localStorage', e);
    }
    // Default fallback
    return new Set(allColumns.filter(c => c.default !== false).map(c => c.key));
  });

  useEffect(() => {
    localStorage.setItem(`esap_cols_${storageKey}`, JSON.stringify(Array.from(visibleCols)));
  }, [visibleCols, storageKey]);

  return { visibleCols, setVisibleCols };
}

export function ColumnSelector({
  columns,
  visibleCols,
  setVisibleCols
}: {
  columns: ColumnDefinition[];
  visibleCols: Set<string>;
  setVisibleCols: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        // Also check if inside popover
        const popover = document.getElementById('esap-col-selector-popover');
        if (popover && popover.contains(e.target as Node)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        title="Configurar columnas"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid #E5E7EB',
          background: isOpen ? '#F3F4F6' : 'white',
          color: '#6B7280',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.2s',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}
        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = '#F9FAFB'; }}
        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'white'; }}
      >
        <Columns3 style={{ width: 14, height: 14 }} />
      </button>

      {isOpen && buttonRef.current && createPortal(
        <div
          id="esap-col-selector-popover"
          style={{
            position: 'absolute',
            top: buttonRef.current.getBoundingClientRect().bottom + 8,
            left: buttonRef.current.getBoundingClientRect().right - 200,
            width: 200,
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            border: '1px solid #E5E7EB',
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '12px', borderBottom: '1px solid #F3F4F6' }}>
            <h4 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#374151' }}>Columnas Visibles</h4>
            <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: '#9CA3AF' }}>Selecciona los datos a mostrar</p>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '6px' }}>
            {columns.map(col => {
              const active = visibleCols.has(col.key);
              return (
                <div
                  key={col.key}
                  onClick={() => {
                    setVisibleCols(prev => {
                      const next = new Set(prev);
                      if (next.has(col.key)) next.delete(col.key);
                      else next.add(col.key);
                      if (next.size === 0) return prev; // prevent hiding all
                      return next;
                    });
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', borderRadius: 6,
                    cursor: 'pointer', transition: 'background 0.15s',
                    background: 'transparent'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: '0.75rem', color: active ? '#111827' : '#6B7280', fontWeight: active ? 600 : 500 }}>
                    {col.label}
                  </span>
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: active ? 'none' : '1px solid #D1D5DB',
                    background: active ? '#003DA5' : 'white',
                    color: 'white'
                  }}>
                    {active && <Check style={{ width: 12, height: 12 }} />}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '8px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
            <button
              onClick={() => setVisibleCols(new Set(columns.filter(c => c.default !== false).map(c => c.key)))}
              style={{
                width: '100%', padding: '6px', borderRadius: 6, border: '1px solid #D1D5DB',
                background: 'white', color: '#6B7280', fontSize: '0.7rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              Restablecer
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

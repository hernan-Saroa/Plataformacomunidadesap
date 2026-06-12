/**
 * PTAWorldClassToolbar - Ultra-compact world-class toolbar
 * Integrates: Stats + Workflow Filters + Search + Actions
 * Design inspired by Linear, Notion, and Asana
 */

import React from 'react';
import { 
  Search, FileDown,
  SlidersHorizontal, Tag, Calendar, GraduationCap,
  FileText, Clock, CheckCircle, XCircle 
} from 'lucide-react';

interface PTAWorldClassToolbarProps {
  // Stats
  estadisticas: any;
  
  // Workflow filter
  filtroEstado: string;
  setFiltroEstado: (v: string) => void;
  ptas: any[];
  
  // Search & filters
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filtroPeriodo: string;
  setFiltroPeriodo: (v: string) => void;
  filtroPrograma: string;
  setFiltroPrograma: (v: string) => void;
  programas: any[];
  
  // View mode
  vistaActual: string;
  setVistaActual: (v: string) => void;
  
  // Actions
  exportAction?: React.ReactNode;
  /** Extra tool buttons (columns, grouping, activity, refresh) to embed in the toolbar row */
  additionalTools?: React.ReactNode;
}

const WORKFLOW_TABS = [
  { id: '', label: 'Todos', color: '#6B7280' },
  { id: 'borrador', label: 'Borradores', color: '#9CA3AF' },
  { id: 'pendientes', label: 'Aprobación', color: '#F59E0B' },
  { id: 'concertacion', label: 'Concertación', color: '#8B5CF6' },
  { id: 'aprobado', label: 'Aprobado', color: '#10B981' },
  { id: 'sna', label: 'SNA', color: '#EF4444' }, // Pestaña dedicada para SNA
];

export function PTAWorldClassToolbar({
  estadisticas,
  filtroEstado,
  setFiltroEstado,
  ptas,
  searchQuery,
  setSearchQuery,
  filtroPeriodo,
  setFiltroPeriodo,
  filtroPrograma,
  setFiltroPrograma,
  programas,
  vistaActual,
  setVistaActual,
  exportAction,
  additionalTools,
}: PTAWorldClassToolbarProps) {
  
  // Count PTAs per stage
  const stageCounts: Record<string, number> = { '': ptas.length };
  ptas.forEach(pta => {
    const estado = pta.estado || '';
    const E = estado.toUpperCase().replace(/\s+/g, '_'); // Normalizar espacios a guiones bajos para atrapar cualquier caso
    
    if (E === 'BORRADOR' || estado === 'Borrador') {
      stageCounts['borrador'] = (stageCounts['borrador'] || 0) + 1;
    } else if (['PENDIENTE_JEFATURA', 'PENDIENTE_DECANATURA', 'PENDIENTE_GESTIÓN_PROFESORAL', 'PENDIENTE_GESTION_PROFESORAL', 'CONCERTADO'].includes(E) || ['Pendiente Jefatura', 'Pendiente Decanatura', 'Pendiente Gestión Profesoral'].includes(estado)) {
      stageCounts['pendientes'] = (stageCounts['pendientes'] || 0) + 1;
    } else if (['EN_CONCERTACION', 'OBJETADO_DOCENTE', 'MODIFICADO_DOCENTE', 'DEVUELTO', 'PROPUESTO_POR_DIRECCION', 'NOTIFICADO_DOCENTE'].includes(E) || estado === 'Devuelto') {
      stageCounts['concertacion'] = (stageCounts['concertacion'] || 0) + 1;
    } else if (['ESCALADO_SNA'].includes(E) || estado === 'Escalado SNA') {
      stageCounts['sna'] = (stageCounts['sna'] || 0) + 1;
    } else if (['EN_FIRME', 'RADICADO', 'EN_EJECUCIÓN', 'EN_EJECUCION'].includes(E) || (pta.dias_en_proceso > 7 && E === 'APROBADO')) {
      stageCounts['SEGUIMIENTO'] = (stageCounts['SEGUIMIENTO'] || 0) + 1;
    } else if (E === 'APROBADO' || estado === 'Aprobado') {
      stageCounts['aprobado'] = (stageCounts['aprobado'] || 0) + 1;
    } else {
      stageCounts[estado] = (stageCounts[estado] || 0) + 1;
    }
  });

  // Deduplicate programs by ID - Fix for duplicate key warnings
  const uniqueProgramas = React.useMemo(() => {
    const seen = new Set();
    return programas.filter((p: any) => {
      if (seen.has(p.id)) {
        return false;
      }
      seen.add(p.id);
      return true;
    });
  }, [programas]);

  return (
    <div style={{
      background: 'white',
      borderBottom: '1px solid #E5E7EB',
      paddingBottom: 12,
    }}>
      {/* Row 1: Workflow Tabs & Actions - Responsive with scroll */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px 10px 16px',
        borderBottom: '1px solid #F3F4F6',
        gap: 8,
      }}>
        {/* Workflow Tabs — horizontal scroll on overflow */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          overflowX: 'auto',
          flex: 1,
          minWidth: 0,
          scrollbarWidth: 'none',       /* Firefox */
          msOverflowStyle: 'none',      /* IE */
        }}>
          {WORKFLOW_TABS.map(tab => {
            const count = stageCounts[tab.id] || 0;
            const isActive = filtroEstado === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setFiltroEstado(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 18,
                  border: '1px solid',
                  borderColor: isActive ? tab.color : 'transparent',
                  background: isActive ? `${tab.color}15` : 'transparent',
                  color: isActive ? tab.color : '#6B7280',
                  fontSize: '0.78rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#F3F4F6';
                    e.currentTarget.style.color = '#374151';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#6B7280';
                  }
                }}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span style={{
                    background: isActive ? tab.color : '#E5E7EB',
                    color: isActive ? 'white' : '#4B5563',
                    padding: '2px 6px',
                    borderRadius: 10,
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    minWidth: 16,
                    textAlign: 'center',
                    transition: 'all 0.2s',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        
        {/* View switcher, Tools & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {additionalTools && (
            <>
              {additionalTools}
            </>
          )}
          {exportAction && (
            <>
              {additionalTools && <div style={{ width: 1, height: 20, background: '#E5E7EB', margin: '0 2px' }} />}
              {exportAction}
            </>
          )}
        </div>
      </div>

      {/* Row 2: Search & Filters — wraps to next line on narrow screens */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        padding: '10px 16px',
      }}>
        {/* Search bar */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180, maxWidth: 400 }}>
          <Search style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 15,
            height: 15,
            color: '#9CA3AF',
            pointerEvents: 'none',
          }} />
          <input
            type="text"
            placeholder="Buscar por docente, territorial, programa..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px 7px 34px',
              border: '1px solid #E5E7EB',
              borderRadius: 6,
              fontSize: '0.82rem',
              color: '#1F2937',
              outline: 'none',
              transition: 'border-color 0.15s',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#3B82F6'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#E5E7EB'}
          />
        </div>

        {/* Periodo filter */}
        <div style={{ position: 'relative', flex: '0 1 auto', minWidth: 110 }}>
          <Calendar style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 13,
            height: 13,
            color: '#9CA3AF',
            pointerEvents: 'none',
            zIndex: 1,
          }} />
          <select
            value={filtroPeriodo}
            onChange={e => setFiltroPeriodo(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 28px 7px 32px',
              border: '1px solid #E5E7EB',
              borderRadius: 6,
              fontSize: '0.82rem',
              color: '#1F2937',
              background: 'white',
              cursor: 'pointer',
              outline: 'none',
              boxSizing: 'border-box',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none' as any,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
            }}
          >
            <option value="2026-1">2026-1</option>
            <option value="2026-2">2026-2</option>
            <option value="2025-2">2025-2</option>
          </select>
        </div>

        {/* Programa filter */}
        <div style={{ position: 'relative', flex: '0 1 auto', minWidth: 160 }}>
          <GraduationCap style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 13,
            height: 13,
            color: '#9CA3AF',
            pointerEvents: 'none',
            zIndex: 1,
          }} />
          <select
            value={filtroPrograma}
            onChange={e => setFiltroPrograma(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 28px 7px 32px',
              border: '1px solid #E5E7EB',
              borderRadius: 6,
              fontSize: '0.82rem',
              color: '#1F2937',
              background: 'white',
              cursor: 'pointer',
              outline: 'none',
              boxSizing: 'border-box',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none' as any,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
            }}
          >
            <option value="">Todos los programas</option>
            {uniqueProgramas.map((p: any) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}



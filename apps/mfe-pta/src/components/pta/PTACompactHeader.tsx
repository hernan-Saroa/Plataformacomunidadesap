/**
 * PTACompactHeader - World-class compact header for PTA module
 * Design inspired by Linear, Notion, and modern SaaS tools
 */

import React from 'react';
import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react';

interface PTACompactHeaderProps {
  estadisticas: any;
  filtroEstado: string;
  setFiltroEstado: (v: string) => void;
  ptas: any[];
}

const WORKFLOW_STAGES = [
  { id: 'PROPUESTO_POR_DIRECCION', label: 'Propuesta', color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'NOTIFICADO_DOCENTE', label: 'Revisión', color: '#F59E0B', bg: '#FEF3C7' },
  { id: 'EN_CONCERTACION', label: 'Concertación', color: '#8B5CF6', bg: '#F3E8FF' },
  { id: 'pendientes', label: 'Aprobación', color: '#10B981', bg: '#D1FAE5' },
  { id: 'Aprobado', label: 'Aprobado', color: '#059669', bg: '#D1FAE5' },
  { id: 'ESCALADO_SNA', label: 'SNA', color: '#EF4444', bg: '#FEE2E2' },
];

interface StatPillProps {
  icon: any;
  label: string;
  value: number;
  color: string;
  highlighted?: boolean;
}

function StatPill({ icon: Icon, label, value, color, highlighted = false }: StatPillProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: highlighted ? '4px 10px' : '4px 8px',
      borderRadius: 6,
      background: highlighted ? '#FEF3C7' : 'transparent',
      border: highlighted ? '1px solid #FDE68A' : 'none',
    }}>
      <Icon style={{ width: 14, height: 14, color, opacity: 0.7 }} />
      <span style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: 500 }}>
        {label}
      </span>
      <span style={{ 
        fontSize: '0.85rem', 
        fontWeight: 700, 
        color: highlighted ? '#D97706' : color,
      }}>
        {value}
      </span>
    </div>
  );
}

export function PTACompactHeader({ estadisticas, filtroEstado, setFiltroEstado, ptas }: PTACompactHeaderProps) {
  // Count PTAs per stage
  const stageCounts: Record<string, number> = {};
  ptas.forEach(pta => {
    const estado = pta.estado;
    if (estado === 'Pendiente Jefatura' || estado === 'Pendiente Decanatura' || estado === 'Pendiente Gestión Profesoral') {
      stageCounts['pendientes'] = (stageCounts['pendientes'] || 0) + 1;
    } else {
      stageCounts[estado] = (stageCounts[estado] || 0) + 1;
    }
  });

  return (
    <div style={{
      background: 'white',
      borderBottom: '1px solid #E5E7EB',
      padding: '14px 20px',
      marginBottom: 12,
    }}>
      {/* Top Row: Stats */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 16,
        marginBottom: 12,
      }}>
        {/* Quick Stats - Inline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <StatPill 
            icon={FileText} 
            label="Total" 
            value={estadisticas?.total || 0} 
            color="#6B7280"
          />
          <StatPill 
            icon={Clock} 
            label="Pendientes" 
            value={estadisticas?.pendientes || 0} 
            color="#F59E0B"
            highlighted={estadisticas?.pendientes > 0}
          />
          <StatPill 
            icon={CheckCircle} 
            label="Aprobados" 
            value={estadisticas?.aprobados || 0} 
            color="#10B981"
          />
          <StatPill 
            icon={XCircle} 
            label="Rechazados" 
            value={estadisticas?.rechazados || 0} 
            color="#EF4444"
          />
        </div>
      </div>

      {/* Bottom Row: Workflow Stages */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 6,
        overflowX: 'auto',
        paddingBottom: 2,
      }}>
        {/* All button */}
        <button
          onClick={() => setFiltroEstado('')}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: filtroEstado === '' ? '1.5px solid #3B82F6' : '1px solid #E5E7EB',
            background: filtroEstado === '' ? '#EFF6FF' : 'white',
            color: filtroEstado === '' ? '#3B82F6' : '#6B7280',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s',
          }}
        >
          Todos
        </button>

        {/* Stage buttons */}
        {WORKFLOW_STAGES.map(stage => {
          const count = stageCounts[stage.id] || 0;
          const isActive = filtroEstado === stage.id;

          return (
            <button
              key={stage.id}
              onClick={() => setFiltroEstado(isActive ? '' : stage.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: isActive ? `1.5px solid ${stage.color}` : '1px solid #E5E7EB',
                background: isActive ? stage.bg : 'white',
                color: isActive ? stage.color : '#6B7280',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              <span>{stage.label}</span>
              {count > 0 && (
                <span style={{
                  background: isActive ? stage.color : '#E5E7EB',
                  color: isActive ? 'white' : '#6B7280',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  minWidth: 18,
                  textAlign: 'center',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * PTAWorkflowPipeline — Barra de flujo interactiva world-class
 *
 * - Muestra el ciclo de vida completo del PTA con conteos en tiempo real
 * - Cada fase es clicable para filtrar la lista principal
 * - Diseño visual premium con animaciones suaves
 * - Responsive: scroll horizontal en mobile, compacto en desktop
 */

import { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  FileText, Bell, MessageSquare, CheckSquare,
  Award, Scale, X, ChevronRight,
} from 'lucide-react';

interface PipelineStage {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  estadosRelacionados: string[];
  phase: 'inicio' | 'revision' | 'concertacion' | 'aprobacion' | 'cierre' | 'sna';
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'propuesta',
    label: 'Propuesta',
    shortLabel: 'Prop.',
    description: 'Dirección propone al docente',
    icon: FileText,
    color: '#1E40AF',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    estadosRelacionados: ['PROPUESTO_POR_DIRECCION'],
    phase: 'inicio',
  },
  {
    id: 'revision',
    label: 'Rev. Docente',
    shortLabel: 'Revisión',
    description: 'Docente acepta, modifica u objeta',
    icon: Bell,
    color: '#92400E',
    bg: '#FEF3C7',
    border: '#FDE68A',
    estadosRelacionados: ['NOTIFICADO_DOCENTE', 'ACEPTADO_DOCENTE', 'MODIFICADO_DOCENTE', 'OBJETADO_DOCENTE'],
    phase: 'revision',
  },
  {
    id: 'concertacion',
    label: 'Concertación',
    shortLabel: 'Conc.',
    description: 'Negociación cuando hay objeciones',
    icon: MessageSquare,
    color: '#6B21A8',
    bg: '#F3E8FF',
    border: '#DDD6FE',
    estadosRelacionados: ['EN_CONCERTACION', 'CONCERTADO'],
    phase: 'concertacion',
  },
  {
    id: 'aprobacion',
    label: 'Aprobación',
    shortLabel: 'Aprob.',
    description: 'Jefatura → Decanatura → G. Profesoral',
    icon: CheckSquare,
    color: '#065F46',
    bg: '#D1FAE5',
    border: '#6EE7B7',
    estadosRelacionados: ['Pendiente Jefatura', 'Pendiente Decanatura', 'Pendiente Gestión Profesoral', 'Aprobado'],
    phase: 'aprobacion',
  },
  {
    id: 'firme',
    label: 'En Firme',
    shortLabel: 'Firme',
    description: 'Firmado digitalmente y radicado',
    icon: Award,
    color: '#FFFFFF',
    bg: '#047857',
    border: '#059669',
    estadosRelacionados: ['En Firme', 'Aprobado'],
    phase: 'cierre',
  },
];

interface PTAWorkflowPipelineProps {
  ptas: any[];
  estadisticas: any;
  filtroEstado: string;
  setFiltroEstado: (v: string) => void;
  loading?: boolean;
}

// Map individual estados to pipeline stage IDs
const ESTADO_TO_STAGE: Record<string, string> = {
  'PROPUESTO_POR_DIRECCION': 'propuesta',
  'NOTIFICADO_DOCENTE': 'revision',
  'ACEPTADO_DOCENTE': 'revision',
  'MODIFICADO_DOCENTE': 'revision',
  'OBJETADO_DOCENTE': 'revision',
  'EN_CONCERTACION': 'concertacion',
  'CONCERTADO': 'concertacion',
  'Pendiente Jefatura': 'aprobacion',
  'Pendiente Decanatura': 'aprobacion',
  'Pendiente Gestión Profesoral': 'aprobacion',
  'Aprobado': 'firme',
  'En Firme': 'firme',
  'ESCALADO_SNA': 'sna',
  'Rechazado': '__rechazado',
  'Devuelto': '__devuelto',
};

// Which estadosFiltro query string to send for each stage
const STAGE_FILTER_MAP: Record<string, string> = {
  propuesta: 'PROPUESTO_POR_DIRECCION',
  revision: 'NOTIFICADO_DOCENTE',
  concertacion: 'EN_CONCERTACION',
  aprobacion: 'pendientes',
  firme: 'Aprobado',
  sna: 'ESCALADO_SNA',
};

export function PTAWorkflowPipeline({
  ptas,
  estadisticas,
  filtroEstado,
  setFiltroEstado,
  loading = false,
}: PTAWorkflowPipelineProps) {

  // Count PTAs per stage
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ptas.forEach(pta => {
      const stageId = ESTADO_TO_STAGE[pta.estado] || 'other';
      counts[stageId] = (counts[stageId] || 0) + 1;
    });
    return counts;
  }, [ptas]);

  const snaCounts = stageCounts['sna'] || 0;

  // Determine current active stage based on filtroEstado
  const activeStageId = useMemo(() => {
    if (!filtroEstado) return null;
    // Find which stage this filter maps to
    for (const [stageId, filterVal] of Object.entries(STAGE_FILTER_MAP)) {
      if (filterVal === filtroEstado) return stageId;
    }
    // Direct estado match
    return ESTADO_TO_STAGE[filtroEstado] || null;
  }, [filtroEstado]);

  const handleStageClick = (stage: PipelineStage) => {
    const filterVal = STAGE_FILTER_MAP[stage.id];
    if (!filterVal) return;
    if (activeStageId === stage.id) {
      setFiltroEstado('');
    } else {
      setFiltroEstado(filterVal);
    }
  };

  const total = estadisticas?.total || ptas.length || 0;

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 10,
        border: '1px solid #E5E7EB',
        padding: '8px 12px',
        marginBottom: 8,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}
    >
      {/* Header - ULTRA COMPACT */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: '0.68rem', fontWeight: 800, color: '#003DA5',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            FLUJO PTA
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {activeStageId && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setFiltroEstado('')}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '2px 8px', borderRadius: 16,
                background: '#EFF6FF', border: '1px solid #BFDBFE',
                color: '#1E40AF', fontSize: '0.65rem', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              title="Limpiar filtro de fase"
            >
              <X style={{ width: 8, height: 8 }} />
              Ver todos
            </motion.button>
          )}
          <span style={{
            fontSize: '0.7rem', color: '#6B7280', fontWeight: 600,
          }}>
            {loading ? '...' : `${total}`}
          </span>
        </div>
      </div>

      {/* Pipeline stages */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        overflowX: 'auto', paddingBottom: 2,
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}>
        <style>{`
          .pta-pipeline-scroll::-webkit-scrollbar { display: none; }
          .pta-pipeline-stage {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .pta-pipeline-stage:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .pta-pipeline-stage.active {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0,61,165,0.2);
          }
        `}</style>

        {PIPELINE_STAGES.map((stage, i) => {
          const StageIcon = stage.icon;
          const count = stageCounts[stage.id] || 0;
          const isActive = activeStageId === stage.id;
          const isFireme = stage.id === 'firme';

          return (
            <button
              key={stage.id}
              className={`pta-pipeline-stage${isActive ? ' active' : ''}`}
              onClick={() => handleStageClick(stage)}
              title={`${stage.label}: ${stage.description}${count > 0 ? ` (${count} PTAs)` : ''}`}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                background: isActive ? stage.color : (isFireme ? stage.bg : stage.bg),
                border: isActive
                  ? `2px solid ${isFireme ? '#059669' : stage.color}`
                  : `1.5px solid ${stage.border}`,
                cursor: 'pointer',
                minWidth: 80,
                textAlign: 'center',
                position: 'relative',
                outline: 'none',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                justifyContent: 'center',
              }}
            >
              <StageIcon style={{
                width: 14, height: 14,
                color: isActive ? (isFireme ? '#047857' : 'white') : stage.color,
                flexShrink: 0,
              }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: isActive ? (isFireme ? '#047857' : 'white') : stage.color,
                  whiteSpace: 'nowrap',
                }}>
                  {stage.shortLabel}
                </span>
                {count > 0 && (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    color: isActive ? (isFireme ? '#047857' : 'rgba(255,255,255,0.8)') : stage.color,
                    opacity: isActive ? 0.9 : 0.7,
                  }}>
                    {count}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {/* SNA Branch */}
        <div style={{ height: 2, width: 16, background: '#FCA5A5', borderRadius: 1, marginLeft: 4 }} />
        <button
          onClick={() => {
            if (activeStageId === 'sna') setFiltroEstado('');
            else setFiltroEstado('ESCALADO_SNA');
          }}
          className={`pta-pipeline-stage${activeStageId === 'sna' ? ' active' : ''}`}
          style={{
            padding: '7px 12px', borderRadius: 8,
            background: activeStageId === 'sna' ? '#991B1B' : '#FEE2E2',
            border: `1.5px solid ${activeStageId === 'sna' ? '#991B1B' : '#FCA5A5'}`,
            cursor: 'pointer', minWidth: 72, textAlign: 'center',
            outline: 'none', position: 'relative',
            display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
            flexShrink: 0,
          }}
          title={`SNA: Arbitraje — Sistema Nacional de Acreditación${snaCounts > 0 ? ` (${snaCounts} PTAs)` : ''}`}
        >
          <Scale style={{
            width: 14, height: 14,
            color: activeStageId === 'sna' ? 'white' : '#991B1B',
            flexShrink: 0,
          }} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700,
              color: activeStageId === 'sna' ? 'white' : '#991B1B',
            }}>
              SNA
            </span>
            {snaCounts > 0 && (
              <span style={{
                fontSize: '0.65rem', fontWeight: 800,
                color: activeStageId === 'sna' ? 'rgba(255,255,255,0.8)' : '#991B1B',
                opacity: activeStageId === 'sna' ? 0.9 : 0.7,
              }}>
                {snaCounts}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Quick stats row below pipeline - HIDDEN for compactness */}
      {false && estadisticas && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          marginTop: 10, paddingTop: 10,
          borderTop: '1px solid #F3F4F6',
          flexWrap: 'wrap',
        }}>
          {[
            { label: 'Pendientes de acción', value: estadisticas.pendientes || 0, color: '#D97706', urgent: true },
            { label: 'En Concertación', value: estadisticas.enConcertacion || 0, color: '#7C3AED', urgent: false },
            { label: 'Aprobados', value: estadisticas.aprobados || 0, color: '#059669', urgent: false },
            { label: 'Rechazados', value: estadisticas.rechazados || 0, color: '#DC2626', urgent: false },
            { label: '% Avance', value: `${estadisticas.porcentajeAvance || 0}%`, color: '#0891B2', urgent: false },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {item.urgent && item.value > 0 && (
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: item.color,
                  animation: 'pta-pulse 2s ease-in-out infinite',
                }} />
              )}
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: item.color }}>
                {item.value}
              </span>
              <span style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>
                {item.label}
              </span>
            </div>
          ))}
          <style>{`
            @keyframes pta-pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.5; transform: scale(1.3); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
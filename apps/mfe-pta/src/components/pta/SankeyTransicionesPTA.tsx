/**
 * SankeyTransicionesPTA — Diagrama Sankey interactivo de transiciones PTA
 *
 * Visualiza el flujo de PTAs entre los 18 estados con:
 * - Diagrama Sankey con ancho proporcional al volumen de transiciones
 * - Colores por fase (Creación, Bidireccional, Concertación, Aprobación, Final)
 * - Tooltips interactivos en cada flujo
 * - Modo chord (circular) alternativo
 * - Resumen de métricas principales
 * - Responsivo con scroll horizontal en móvil
 *
 * Se integra como pestaña adicional en WorkflowVisualizerPTA.
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity, ArrowRight, BarChart3, Eye, Filter,
  Loader2, RefreshCw, Target, TrendingUp, Zap,
  GitBranch, Maximize2, Minimize2,
} from 'lucide-react';
import { getPtaStatusVisual } from './shared/ptaStatusVisuals';

// ═══ Types ══════════════════════════════════════════════════════════

interface TransitionData {
  from: string;
  to: string;
  count: number;
}

interface SankeyNode {
  id: string;
  label: string;
  color: string;
  bg: string;
  fase: string;
  x: number;
  y: number;
  height: number;
  totalIn: number;
  totalOut: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  sourceY: number;
  targetY: number;
  thickness: number;
  color: string;
}

interface SankeyTransicionesPTAProps {
  transiciones: Record<string, number>;
  conteoEstados: Record<string, number>;
  periodo: string;
  onRefresh?: () => void;
  loading?: boolean;
}

// ═══ State Config ═══════════════════════════════════════════════════

const FASES_ORDEN: Record<string, number> = {
  'Creacion': 0,
  'Bidireccional': 1,
  'Concertacion': 2,
  'Arbitraje': 2,
  'Aprobacion': 3,
  'Final': 4,
  'Excepcional': 4,
};

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; fase: string }> = {
  'Borrador':                     { label: 'Borrador',            color: '#6B7280', bg: '#F3F4F6', fase: 'Creacion' },
  'PROPUESTO_POR_DIRECCION':      { label: 'Propuesto Dir.',      color: '#1E40AF', bg: '#EFF6FF', fase: 'Bidireccional' },
  'NOTIFICADO_DOCENTE':           { label: 'Notificado',          color: '#92400E', bg: '#FEF3C7', fase: 'Bidireccional' },
  'ACEPTADO_DOCENTE':             { label: 'Aceptado Doc.',       color: '#065F46', bg: '#D1FAE5', fase: 'Bidireccional' },
  'MODIFICADO_DOCENTE':           { label: 'Modificado Doc.',     color: '#1E40AF', bg: '#DBEAFE', fase: 'Bidireccional' },
  'OBJETADO_DOCENTE':             { label: 'Objetado Doc.',       color: '#991B1B', bg: '#FEE2E2', fase: 'Bidireccional' },
  'EN_CONCERTACION':              { label: 'En Concertación',     color: '#6B21A8', bg: '#F3E8FF', fase: 'Concertacion' },
  'CONCERTADO':                   { label: 'Concertado',          color: '#065F46', bg: '#D1FAE5', fase: 'Concertacion' },
  'ESCALADO_SNA':                 { label: 'Escalado SNA',        color: '#991B1B', bg: '#FEF2F2', fase: 'Arbitraje' },
  'RESUELTO_SNA':                 { label: 'Resuelto SNA',        color: '#065F46', bg: '#D1FAE5', fase: 'Arbitraje' },
  'AJUSTE_REQUERIDO':             { label: 'Ajuste Requerido',    color: '#9A3412', bg: '#FFF7ED', fase: 'Excepcional' },
  'Pendiente Jefatura':           { label: 'Pend. Jefatura',      color: '#92400E', bg: '#FEF3C7', fase: 'Aprobacion' },
  'Pendiente Decanatura':         { label: 'Pend. Decanatura',    color: '#1E40AF', bg: '#DBEAFE', fase: 'Aprobacion' },
  'Pendiente Gestión Profesoral': { label: 'Pend. G. Profesoral', color: '#3730A3', bg: '#E0E7FF', fase: 'Aprobacion' },
  'Aprobado':                     { label: 'Aprobado',            color: '#065F46', bg: '#D1FAE5', fase: 'Final' },
  'En Firme':                     { label: 'En Firme',            color: '#0F766E', bg: '#F0FDFA', fase: 'Final' },
  'RADICADO':                     { label: 'Radicado',            color: '#1E3A8A', bg: '#DBEAFE', fase: 'Final' },
  'EN_EJECUCION':                 { label: 'En Ejecucion',        color: '#0E7490', bg: '#ECFEFF', fase: 'Final' },
  'Finalizado':                   { label: 'Finalizado',          color: '#5B21B6', bg: '#EDE9FE', fase: 'Final' },
  'Terminado':                    { label: 'Terminado',           color: '#334155', bg: '#E2E8F0', fase: 'Final' },
  'Rechazado':                    { label: 'Rechazado',           color: '#991B1B', bg: '#FEE2E2', fase: 'Final' },
  'Devuelto':                     { label: 'Devuelto',            color: '#9A3412', bg: '#FFF7ED', fase: 'Excepcional' },
  'CERRADO_INACTIVIDAD':          { label: 'Cerrado',             color: '#6B7280', bg: '#F3F4F6', fase: 'Final' },
  'ANULADO':                      { label: 'Anulado',             color: '#6B7280', bg: '#F3F4F6', fase: 'Final' },
};

const FASE_COLORS: Record<string, string> = {
  'Creacion': '#6B7280',
  'Bidireccional': '#1E40AF',
  'Concertacion': '#7C3AED',
  'Arbitraje': '#DC2626',
  'Aprobacion': '#D97706',
  'Final': '#059669',
  'Excepcional': '#9A3412',
};

const getCfg = (e: string) => {
  const visual = getPtaStatusVisual(e);
  const configured = ESTADO_CONFIG[e];
  return {
    ...visual,
    label: configured?.label || visual.label,
    fase: configured?.fase || 'Otro',
  };
};

// ═══ Sankey Computation ═════════════════════════════════════════════

function computeSankey(
  transitions: TransitionData[],
  canvasWidth: number,
  canvasHeight: number,
): { nodes: SankeyNode[]; links: SankeyLink[] } {
  if (transitions.length === 0) return { nodes: [], links: [] };

  // Collect unique states
  const stateSet = new Set<string>();
  transitions.forEach(t => { stateSet.add(t.from); stateSet.add(t.to); });
  const states = Array.from(stateSet).sort((a, b) => {
    const fa = FASES_ORDEN[getCfg(a).fase] ?? 5;
    const fb = FASES_ORDEN[getCfg(b).fase] ?? 5;
    return fa - fb;
  });

  // Group by fase columns
  const faseGroups: Record<string, string[]> = {};
  states.forEach(s => {
    const fase = getCfg(s).fase;
    if (!faseGroups[fase]) faseGroups[fase] = [];
    faseGroups[fase].push(s);
  });

  const columnKeys = Object.keys(faseGroups).sort((a, b) => (FASES_ORDEN[a] ?? 5) - (FASES_ORDEN[b] ?? 5));
  const nodeWidth = 24;
  const columnPadding = 60;
  const availableWidth = canvasWidth - columnPadding * 2;
  const colSpacing = columnKeys.length > 1 ? availableWidth / (columnKeys.length - 1) : 0;

  // Compute totals per node
  const nodeIn: Record<string, number> = {};
  const nodeOut: Record<string, number> = {};
  transitions.forEach(t => {
    nodeOut[t.from] = (nodeOut[t.from] || 0) + t.count;
    nodeIn[t.to] = (nodeIn[t.to] || 0) + t.count;
  });

  const maxNodeValue = Math.max(...states.map(s => Math.max(nodeIn[s] || 0, nodeOut[s] || 0, 1)));
  const minNodeH = 18;
  const maxNodeH = canvasHeight * 0.25;

  // Build nodes
  const nodes: SankeyNode[] = [];
  const nodeMap: Record<string, SankeyNode> = {};

  columnKeys.forEach((fase, colIdx) => {
    const statesInCol = faseGroups[fase];
    const x = columnPadding + colIdx * colSpacing;

    const totalHeight = statesInCol.reduce((sum, s) => {
      const val = Math.max(nodeIn[s] || 0, nodeOut[s] || 0, 1);
      return sum + Math.max(minNodeH, (val / maxNodeValue) * maxNodeH);
    }, 0);
    const gap = statesInCol.length > 1 ? Math.min(20, (canvasHeight - totalHeight) / (statesInCol.length + 1)) : 0;
    let currentY = Math.max(20, (canvasHeight - totalHeight - gap * (statesInCol.length - 1)) / 2);

    statesInCol.forEach(s => {
      const cfg = getCfg(s);
      const val = Math.max(nodeIn[s] || 0, nodeOut[s] || 0, 1);
      const h = Math.max(minNodeH, (val / maxNodeValue) * maxNodeH);
      const node: SankeyNode = {
        id: s, label: cfg.label, color: cfg.color, bg: cfg.bg,
        fase: cfg.fase, x, y: currentY, height: h,
        totalIn: nodeIn[s] || 0, totalOut: nodeOut[s] || 0,
      };
      nodes.push(node);
      nodeMap[s] = node;
      currentY += h + gap;
    });
  });

  // Build links with Y positioning
  const sourceOffsets: Record<string, number> = {};
  const targetOffsets: Record<string, number> = {};
  nodes.forEach(n => { sourceOffsets[n.id] = n.y; targetOffsets[n.id] = n.y; });

  const maxTransCount = Math.max(...transitions.map(t => t.count), 1);
  const links: SankeyLink[] = transitions
    .sort((a, b) => b.count - a.count)
    .map(t => {
      const src = nodeMap[t.from];
      const tgt = nodeMap[t.to];
      if (!src || !tgt) return null;

      const thickness = Math.max(2, (t.count / maxTransCount) * 30);
      const srcY = sourceOffsets[t.from] + thickness / 2;
      const tgtY = targetOffsets[t.to] + thickness / 2;
      sourceOffsets[t.from] += thickness + 2;
      targetOffsets[t.to] += thickness + 2;

      const faseColor = FASE_COLORS[src.fase] || '#6B7280';

      return {
        source: t.from,
        target: t.to,
        value: t.count,
        sourceY: srcY,
        targetY: tgtY,
        thickness,
        color: faseColor,
      } as SankeyLink;
    })
    .filter(Boolean) as SankeyLink[];

  return { nodes, links };
}

// ═══ Component ══════════════════════════════════════════════════════

export function SankeyTransicionesPTA({
  transiciones, conteoEstados, periodo, onRefresh, loading,
}: SankeyTransicionesPTAProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const [viewMode, setViewMode] = useState<'sankey' | 'chord'>('sankey');
  const [expanded, setExpanded] = useState(false);

  // Parse transitions
  const transitionData = useMemo((): TransitionData[] => {
    return Object.entries(transiciones)
      .map(([key, count]) => {
        const parts = key.split('→').map(s => s.trim());
        if (parts.length !== 2) return null;
        return { from: parts[0], to: parts[1], count } as TransitionData;
      })
      .filter(Boolean) as TransitionData[];
  }, [transiciones]);

  const canvasW = expanded ? 1000 : 750;
  const canvasH = expanded ? 600 : 420;

  const { nodes, links } = useMemo(
    () => computeSankey(transitionData, canvasW, canvasH),
    [transitionData, canvasW, canvasH],
  );

  // Stats
  const stats = useMemo(() => {
    const totalTransitions = transitionData.reduce((s, t) => s + t.count, 0);
    const uniqueStates = new Set([...transitionData.map(t => t.from), ...transitionData.map(t => t.to)]).size;
    const topTransition = transitionData.sort((a, b) => b.count - a.count)[0];
    return { totalTransitions, uniqueStates, topTransition };
  }, [transitionData]);

  const handleLinkHover = useCallback((link: SankeyLink | null, e?: React.MouseEvent) => {
    if (link && e) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top - 50,
          content: `${getCfg(link.source).label} → ${getCfg(link.target).label}: ${link.value} PTAs`,
        });
      }
      setHoveredLink(`${link.source}-${link.target}`);
    } else {
      setTooltip(null);
      setHoveredLink(null);
    }
  }, []);

  // Generate SVG path for curved link
  const getLinkPath = (link: SankeyLink): string => {
    const srcNode = nodes.find(n => n.id === link.source);
    const tgtNode = nodes.find(n => n.id === link.target);
    if (!srcNode || !tgtNode) return '';

    const x0 = srcNode.x + 24;
    const x1 = tgtNode.x;
    const midX = (x0 + x1) / 2;

    return `M ${x0} ${link.sourceY}
            C ${midX} ${link.sourceY}, ${midX} ${link.targetY}, ${x1} ${link.targetY}`;
  };

  if (transitionData.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '50px 20px',
        background: '#F9FAFB', borderRadius: 14, border: '1px solid #E5E7EB',
      }}>
        <GitBranch style={{ width: 36, height: 36, color: '#D1D5DB', margin: '0 auto 10px' }} />
        <p style={{ fontSize: '0.9rem', color: '#6B7280', fontWeight: 600 }}>
          Sin datos de transiciones disponibles
        </p>
        <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>
          Las transiciones se generan cuando los PTAs cambian de estado
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 14, flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Activity style={{ width: 18, height: 18, color: 'white' }} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              Diagrama de Flujo de Transiciones
            </h4>
            <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: '1px 0 0' }}>
              {stats.totalTransitions} transiciones • {stats.uniqueStates} estados • {periodo}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setViewMode(viewMode === 'sankey' ? 'chord' : 'sankey')}
            style={{
              padding: '5px 12px', borderRadius: 7, border: '1px solid #E5E7EB',
              background: 'white', color: '#6B7280', fontSize: '0.72rem',
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <GitBranch style={{ width: 12, height: 12 }} />
            {viewMode === 'sankey' ? 'Chord' : 'Sankey'}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: '5px 10px', borderRadius: 7, border: '1px solid #E5E7EB',
              background: 'white', color: '#6B7280', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}
          >
            {expanded ? <Minimize2 style={{ width: 14, height: 14 }} /> : <Maximize2 style={{ width: 14, height: 14 }} />}
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              style={{
                padding: '5px 10px', borderRadius: 7, border: '1px solid #E5E7EB',
                background: 'white', color: '#6B7280', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
                opacity: loading ? 0.5 : 1,
              }}
            >
              <RefreshCw style={{ width: 14, height: 14, animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 8, marginBottom: 14,
      }}>
        {[
          { label: 'Total transiciones', value: stats.totalTransitions, icon: ArrowRight, color: '#7C3AED' },
          { label: 'Estados activos', value: stats.uniqueStates, icon: Target, color: '#003DA5' },
          { label: 'Flujo principal', value: stats.topTransition ? `${getCfg(stats.topTransition.from).label} → ${getCfg(stats.topTransition.to).label}` : '—', icon: TrendingUp, color: '#059669' },
          { label: 'Mayor volumen', value: stats.topTransition?.count || 0, icon: Zap, color: '#D97706' },
        ].map((kpi, i) => (
          <div key={kpi.label} style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'white', border: '1px solid #F3F4F6',
          }}>
            <kpi.icon style={{ width: 14, height: 14, color: kpi.color, marginBottom: 4 }} />
            <div style={{ fontSize: typeof kpi.value === 'number' ? '1.2rem' : '0.72rem', fontWeight: 800, color: '#111827' }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '0.62rem', color: '#9CA3AF', fontWeight: 500 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Sankey / Chord Canvas */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          background: 'white', borderRadius: 14, border: '1px solid #E5E7EB',
          padding: 16, overflowX: 'auto',
        }}
      >
        {viewMode === 'sankey' ? (
          <svg
            ref={svgRef}
            width={canvasW}
            height={canvasH}
            viewBox={`0 0 ${canvasW} ${canvasH}`}
            style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}
          >
            {/* Links */}
            {links.map((link, i) => {
              const id = `${link.source}-${link.target}`;
              const isHovered = hoveredLink === id;
              const isNodeHovered = hoveredNode === link.source || hoveredNode === link.target;
              const dimmed = (hoveredLink && !isHovered) || (hoveredNode && !isNodeHovered);

              return (
                <path
                  key={i}
                  d={getLinkPath(link)}
                  fill="none"
                  stroke={link.color}
                  strokeWidth={link.thickness}
                  strokeOpacity={dimmed ? 0.08 : isHovered ? 0.6 : 0.2}
                  style={{ transition: 'stroke-opacity 0.2s, stroke-width 0.2s', cursor: 'pointer' }}
                  onMouseEnter={(e) => handleLinkHover(link, e)}
                  onMouseMove={(e) => handleLinkHover(link, e)}
                  onMouseLeave={() => handleLinkHover(null)}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const isHovered = hoveredNode === node.id;
              const connectedToHoveredLink = hoveredLink
                ? links.some(l => (l.source === node.id || l.target === node.id) &&
                    `${l.source}-${l.target}` === hoveredLink)
                : false;

              return (
                <g
                  key={node.id}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={node.x}
                    y={node.y}
                    width={24}
                    height={node.height}
                    rx={4}
                    fill={isHovered || connectedToHoveredLink ? node.color : node.bg}
                    stroke={node.color}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    style={{ transition: 'all 0.2s' }}
                  />
                  <text
                    x={node.x + 30}
                    y={node.y + node.height / 2}
                    dominantBaseline="middle"
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: isHovered ? 700 : 500,
                      fill: isHovered ? node.color : '#374151',
                    }}
                  >
                    {node.label}
                  </text>
                  {(isHovered || node.totalOut > 0 || node.totalIn > 0) && (
                    <text
                      x={node.x + 30}
                      y={node.y + node.height / 2 + 11}
                      dominantBaseline="middle"
                      style={{ fontSize: '0.5rem', fill: '#9CA3AF' }}
                    >
                      {node.totalIn > 0 ? `↓${node.totalIn}` : ''}{node.totalIn > 0 && node.totalOut > 0 ? ' ' : ''}{node.totalOut > 0 ? `↑${node.totalOut}` : ''}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        ) : (
          /* Chord-style radial view */
          <ChordView transitions={transitionData} canvasSize={Math.min(canvasW, canvasH)} />
        )}

        {/* Tooltip */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                left: tooltip.x, top: tooltip.y,
                padding: '6px 12px', borderRadius: 8,
                background: '#111827', color: 'white',
                fontSize: '0.75rem', fontWeight: 600,
                pointerEvents: 'none', whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                zIndex: 10, transform: 'translateX(-50%)',
              }}
            >
              {tooltip.content}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10,
        marginTop: 12, justifyContent: 'center',
      }}>
        {Object.entries(FASE_COLORS).map(([fase, color]) => (
          <div key={fase} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', color: '#6B7280' }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
            {fase}
          </div>
        ))}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ═══ Chord View ═════════════════════════════════════════════════════

function ChordView({ transitions, canvasSize }: { transitions: TransitionData[]; canvasSize: number }) {
  const states = useMemo(() => {
    const set = new Set<string>();
    transitions.forEach(t => { set.add(t.from); set.add(t.to); });
    return Array.from(set).sort((a, b) => {
      const fa = FASES_ORDEN[getCfg(a).fase] ?? 5;
      const fb = FASES_ORDEN[getCfg(b).fase] ?? 5;
      return fa - fb;
    });
  }, [transitions]);

  const [hoveredArc, setHoveredArc] = useState<string | null>(null);

  const size = Math.min(canvasSize, 400);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const arcWidth = 14;

  const anglePerState = (2 * Math.PI) / states.length;
  const gapAngle = 0.04;

  // State positions
  const stateAngles = states.map((s, i) => ({
    id: s,
    startAngle: i * anglePerState + gapAngle / 2,
    endAngle: (i + 1) * anglePerState - gapAngle / 2,
    midAngle: (i + 0.5) * anglePerState,
  }));

  const stateAngleMap = Object.fromEntries(stateAngles.map(s => [s.id, s]));
  const maxTransition = Math.max(...transitions.map(t => t.count), 1);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto' }}>
      {/* Arcs */}
      {stateAngles.map(arc => {
        const cfg = getCfg(arc.id);
        const isHovered = hoveredArc === arc.id;
        const r = radius;
        const x1 = cx + r * Math.cos(arc.startAngle - Math.PI / 2);
        const y1 = cy + r * Math.sin(arc.startAngle - Math.PI / 2);
        const x2 = cx + r * Math.cos(arc.endAngle - Math.PI / 2);
        const y2 = cy + r * Math.sin(arc.endAngle - Math.PI / 2);
        const largeArc = arc.endAngle - arc.startAngle > Math.PI ? 1 : 0;

        return (
          <g key={arc.id}
            onMouseEnter={() => setHoveredArc(arc.id)}
            onMouseLeave={() => setHoveredArc(null)}
            style={{ cursor: 'pointer' }}
          >
            <path
              d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
              fill="none"
              stroke={cfg.color}
              strokeWidth={isHovered ? arcWidth + 4 : arcWidth}
              strokeLinecap="round"
              opacity={hoveredArc && !isHovered ? 0.3 : 1}
              style={{ transition: 'all 0.15s' }}
            />
            {/* Label */}
            <text
              x={cx + (r + 26) * Math.cos(arc.midAngle - Math.PI / 2)}
              y={cy + (r + 26) * Math.sin(arc.midAngle - Math.PI / 2)}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: '0.52rem',
                fontWeight: isHovered ? 700 : 500,
                fill: isHovered ? cfg.color : '#6B7280',
              }}
              transform={`rotate(${
                (arc.midAngle * 180 / Math.PI)
              }, ${cx + (r + 26) * Math.cos(arc.midAngle - Math.PI / 2)}, ${cy + (r + 26) * Math.sin(arc.midAngle - Math.PI / 2)})`}
            >
              {cfg.label}
            </text>
          </g>
        );
      })}

      {/* Chords */}
      {transitions.map((t, i) => {
        const src = stateAngleMap[t.from];
        const tgt = stateAngleMap[t.to];
        if (!src || !tgt) return null;

        const srcCfg = getCfg(t.from);
        const thickness = Math.max(1, (t.count / maxTransition) * 6);
        const isConnected = hoveredArc === t.from || hoveredArc === t.to;
        const dimmed = hoveredArc && !isConnected;

        const x1 = cx + (radius - arcWidth) * Math.cos(src.midAngle - Math.PI / 2);
        const y1 = cy + (radius - arcWidth) * Math.sin(src.midAngle - Math.PI / 2);
        const x2 = cx + (radius - arcWidth) * Math.cos(tgt.midAngle - Math.PI / 2);
        const y2 = cy + (radius - arcWidth) * Math.sin(tgt.midAngle - Math.PI / 2);

        return (
          <path
            key={i}
            d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
            fill="none"
            stroke={srcCfg.color}
            strokeWidth={thickness}
            opacity={dimmed ? 0.04 : isConnected ? 0.5 : 0.15}
            style={{ transition: 'opacity 0.15s' }}
          />
        );
      })}
    </svg>
  );
}

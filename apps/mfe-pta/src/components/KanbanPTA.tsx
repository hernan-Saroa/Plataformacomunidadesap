/**
 * KanbanPTA — Tablero Kanban visual world-class para gestión de PTAs por estado
 *
 * Funcionalidades:
 * - Columnas por estado del flujo PTA (18 estados agrupados en fases)
 * - Tarjetas de PTA con datos clave (docente, dedicación, % carga, territorial)
 * - Drag & Drop (mouse + touch/pointer events para móvil) entre columnas
 * - Contador por columna con código de color y WIP limit
 * - Filtro por territorial, programa, dedicación
 * - Búsqueda rápida de docentes
 * - Indicadores de tiempo en estado actual con semáforo visual
 * - Vista compacta y expandida
 * - Cambio rápido de estado desde el modal de detalle
 * - Barra de progreso visual por columna
 * - Agrupación por fases plegable
 */

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Columns3, Clock, FileText, Filter, Search,
  Eye, X, ChevronDown, AlertTriangle, CheckCircle,
  ArrowRight, Maximize2, Minimize2, MessageSquare, Scale,
  ChevronRight, TrendingUp, Users, RefreshCw, GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { getAllPTAs, updatePTAStatus, getConfiguracionPTAGlobal, getPTAsByDocente } from '../services/api/ptaApi';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatPtaPercentage, getPtaCompletionPercentage } from '../utils/ptaCompletion';

interface KanbanCard {
  id: string;
  docenteId: string;
  docenteNombre: string;
  dedicacion: 'TC' | 'MT' | 'HC';
  programa: string;
  territorial: string;
  estado: string;
  horasProgramadas: number;
  horasDisponibles: number;
  pctCarga: number;
  diasEnEstado: number;
  periodo: string;
  prioridad: 'critica' | 'alta' | 'normal';
  maxDiasSla: number;
}

interface KanbanColumn {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  wipLimit: number;
  fase: string;
  icon?: any;
}

const COLUMNS: KanbanColumn[] = [
  { id: 'borrador', label: 'Borradores', shortLabel: 'Borradores', color: '#9CA3AF', bg: '#F3F4F6', wipLimit: 999, fase: 'Preparación' },
  { id: 'pendientes', label: 'Aprobación', shortLabel: 'Aprobación', color: '#F59E0B', bg: '#FEF3C7', wipLimit: 999, fase: 'Flujo Principal' },
  { id: 'concertacion', label: 'Concertación', shortLabel: 'Concertación', color: '#8B5CF6', bg: '#F3E8FF', wipLimit: 999, fase: 'Revisión Docente' },
  { id: 'aprobado', label: 'Aprobado', shortLabel: 'Aprobado', color: '#10B981', bg: '#D1FAE5', wipLimit: 999, fase: 'Cierre' },
  { id: 'sna', label: 'SNA', shortLabel: 'SNA', color: '#EF4444', bg: '#FEE2E2', wipLimit: 999, fase: 'Arbitraje' },
];

function agruparEstadoMacro(estado: string): string {
  if (!estado) return 'borrador';
  const E = estado.toUpperCase().replace(/\s+/g, '_');
  if (E === 'BORRADOR' || estado === 'Borrador') return 'borrador';
  if (['PENDIENTE_JEFATURA', 'PENDIENTE_DECANATURA', 'PENDIENTE_GESTIÓN_PROFESORAL', 'PENDIENTE_GESTION_PROFESORAL', 'CONCERTADO'].includes(E) || ['Pendiente Jefatura', 'Pendiente Decanatura', 'Pendiente Gestión Profesoral'].includes(estado)) return 'pendientes';
  if (['EN_CONCERTACION', 'OBJETADO_DOCENTE', 'MODIFICADO_DOCENTE', 'DEVUELTO', 'PROPUESTO_POR_DIRECCION', 'NOTIFICADO_DOCENTE'].includes(E) || estado === 'Devuelto') return 'concertacion';
  if (['ESCALADO_SNA'].includes(E) || estado === 'Escalado SNA') return 'sna';
  if (E === 'APROBADO' || estado === 'Aprobado') return 'aprobado';
  return 'borrador'; // fallback
}

/**
 * Convierte PTAs de la API en tarjetas Kanban
 */
function ptasToKanbanCards(ptas: any[], rules?: any): KanbanCard[] {
  // Validación de seguridad
  if (!Array.isArray(ptas)) {
    console.warn('[ptasToKanbanCards] Input is not an array:', ptas);
    return [];
  }
  
  return ptas.map(pta => {
    const horasProg = pta.total_horas_programadas || 0;
    const horasDisp = pta.horas_asignables ?? pta.horas_a_programar ?? 0;
    const pctCarga = getPtaCompletionPercentage(horasProg, horasDisp);
    
    // Calcular días en estado actual
    const updatedAt = pta.updatedAt || pta.updated_at ? new Date(pta.updatedAt || pta.updated_at) : new Date();
    const now = new Date();
    const diasEnEstado = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    
    // Determinar SLA máximo según estado
    let maxDias = 15; // default fallback
    const estadoRaw = pta.estado;
    if (estadoRaw === 'Borrador') maxDias = rules?.sla_radicacion_pta || 15;
    else if (['Pendiente Jefatura', 'Pendiente Decanatura', 'Pendiente Gestión Profesoral'].includes(estadoRaw)) maxDias = rules?.sla_verificacion_jefaturas || 5;
    else if (estadoRaw === 'Escalado SNA') maxDias = rules?.sla_verificacion_sna || 10;
    else if (estadoRaw === 'Devuelto') maxDias = 3;
    
    // Determinar prioridad basada en % carga y días en estado respecto al SLA
    let prioridad: 'critica' | 'alta' | 'normal' = 'normal';
    if (pctCarga > 110 || diasEnEstado >= maxDias) prioridad = 'critica';
    else if (pctCarga > 95 || diasEnEstado >= maxDias - 2) prioridad = 'alta';
    
    return {
      id: pta.id,
      docenteId: pta.docente_id || pta.docenteId || '',
      docenteNombre: pta.docente_nombre || 'Docente ESAP',
      dedicacion: pta.dedicacion || 'TC',
      programa: pta.programa || '',
      territorial: pta.territorial || '',
      estado: agruparEstadoMacro(pta.estado),
      horasProgramadas: horasProg,
      horasDisponibles: horasDisp,
      pctCarga,
      diasEnEstado,
      periodo: pta.periodo || '2025-2',
      prioridad,
      maxDiasSla: maxDias,
    };
  });
}

function getDiasColor(dias: number, maxDias: number): string {
  if (dias < Math.floor(maxDias / 2)) return '#059669'; // Verde: A tiempo
  if (dias < maxDias) return '#D97706'; // Naranja: Acercándose al límite
  return '#DC2626'; // Rojo: Vencido SLA
}

function getPrioridadStyle(prioridad: string): React.CSSProperties {
  if (prioridad === 'critica') return { borderLeft: '3px solid #EF4444' };
  if (prioridad === 'alta') return { borderLeft: '3px solid #F59E0B' };
  return { borderLeft: '3px solid transparent' };
}

// ── Componente de tarjeta Kanban ────────────────────────────────────────
function KanbanCard({
  card, compact, isBeingDragged, onPointerDown, onClick,
}: {
  card: KanbanCard;
  compact: boolean;
  isBeingDragged: boolean;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onClick: (card: KanbanCard) => void;
}) {
  const col = COLUMNS.find(c => c.id === card.estado);
  const diasColor = getDiasColor(card.diasEnEstado, card.maxDiasSla);
  const cargaPct = Math.min(card.pctCarga, 100);
  const cargaColor = card.pctCarga > 100 ? '#DC2626' : card.pctCarga > 90 ? '#D97706' : '#003DA5';

  return (
    <div
      onClick={() => onClick(card)}
      onPointerDown={e => onPointerDown(e, card.id)}
      style={{
        padding: compact ? '7px 10px' : '10px 12px',
        borderRadius: 9,
        background: isBeingDragged ? '#EFF6FF' : 'white',
        border: `1px solid ${card.prioridad === 'critica' ? '#FCA5A5' : card.prioridad === 'alta' ? '#FDE68A' : '#E5E7EB'}`,
        ...getPrioridadStyle(card.prioridad),
        cursor: 'grab',
        boxShadow: isBeingDragged
          ? '0 8px 24px rgba(0,61,165,0.2)'
          : '0 1px 3px rgba(0,0,0,0.05)',
        opacity: isBeingDragged ? 0.6 : 1,
        transition: 'box-shadow 0.15s, opacity 0.15s',
        userSelect: 'none',
        touchAction: 'none',
      }}
      onMouseEnter={e => {
        if (!isBeingDragged) e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={e => {
        if (!isBeingDragged) e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
      }}
    >
      {/* Grip + nombre */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginBottom: compact ? 2 : 6 }}>
        <GripVertical style={{ width: 12, height: 12, color: '#D1D5DB', flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#111827', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {card.docenteNombre}
          </div>
          {!compact && (
            <div style={{ fontSize: '0.62rem', color: '#9CA3AF', marginTop: 1 }}>
              {card.territorial}
            </div>
          )}
        </div>
        {/* Prioridad indicator */}
        {card.prioridad !== 'normal' && (
          <div style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 2,
            background: card.prioridad === 'critica' ? '#EF4444' : '#F59E0B',
          }} title={`Prioridad ${card.prioridad}`} />
        )}
      </div>

      {!compact && (
        <>
          {/* Badges */}
          <div style={{ display: 'flex', gap: 3, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ padding: '1px 5px', borderRadius: 4, background: '#F3F4F6', fontSize: '0.55rem', color: '#374151', fontWeight: 700 }}>
              {card.dedicacion}
            </span>
            <span style={{ padding: '1px 5px', borderRadius: 4, background: '#F3F4F6', fontSize: '0.55rem', color: '#6B7280', fontWeight: 600 }}>
              {card.programa}
            </span>
          </div>

          {/* Carga progress */}
          <div style={{ marginBottom: 5 }}>
            <div style={{ height: 4, borderRadius: 2, background: '#F3F4F6', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, width: `${cargaPct}%`, background: cargaColor, transition: 'width 0.3s' }} />
            </div>
          </div>

          {/* Meta row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.6rem', color: '#9CA3AF' }}>
              {card.horasProgramadas}h / {card.horasDisponibles}h ({formatPtaPercentage(card.pctCarga)}%)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock style={{ width: 9, height: 9, color: diasColor }} />
              <span style={{ fontSize: '0.58rem', fontWeight: 700, color: diasColor }}>
                {card.diasEnEstado}d
              </span>
            </div>
          </div>
        </>
      )}

      {compact && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
          <span style={{ fontSize: '0.55rem', color: '#9CA3AF', fontWeight: 600 }}>{card.dedicacion} · {formatPtaPercentage(card.pctCarga)}%</span>
          <span style={{ fontSize: '0.55rem', fontWeight: 700, color: diasColor }}>{card.diasEnEstado}d</span>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────
export function KanbanPTA() {
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [filtroTerritorial, setFiltroTerritorial] = useState('');
  const [filtroPrograma, setFiltroPrograma] = useState('');
  const [filtroDedicacion, setFiltroDedicacion] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [compact, setCompact] = useState(false);
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null);
  const [visiblePhases, setVisiblePhases] = useState<Set<string>>(new Set(COLUMNS.map(c => c.fase)));
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragGhost = useRef<HTMLDivElement | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // ── Pointer events for drag (works on both mouse + touch) ─────────────
  const handlePointerDown = useCallback((e: React.PointerEvent, cardId: string) => {
    if (e.button === 2) return; // ignore right click
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragCardId(cardId);

    // Create ghost
    const ghost = document.createElement('div');
    ghost.style.cssText = `
      position: fixed; z-index: 9999; pointer-events: none;
      padding: 8px 12px; border-radius: 9px; background: #1E40AF;
      color: white; font-size: 0.72rem; font-weight: 700;
      box-shadow: 0 8px 24px rgba(0,61,165,0.35);
      max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      transition: none;
    `;
    const card = cards.find(c => c.id === cardId);
    ghost.textContent = card?.docenteNombre || 'PTA';
    document.body.appendChild(ghost);
    dragGhost.current = ghost;

    const rect = e.currentTarget.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    ghost.style.left = `${e.clientX - dragOffset.current.x}px`;
    ghost.style.top = `${e.clientY - dragOffset.current.y}px`;
  }, [cards]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragCardId || !dragGhost.current) return;
    dragGhost.current.style.left = `${e.clientX - dragOffset.current.x}px`;
    dragGhost.current.style.top = `${e.clientY - dragOffset.current.y}px`;

    // Determine which column the pointer is over
    const elem = document.elementFromPoint(e.clientX, e.clientY);
    const colEl = elem?.closest('[data-col-id]') as HTMLElement | null;
    const colId = colEl?.dataset.colId || null;
    setDragOverColId(colId);
  }, [dragCardId]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragGhost.current) {
      document.body.removeChild(dragGhost.current);
      dragGhost.current = null;
    }
    if (dragCardId && dragOverColId && dragOverColId !== cards.find(c => c.id === dragCardId)?.estado) {
      const card = cards.find(c => c.id === dragCardId);
      const col = COLUMNS.find(c => c.id === dragOverColId);
      setCards(prev => prev.map(c => c.id === dragCardId ? { ...c, estado: dragOverColId, diasEnEstado: 0 } : c));
      if (card && col) toast.success(`${card.docenteNombre.split(' ')[0]} → ${col.shortLabel}`);
    }
    setDragCardId(null);
    setDragOverColId(null);
  }, [dragCardId, dragOverColId, cards]);

  // Cleanup ghost on unmount
  useEffect(() => {
    return () => {
      if (dragGhost.current) {
        try { document.body.removeChild(dragGhost.current); } catch {}
        dragGhost.current = null;
      }
    };
  }, []);

  // ── Filters ────────────────────────────────────────────────────────────
  const filteredCards = useMemo(() => {
    let result = cards;
    if (filtroTerritorial) result = result.filter(c => c.territorial === filtroTerritorial);
    if (filtroPrograma) result = result.filter(c => c.programa === filtroPrograma);
    if (filtroDedicacion) result = result.filter(c => c.dedicacion === filtroDedicacion);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.docenteNombre.toLowerCase().includes(q) || c.programa.toLowerCase().includes(q));
    }
    return result;
  }, [cards, filtroTerritorial, filtroPrograma, filtroDedicacion, searchQuery]);

  // ── Extract unique values for filters from actual data ─────────────────
  const uniqueTerritoriales = useMemo(() => [...new Set(cards.map(c => c.territorial).filter(Boolean))].sort(), [cards]);
  const uniqueProgramas = useMemo(() => [...new Set(cards.map(c => c.programa).filter(Boolean))].sort(), [cards]);
  const uniqueDedicaciones = useMemo(() => [...new Set(cards.map(c => c.dedicacion).filter(Boolean))].sort(), [cards]);

  const visibleColumns = useMemo(() => COLUMNS.filter(col => visiblePhases.has(col.fase)), [visiblePhases]);
  const getCardsForColumn = useCallback((colId: string) => filteredCards.filter(c => c.estado === colId), [filteredCards]);

  const phases = useMemo(() => [...new Set(COLUMNS.map(c => c.fase))], []);
  const totalByPhase = useMemo(() => {
    const map: Record<string, number> = {};
    phases.forEach(p => {
      const cols = COLUMNS.filter(c => c.fase === p);
      map[p] = cols.reduce((sum, col) => sum + filteredCards.filter(c => c.estado === col.id).length, 0);
    });
    return map;
  }, [filteredCards, phases]);

  const globalTotal = filteredCards.length;
  const criticalCount = filteredCards.filter(c => c.prioridad === 'critica').length;
  const overdueCount = filteredCards.filter(c => c.diasEnEstado > 10).length;

  // ── Handle quick state change from modal ───────────────────────────────
  const handleQuickStateChange = (cardId: string, newState: string) => {
    const card = cards.find(c => c.id === cardId);
    const col = COLUMNS.find(c => c.id === newState);
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, estado: newState, diasEnEstado: 0 } : c));
    setSelectedCard(null);
    if (card && col) toast.success(`${card.docenteNombre.split(' ')[0]} movido a ${col.shortLabel}`);
  };

  // ── Fetch PTAs on mount ────────────────────────────────────────────────
  const loadPTAs = useCallback(async () => {
    try {
      const response = await getAllPTAs();
      console.log('[KanbanPTA] Response from API:', response);
      
      // Extraer el array de datos del response
      const ptas = response?.data || response || [];
      console.log('[KanbanPTA] Extracted PTAs array:', ptas);
      console.log('[KanbanPTA] Number of PTAs:', ptas.length);
      
      // Log estados de los PTAs
      if (ptas.length > 0) {
        console.log('[KanbanPTA] Estados de PTAs:', ptas.map((p: any) => ({ 
          id: p.id, 
          estado: p.estado, 
          docente: p.docente_nombre 
        })));
      }
      
      const kanbanCards = ptasToKanbanCards(ptas);
      console.log('[KanbanPTA] Kanban cards created:', kanbanCards.length);
      
      setCards(kanbanCards);
      toast.success(`${kanbanCards.length} PTAs cargados`);
    } catch (err) {
      toast.error('Error al cargar PTAs');
      console.error('[KanbanPTA] Error loading PTAs:', err);
    }
  }, []);
  
  // ── Recargar datos de seed ─────────────────────────────────────────────
  const reloadSeed = useCallback(async () => {
    try {
      toast.loading('Recargando datos de prueba...');
      const response = await fetch(
        `http://localhost:5000/api/pta/seed?force=true`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const data = await response.json();
      toast.dismiss();
      if (data.success) {
        toast.success('Datos recargados correctamente');
        await loadPTAs();
      } else {
        toast.error('Error al recargar datos');
      }
    } catch (err) {
      toast.dismiss();
      toast.error('Error al recargar datos');
      console.error('[KanbanPTA] Error reloading seed:', err);
    }
  }, [loadPTAs]);

  useEffect(() => {
    loadPTAs();
  }, [loadPTAs]);

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ userSelect: dragCardId ? 'none' : 'auto' }}
    >
      {/* ── Controles Superiores (Toggles + Acciones) ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        
        {/* Phase toggles (Izquierda) */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {phases.map(phase => {
            const isActive = visiblePhases.has(phase);
            const count = totalByPhase[phase] || 0;
            return (
              <button
                key={phase}
                onClick={() => setVisiblePhases(prev => {
                  const next = new Set(prev);
                  if (next.has(phase)) next.delete(phase); else next.add(phase);
                  return next;
                })}
                style={{
                  padding: '4px 11px', borderRadius: 20,
                  border: isActive ? '1.5px solid #003DA5' : '1px solid #E5E7EB',
                  background: isActive ? '#EFF6FF' : 'white',
                  color: isActive ? '#003DA5' : '#9CA3AF',
                  fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {phase}
                <span style={{
                  minWidth: 18, height: 16, borderRadius: 8, padding: '0 4px',
                  background: isActive ? '#003DA5' : '#E5E7EB',
                  color: isActive ? 'white' : '#9CA3AF',
                  fontSize: '0.55rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Acciones Kanban (Derecha) */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={reloadSeed}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            title="Recargar datos de prueba con estados correctos"
          >
            <RefreshCw style={{ width: 12, height: 12 }} />
            Recargar Seed
          </button>
          <button
            onClick={loadPTAs}
            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Actualizar datos"
          >
            <RefreshCw style={{ width: 13, height: 13, color: '#6B7280' }} />
          </button>
          <button
            onClick={() => setCompact(!compact)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: compact ? '#EFF6FF' : 'white', color: compact ? '#003DA5' : '#6B7280', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            title={compact ? 'Vista expandida' : 'Vista compacta'}
          >
            {compact ? <Maximize2 style={{ width: 12, height: 12 }} /> : <Minimize2 style={{ width: 12, height: 12 }} />}
            {compact ? 'Expandir' : 'Compactar'}
          </button>
        </div>
      </div>

      {/* ── Kanban Board ─────────────────────────────────────────────────── */}
      <div
        ref={boardRef}
        style={{ overflowX: 'auto', paddingBottom: 14, WebkitOverflowScrolling: 'touch' }}
      >
        <div style={{ display: 'flex', gap: 9, minWidth: visibleColumns.length * 195 }}>
          {visibleColumns.map(col => {
            const colCards = getCardsForColumn(col.id);
            const isOverWip = col.wipLimit < 999 && colCards.length > col.wipLimit;
            const isDragTarget = dragOverColId === col.id;
            const wipPct = col.wipLimit < 999 ? Math.min((colCards.length / col.wipLimit) * 100, 100) : 0;

            return (
              <div
                key={col.id}
                data-col-id={col.id}
                style={{
                  flex: '0 0 186px', minHeight: 180, borderRadius: 12,
                  background: isDragTarget ? `${col.color}08` : '#F9FAFB',
                  border: isDragTarget ? `2px dashed ${col.color}` : '1px solid #E5E7EB',
                  display: 'flex', flexDirection: 'column',
                  transition: 'all 0.15s',
                  boxShadow: isDragTarget ? `0 0 0 3px ${col.color}20` : 'none',
                }}
              >
                {/* Column header */}
                <div style={{ padding: '8px 10px 6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.64rem', fontWeight: 800, color: col.color, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.2, flex: 1, paddingRight: 4 }}>
                      {col.shortLabel}
                    </span>
                    <span style={{
                      minWidth: 20, height: 18, padding: '0 5px', borderRadius: 6,
                      background: isOverWip ? '#FEE2E2' : `${col.color}15`,
                      color: isOverWip ? '#DC2626' : col.color,
                      fontSize: '0.6rem', fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {colCards.length}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.52rem', color: '#9CA3AF', marginBottom: 5, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{col.fase}</span>
                    {col.wipLimit < 999 && (
                      <span style={{ color: isOverWip ? '#DC2626' : '#C4C9D4', fontWeight: 600 }}>
                        WIP {col.wipLimit}
                      </span>
                    )}
                  </div>

                  {/* WIP progress bar */}
                  {col.wipLimit < 999 && (
                    <div style={{ height: 3, borderRadius: 2, background: '#E5E7EB', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 2,
                        width: `${wipPct}%`,
                        background: isOverWip ? '#DC2626' : col.color,
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  )}

                  {/* Bottom border accent */}
                  <div style={{ height: 2, borderRadius: 1, background: col.color, marginTop: 5 }} />
                </div>

                {/* Drop zone highlight */}
                {isDragTarget && (
                  <div style={{
                    margin: '0 8px 4px',
                    padding: '6px',
                    borderRadius: 7,
                    background: `${col.color}10`,
                    border: `1px dashed ${col.color}`,
                    textAlign: 'center',
                    fontSize: '0.6rem',
                    color: col.color,
                    fontWeight: 700,
                  }}>
                    Soltar aquí
                  </div>
                )}

                {/* Cards */}
                <div style={{ padding: '4px 7px 7px', display: 'flex', flexDirection: 'column', gap: 5, flex: 1, overflowY: 'auto', maxHeight: compact ? 280 : 400 }}>
                  <AnimatePresence initial={false}>
                    {colCards.map(card => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        layout
                      >
                        <KanbanCard
                          card={card}
                          compact={compact}
                          isBeingDragged={dragCardId === card.id}
                          onPointerDown={handlePointerDown}
                          onClick={setSelectedCard}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {colCards.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px 8px', color: '#D1D5DB' }}>
                      <div style={{ fontSize: '1.2rem', marginBottom: 3 }}>
                        {isDragTarget ? '↓' : '·'}
                      </div>
                      <div style={{ fontSize: '0.6rem', fontWeight: 500 }}>
                        {isDragTarget ? `Soltar en ${col.shortLabel}` : 'Sin PTAs'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Card Detail Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedCard && (() => {
          const col = COLUMNS.find(c => c.id === selectedCard.estado);
          const nextStates = COLUMNS.filter(c => c.id !== selectedCard.estado).slice(0, 8);
          const diasColor = getDiasColor(selectedCard.diasEnEstado, selectedCard.maxDiasSla);
          const modalContent = (
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(4px)' }}
              onClick={() => setSelectedCard(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' }}
              >
                {/* Header */}
                <div style={{ padding: '16px 20px', background: `linear-gradient(135deg, ${col?.color}12 0%, white 100%)`, borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <FileText style={{ width: 16, height: 16, color: col?.color || '#003DA5' }} />
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                        {selectedCard.docenteNombre}
                      </h3>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: col?.bg, color: col?.color, fontSize: '0.65rem', fontWeight: 700, border: `1px solid ${col?.color}25` }}>
                        {col?.label || selectedCard.estado}
                      </span>
                      {selectedCard.prioridad !== 'normal' && (
                        <span style={{ padding: '2px 8px', borderRadius: 6, background: selectedCard.prioridad === 'critica' ? '#FEE2E2' : '#FEF3C7', color: selectedCard.prioridad === 'critica' ? '#DC2626' : '#D97706', fontSize: '0.62rem', fontWeight: 700 }}>
                          ⚡ {selectedCard.prioridad === 'critica' ? 'Crítico' : 'Alta prioridad'}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelectedCard(null)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X style={{ width: 14, height: 14, color: '#6B7280' }} />
                  </button>
                </div>

                {/* Body */}
                <div style={{ padding: '16px 20px' }}>
                  {/* KPI grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                    {[
                      { label: 'Dedicación', value: selectedCard.dedicacion, color: '#003DA5', bg: '#EFF6FF' },
                      { label: '% Carga', value: `${formatPtaPercentage(selectedCard.pctCarga)}%`, color: selectedCard.pctCarga > 100 ? '#DC2626' : selectedCard.pctCarga > 90 ? '#D97706' : '#059669', bg: selectedCard.pctCarga > 100 ? '#FEE2E2' : '#D1FAE5' },
                      { label: 'Días en estado', value: `${selectedCard.diasEnEstado}d`, color: diasColor, bg: diasColor + '15' },
                      { label: 'Programa', value: selectedCard.programa, color: '#374151', bg: '#F9FAFB' },
                      { label: 'Territorial', value: selectedCard.territorial, color: '#374151', bg: '#F9FAFB' },
                      { label: 'Periodo', value: selectedCard.periodo, color: '#374151', bg: '#F9FAFB' },
                    ].map(item => (
                      <div key={item.label} style={{ padding: '8px 10px', borderRadius: 8, background: item.bg, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: item.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</div>
                        <div style={{ fontSize: '0.52rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: 1 }}>{item.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Carga bar */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#374151' }}>Carga académica</span>
                      <span style={{ fontSize: '0.68rem', color: '#6B7280' }}>{selectedCard.horasProgramadas}h / {selectedCard.horasDisponibles}h</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(selectedCard.pctCarga, 100)}%` }}
                        transition={{ duration: 0.5 }}
                        style={{ height: '100%', borderRadius: 4, background: selectedCard.pctCarga > 100 ? '#DC2626' : selectedCard.pctCarga > 90 ? '#D97706' : '#003DA5' }}
                      />
                    </div>
                  </div>

                  {/* Quick state change */}
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#374151', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <ArrowRight style={{ width: 12, height: 12, color: '#9CA3AF' }} />
                      Mover a estado:
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {nextStates.map(col => (
                        <button
                          key={col.id}
                          onClick={() => handleQuickStateChange(selectedCard.id, col.id)}
                          style={{
                            padding: '4px 9px', borderRadius: 6,
                            border: `1.5px solid ${col.color}30`,
                            background: col.bg, color: col.color,
                            fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer',
                            transition: 'all 0.1s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = col.color; e.currentTarget.style.transform = 'scale(1.03)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = `${col.color}30`; e.currentTarget.style.transform = 'none'; }}
                        >
                          {col.shortLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          );
          return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
        })()}
      </AnimatePresence>
    </div>
  );
}

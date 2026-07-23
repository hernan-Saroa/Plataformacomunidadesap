/**
 * Panel SNA — Sistema Nacional de Arbitraje PTA
 *
 * Gestiona PTAs escalados cuando la concertación docente-dirección fracasa.
 * Flujo: ESCALADO_SNA → En Revisión SNA → Resolución → AJUSTE_REQUERIDO / CONCERTADO
 *
 * Features:
 * - Lista de casos escalados con prioridad
 * - Panel de arbitraje con contexto completo
 * - Formulario de resolución con decisión vinculante
 * - Timeline de proceso SNA
 * - Estadísticas de arbitraje
 */

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Scale, AlertTriangle, Clock, CheckCircle, XCircle, FileText,
  MessageSquare, ChevronRight, Eye, Gavel, Users, TrendingUp,
  ArrowRight, X, Send, Shield, AlertCircle, Calendar, Hash,
  RefreshCw, Filter, Search,
} from 'lucide-react';
import { getAllPTAs, updatePTAStatus, getPTAById } from '../../services/api/ptaApi';
import { toast } from 'sonner';
import { ExportadorReportesPTA } from './ExportadorReportesPTA';

interface CasoSNA {
  id: string;
  pta: any;
  motivo: string;
  fecha_escalamiento: string;
  estado_sna: 'pendiente' | 'en_revision' | 'resuelto';
  prioridad: 'alta' | 'media' | 'baja';
  arbitro_asignado?: string;
  resolucion?: {
    decision: string;
    fundamento: string;
    fecha: string;
    tipo: 'a_favor_docente' | 'a_favor_direccion' | 'punto_medio';
  };
  historial_sna: Array<{
    fecha: string;
    accion: string;
    actor: string;
    detalle: string;
  }>;
}

function getPrioridadConfig(p: string) {
  switch (p) {
    case 'alta': return { label: 'ALTA', bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' };
    case 'media': return { label: 'MEDIA', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' };
    default: return { label: 'BAJA', bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' };
  }
}

function getEstadoSNAConfig(e: string) {
  switch (e) {
    case 'pendiente': return { label: 'Pendiente Asignación', bg: '#FEF3C7', color: '#92400E', icon: Clock };
    case 'en_revision': return { label: 'En Revisión Árbitro', bg: '#EFF6FF', color: '#1E40AF', icon: Eye };
    case 'resuelto': return { label: 'Resuelto', bg: '#D1FAE5', color: '#065F46', icon: CheckCircle };
    default: return { label: e, bg: '#F3F4F6', color: '#6B7280', icon: Clock };
  }
}

function calcularDiasEnSNA(fecha: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000));
}

interface PanelSNA_PTAProps {
  onVerDetalle?: (pta: any) => void;
  searchQuery?: string;
  filtroPeriodo?: string;
  filtroPrograma?: string;
}

export function PanelSNA_PTA({ onVerDetalle, searchQuery = '', filtroPeriodo = '', filtroPrograma = '' }: PanelSNA_PTAProps) {
  const [casos, setCasos] = useState<CasoSNA[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaso, setSelectedCaso] = useState<CasoSNA | null>(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Resolution modal
  const [showResolucion, setShowResolucion] = useState(false);
  const [resolucionData, setResolucionData] = useState({
    decision: '' as '' | 'a_favor_docente' | 'a_favor_direccion' | 'punto_medio',
    fundamento: '',
    nuevaAccion: '' as '' | 'CONCERTADO' | 'AJUSTE_REQUERIDO',
  });
  const [procesando, setProcesando] = useState(false);

  const loadCasos = async () => {
    setLoading(true);
    const res = await getAllPTAs({ estado: 'ESCALADO_SNA' });
    if (res.success && res.data) {
      // Filter only real SNA cases using robust state matching
      const ptaList = res.data.filter((p: any) => {
        const e = (p.estado || '').toUpperCase().replace(/\s+/g, '_');
        return e === 'ESCALADO_SNA' || p.estado === 'Escalado SNA';
      });

      const casosMapped: CasoSNA[] = ptaList.map((pta: any) => {
        const escalamiento = pta.historial?.find((h: any) => h.estado_nuevo === 'ESCALADO_SNA');
        const dias = escalamiento ? calcularDiasEnSNA(escalamiento.fecha) : 0;
        return {
          id: `SNA-${pta.id.substring(0, 8).toUpperCase()}`,
          pta,
          motivo: escalamiento?.observaciones || pta.motivo_escalamiento || 'Sin definir motivo de escalamiento',
          fecha_escalamiento: escalamiento?.fecha || pta.updatedAt || pta.updated_at || new Date().toISOString(),
          estado_sna: pta.resolucion_sna ? 'resuelto' : 'pendiente',
          prioridad: dias > 10 ? 'alta' : dias > 5 ? 'media' : 'baja',
          arbitro_asignado: pta.arbitro_sna || undefined,
          resolucion: pta.resolucion_sna || undefined,
          historial_sna: [
            { fecha: escalamiento?.fecha || pta.updatedAt || pta.updated_at || new Date().toISOString(), accion: 'Escalamiento a SNA', actor: escalamiento?.actor || 'Sistema', detalle: escalamiento?.observaciones || 'Caso escalado por falta de acuerdo en concertación' },
            ...(pta.historial_sna || []),
          ],
        };
      });
      setCasos(casosMapped);
    }
    setLoading(false);
  };

  useEffect(() => { loadCasos(); }, []);

  const casosFiltrados = useMemo(() => {
    let filtered = casos;
    if (filtroEstado) filtered = filtered.filter(c => c.estado_sna === filtroEstado);
    
    // Helper para quitar tildes y diacríticos
    const norm = (s?: string) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

    if (busqueda.trim()) {
      const q = norm(busqueda);
      filtered = filtered.filter(c =>
        norm(c.id).includes(q) ||
        norm(c.pta.docente_nombre).includes(q) ||
        norm(c.motivo).includes(q)
      );
    }

    if (searchQuery.trim()) {
      const q = norm(searchQuery);
      filtered = filtered.filter(c =>
        norm(c.motivo).includes(q) ||
        norm(c.pta?.docente_nombre).includes(q) ||
        norm(c.pta?.docente_identificacion).includes(q) ||
        norm(c.pta?.territorial).includes(q) ||
        norm(c.pta?.programa).includes(q) ||
        norm(c.pta?.id).includes(q)
      );
    }
    
    if (filtroPrograma) {
      filtered = filtered.filter((c: any) => 
         c.pta?.programa_id === filtroPrograma || 
         norm(c.pta?.programa).includes(norm(filtroPrograma))
      );
    }
    
    if (filtroPeriodo) {
      filtered = filtered.filter((c: any) => (c.pta?.periodo || '') === filtroPeriodo);
    }

    return filtered;
  }, [casos, filtroEstado, busqueda, searchQuery, filtroPrograma, filtroPeriodo]);

  // Stats
  const totalPendientes = casos.filter(c => c.estado_sna === 'pendiente').length;
  const totalEnRevision = casos.filter(c => c.estado_sna === 'en_revision').length;
  const totalResueltos = casos.filter(c => c.estado_sna === 'resuelto').length;
  const casosAlta = casos.filter(c => c.prioridad === 'alta').length;

  const handleResolver = async () => {
    if (!selectedCaso || !resolucionData.decision || !resolucionData.fundamento.trim() || !resolucionData.nuevaAccion) return;
    setProcesando(true);

    const nuevoEstado = resolucionData.nuevaAccion;
    const res = await updatePTAStatus(selectedCaso.pta.id, {
      estado: nuevoEstado,
      observaciones: `[RESOLUCIÓN SNA] ${resolucionData.decision === 'a_favor_docente' ? 'A favor del docente' : resolucionData.decision === 'a_favor_direccion' ? 'A favor de la dirección' : 'Punto medio'}: ${resolucionData.fundamento}`,
      aprobador_id: 'arbitro-sna',
      aprobador_nombre: 'Árbitro SNA - ESAP',
    });

    setProcesando(false);
    if (res.success) {
      toast.success(`Caso ${selectedCaso.id} resuelto → ${nuevoEstado}`);
      setShowResolucion(false);
      setSelectedCaso(null);
      setResolucionData({ decision: '', fundamento: '', nuevaAccion: '' });
      loadCasos();
    } else {
      toast.error('Error al resolver el caso SNA');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: '#991B1B', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Cargando casos de arbitraje...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Scale style={{ width: 24, height: 24, color: '#991B1B' }} />
            Sistema Nacional de Arbitraje (SNA)
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>
            Resolución de PTAs escalados por falta de acuerdo en concertación
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ExportadorReportesPTA
            data={casosFiltrados.map(c => ({
              caso_id: c.id,
              docente: c.pta.docente_nombre,
              motivo: c.motivo,
              prioridad: c.prioridad,
              estado_sna: c.estado_sna,
              dias_en_sna: calcularDiasEnSNA(c.fecha_escalamiento),
              fecha_escalamiento: c.fecha_escalamiento,
            }))}
            columns={[
              { key: 'caso_id', label: 'Caso SNA' },
              { key: 'docente', label: 'Docente' },
              { key: 'motivo', label: 'Motivo' },
              { key: 'prioridad', label: 'Prioridad' },
              { key: 'estado_sna', label: 'Estado' },
              { key: 'dias_en_sna', label: 'Días en SNA' },
              { key: 'fecha_escalamiento', label: 'Fecha Escalamiento' },
            ]}
            filename="sna_arbitraje"
            title="Reporte SNA - Arbitraje PTA"
            variant="compact"
          />
          <button onClick={loadCasos} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw style={{ width: 16, height: 16, color: '#6B7280' }} />
          </button>
        </div>
      </div>


      {/* Cases list */}
      {casosFiltrados.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '60px 24px', textAlign: 'center' }}>
          <Scale style={{ width: 40, height: 40, color: '#D1D5DB', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#6B7280' }}>No hay casos de arbitraje</p>
          <p style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>Los casos aparecen cuando una concertación es escalada al SNA</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {casosFiltrados.map((caso, idx) => {
            const pConfig = getPrioridadConfig(caso.prioridad);
            const eConfig = getEstadoSNAConfig(caso.estado_sna);
            const dias = calcularDiasEnSNA(caso.fecha_escalamiento);
            const IconEstado = eConfig.icon;

            return (
              <motion.div
                key={caso.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => setSelectedCaso(caso)}
                style={{
                  background: 'white', borderRadius: 12, border: '1px solid #E5E7EB',
                  padding: '16px 20px', cursor: 'pointer', transition: 'all 0.15s',
                  borderLeft: `4px solid ${pConfig.color}`,
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#991B1B', fontFamily: 'monospace' }}>{caso.id}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: pConfig.bg, color: pConfig.color, border: `1px solid ${pConfig.border}`, fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.05em' }}>{pConfig.label}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: eConfig.bg, color: eConfig.color, fontSize: '0.68rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <IconEstado style={{ width: 10, height: 10 }} /> {eConfig.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                      {caso.pta.docente_nombre || 'Docente ESAP'}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: 0, lineHeight: 1.4 }}>
                      {caso.motivo.length > 120 ? caso.motivo.substring(0, 120) + '...' : caso.motivo}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: 4 }}>Días en SNA</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: dias > 10 ? '#DC2626' : dias > 5 ? '#D97706' : '#6B7280' }}>{dias}</div>
                    <div style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 2 }}>
                      {new Date(caso.fecha_escalamiento).toLocaleDateString('es-CO')}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ═══ Panel Detalle / Arbitraje ═══ */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedCaso && !showResolucion && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedCaso(null)}>
              <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 740, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            >
              {/* Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Scale style={{ width: 20, height: 20, color: '#991B1B' }} />
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: 0 }}>Caso {selectedCaso.id}</h2>
                    <span style={{ ...getPrioridadConfig(selectedCaso.prioridad), padding: '2px 8px', borderRadius: 6, fontSize: '0.62rem', fontWeight: 800, border: `1px solid ${getPrioridadConfig(selectedCaso.prioridad).border}` }}>
                      {getPrioridadConfig(selectedCaso.prioridad).label}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0' }}>
                    {selectedCaso.pta.docente_nombre} • {selectedCaso.pta.periodo || '2025-2'}
                  </p>
                </div>
                <button onClick={() => setSelectedCaso(null)} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X style={{ width: 18, height: 18, color: '#6B7280' }} />
                </button>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                {/* Info cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Dedicación', value: selectedCaso.pta.dedicacion || 'TC' },
                    { label: 'Horas Programadas', value: `${selectedCaso.pta.total_horas_programadas || 0}/${selectedCaso.pta.horas_asignables ?? selectedCaso.pta.horas_a_programar ?? 0}` },
                    { label: 'Días en SNA', value: `${calcularDiasEnSNA(selectedCaso.fecha_escalamiento)} días` },
                  ].map(item => (
                    <div key={item.label} style={{ padding: 12, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>{item.label}</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', marginTop: 2 }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Motivo de escalamiento */}
                <div style={{ marginBottom: 20, padding: 16, borderRadius: 10, background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#991B1B', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle style={{ width: 14, height: 14 }} />
                    Motivo del Escalamiento
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#7F1D1D', margin: 0, lineHeight: 1.5 }}>
                    {selectedCaso.motivo}
                  </p>
                </div>

                {/* Posiciones */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div style={{ padding: 14, borderRadius: 10, border: '1px solid #BFDBFE', background: '#EFF6FF' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1E40AF', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Shield style={{ width: 12, height: 12 }} /> Posición de Dirección
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#1E3A5F', margin: 0, lineHeight: 1.4 }}>
                      Asignación según distribución institucional y necesidades del programa para el periodo {selectedCaso.pta.periodo || '2025-2'}.
                    </p>
                  </div>
                  <div style={{ padding: 14, borderRadius: 10, border: '1px solid #DDD6FE', background: '#F3E8FF' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B21A8', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Users style={{ width: 12, height: 12 }} /> Posición del Docente
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#4C1D95', margin: 0, lineHeight: 1.4 }}>
                      {selectedCaso.pta.objecion_docente || 'Objeciones documentadas durante la fase de concertación. El docente solicita ajustes en la distribución de carga.'}
                    </p>
                  </div>
                </div>

                {/* Timeline SNA */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock style={{ width: 16, height: 16, color: '#991B1B' }} />
                    Timeline del Proceso SNA
                  </div>
                  <div style={{ paddingLeft: 10 }}>
                    {selectedCaso.historial_sna.map((h, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                        {idx < selectedCaso.historial_sna.length - 1 && (
                          <div style={{ position: 'absolute', left: 5, top: 18, bottom: -6, width: 2, background: '#FCA5A5' }} />
                        )}
                        <div style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: idx === 0 ? '#991B1B' : '#FECACA', border: `2px solid ${idx === 0 ? '#7F1D1D' : '#FCA5A5'}` }} />
                        <div style={{ paddingBottom: 14, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>{h.accion}</span>
                            <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{new Date(h.fecha).toLocaleDateString('es-CO')}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 1 }}>{h.actor}</div>
                          {h.detalle && (
                            <div style={{ fontSize: '0.75rem', color: '#4B5563', marginTop: 4, padding: '5px 8px', borderRadius: 5, background: '#FEF2F2', borderLeft: '3px solid #FCA5A5' }}>{h.detalle}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              {selectedCaso.estado_sna !== 'resuelto' && (
                <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  {onVerDetalle && (
                    <button
                      onClick={() => onVerDetalle(selectedCaso.pta)}
                      style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #D1D5DB', background: 'white', color: '#003DA5', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginRight: 'auto' }}
                    >
                      <Eye style={{ width: 16, height: 16 }} />
                      Ver Contexto del PTA
                    </button>
                  )}
                  <button onClick={() => setSelectedCaso(null)} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    Cerrar
                  </button>
                  <button
                    onClick={() => setShowResolucion(true)}
                    style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: '#991B1B', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(153,27,27,0.25)' }}
                  >
                    <Gavel style={{ width: 15, height: 15 }} />
                    Emitir Resolución
                  </button>
                </div>
              )}
            </motion.div>
          </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ═══ Modal Resolución SNA ═══ */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showResolucion && selectedCaso && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(4px)' }}>
              <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 540, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Gavel style={{ width: 20, height: 20, color: '#991B1B' }} />
                  Resolución del Caso {selectedCaso.id}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0' }}>
                  La resolución es vinculante y se notificará a ambas partes.
                </p>
              </div>

              <div style={{ padding: 24 }}>
                {/* Decision */}
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  Decisión del Arbitraje *
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {([
                    { key: 'a_favor_docente', label: 'A favor del Docente', color: '#7C3AED', bg: '#F3E8FF' },
                    { key: 'punto_medio', label: 'Punto Medio', color: '#D97706', bg: '#FEF3C7' },
                    { key: 'a_favor_direccion', label: 'A favor de Dirección', color: '#003DA5', bg: '#EFF6FF' },
                  ] as const).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setResolucionData(prev => ({ ...prev, decision: opt.key }))}
                      style={{
                        flex: 1, padding: '10px 8px', borderRadius: 8,
                        border: `2px solid ${resolucionData.decision === opt.key ? opt.color : '#E5E7EB'}`,
                        background: resolucionData.decision === opt.key ? opt.bg : 'white',
                        color: resolucionData.decision === opt.key ? opt.color : '#6B7280',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textAlign: 'center',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Action */}
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  Acción Resultante *
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {([
                    { key: 'CONCERTADO', label: 'Declarar Concertado', desc: 'El PTA avanza con el acuerdo del árbitro', color: '#059669' },
                    { key: 'AJUSTE_REQUERIDO', label: 'Requerir Ajuste', desc: 'El PTA regresa para ajuste según resolución', color: '#D97706' },
                  ] as const).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setResolucionData(prev => ({ ...prev, nuevaAccion: opt.key }))}
                      style={{
                        flex: 1, padding: '12px', borderRadius: 8,
                        border: `2px solid ${resolucionData.nuevaAccion === opt.key ? opt.color : '#E5E7EB'}`,
                        background: resolucionData.nuevaAccion === opt.key ? `${opt.color}10` : 'white',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: resolucionData.nuevaAccion === opt.key ? opt.color : '#374151' }}>{opt.label}</div>
                      <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 2 }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Fundamento */}
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Fundamento de la Resolución *
                </label>
                <textarea
                  value={resolucionData.fundamento}
                  onChange={e => setResolucionData(prev => ({ ...prev, fundamento: e.target.value }))}
                  placeholder="Describa los argumentos, normativa aplicable y razones que sustentan la decisión del arbitraje..."
                  rows={5}
                  style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #D1D5DB', fontSize: '0.85rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={() => { setShowResolucion(false); setResolucionData({ decision: '', fundamento: '', nuevaAccion: '' }); }} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button
                  onClick={handleResolver}
                  disabled={procesando || !resolucionData.decision || !resolucionData.fundamento.trim() || !resolucionData.nuevaAccion}
                  style={{
                    padding: '9px 22px', borderRadius: 9, border: 'none',
                    background: '#991B1B', color: 'white', fontSize: '0.85rem', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    opacity: procesando || !resolucionData.decision || !resolucionData.fundamento.trim() || !resolucionData.nuevaAccion ? 0.5 : 1,
                  }}
                >
                  <Gavel style={{ width: 14, height: 14 }} />
                  {procesando ? 'Procesando...' : 'Confirmar Resolución'}
                </button>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

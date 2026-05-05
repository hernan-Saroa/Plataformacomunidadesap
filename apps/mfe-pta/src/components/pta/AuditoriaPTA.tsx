/**
 * Auditoría PTA — Historial global de acciones
 *
 * Timeline de todas las acciones sobre PTAs con filtros,
 * estadísticas de auditoría, actores frecuentes.
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Shield, Clock, Search, Filter, RefreshCw, CheckCircle,
  XCircle, RotateCcw, AlertTriangle, Users, Zap, Activity,
  ChevronRight, ArrowUpDown, FileText,
} from 'lucide-react';
import { getAuditoriaPTA } from '../../services/api/ptaApi';

function getEventIcon(estado: string) {
  if (estado === 'Aprobado') return { icon: CheckCircle, color: '#059669' };
  if (estado === 'Rechazado') return { icon: XCircle, color: '#DC2626' };
  if (estado === 'Devuelto') return { icon: RotateCcw, color: '#D97706' };
  if (estado === 'ESCALADO_SNA') return { icon: Zap, color: '#EA580C' };
  if (estado?.includes('Pendiente')) return { icon: Clock, color: '#2563EB' };
  if (['EN_CONCERTACION', 'CONCERTADO'].includes(estado)) return { icon: Activity, color: '#7C3AED' };
  if (estado === 'PROPUESTO_POR_DIRECCION') return { icon: FileText, color: '#1E40AF' };
  if (estado === 'NOTIFICADO_DOCENTE') return { icon: AlertTriangle, color: '#92400E' };
  return { icon: FileText, color: '#6B7280' };
}

function getStatusBadge(estado: string) {
  const m: Record<string, { bg: string; color: string }> = {
    'Borrador': { bg: '#F3F4F6', color: '#4B5563' }, 'Aprobado': { bg: '#D1FAE5', color: '#065F46' },
    'Rechazado': { bg: '#FEE2E2', color: '#991B1B' }, 'Devuelto': { bg: '#FFF7ED', color: '#9A3412' },
    'ESCALADO_SNA': { bg: '#FEE2E2', color: '#991B1B' }, 'EN_CONCERTACION': { bg: '#F3E8FF', color: '#6B21A8' },
    'CONCERTADO': { bg: '#D1FAE5', color: '#065F46' }, 'PROPUESTO_POR_DIRECCION': { bg: '#EFF6FF', color: '#1E40AF' },
    'NOTIFICADO_DOCENTE': { bg: '#FEF3C7', color: '#92400E' },
    'Pendiente Jefatura': { bg: '#FEF3C7', color: '#92400E' }, 'Pendiente Decanatura': { bg: '#DBEAFE', color: '#1E40AF' },
    'Pendiente Gestión Profesoral': { bg: '#E0E7FF', color: '#3730A3' },
  };
  return m[estado] || { bg: '#F3F4F6', color: '#4B5563' };
}

export function AuditoriaPTA() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('2026-1');
  const [accion, setAccion] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const loadData = async () => {
    setLoading(true);
    const res = await getAuditoriaPTA({ periodo, accion });
    if (res.success) setData(res.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [periodo, accion]);

  const filteredEventos = (data?.eventos || []).filter((e: any) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return e.docente?.toLowerCase().includes(q) || e.actor?.toLowerCase().includes(q) ||
      e.territorial?.toLowerCase().includes(q) || e.pta_id?.toLowerCase().includes(q) ||
      e.estado_nuevo?.toLowerCase().includes(q);
  });

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: '#003DA5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Cargando auditoría...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const stats = data?.stats || { totalEventos: 0, aprobaciones: 0, rechazos: 0, devoluciones: 0, escalamientos: 0, actoresFrecuentes: [] };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield style={{ width: 24, height: 24, color: '#003DA5' }} />
            Auditoría PTA
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>
            Historial completo de acciones — Periodo {periodo}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.85rem', background: 'white' }}>
            <option value="2026-1">2026-1</option><option value="2026-2">2026-2</option><option value="2025-2">2025-2</option>
          </select>
          <button onClick={loadData} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw style={{ width: 16, height: 16, color: '#6B7280' }} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Eventos', value: stats.totalEventos, icon: Activity, color: '#003DA5', bg: '#EFF6FF' },
          { label: 'Aprobaciones', value: stats.aprobaciones, icon: CheckCircle, color: '#059669', bg: '#D1FAE5' },
          { label: 'Rechazos', value: stats.rechazos, icon: XCircle, color: '#DC2626', bg: '#FEE2E2' },
          { label: 'Devoluciones', value: stats.devoluciones, icon: RotateCcw, color: '#D97706', bg: '#FEF3C7' },
          { label: 'Escalamientos', value: stats.escalamientos, icon: Zap, color: '#EA580C', bg: '#FFF7ED' },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon style={{ width: 16, height: 16, color: s.color }} />
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827' }}>{s.value}</div>
            <div style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: 500 }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Actores Frecuentes + Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 20 }}>
        {/* Actores */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 20 }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users style={{ width: 16, height: 16, color: '#7C3AED' }} />
            Actores Frecuentes
          </h3>
          {stats.actoresFrecuentes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {stats.actoresFrecuentes.map((a: any, i: number) => (
                <div key={a.actor} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < stats.actoresFrecuentes.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  <span style={{ width: 20, fontSize: '0.72rem', fontWeight: 700, color: i < 3 ? '#003DA5' : '#9CA3AF', textAlign: 'center' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.actor}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#003DA5' }}>{a.count}</span>
                </div>
              ))}
            </div>
          ) : <p style={{ color: '#9CA3AF', fontSize: '0.82rem' }}>Sin datos</p>}
        </div>

        {/* Filters */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 20 }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Filtrar Eventos</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {[
              { key: '', label: 'Todos' },
              { key: 'aprobacion', label: 'Aprobaciones' },
              { key: 'rechazo', label: 'Rechazos/Devoluciones' },
              { key: 'concertacion', label: 'Concertación' },
            ].map(f => (
              <button key={f.key} onClick={() => setAccion(f.key)} style={{
                padding: '6px 14px', borderRadius: 8, border: `1px solid ${accion === f.key ? '#003DA5' : '#D1D5DB'}`,
                background: accion === f.key ? '#EFF6FF' : 'white', color: accion === f.key ? '#003DA5' : '#6B7280',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
              }}>
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <Search style={{ width: 14, height: 14, color: '#9CA3AF', position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input type="text" placeholder="Buscar por docente, actor, territorial..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }} />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock style={{ width: 18, height: 18, color: '#6B7280' }} />
            Timeline de Eventos ({filteredEventos.length})
          </h3>
        </div>

        {filteredEventos.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingLeft: 8, maxHeight: 600, overflowY: 'auto' }}>
            {filteredEventos.slice(0, 100).map((e: any, i: number) => {
              const { icon: Icon, color } = getEventIcon(e.estado_nuevo);
              const sb = getStatusBadge(e.estado_nuevo);
              return (
                <div key={i} style={{ display: 'flex', gap: 14, position: 'relative', paddingBottom: 14 }}>
                  {i < filteredEventos.length - 1 && <div style={{ position: 'absolute', left: 9, top: 22, bottom: 0, width: 1.5, background: '#E5E7EB' }} />}
                  <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}15`, border: `2px solid ${color}` }}>
                    <Icon style={{ width: 10, height: 10, color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{e.docente}</span>
                        <ChevronRight style={{ width: 12, height: 12, color: '#D1D5DB' }} />
                        <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: 8, background: sb.bg, color: sb.color, fontWeight: 600 }}>
                          {e.estado_nuevo?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#9CA3AF', flexShrink: 0 }}>
                        {new Date(e.fecha).toLocaleDateString('es-CO')} {new Date(e.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 3, fontSize: '0.75rem', color: '#6B7280' }}>
                      <span>Actor: <strong>{e.actor}</strong> ({e.actor_rol})</span>
                      <span>Territorial: {e.territorial}</span>
                    </div>
                    {e.estado_anterior && (
                      <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 2 }}>
                        Transición: {e.estado_anterior?.replace(/_/g, ' ')} → {e.estado_nuevo?.replace(/_/g, ' ')}
                      </div>
                    )}
                    {e.observaciones && e.observaciones !== 'PTA creado' && (
                      <div style={{ fontSize: '0.75rem', color: '#4B5563', marginTop: 4, padding: '4px 8px', borderRadius: 6, background: '#F3F4F6', borderLeft: '3px solid #D1D5DB' }}>
                        {e.observaciones}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredEventos.length > 100 && (
              <p style={{ color: '#9CA3AF', fontSize: '0.82rem', textAlign: 'center', padding: '12px 0' }}>
                Mostrando 100 de {filteredEventos.length} eventos
              </p>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Shield style={{ width: 36, height: 36, color: '#D1D5DB', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '0.92rem', fontWeight: 600, color: '#6B7280' }}>Sin eventos registrados</p>
            <p style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>Los eventos aparecerán cuando los PTAs sean procesados.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

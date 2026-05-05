/**
 * PreAprobacionSNI_SNPI_PTA — Panel de gestion de pre-aprobaciones SNI/SNPI/EAG
 *
 * Circular 003/2025, Secciones 1.3.7 y 1.3.8:
 *  - SNI: La Subdireccion Nacional de Investigaciones aprueba horas de investigacion
 *  - SNPI: La Subdireccion Nacional de Proyeccion Institucional aprueba horas de extension
 *  - EAG: La Escuela de Alto Gobierno solicita/aprueba horas de extension
 *
 * Este componente permite:
 *  1. Listar solicitudes pendientes de SNI y SNPI/EAG
 *  2. Aprobar/rechazar solicitudes con observaciones y horas ajustadas
 *  3. Ver historico de resoluciones
 *  4. Alertas para solicitudes antiguas (>30 dias)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Microscope, BookOpen, Building2, CheckCircle2, XCircle,
  Clock, AlertTriangle, Filter, Search, ChevronDown, ChevronRight,
  FileText, User, Calendar, Hash, MessageSquare, RefreshCw,
  Shield, Zap, Eye, Send, ArrowRight, Award, Timer,
} from 'lucide-react';
import {
  getSolicitudesSNI, getSolicitudesSNPI,
  resolverSolicitudSNI, resolverSolicitudSNPI,
} from '../../services/api/ptaApi';
import { toast } from 'sonner';

type TabType = 'sni' | 'snpi' | 'eag';

interface Solicitud {
  id: string;
  tipo: 'SNI' | 'SNPI' | 'EAG';
  pta_id: string;
  docente_id: string;
  docente_nombre: string;
  horas_solicitadas: number;
  horas_aprobadas?: number;
  estado: string;
  justificacion?: string;
  observaciones_sni?: string;
  observaciones_snpi?: string;
  fecha_solicitud: string;
  fecha_resolucion?: string;
  resuelto_por?: string;
  rol_investigacion?: string;
  proyecto_nombre?: string;
  proyecto_codigo?: string;
  grupo_investigacion?: string;
  direccion?: string;
  actividades?: any[];
  periodo?: string;
  solicitado_por?: string;
}

const ESTADO_BADGE: Record<string, { bg: string; color: string; label: string; icon: any }> = {
  PENDIENTE_SNI: { bg: '#FEF3C7', color: '#92400E', label: 'Pendiente SNI', icon: Clock },
  PENDIENTE_SNPI: { bg: '#FEF3C7', color: '#92400E', label: 'Pendiente SNPI', icon: Clock },
  APROBADO_SNI: { bg: '#D1FAE5', color: '#065F46', label: 'Aprobado SNI', icon: CheckCircle2 },
  APROBADO_SNPI: { bg: '#D1FAE5', color: '#065F46', label: 'Aprobado SNPI', icon: CheckCircle2 },
  RECHAZADO_SNI: { bg: '#FEE2E2', color: '#991B1B', label: 'Rechazado SNI', icon: XCircle },
  RECHAZADO_SNPI: { bg: '#FEE2E2', color: '#991B1B', label: 'Rechazado SNPI', icon: XCircle },
};

const TAB_CONFIG: Record<TabType, { label: string; icon: any; color: string; desc: string }> = {
  sni: { label: 'SNI — Investigacion', icon: Microscope, color: '#7C3AED', desc: 'Subdireccion Nacional de Investigaciones' },
  snpi: { label: 'SNPI — Extension', icon: BookOpen, color: '#0891B2', desc: 'Subdireccion Nacional de Proyeccion Institucional' },
  eag: { label: 'EAG — Alto Gobierno', icon: Building2, color: '#D97706', desc: 'Escuela de Alto Gobierno' },
};

function diasDesde(fecha: string): number {
  return Math.ceil((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
}

export default function PreAprobacionSNI_SNPI_PTA() {
  const [activeTab, setActiveTab] = useState<TabType>('sni');
  const [solicitudesSNI, setSolicitudesSNI] = useState<Solicitud[]>([]);
  const [solicitudesSNPI, setSolicitudesSNPI] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [busqueda, setBusqueda] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolucionModal, setResolucionModal] = useState<{ sol: Solicitud; aprobado: boolean } | null>(null);
  const [resForm, setResForm] = useState({ horas_aprobadas: 0, observaciones: '', resuelto_por: '' });
  const [submitting, setSubmitting] = useState(false);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [sni, snpi] = await Promise.all([
        getSolicitudesSNI(),
        getSolicitudesSNPI(),
      ]);
      setSolicitudesSNI(sni.data || []);
      setSolicitudesSNPI(snpi.data || []);
    } catch (e) {
      console.error('Error loading solicitudes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const solicitudesActivas = useMemo(() => {
    let items: Solicitud[] = [];
    if (activeTab === 'sni') items = solicitudesSNI;
    else if (activeTab === 'snpi') items = solicitudesSNPI.filter(s => s.tipo === 'SNPI');
    else items = solicitudesSNPI.filter(s => s.tipo === 'EAG');

    if (filtroEstado) items = items.filter(s => s.estado === filtroEstado);
    if (busqueda) {
      const q = busqueda.toLowerCase();
      items = items.filter(s =>
        s.docente_nombre?.toLowerCase().includes(q) ||
        s.proyecto_nombre?.toLowerCase().includes(q) ||
        s.pta_id?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [activeTab, solicitudesSNI, solicitudesSNPI, filtroEstado, busqueda]);

  const stats = useMemo(() => {
    const all = [...solicitudesSNI, ...solicitudesSNPI];
    return {
      totalPendientes: all.filter(s => s.estado.includes('PENDIENTE')).length,
      totalAprobadas: all.filter(s => s.estado.includes('APROBADO')).length,
      totalRechazadas: all.filter(s => s.estado.includes('RECHAZADO')).length,
      antiguasWarning: all.filter(s => s.estado.includes('PENDIENTE') && diasDesde(s.fecha_solicitud) > 30).length,
      sniPendientes: solicitudesSNI.filter(s => s.estado === 'PENDIENTE_SNI').length,
      snpiPendientes: solicitudesSNPI.filter(s => s.estado === 'PENDIENTE_SNPI' && s.tipo === 'SNPI').length,
      eagPendientes: solicitudesSNPI.filter(s => s.estado === 'PENDIENTE_SNPI' && s.tipo === 'EAG').length,
    };
  }, [solicitudesSNI, solicitudesSNPI]);

  const handleResolver = async () => {
    if (!resolucionModal) return;
    setSubmitting(true);
    try {
      const { sol, aprobado } = resolucionModal;
      const payload = {
        aprobado,
        horas_aprobadas: aprobado ? resForm.horas_aprobadas : 0,
        observaciones: resForm.observaciones,
        resuelto_por: resForm.resuelto_por || (sol.tipo === 'SNI' ? 'SNI' : 'SNPI'),
      };
      const result = sol.tipo === 'SNI'
        ? await resolverSolicitudSNI(sol.pta_id, payload)
        : await resolverSolicitudSNPI(sol.pta_id, payload);

      if (result.success) {
        toast.success(aprobado
          ? `Aprobadas ${payload.horas_aprobadas}h para ${sol.docente_nombre}`
          : `Solicitud rechazada para ${sol.docente_nombre}`
        );
        setResolucionModal(null);
        cargarDatos();
      } else {
        toast.error('Error al resolver solicitud');
      }
    } catch (e) {
      console.error('Error resolving:', e);
      toast.error('Error de conexion');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
            Pre-Aprobacion SNI / SNPI / EAG
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '4px 0 0' }}>
            Circular 003/2025 — Secciones 1.3.7 y 1.3.8: Aprobacion de horas antes del semestre
          </p>
        </div>
        <button
          onClick={cargarDatos}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            borderRadius: 8, border: '1px solid #E5E7EB', background: 'white',
            fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', color: '#374151',
          }}
        >
          <RefreshCw style={{ width: 14, height: 14, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualizar
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Pendientes', value: stats.totalPendientes, color: '#D97706', bg: '#FEF3C7', icon: Clock },
          { label: 'Aprobadas', value: stats.totalAprobadas, color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
          { label: 'Rechazadas', value: stats.totalRechazadas, color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
          { label: '>30 dias sin resolver', value: stats.antiguasWarning, color: '#991B1B', bg: '#FEE2E2', icon: AlertTriangle },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                padding: '14px 16px', borderRadius: 12, background: s.bg,
                border: `1px solid ${s.color}20`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon style={{ width: 16, height: 16, color: s.color }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: s.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Alerta >30 dias */}
      {stats.antiguasWarning > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 16,
            background: '#FEF2F2', border: '1px solid #FCA5A5',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <AlertTriangle style={{ width: 18, height: 18, color: '#DC2626', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#991B1B' }}>
              {stats.antiguasWarning} solicitud(es) llevan mas de 30 dias sin resolver
            </div>
            <div style={{ fontSize: '0.72rem', color: '#B91C1C', marginTop: 2 }}>
              La Circular 003/2025 establece que las pre-aprobaciones deben resolverse antes del inicio del semestre.
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #F3F4F6', paddingBottom: 0 }}>
        {(Object.entries(TAB_CONFIG) as [TabType, typeof TAB_CONFIG[TabType]][]).map(([key, cfg]) => {
          const isActive = activeTab === key;
          const Icon = cfg.icon;
          const pendCount = key === 'sni' ? stats.sniPendientes : key === 'snpi' ? stats.snpiPendientes : stats.eagPendientes;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                border: 'none', borderBottom: isActive ? `2.5px solid ${cfg.color}` : '2.5px solid transparent',
                background: 'transparent', cursor: 'pointer', marginBottom: -2,
                color: isActive ? cfg.color : '#9CA3AF',
                fontWeight: isActive ? 700 : 500, fontSize: '0.82rem',
                transition: 'all 0.15s',
              }}
            >
              <Icon style={{ width: 16, height: 16 }} />
              {cfg.label}
              {pendCount > 0 && (
                <span style={{
                  padding: '1px 7px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700,
                  background: `${cfg.color}15`, color: cfg.color,
                }}>
                  {pendCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9CA3AF' }} />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por docente, proyecto o PTA..."
            style={{
              width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8,
              border: '1px solid #E5E7EB', fontSize: '0.78rem', outline: 'none',
            }}
          />
        </div>
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
            fontSize: '0.78rem', color: '#374151', cursor: 'pointer', background: 'white',
          }}
        >
          <option value="">Todos los estados</option>
          <option value={activeTab === 'sni' ? 'PENDIENTE_SNI' : 'PENDIENTE_SNPI'}>Pendientes</option>
          <option value={activeTab === 'sni' ? 'APROBADO_SNI' : 'APROBADO_SNPI'}>Aprobados</option>
          <option value={activeTab === 'sni' ? 'RECHAZADO_SNI' : 'RECHAZADO_SNPI'}>Rechazados</option>
        </select>
      </div>

      {/* Solicitudes list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
          <RefreshCw style={{ width: 24, height: 24, margin: '0 auto 8px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '0.82rem' }}>Cargando solicitudes...</p>
        </div>
      ) : solicitudesActivas.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px 20px', borderRadius: 14,
          border: '2px dashed #E5E7EB', color: '#9CA3AF',
        }}>
          <Shield style={{ width: 32, height: 32, margin: '0 auto 8px' }} />
          <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>No hay solicitudes {filtroEstado ? 'con este filtro' : 'registradas'}</p>
          <p style={{ fontSize: '0.72rem', marginTop: 4 }}>
            Las solicitudes de pre-aprobacion se generan desde el formulario PTA cuando se registran horas de investigacion o extension.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence>
            {solicitudesActivas.map((sol, i) => {
              const badge = ESTADO_BADGE[sol.estado] || { bg: '#F3F4F6', color: '#6B7280', label: sol.estado, icon: Clock };
              const BadgeIcon = badge.icon;
              const isExpanded = expandedId === sol.id;
              const diasPendiente = sol.estado.includes('PENDIENTE') ? diasDesde(sol.fecha_solicitud) : 0;
              const esAntigua = diasPendiente > 30;

              return (
                <motion.div
                  key={sol.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    borderRadius: 12, border: `1px solid ${esAntigua ? '#FCA5A5' : '#E5E7EB'}`,
                    background: esAntigua ? '#FFFBEB' : 'white', overflow: 'hidden',
                  }}
                >
                  {/* Row header */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : sol.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${TAB_CONFIG[activeTab].color}10`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <User style={{ width: 18, height: 18, color: TAB_CONFIG[activeTab].color }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>
                        {sol.docente_nombre}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#6B7280', display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                        {sol.proyecto_nombre && <span>{sol.proyecto_nombre}</span>}
                        {sol.rol_investigacion && <span style={{ color: '#7C3AED' }}>{sol.rol_investigacion}</span>}
                        {sol.direccion && <span style={{ color: '#0891B2' }}>{sol.direccion}</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <div style={{
                        padding: '3px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                        background: TAB_CONFIG[activeTab].color + '10',
                        color: TAB_CONFIG[activeTab].color,
                      }}>
                        {sol.horas_solicitadas}h
                      </div>
                      <div style={{
                        padding: '3px 10px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700,
                        background: badge.bg, color: badge.color,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <BadgeIcon style={{ width: 11, height: 11 }} />
                        {badge.label}
                      </div>
                      {diasPendiente > 0 && (
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 600,
                          color: esAntigua ? '#DC2626' : '#D97706',
                        }}>
                          {diasPendiente}d
                        </span>
                      )}
                      <ChevronDown style={{
                        width: 14, height: 14, color: '#9CA3AF',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                        transition: 'transform 0.2s',
                      }} />
                    </div>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #F3F4F6' }}>
                          <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: 10, marginTop: 12,
                          }}>
                            <DetailField icon={Hash} label="PTA ID" value={sol.pta_id} />
                            <DetailField icon={Calendar} label="Fecha solicitud" value={new Date(sol.fecha_solicitud).toLocaleDateString('es-CO')} />
                            <DetailField icon={User} label="Solicitado por" value={sol.solicitado_por || 'Docente'} />
                            <DetailField icon={Timer} label="Periodo" value={sol.periodo || '2026-1'} />
                            {sol.proyecto_codigo && <DetailField icon={FileText} label="Codigo proyecto" value={sol.proyecto_codigo} />}
                            {sol.grupo_investigacion && <DetailField icon={Award} label="Grupo investigacion" value={sol.grupo_investigacion} />}
                            {sol.horas_aprobadas !== undefined && sol.horas_aprobadas > 0 && (
                              <DetailField icon={Zap} label="Horas aprobadas" value={`${sol.horas_aprobadas}h`} />
                            )}
                            {sol.fecha_resolucion && (
                              <DetailField icon={Calendar} label="Fecha resolucion" value={new Date(sol.fecha_resolucion).toLocaleDateString('es-CO')} />
                            )}
                            {sol.resuelto_por && <DetailField icon={Shield} label="Resuelto por" value={sol.resuelto_por} />}
                          </div>

                          {sol.justificacion && (
                            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 }}>Justificacion</div>
                              <div style={{ fontSize: '0.78rem', color: '#374151', lineHeight: 1.5 }}>{sol.justificacion}</div>
                            </div>
                          )}

                          {(sol.observaciones_sni || sol.observaciones_snpi) && (
                            <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 8, background: sol.estado.includes('APROBADO') ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${sol.estado.includes('APROBADO') ? '#BBF7D0' : '#FCA5A5'}` }}>
                              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: sol.estado.includes('APROBADO') ? '#166534' : '#991B1B', textTransform: 'uppercase', marginBottom: 4 }}>
                                Observaciones {sol.tipo}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#374151', lineHeight: 1.5 }}>
                                {sol.observaciones_sni || sol.observaciones_snpi}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          {sol.estado.includes('PENDIENTE') && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                              <button
                                onClick={() => {
                                  setResolucionModal({ sol, aprobado: true });
                                  setResForm({ horas_aprobadas: sol.horas_solicitadas, observaciones: '', resuelto_por: '' });
                                }}
                                style={{
                                  flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none',
                                  background: '#059669', color: 'white', fontWeight: 700,
                                  fontSize: '0.82rem', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                }}
                              >
                                <CheckCircle2 style={{ width: 16, height: 16 }} />
                                Aprobar horas
                              </button>
                              <button
                                onClick={() => {
                                  setResolucionModal({ sol, aprobado: false });
                                  setResForm({ horas_aprobadas: 0, observaciones: '', resuelto_por: '' });
                                }}
                                style={{
                                  flex: 1, padding: '10px 16px', borderRadius: 8, border: '1.5px solid #FCA5A5',
                                  background: 'white', color: '#DC2626', fontWeight: 700,
                                  fontSize: '0.82rem', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                }}
                              >
                                <XCircle style={{ width: 16, height: 16 }} />
                                Rechazar
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Referencia normativa footer */}
      <div style={{
        marginTop: 20, padding: '12px 16px', borderRadius: 10,
        background: '#F9FAFB', border: '1px solid #E5E7EB',
        fontSize: '0.68rem', color: '#6B7280', lineHeight: 1.6,
      }}>
        <strong style={{ color: '#374151' }}>Referencia normativa:</strong>{' '}
        Circular Dispositiva No. 003/2025, Seccion 1.3.7 (SNI) y 1.3.8 (SNPI/EAG).
        Las horas de investigacion requieren aprobacion previa de la SNI. Las horas de extension requieren solicitud formal a la SNPI o Escuela de Alto Gobierno.
        Ambas pre-aprobaciones deben resolverse antes del inicio del semestre academico.
      </div>

      {/* Resolucion Modal */}
      <AnimatePresence>
        {resolucionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            }}
            onClick={() => setResolucionModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'white', borderRadius: 16, padding: '24px 28px',
                width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                {resolucionModal.aprobado
                  ? <CheckCircle2 style={{ width: 24, height: 24, color: '#059669' }} />
                  : <XCircle style={{ width: 24, height: 24, color: '#DC2626' }} />
                }
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>
                    {resolucionModal.aprobado ? 'Aprobar solicitud' : 'Rechazar solicitud'}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6B7280' }}>
                    {resolucionModal.sol.docente_nombre} — {resolucionModal.sol.tipo}
                  </p>
                </div>
              </div>

              {resolucionModal.aprobado && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                    Horas aprobadas
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={resolucionModal.sol.horas_solicitadas}
                    value={resForm.horas_aprobadas}
                    onChange={e => setResForm(p => ({ ...p, horas_aprobadas: Number(e.target.value) }))}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 8,
                      border: '1.5px solid #D1D5DB', fontSize: '0.85rem', fontWeight: 700,
                      outline: 'none',
                    }}
                  />
                  <p style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 4 }}>
                    Solicitadas: {resolucionModal.sol.horas_solicitadas}h. Puede ajustar a un valor menor.
                  </p>
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Observaciones {resolucionModal.aprobado ? '(opcional)' : '(motivo del rechazo)'}
                </label>
                <textarea
                  value={resForm.observaciones}
                  onChange={e => setResForm(p => ({ ...p, observaciones: e.target.value }))}
                  rows={3}
                  placeholder={resolucionModal.aprobado ? 'Observaciones opcionales...' : 'Explique el motivo del rechazo...'}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '1.5px solid #D1D5DB', fontSize: '0.82rem', resize: 'vertical',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Resuelto por
                </label>
                <input
                  value={resForm.resuelto_por}
                  onChange={e => setResForm(p => ({ ...p, resuelto_por: e.target.value }))}
                  placeholder={resolucionModal.sol.tipo === 'SNI' ? 'Nombre funcionario SNI' : 'Nombre funcionario SNPI/EAG'}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '1.5px solid #D1D5DB', fontSize: '0.82rem', outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setResolucionModal(null)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB',
                    background: 'white', color: '#6B7280', fontWeight: 600,
                    fontSize: '0.82rem', cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleResolver}
                  disabled={submitting || (!resolucionModal.aprobado && !resForm.observaciones)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                    background: resolucionModal.aprobado ? '#059669' : '#DC2626',
                    color: 'white', fontWeight: 700, fontSize: '0.82rem',
                    cursor: submitting ? 'wait' : 'pointer',
                    opacity: submitting || (!resolucionModal.aprobado && !resForm.observaciones) ? 0.5 : 1,
                  }}
                >
                  {submitting ? 'Procesando...' : resolucionModal.aprobado ? 'Confirmar aprobacion' : 'Confirmar rechazo'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailField({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Icon style={{ width: 12, height: 12, color: '#9CA3AF', flexShrink: 0 }} />
      <span style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}:</span>
      <span style={{ fontSize: '0.72rem', color: '#374151', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
    </div>
  );
}

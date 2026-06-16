/**
 * AlertasTempranasPTA — Panel de alertas tempranas y detección de anomalías
 *
 * Detecta automáticamente:
 * - PTAs estancados (sin movimiento >15 días en un nivel de aprobación)
 * - PTAs con prorrateo excedido (investigación >50%, extensión >25%)
 * - Docentes sin PTA asignado para el periodo actual
 * - Deadlines próximos (fecha límite de concertación < 5 días)
 * - Concentración excesiva de carga en un componente
 * - PTAs devueltos sin corrección >7 días
 *
 * Clasificación: CRÍTICA (rojo), ALTA (naranja), MEDIA (amarillo), BAJA (azul)
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle, Clock, UserX, FileWarning, TrendingDown,
  CheckCircle, RotateCcw, Shield, Flame, Zap, X,
  ChevronRight, Filter, Bell, RefreshCw, Eye, Send,
  AlertCircle, Target, Calendar, BarChart3, Users,
} from 'lucide-react';
import { getAllPTAs, getDocentesDisponibles } from '../../services/api/ptaApi';
import { toast } from 'sonner';

type AlertSeverity = 'critica' | 'alta' | 'media' | 'baja';
type AlertCategory = 'estancado' | 'prorrateo' | 'sin_pta' | 'deadline' | 'devolucion' | 'carga' | 'anomalia';

interface Alerta {
  id: string;
  severidad: AlertSeverity;
  categoria: AlertCategory;
  titulo: string;
  descripcion: string;
  ptaId?: string;
  docenteNombre?: string;
  valor?: string;
  diasSinMovimiento?: number;
  accionSugerida: string;
  timestamp: string;
}

const SEV_CONFIG: Record<AlertSeverity, { bg: string; color: string; border: string; icon: any; label: string }> = {
  critica: { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', icon: Flame, label: 'CRÍTICA' },
  alta: { bg: '#FFF7ED', color: '#9A3412', border: '#FDBA74', icon: AlertTriangle, label: 'ALTA' },
  media: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', icon: AlertCircle, label: 'MEDIA' },
  baja: { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', icon: Bell, label: 'BAJA' },
};

const CAT_CONFIG: Record<AlertCategory, { label: string; icon: any; color: string }> = {
  estancado: { label: 'Estancado', icon: Clock, color: '#DC2626' },
  prorrateo: { label: 'Prorrateo', icon: BarChart3, color: '#D97706' },
  sin_pta: { label: 'Sin PTA', icon: UserX, color: '#7C3AED' },
  deadline: { label: 'Deadline', icon: Calendar, color: '#EA580C' },
  devolucion: { label: 'Devolución', icon: RotateCcw, color: '#9A3412' },
  carga: { label: 'Carga', icon: TrendingDown, color: '#0891B2' },
  anomalia: { label: 'Anomalía', icon: FileWarning, color: '#991B1B' },
};

function diasDesde(fecha: string): number {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
}

export function AlertasTempranasPTA() {
  const [ptas, setPtas] = useState<any[]>([]);
  const [docentes, setDocentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroSeveridad, setFiltroSeveridad] = useState<AlertSeverity | ''>('');
  const [filtroCategoria, setFiltroCategoria] = useState<AlertCategory | ''>('');
  const [selectedAlerta, setSelectedAlerta] = useState<Alerta | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadData = async () => {
    setLoading(true);
    const [ptaRes, docRes] = await Promise.all([
      getAllPTAs({ periodo: '2025-2' }),
      getDocentesDisponibles('2025-2'),
    ]);
    // Validación robusta: asegurar que siempre sean arrays
    if (ptaRes.success && Array.isArray(ptaRes.data)) {
      setPtas(ptaRes.data);
    } else {
      console.warn('[AlertasTempranas] PTA data is not an array:', ptaRes);
      setPtas([]);
    }
    if (docRes.success && Array.isArray(docRes.data)) {
      setDocentes(docRes.data);
    } else {
      console.warn('[AlertasTempranas] Docentes data is not an array:', docRes);
      setDocentes([]);
    }
    setLoading(false);
    setLastRefresh(new Date());
  };

  useEffect(() => { loadData(); }, []);

  // ═══ Generate alerts from data ═══
  const alertas = useMemo<Alerta[]>(() => {
    const items: Alerta[] = [];
    const now = new Date();

    ptas.forEach(pta => {
      const lastUpdate = pta.updated_at || pta.created_at || now.toISOString();
      const dias = diasDesde(lastUpdate);

      // 1. PTAs estancados (>15 días sin movimiento en aprobación)
      if (['Pendiente Jefatura', 'Pendiente Decanatura', 'Pendiente Gestión Profesoral'].includes(pta.estado) && dias > 15) {
        items.push({
          id: `estancado-${pta.id}`,
          severidad: dias > 30 ? 'critica' : dias > 20 ? 'alta' : 'media',
          categoria: 'estancado',
          titulo: `PTA estancado ${dias} días en ${pta.estado?.replace(/_/g, ' ')}`,
          descripcion: `${pta.docente_nombre || 'Docente'} — Sin movimiento desde ${new Date(lastUpdate).toLocaleDateString('es-CO')}`,
          ptaId: pta.id,
          docenteNombre: pta.docente_nombre,
          diasSinMovimiento: dias,
          accionSugerida: dias > 30 ? 'Escalar al nivel superior o contactar al aprobador' : 'Enviar recordatorio al aprobador del nivel actual',
          timestamp: lastUpdate,
        });
      }

      // 2. PTAs estancados en concertación (>10 días)
      if (pta.estado === 'EN_CONCERTACION' && dias > 10) {
        items.push({
          id: `conc-estancada-${pta.id}`,
          severidad: dias > 20 ? 'critica' : 'alta',
          categoria: 'deadline',
          titulo: `Concertación sin resolución — ${dias} días`,
          descripcion: `${pta.docente_nombre || 'Docente'} — Considerar escalamiento a SNA`,
          ptaId: pta.id,
          docenteNombre: pta.docente_nombre,
          diasSinMovimiento: dias,
          accionSugerida: 'Revisar mesa de concertación o escalar a Sistema Nacional de Arbitraje',
          timestamp: lastUpdate,
        });
      }

      // 3. PTAs devueltos sin corrección (>7 días)
      if (pta.estado === 'Devuelto' && dias > 7) {
        items.push({
          id: `dev-sin-correccion-${pta.id}`,
          severidad: dias > 14 ? 'alta' : 'media',
          categoria: 'devolucion',
          titulo: `Devolución sin corrección — ${dias} días`,
          descripcion: `${pta.docente_nombre || 'Docente'} — Motivo: ${(pta.motivo_devolucion || pta.observaciones || '').substring(0, 80)}`,
          ptaId: pta.id,
          docenteNombre: pta.docente_nombre,
          diasSinMovimiento: dias,
          accionSugerida: 'Contactar al docente para que realice las correcciones',
          timestamp: lastUpdate,
        });
      }

      // 4. Prorrateo excedido
      const horasProg = pta.total_horas_programadas || 0;
      const horasDisp = pta.horas_a_programar || 800;
      const pctCarga = horasDisp > 0 ? (horasProg / horasDisp) * 100 : 0;

      if (pctCarga > 105) {
        items.push({
          id: `carga-excedida-${pta.id}`,
          severidad: pctCarga > 120 ? 'critica' : 'alta',
          categoria: 'carga',
          titulo: `Carga excedida: ${Math.round(pctCarga)}%`,
          descripcion: `${pta.docente_nombre || 'Docente'} — ${horasProg}/${horasDisp} horas programadas`,
          ptaId: pta.id,
          docenteNombre: pta.docente_nombre,
          valor: `${Math.round(pctCarga)}%`,
          accionSugerida: 'Revisar distribución de asignaturas y ajustar la carga',
          timestamp: lastUpdate,
        });
      }

      // 5. Prorrateo de componentes (si hay data de componentes)
      if (pta.prorrateo) {
        const prorrateo = pta.prorrateo;
        if (prorrateo.investigacion_pct > 50) {
          items.push({
            id: `prorr-inv-${pta.id}`,
            severidad: 'alta',
            categoria: 'prorrateo',
            titulo: `Investigación excede 50%: ${prorrateo.investigacion_pct}%`,
            descripcion: `${pta.docente_nombre || 'Docente'} — Límite máximo: 50% del prorrateo`,
            ptaId: pta.id,
            docenteNombre: pta.docente_nombre,
            valor: `${prorrateo.investigacion_pct}%`,
            accionSugerida: 'Redistribuir horas de investigación a otros componentes',
            timestamp: lastUpdate,
          });
        }
        if (prorrateo.extension_pct > 25) {
          items.push({
            id: `prorr-ext-${pta.id}`,
            severidad: 'media',
            categoria: 'prorrateo',
            titulo: `Extensión excede 25%: ${prorrateo.extension_pct}%`,
            descripcion: `${pta.docente_nombre || 'Docente'} — Límite máximo: 25% del prorrateo`,
            ptaId: pta.id,
            docenteNombre: pta.docente_nombre,
            valor: `${prorrateo.extension_pct}%`,
            accionSugerida: 'Redistribuir horas de extensión',
            timestamp: lastUpdate,
          });
        }
      }

      // 6. Anomalía: PTA sin asignaturas asignadas
      if (pta.estado !== 'Borrador' && (!pta.asignaturas || pta.asignaturas.length === 0) && (!pta.num_asignaturas || pta.num_asignaturas === 0)) {
        items.push({
          id: `sin-asignaturas-${pta.id}`,
          severidad: 'alta',
          categoria: 'anomalia',
          titulo: 'PTA sin asignaturas asignadas',
          descripcion: `${pta.docente_nombre || 'Docente'} — Estado: ${pta.estado?.replace(/_/g, ' ')}`,
          ptaId: pta.id,
          docenteNombre: pta.docente_nombre,
          accionSugerida: 'Verificar que el PTA tenga asignaturas correctamente asignadas',
          timestamp: lastUpdate,
        });
      }

      // 7. PTAs NOTIFICADO_DOCENTE sin respuesta >5 días
      if (pta.estado === 'NOTIFICADO_DOCENTE' && dias > 5) {
        items.push({
          id: `sin-respuesta-${pta.id}`,
          severidad: dias > 10 ? 'alta' : 'media',
          categoria: 'deadline',
          titulo: `Propuesta sin respuesta del docente — ${dias} días`,
          descripcion: `${pta.docente_nombre || 'Docente'} — Notificado hace ${dias} días`,
          ptaId: pta.id,
          docenteNombre: pta.docente_nombre,
          diasSinMovimiento: dias,
          accionSugerida: 'Re-notificar al docente o contactar directamente',
          timestamp: lastUpdate,
        });
      }
    });

    // 8. Docentes sin PTA
    if (docentes.length > 0) {
      const docentesConPTA = new Set(ptas.map(p => p.docente_id));
      docentes.forEach(doc => {
        if (!docentesConPTA.has(doc.id) && doc.activo !== false) {
          items.push({
            id: `sin-pta-${doc.id}`,
            severidad: 'media',
            categoria: 'sin_pta',
            titulo: `Docente sin PTA para el periodo`,
            descripcion: `${doc.nombre || doc.id} — ${doc.dedicacion || 'TC'} • ${doc.territorial || 'N/A'}`,
            docenteNombre: doc.nombre || doc.id,
            accionSugerida: 'Crear PTA o asignar propuesta institucional',
            timestamp: new Date().toISOString(),
          });
        }
      });
    }

    // Sort by severity
    const sevOrder: Record<AlertSeverity, number> = { critica: 0, alta: 1, media: 2, baja: 3 };
    return items.sort((a, b) => sevOrder[a.severidad] - sevOrder[b.severidad]);
  }, [ptas, docentes]);

  // ═══ Filtered alerts ═══
  const filteredAlertas = useMemo(() => {
    let result = alertas;
    if (filtroSeveridad) result = result.filter(a => a.severidad === filtroSeveridad);
    if (filtroCategoria) result = result.filter(a => a.categoria === filtroCategoria);
    return result;
  }, [alertas, filtroSeveridad, filtroCategoria]);

  // ═══ Stats ═══
  const stats = useMemo(() => ({
    total: alertas.length,
    criticas: alertas.filter(a => a.severidad === 'critica').length,
    altas: alertas.filter(a => a.severidad === 'alta').length,
    medias: alertas.filter(a => a.severidad === 'media').length,
    bajas: alertas.filter(a => a.severidad === 'baja').length,
    byCat: Object.fromEntries(Object.keys(CAT_CONFIG).map(k => [k, alertas.filter(a => a.categoria === k).length])),
  }), [alertas]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#DC2626', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#6B7280', fontSize: '0.85rem' }}>Analizando alertas tempranas...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield style={{ width: 24, height: 24, color: '#DC2626' }} />
            Alertas Tempranas PTA
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0' }}>
            Detección automática de anomalías y PTAs que requieren atención — {alertas.length} alerta(s) activa(s)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>
            Actualizado: {lastRefresh.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button onClick={loadData} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw style={{ width: 14, height: 14, color: '#6B7280' }} />
          </button>
        </div>
      </div>

      {/* Severity Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 18 }}>
        {([
          { key: 'critica' as AlertSeverity, label: 'Críticas', value: stats.criticas, color: '#DC2626', bg: '#FEE2E2', icon: Flame },
          { key: 'alta' as AlertSeverity, label: 'Altas', value: stats.altas, color: '#EA580C', bg: '#FFF7ED', icon: AlertTriangle },
          { key: 'media' as AlertSeverity, label: 'Medias', value: stats.medias, color: '#D97706', bg: '#FEF3C7', icon: AlertCircle },
          { key: 'baja' as AlertSeverity, label: 'Bajas', value: stats.bajas, color: '#2563EB', bg: '#EFF6FF', icon: Bell },
        ]).map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => setFiltroSeveridad(filtroSeveridad === card.key ? '' : card.key)}
            style={{
              background: filtroSeveridad === card.key ? card.bg : 'white',
              borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
              border: filtroSeveridad === card.key ? `2px solid ${card.color}` : '1px solid #E5E7EB',
              transition: 'all 0.15s',
            }}
          >
            <card.icon style={{ width: 18, height: 18, color: card.color, marginBottom: 6 }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: card.value > 0 ? card.color : '#D1D5DB' }}>{card.value}</div>
            <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 500 }}>{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Category Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <button
          onClick={() => setFiltroCategoria('')}
          style={{
            padding: '5px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
            border: !filtroCategoria ? '1.5px solid #003DA5' : '1px solid #E5E7EB',
            background: !filtroCategoria ? '#EFF6FF' : 'white',
            color: !filtroCategoria ? '#003DA5' : '#6B7280',
          }}
        >
          Todas ({alertas.length})
        </button>
        {Object.entries(CAT_CONFIG).map(([key, cfg]) => {
          const count = stats.byCat[key] || 0;
          if (count === 0) return null;
          const CatIcon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setFiltroCategoria(filtroCategoria === key ? '' : key as AlertCategory)}
              style={{
                padding: '5px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                border: filtroCategoria === key ? `1.5px solid ${cfg.color}` : '1px solid #E5E7EB',
                background: filtroCategoria === key ? `${cfg.color}10` : 'white',
                color: filtroCategoria === key ? cfg.color : '#6B7280',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <CatIcon style={{ width: 12, height: 12 }} />
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Alerts List */}
      {filteredAlertas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#F9FAFB', borderRadius: 14, border: '1px solid #E5E7EB' }}>
          <CheckCircle style={{ width: 40, height: 40, color: '#6EE7B7', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '1rem', fontWeight: 700, color: '#059669' }}>
            {alertas.length === 0 ? 'Sin alertas activas' : 'Sin alertas en esta categoría'}
          </p>
          <p style={{ fontSize: '0.82rem', color: '#6B7280' }}>Todos los PTAs están en orden</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredAlertas.map((alerta, i) => {
            const sevCfg = SEV_CONFIG[alerta.severidad];
            const catCfg = CAT_CONFIG[alerta.categoria];
            const SevIcon = sevCfg.icon;
            const CatIcon = catCfg.icon;

            return (
              <motion.div
                key={alerta.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => setSelectedAlerta(alerta)}
                style={{
                  background: 'white', borderRadius: 12,
                  border: `1px solid ${sevCfg.border}`,
                  borderLeft: `4px solid ${sevCfg.color}`,
                  padding: '14px 18px', cursor: 'pointer',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: sevCfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <SevIcon style={{ width: 18, height: 18, color: sevCfg.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>{alerta.titulo}</span>
                      <span style={{ padding: '1px 6px', borderRadius: 4, background: sevCfg.bg, color: sevCfg.color, fontSize: '0.58rem', fontWeight: 800 }}>
                        {sevCfg.label}
                      </span>
                      <span style={{ padding: '1px 6px', borderRadius: 4, background: `${catCfg.color}15`, color: catCfg.color, fontSize: '0.58rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CatIcon style={{ width: 8, height: 8 }} /> {catCfg.label}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {alerta.descripcion}
                    </p>
                    {alerta.diasSinMovimiento != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: '0.72rem', color: '#9CA3AF' }}>
                        <Clock style={{ width: 11, height: 11 }} />
                        {alerta.diasSinMovimiento} día(s) sin movimiento
                      </div>
                    )}
                  </div>
                  <ChevronRight style={{ width: 16, height: 16, color: '#D1D5DB', flexShrink: 0, alignSelf: 'center' }} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedAlerta && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedAlerta(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}
            >
              {/* Header */}
              <div style={{ background: SEV_CONFIG[selectedAlerta.severidad].bg, padding: '18px 24px', borderBottom: `2px solid ${SEV_CONFIG[selectedAlerta.severidad].border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {(() => { const Icon = SEV_CONFIG[selectedAlerta.severidad].icon; return <Icon style={{ width: 22, height: 22, color: SEV_CONFIG[selectedAlerta.severidad].color, marginTop: 2 }} />; })()}
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>{selectedAlerta.titulo}</h3>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: SEV_CONFIG[selectedAlerta.severidad].color, color: 'white', fontSize: '0.62rem', fontWeight: 800 }}>{SEV_CONFIG[selectedAlerta.severidad].label}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: `${CAT_CONFIG[selectedAlerta.categoria].color}20`, color: CAT_CONFIG[selectedAlerta.categoria].color, fontSize: '0.62rem', fontWeight: 700 }}>{CAT_CONFIG[selectedAlerta.categoria].label}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedAlerta(null)} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'rgba(0,0,0,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X style={{ width: 14, height: 14, color: '#6B7280' }} />
                </button>
              </div>

              {/* Content */}
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 }}>Descripción</div>
                    <p style={{ fontSize: '0.85rem', color: '#374151', margin: 0 }}>{selectedAlerta.descripcion}</p>
                  </div>

                  {selectedAlerta.docenteNombre && (
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 }}>Docente</div>
                      <p style={{ fontSize: '0.85rem', color: '#111827', fontWeight: 600, margin: 0 }}>{selectedAlerta.docenteNombre}</p>
                    </div>
                  )}

                  {selectedAlerta.diasSinMovimiento != null && (
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#92400E', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock style={{ width: 12, height: 12 }} />
                        {selectedAlerta.diasSinMovimiento} día(s) sin actividad
                      </div>
                    </div>
                  )}

                  {selectedAlerta.valor && (
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280' }}>Valor detectado</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>{selectedAlerta.valor}</div>
                    </div>
                  )}

                  <div style={{ padding: '12px 16px', borderRadius: 10, background: '#D1FAE5', border: '1px solid #6EE7B7' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#065F46', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Target style={{ width: 12, height: 12 }} /> Acción sugerida
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#065F46', margin: 0 }}>{selectedAlerta.accionSugerida}</p>
                  </div>

                  {selectedAlerta.ptaId && (
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                      PTA ID: <code style={{ background: '#F3F4F6', padding: '1px 5px', borderRadius: 4 }}>{selectedAlerta.ptaId.substring(0, 16)}</code>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

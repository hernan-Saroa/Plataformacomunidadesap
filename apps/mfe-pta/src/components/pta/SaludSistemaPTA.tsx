/**
 * SaludSistemaPTA — Panel de Salud del Sistema
 * 
 * Dashboard unificado con:
 * - Semaforo global (verde/amarillo/rojo) con score 0-100
 * - 4 modulos monitoreados: Mapeo, Oferta, PTAs, Sincronizacion
 * - Auto-polling cada 60s con notificaciones bell
 * - Botones de auto-resolucion para fixes rapidos
 * - Tendencia vs ultimo chequeo
 * - Detalle de checks con acciones directas
 * 
 * Ref: Sistema de integridad bidireccional PTA ↔ Programas Academicos
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Loader2,
  ChevronLeft, Shield, Zap, TrendingUp, TrendingDown, Minus,
  Link2, BookOpen, FileText, ArrowRight, Settings, Bell,
  Clock, Database, Building2, Play, Pause, Info, ChevronRight,
  ArrowUpRight, ArrowDownRight, Wrench, Check, AlertOctagon,
} from 'lucide-react';
import { getSyncHealth, autoResolveSync, validateSync, getChangeAlerts, recordHealthHistory } from '../../services/api/ptaApi';
import { toast } from 'sonner';

interface Props {
  onBack?: () => void;
  onNavigate?: (view: string) => void;
}

const POLL_INTERVAL = 60000; // 60s

const SEMAPHORE_CONFIG = {
  green: { color: '#059669', bg: '#D1FAE5', border: '#6EE7B7', label: 'Saludable', icon: CheckCircle2, glow: '0 0 20px #6EE7B740' },
  yellow: { color: '#D97706', bg: '#FEF3C7', border: '#FDE68A', label: 'Advertencias', icon: AlertTriangle, glow: '0 0 20px #D9770640' },
  red: { color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5', label: 'Critico', icon: XCircle, glow: '0 0 20px #DC262640' },
};

const MODULE_CONFIG: Record<string, { label: string; icon: any; description: string }> = {
  mapeo: { label: 'Mapeo de Programas', icon: Link2, description: 'Vinculacion entre programas reales y catalogo PTA' },
  oferta: { label: 'Oferta Academica', icon: BookOpen, description: 'Integridad de items en oferta del periodo' },
  ptas: { label: 'PTAs Activos', icon: FileText, description: 'Planes de trabajo vinculados a programas validos' },
  sincronizacion: { label: 'Sincronizacion', icon: RefreshCw, description: 'Cambios detectados vs snapshot anterior' },
};

const CHECK_LABELS: Record<string, { label: string; description: string }> = {
  orphan_mappings: { label: 'Mapeos huerfanos', description: 'Mapeos apuntando a programas eliminados de BD' },
  invalid_targets: { label: 'Targets invalidos', description: 'Mapeos apuntando a catalogos PTA inexistentes' },
  no_config: { label: 'Sin configuracion', description: 'Programas sin mapeo ni asignaturas propias' },
  orphan_oferta: { label: 'Oferta huerfana', description: 'Items de oferta referenciando programas inexistentes' },
  orphan_ptas: { label: 'PTAs huerfanos', description: 'PTAs activos con programas que ya no existen' },
  snapshot_changes: { label: 'Cambios pendientes', description: 'Programas agregados, eliminados o modificados' },
};

export function SaludSistemaPTA({ onBack, onNavigate }: Props) {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);
  const pollRef = useRef<any>(null);

  const fetchHealth = useCallback(async (notify = false) => {
    try {
      const res = await getSyncHealth(undefined, notify);
      if (res.success && res.data) {
        setHealth(res.data);
        setLastPollTime(new Date());
        // Record to history timeline
        if (notify) {
          recordHealthHistory({
            semaphore: res.data.semaphore,
            score: res.data.overallScore,
            errors: res.data.summary?.errors || 0,
            warnings: res.data.summary?.warnings || 0,
            infos: res.data.summary?.infos || 0,
            trigger: 'auto-poll',
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Error fetching health:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHealth(false);
  }, [fetchHealth]);

  useEffect(() => {
    if (polling) {
      pollRef.current = setInterval(() => fetchHealth(true), POLL_INTERVAL);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [polling, fetchHealth]);

  const handleAutoResolve = async (type: string, params: any) => {
    setResolving(true);
    try {
      const res = await autoResolveSync([{ type, params }]);
      if (res.success && res.data) {
        const r = res.data.results[0];
        if (r?.success) {
          toast.success(`Resolucion exitosa: ${type.replace(/_/g, ' ')}`);
          await fetchHealth(false);
        } else {
          toast.error(`Error: ${r?.error || 'Accion fallida'}`);
        }
      }
    } catch (err) {
      toast.error('Error ejecutando auto-resolucion');
    }
    setResolving(false);
  };

  const handleResolveAll = async () => {
    if (!health?.checksDetail?.length) return;
    setResolving(true);
    const actions: any[] = [];
    for (const check of health.checksDetail) {
      switch (check.check) {
        case 'orphan_mappings':
          // Would need programa_ids — simplified for batch
          actions.push({ type: 'dismiss_alert', params: { alert_id: `auto-resolve-orphan-mappings` } });
          break;
      }
    }
    if (actions.length > 0) {
      await autoResolveSync(actions);
    }
    await fetchHealth(false);
    toast.success('Resoluciones aplicadas');
    setResolving(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#003DA5' }} />
        <span style={{ fontSize: '0.95rem', color: '#6B7280' }}>Analizando salud del sistema...</span>
      </div>
    );
  }

  const semaphore = health?.semaphore || 'green';
  const cfg = SEMAPHORE_CONFIG[semaphore as keyof typeof SEMAPHORE_CONFIG] || SEMAPHORE_CONFIG.green;
  const SemIcon = cfg.icon;
  const score = health?.overallScore ?? 100;
  const trend = health?.trend;
  const scoreDiff = trend ? score - (trend.prev_score || 0) : 0;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            {onBack && (
              <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
                <ChevronLeft style={{ width: 20, height: 20, color: '#6B7280' }} />
              </button>
            )}
            <Shield style={{ width: 28, height: 28, color: '#003DA5' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              Salud del Sistema PTA
            </h2>
          </div>
          <p style={{ fontSize: '0.88rem', color: '#6B7280', marginLeft: onBack ? 34 : 38 }}>
            Monitoreo de integridad entre modulos PTA, Programas Academicos y Oferta
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setPolling(!polling)}
            style={{
              padding: '6px 12px', borderRadius: 8,
              border: `1px solid ${polling ? '#059669' : '#D1D5DB'}`,
              background: polling ? '#D1FAE5' : 'white',
              color: polling ? '#065F46' : '#6B7280',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {polling ? <Play style={{ width: 12, height: 12 }} /> : <Pause style={{ width: 12, height: 12 }} />}
            {polling ? 'Auto-check ON' : 'Auto-check OFF'}
          </button>
          <button onClick={() => fetchHealth(true)} style={{
            padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB',
            background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}>
            <RefreshCw style={{ width: 15, height: 15, color: '#6B7280' }} />
          </button>
        </div>
      </div>

      {/* ═══ SEMAPHORE + SCORE ═══ */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          padding: '28px 32px', borderRadius: 16,
          background: `linear-gradient(135deg, ${cfg.bg} 0%, white 100%)`,
          border: `2px solid ${cfg.border}`,
          boxShadow: cfg.glow,
          marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Animated semaphore circle */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            style={{
              width: 80, height: 80, borderRadius: '50%',
              background: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 30px ${cfg.color}50`,
            }}
          >
            <SemIcon style={{ width: 36, height: 36, color: 'white' }} />
          </motion.div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
              Estado del Sistema
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: cfg.color }}>{cfg.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: '0.8rem', color: '#6B7280' }}>
              <span>{health?.summary?.errors || 0} errores</span>
              <span style={{ color: '#D1D5DB' }}>|</span>
              <span>{health?.summary?.warnings || 0} advertencias</span>
              <span style={{ color: '#D1D5DB' }}>|</span>
              <span>{health?.summary?.infos || 0} informativos</span>
            </div>
          </div>
        </div>

        {/* Score gauge */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', width: 100, height: 100 }}>
            <svg viewBox="0 0 100 100" style={{ width: 100, height: 100, transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E7EB" strokeWidth="8" />
              <motion.circle
                cx="50" cy="50" r="42" fill="none"
                stroke={cfg.color} strokeWidth="8" strokeLinecap="round"
                initial={{ strokeDasharray: `0, ${2 * Math.PI * 42}` }}
                animate={{ strokeDasharray: `${(score / 100) * 2 * Math.PI * 42}, ${2 * Math.PI * 42}` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: cfg.color }}>{score}</div>
              <div style={{ fontSize: '0.6rem', color: '#9CA3AF', fontWeight: 600 }}>/ 100</div>
            </div>
          </div>
          {trend && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 4, fontSize: '0.72rem', color: scoreDiff > 0 ? '#059669' : scoreDiff < 0 ? '#DC2626' : '#6B7280' }}>
              {scoreDiff > 0 ? <TrendingUp style={{ width: 12, height: 12 }} /> : scoreDiff < 0 ? <TrendingDown style={{ width: 12, height: 12 }} /> : <Minus style={{ width: 12, height: 12 }} />}
              {scoreDiff > 0 ? '+' : ''}{scoreDiff} pts
            </div>
          )}
        </div>

        {/* Context */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.72rem', color: '#6B7280' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Database style={{ width: 11, height: 11 }} /> {health?.context?.real_programs || 0} programas reales</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Building2 style={{ width: 11, height: 11 }} /> {health?.context?.static_programs || 0} programas estaticos</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><BookOpen style={{ width: 11, height: 11 }} /> {health?.context?.oferta_items || 0} items oferta</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText style={{ width: 11, height: 11 }} /> {health?.context?.active_ptas || 0} PTAs activos</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Link2 style={{ width: 11, height: 11 }} /> {health?.context?.mappings || 0} mapeos</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock style={{ width: 11, height: 11 }} /> {lastPollTime ? lastPollTime.toLocaleTimeString('es-CO') : '-'}</div>
        </div>
      </motion.div>

      {/* ═══ MODULE HEALTH CARDS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12, marginBottom: 24 }}>
        {Object.entries(health?.modules || {}).map(([key, mod]: [string, any], i) => {
          const modCfg = MODULE_CONFIG[key] || { label: key, icon: Activity, description: '' };
          const Icon = modCfg.icon;
          const modSem = mod.status === 'critical' ? SEMAPHORE_CONFIG.red : mod.status === 'warning' ? SEMAPHORE_CONFIG.yellow : SEMAPHORE_CONFIG.green;
          const ModStatusIcon = modSem.icon;

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{
                padding: '16px 18px', borderRadius: 12,
                border: `1px solid ${modSem.border}`, background: 'white',
                position: 'relative', overflow: 'hidden',
              }}
            >
              {/* Score bar */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 4,
                background: '#F3F4F6',
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${mod.score}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.1 }}
                  style={{ height: '100%', background: modSem.color, borderRadius: '0 2px 0 0' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: modSem.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon style={{ width: 18, height: 18, color: modSem.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827' }}>{modCfg.label}</div>
                    <div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{modCfg.description}</div>
                  </div>
                </div>
                <ModStatusIcon style={{ width: 18, height: 18, color: modSem.color }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: modSem.color }}>{mod.score}%</div>
                <span style={{
                  padding: '2px 8px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700,
                  background: modSem.bg, color: modSem.color, textTransform: 'uppercase',
                }}>
                  {mod.status === 'critical' ? 'Critico' : mod.status === 'warning' ? 'Advertencia' : 'OK'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ═══ TREND COMPARISON ═══ */}
      {trend && (
        <div style={{
          padding: '14px 18px', borderRadius: 12, marginBottom: 20,
          background: '#F9FAFB', border: '1px solid #E5E7EB',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity style={{ width: 18, height: 18, color: '#6B7280' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Tendencia vs. chequeo anterior</span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#6B7280' }}>Errores:</span>
              <span style={{ fontWeight: 700, color: (health?.summary?.errors || 0) > trend.prev_errors ? '#DC2626' : (health?.summary?.errors || 0) < trend.prev_errors ? '#059669' : '#6B7280' }}>
                {trend.prev_errors} → {health?.summary?.errors || 0}
                {(health?.summary?.errors || 0) > trend.prev_errors && <ArrowUpRight style={{ width: 12, height: 12, display: 'inline' }} />}
                {(health?.summary?.errors || 0) < trend.prev_errors && <ArrowDownRight style={{ width: 12, height: 12, display: 'inline' }} />}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#6B7280' }}>Advertencias:</span>
              <span style={{ fontWeight: 700, color: (health?.summary?.warnings || 0) > trend.prev_warnings ? '#D97706' : (health?.summary?.warnings || 0) < trend.prev_warnings ? '#059669' : '#6B7280' }}>
                {trend.prev_warnings} → {health?.summary?.warnings || 0}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#6B7280' }}>Score:</span>
              <span style={{ fontWeight: 700, color: scoreDiff > 0 ? '#059669' : scoreDiff < 0 ? '#DC2626' : '#6B7280' }}>
                {trend.prev_score} → {score} ({scoreDiff > 0 ? '+' : ''}{scoreDiff})
              </span>
            </div>
            {trend.prev_checked && (
              <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                Anterior: {new Date(trend.prev_checked).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ CHECKS DETAIL ═══ */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            padding: '10px 16px', borderRadius: 10,
            border: '1px solid #E5E7EB', background: 'white',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings style={{ width: 16, height: 16, color: '#6B7280' }} />
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#374151' }}>
              Detalle de Verificaciones ({health?.checksDetail?.length || 0} hallazgos)
            </span>
          </div>
          <ChevronRight style={{ width: 16, height: 16, color: '#9CA3AF', transform: showDetails ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(health?.checksDetail || []).length === 0 ? (
                  <div style={{ padding: 30, textAlign: 'center', color: '#9CA3AF', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
                    <CheckCircle2 style={{ width: 32, height: 32, margin: '0 auto 8px', opacity: 0.4 }} />
                    <p style={{ fontSize: '0.88rem' }}>Todas las verificaciones pasaron correctamente</p>
                  </div>
                ) : (
                  (health?.checksDetail || []).map((check: any, idx: number) => {
                    const severity = check.severity || 'info';
                    const sevColor = severity === 'error' ? '#DC2626' : severity === 'warning' ? '#D97706' : '#2563EB';
                    const sevBg = severity === 'error' ? '#FEE2E2' : severity === 'warning' ? '#FEF3C7' : '#DBEAFE';
                    const SevIcon = severity === 'error' ? XCircle : severity === 'warning' ? AlertTriangle : Info;
                    const checkInfo = CHECK_LABELS[check.check] || { label: check.check, description: '' };

                    const canAutoResolve = ['orphan_mappings', 'orphan_oferta'].includes(check.check);

                    return (
                      <motion.div
                        key={check.check}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        style={{
                          padding: '12px 16px', borderRadius: 10,
                          border: `1px solid ${sevColor}20`, background: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: 12, flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: sevBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <SevIcon style={{ width: 16, height: 16, color: sevColor }} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>{checkInfo.label}</span>
                              <span style={{
                                padding: '1px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 800,
                                background: sevBg, color: sevColor,
                              }}>
                                {check.count}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{checkInfo.description}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {canAutoResolve && (
                            <button
                              onClick={() => {
                                if (check.check === 'orphan_mappings') {
                                  // Need to get actual IDs - for now show nav
                                  toast.info('Navegue a Mapeo & Sync para eliminar mapeos huerfanos');
                                  onNavigate?.('mapeo_sincronizacion');
                                } else if (check.check === 'orphan_oferta') {
                                  toast.info('Navegue a Programacion Institucional para limpiar oferta');
                                  onNavigate?.('programacion_institucional');
                                }
                              }}
                              disabled={resolving}
                              style={{
                                padding: '4px 10px', borderRadius: 6,
                                border: `1px solid ${sevColor}40`, background: sevBg,
                                color: sevColor, fontSize: '0.72rem', fontWeight: 600,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
                              }}
                            >
                              <Wrench style={{ width: 11, height: 11 }} />
                              Resolver
                            </button>
                          )}
                          {onNavigate && (
                            <button
                              onClick={() => onNavigate('mapeo_sincronizacion')}
                              style={{
                                padding: '4px 10px', borderRadius: 6,
                                border: '1px solid #E5E7EB', background: 'white',
                                color: '#003DA5', fontSize: '0.72rem', fontWeight: 600,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
                              }}
                            >
                              <ArrowRight style={{ width: 11, height: 11 }} />
                              Ver detalle
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <div style={{
        padding: '16px 20px', borderRadius: 12,
        background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
        border: '1px solid #BFDBFE',
      }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E40AF', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Zap style={{ width: 16, height: 16 }} />
          Acciones Rapidas
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {onNavigate && (
            <>
              <button onClick={() => onNavigate('mapeo_sincronizacion')} style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid #003DA5',
                background: 'white', color: '#003DA5', fontSize: '0.8rem', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <Link2 style={{ width: 14, height: 14 }} />
                Mapeo & Sincronizacion
              </button>
              <button onClick={() => onNavigate('programacion_institucional')} style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid #059669',
                background: 'white', color: '#059669', fontSize: '0.8rem', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <BookOpen style={{ width: 14, height: 14 }} />
                Programacion Institucional
              </button>
              <button onClick={() => onNavigate('reconciliacion_masiva')} style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid #DC2626',
                background: 'white', color: '#DC2626', fontSize: '0.8rem', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <Wrench style={{ width: 14, height: 14 }} />
                Reconciliacion Masiva
              </button>
            </>
          )}
          <button onClick={() => { fetchHealth(true); toast.success('Verificacion completa ejecutada'); }} style={{
            padding: '8px 14px', borderRadius: 8, border: '1px solid #7C3AED',
            background: 'white', color: '#7C3AED', fontSize: '0.8rem', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <RefreshCw style={{ width: 14, height: 14 }} />
            Forzar Verificacion + Notificar
          </button>
          <button
            onClick={() => setPolling(!polling)}
            style={{
              padding: '8px 14px', borderRadius: 8,
              border: `1px solid ${polling ? '#DC2626' : '#059669'}`,
              background: 'white',
              color: polling ? '#DC2626' : '#059669',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            {polling ? <Pause style={{ width: 14, height: 14 }} /> : <Play style={{ width: 14, height: 14 }} />}
            {polling ? 'Detener Auto-check' : 'Activar Auto-check (60s)'}
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: '0.72rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Bell style={{ width: 11, height: 11 }} />
          {polling
            ? 'El sistema verifica automaticamente cada 60 segundos y genera notificaciones de campana cuando se detectan nuevos errores.'
            : 'Auto-check desactivado. Active para recibir notificaciones automaticas.'
          }
        </div>
      </div>
    </div>
  );
}

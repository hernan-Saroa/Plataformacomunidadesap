/**
 * ReconciliacionMasivaPTA — Panel de Reconciliacion Masiva
 * 
 * Permite seleccionar multiples inconsistencias, ver preview
 * detallado del impacto, y aplicar batch en una sola operacion.
 * Incluye timeline de historial de health scores y exportacion PDF.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Info, Zap, Shield, FileText, ArrowRight, Check, Square, CheckSquare,
  Download, Clock, Activity, TrendingUp, TrendingDown, Minus,
  Eye, Play, AlertOctagon, Wrench, BookOpen, Link2,
} from 'lucide-react';
import {
  getReconciliationPreview, applyReconciliation, getHealthHistory,
  getSyncHealth, recordHealthHistory,
} from '../../services/api/ptaApi';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';

interface Props {
  onBack?: () => void;
  onNavigate?: (view: string) => void;
}

const SEV_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  error: { color: '#DC2626', bg: '#FEE2E2', icon: XCircle, label: 'Error' },
  warning: { color: '#D97706', bg: '#FEF3C7', icon: AlertTriangle, label: 'Advertencia' },
  info: { color: '#2563EB', bg: '#DBEAFE', icon: Info, label: 'Informativo' },
};

const TYPE_ICONS: Record<string, any> = {
  delete_orphan_mapping: Link2,
  remove_orphan_oferta: BookOpen,
  propagate_rename: ArrowRight,
  flag_review: AlertOctagon,
};

export function ReconciliacionMasivaPTA({ onBack, onNavigate }: Props) {
  const [tab, setTab] = useState<'reconcile' | 'history'>('reconcile');
  const [preview, setPreview] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showResults, setShowResults] = useState<any>(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    const res = await getReconciliationPreview();
    if (res.success && res.data) setPreview(res.data);
    setLoading(false);
  }, []);

  const loadHistory = useCallback(async () => {
    const res = await getHealthHistory(50);
    if (res.success && res.data) setHistory(res.data.entries || []);
  }, []);

  useEffect(() => {
    loadPreview();
    loadHistory();
  }, [loadPreview, loadHistory]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    if (!preview?.actions) return;
    const autoFixable = preview.actions.filter((a: any) => !a.manual_only);
    if (selected.size === autoFixable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(autoFixable.map((a: any) => a.id)));
    }
  };

  const handleApply = async () => {
    if (selected.size === 0) { toast.error('Seleccione al menos una accion'); return; }
    setApplying(true);
    try {
      const res = await applyReconciliation(Array.from(selected));
      if (res.success && res.data) {
        setShowResults(res.data);
        toast.success(`${res.data.successful} de ${res.data.total} acciones aplicadas`);
        // Record to history
        const healthRes = await getSyncHealth();
        if (healthRes.success && healthRes.data) {
          await recordHealthHistory({
            semaphore: healthRes.data.semaphore,
            score: healthRes.data.overallScore,
            errors: healthRes.data.summary.errors,
            warnings: healthRes.data.summary.warnings,
            infos: healthRes.data.summary.infos,
            trigger: 'reconciliation',
          });
        }
        setSelected(new Set());
        await loadPreview();
        await loadHistory();
      } else {
        toast.error('Error aplicando reconciliacion');
      }
    } catch { toast.error('Error aplicando reconciliacion'); }
    setApplying(false);
  };

  const generatePDFReport = () => {
    // Generate client-side HTML-based report
    const now = new Date();
    const healthData = preview;
    const historyData = history.slice(0, 20);
    
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Reporte Salud Sistema PTA - ${now.toLocaleDateString('es-CO')}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #111827; font-size: 12px; }
  h1 { color: #003DA5; font-size: 20px; border-bottom: 3px solid #003DA5; padding-bottom: 8px; }
  h2 { color: #1E40AF; font-size: 16px; margin-top: 24px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-weight: 700; font-size: 11px; }
  .badge-green { background: #D1FAE5; color: #065F46; }
  .badge-yellow { background: #FEF3C7; color: #92400E; }
  .badge-red { background: #FEE2E2; color: #991B1B; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th { background: #F3F4F6; padding: 8px 12px; text-align: left; font-size: 11px; border-bottom: 2px solid #E5E7EB; }
  td { padding: 6px 12px; border-bottom: 1px solid #F3F4F6; font-size: 11px; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
  .summary-card { padding: 12px; border-radius: 8px; border: 1px solid #E5E7EB; text-align: center; }
  .summary-card .value { font-size: 24px; font-weight: 800; }
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #E5E7EB; font-size: 10px; color: #9CA3AF; }
  @media print { body { margin: 20px; } }
</style></head><body>
<div class="header">
  <div><h1>Reporte de Salud del Sistema PTA</h1>
  <p>ESAP - Backoffice Administrativo | Generado: ${now.toLocaleString('es-CO')}</p></div>
</div>

<h2>Estado Actual</h2>
<div class="summary-grid">
  <div class="summary-card"><div class="value" style="color:#003DA5">${healthData?.summary?.total || 0}</div><div>Hallazgos Totales</div></div>
  <div class="summary-card"><div class="value" style="color:#DC2626">${healthData?.summary?.errors || 0}</div><div>Errores</div></div>
  <div class="summary-card"><div class="value" style="color:#D97706">${healthData?.summary?.warnings || 0}</div><div>Advertencias</div></div>
  <div class="summary-card"><div class="value" style="color:#2563EB">${healthData?.summary?.infos || 0}</div><div>Informativos</div></div>
</div>

<h2>Acciones Pendientes de Reconciliacion</h2>
<table>
  <thead><tr><th>Tipo</th><th>Severidad</th><th>Descripcion</th><th>Impacto</th><th>Auto-fix</th></tr></thead>
  <tbody>
    ${(healthData?.actions || []).map((a: any) => `<tr>
      <td>${a.type}</td>
      <td><span class="badge badge-${a.severity === 'error' ? 'red' : a.severity === 'warning' ? 'yellow' : 'green'}">${a.severity}</span></td>
      <td>${a.title}</td>
      <td>${a.impact || '-'}</td>
      <td>${a.manual_only ? 'Manual' : 'Si'}</td>
    </tr>`).join('')}
    ${(healthData?.actions || []).length === 0 ? '<tr><td colspan="5" style="text-align:center;color:#9CA3AF">Sin acciones pendientes</td></tr>' : ''}
  </tbody>
</table>

<h2>Historial de Scores (ultimos ${historyData.length})</h2>
<table>
  <thead><tr><th>Fecha</th><th>Trigger</th><th>Semaforo</th><th>Score</th><th>Errores</th><th>Advertencias</th></tr></thead>
  <tbody>
    ${historyData.map((h: any) => `<tr>
      <td>${h.timestamp ? new Date(h.timestamp).toLocaleString('es-CO') : '-'}</td>
      <td>${h.trigger || '-'}</td>
      <td><span class="badge badge-${h.semaphore === 'red' ? 'red' : h.semaphore === 'yellow' ? 'yellow' : 'green'}">${h.semaphore || '-'}</span></td>
      <td>${h.score ?? '-'}</td>
      <td>${h.errors ?? '-'}</td>
      <td>${h.warnings ?? '-'}</td>
    </tr>`).join('')}
    ${historyData.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#9CA3AF">Sin historial</td></tr>' : ''}
  </tbody>
</table>

<div class="footer">
  <p>ESAP - Escuela Superior de Administracion Publica | Modulo PTA | Reporte generado automaticamente</p>
  <p>Periodo: 2026-1 | Este documento es informativo y no constituye acta oficial.</p>
</div>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      setTimeout(() => { win.print(); }, 500);
    }
    toast.success('Reporte generado. Use Ctrl+P para guardar como PDF.');
  };

  // Chart data
  const chartData = [...history].reverse().map(h => ({
    time: h.timestamp ? new Date(h.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '',
    score: h.score ?? 100,
    errors: h.errors ?? 0,
    warnings: h.warnings ?? 0,
    trigger: h.trigger,
  }));

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#003DA5' }} />
        <span style={{ fontSize: '0.95rem', color: '#6B7280' }}>Analizando inconsistencias...</span>
      </div>
    );
  }

  const actions = preview?.actions || [];
  const summary = preview?.summary || {};
  const autoFixable = actions.filter((a: any) => !a.manual_only);
  const manualOnly = actions.filter((a: any) => a.manual_only);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            {onBack && <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}><ChevronLeft style={{ width: 20, height: 20, color: '#6B7280' }} /></button>}
            <Wrench style={{ width: 26, height: 26, color: '#003DA5' }} />
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', margin: 0 }}>Reconciliacion Masiva</h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#6B7280', marginLeft: onBack ? 34 : 36 }}>Seleccione, previsualice y aplique correcciones de integridad en batch</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={generatePDFReport} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #003DA5', background: 'white', color: '#003DA5', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Download style={{ width: 13, height: 13 }} /> Exportar PDF
          </button>
          <button onClick={() => { loadPreview(); loadHistory(); }} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <RefreshCw style={{ width: 14, height: 14, color: '#6B7280' }} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: '#F3F4F6', borderRadius: 10, padding: 3 }}>
        {(['reconcile', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none',
            background: tab === t ? 'white' : 'transparent',
            color: tab === t ? '#003DA5' : '#6B7280',
            fontWeight: tab === t ? 700 : 500, fontSize: '0.82rem',
            cursor: 'pointer', boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {t === 'reconcile' ? <><Wrench style={{ width: 14, height: 14 }} /> Reconciliar ({actions.length})</> : <><Activity style={{ width: 14, height: 14 }} /> Historial ({history.length})</>}
          </button>
        ))}
      </div>

      {tab === 'reconcile' && (
        <>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Total', value: summary.total || 0, color: '#003DA5' },
              { label: 'Auto-fix', value: summary.auto_fixable || 0, color: '#059669' },
              { label: 'Manual', value: summary.manual_review || 0, color: '#D97706' },
              { label: 'Errores', value: summary.errors || 0, color: '#DC2626' },
              { label: 'Advertencias', value: summary.warnings || 0, color: '#D97706' },
              { label: 'Seleccionados', value: selected.size, color: '#7C3AED' },
            ].map(s => (
              <div key={s.label} style={{ padding: '12px 14px', borderRadius: 10, background: 'white', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Action bar */}
          {autoFixable.length > 0 && (
            <div style={{
              padding: '10px 16px', borderRadius: 10, marginBottom: 14,
              background: '#EFF6FF', border: '1px solid #BFDBFE',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            }}>
              <button onClick={selectAll} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #003DA5', background: 'white', color: '#003DA5', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                {selected.size === autoFixable.length ? <CheckSquare style={{ width: 13, height: 13 }} /> : <Square style={{ width: 13, height: 13 }} />}
                {selected.size === autoFixable.length ? 'Deseleccionar todos' : `Seleccionar todos (${autoFixable.length})`}
              </button>
              <button
                onClick={handleApply}
                disabled={applying || selected.size === 0}
                style={{
                  padding: '6px 16px', borderRadius: 8, border: 'none',
                  background: selected.size > 0 ? '#003DA5' : '#D1D5DB',
                  color: 'white', fontSize: '0.82rem', fontWeight: 700,
                  cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {applying ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : <Play style={{ width: 14, height: 14 }} />}
                Aplicar {selected.size} accion(es)
              </button>
            </div>
          )}

          {/* Results toast */}
          <AnimatePresence>
            {showResults && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  padding: '12px 16px', borderRadius: 10, marginBottom: 14,
                  background: showResults.failed === 0 ? '#D1FAE5' : '#FEF3C7',
                  border: `1px solid ${showResults.failed === 0 ? '#6EE7B7' : '#FDE68A'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 style={{ width: 18, height: 18, color: '#059669' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {showResults.successful} exitosas, {showResults.failed} fallidas
                  </span>
                </div>
                <button onClick={() => setShowResults(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#6B7280' }}>Cerrar</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions list */}
          {actions.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', background: '#F0FDF4', borderRadius: 12, border: '2px solid #A7F3D0' }}>
              <CheckCircle2 style={{ width: 40, height: 40, color: '#059669', margin: '0 auto 12px', opacity: 0.6 }} />
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#065F46' }}>Sin inconsistencias</div>
              <div style={{ fontSize: '0.85rem', color: '#047857', marginTop: 4 }}>Todos los modulos estan sincronizados correctamente.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Auto-fixable */}
              {autoFixable.length > 0 && (
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Zap style={{ width: 12, height: 12 }} /> Auto-resoluble ({autoFixable.length})
                </div>
              )}
              {autoFixable.map((action: any, i: number) => {
                const sev = SEV_CONFIG[action.severity] || SEV_CONFIG.info;
                const SevIcon = sev.icon;
                const TypeIcon = TYPE_ICONS[action.type] || FileText;
                const isSelected = selected.has(action.id);

                return (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => toggleSelect(action.id)}
                    style={{
                      padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${isSelected ? '#003DA5' : '#E5E7EB'}`,
                      background: isSelected ? '#EFF6FF' : 'white',
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{ marginTop: 2, flexShrink: 0 }}>
                      {isSelected
                        ? <CheckSquare style={{ width: 18, height: 18, color: '#003DA5' }} />
                        : <Square style={{ width: 18, height: 18, color: '#D1D5DB' }} />
                      }
                    </div>
                    {/* Icon */}
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: sev.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <TypeIcon style={{ width: 16, height: 16, color: sev.color }} />
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                        <span style={{ padding: '1px 8px', borderRadius: 6, background: sev.bg, color: sev.color, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>{sev.label}</span>
                        <span style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 600 }}>{action.type.replace(/_/g, ' ')}</span>
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827' }}>{action.title}</div>
                      <div style={{ fontSize: '0.78rem', color: '#4B5563', marginTop: 1 }}>{action.description}</div>
                      {action.impact && (
                        <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Shield style={{ width: 11, height: 11 }} /> Impacto: {action.impact}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Manual only */}
              {manualOnly.length > 0 && (
                <>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: 1, marginTop: 10, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Eye style={{ width: 12, height: 12 }} /> Revision manual requerida ({manualOnly.length})
                  </div>
                  {manualOnly.map((action: any, i: number) => {
                    const sev = SEV_CONFIG[action.severity] || SEV_CONFIG.info;
                    return (
                      <div key={action.id} style={{ padding: '12px 16px', borderRadius: 10, border: `1px solid ${sev.color}30`, background: `${sev.bg}50`, display: 'flex', alignItems: 'flex-start', gap: 12, opacity: 0.85 }}>
                        <AlertOctagon style={{ width: 18, height: 18, color: sev.color, marginTop: 2, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827' }}>{action.title}</div>
                          <div style={{ fontSize: '0.78rem', color: '#4B5563' }}>{action.description}</div>
                          {action.impact && <div style={{ fontSize: '0.72rem', color: sev.color, marginTop: 3, fontWeight: 600 }}>Impacto: {action.impact}</div>}
                        </div>
                        {onNavigate && (
                          <button onClick={() => onNavigate('gestion')} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${sev.color}`, background: 'white', color: sev.color, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            Ir a Gestion
                          </button>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <>
          {/* Score timeline chart */}
          {chartData.length > 1 && (
            <div style={{ marginBottom: 20, padding: '16px', borderRadius: 12, background: 'white', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp style={{ width: 16, height: 16, color: '#003DA5' }} />
                Timeline de Score de Salud
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <Tooltip contentStyle={{ fontSize: '0.78rem', borderRadius: 8 }} />
                  <ReferenceLine y={70} stroke="#D97706" strokeDasharray="5 5" label={{ value: 'Warning', fill: '#D97706', fontSize: 10 }} />
                  <ReferenceLine y={40} stroke="#DC2626" strokeDasharray="5 5" label={{ value: 'Critical', fill: '#DC2626', fontSize: 10 }} />
                  <Line type="monotone" dataKey="score" stroke="#003DA5" strokeWidth={2} dot={{ r: 3, fill: '#003DA5' }} name="Score" />
                  <Line type="monotone" dataKey="errors" stroke="#DC2626" strokeWidth={1.5} dot={{ r: 2, fill: '#DC2626' }} name="Errores" />
                  <Line type="monotone" dataKey="warnings" stroke="#D97706" strokeWidth={1.5} dot={{ r: 2, fill: '#D97706' }} name="Advertencias" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* History table */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#374151' }}>Historial de Verificaciones ({history.length})</span>
              <button onClick={generatePDFReport} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #003DA5', background: 'white', color: '#003DA5', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Download style={{ width: 11, height: 11 }} /> PDF
              </button>
            </div>
            {history.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#9CA3AF' }}>
                <Clock style={{ width: 28, height: 28, margin: '0 auto 8px', opacity: 0.4 }} />
                <p style={{ fontSize: '0.85rem' }}>Sin historial. Las verificaciones se registran automaticamente.</p>
              </div>
            ) : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB' }}>
                      <th style={{ padding: '8px 12px', fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textAlign: 'left', borderBottom: '1px solid #E5E7EB' }}>Fecha</th>
                      <th style={{ padding: '8px 12px', fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textAlign: 'left', borderBottom: '1px solid #E5E7EB' }}>Trigger</th>
                      <th style={{ padding: '8px 12px', fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textAlign: 'center', borderBottom: '1px solid #E5E7EB' }}>Semaforo</th>
                      <th style={{ padding: '8px 12px', fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textAlign: 'center', borderBottom: '1px solid #E5E7EB' }}>Score</th>
                      <th style={{ padding: '8px 12px', fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textAlign: 'center', borderBottom: '1px solid #E5E7EB' }}>Err</th>
                      <th style={{ padding: '8px 12px', fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textAlign: 'center', borderBottom: '1px solid #E5E7EB' }}>Warn</th>
                      <th style={{ padding: '8px 12px', fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textAlign: 'left', borderBottom: '1px solid #E5E7EB' }}>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h: any, i: number) => {
                      const semColor = h.semaphore === 'red' ? '#DC2626' : h.semaphore === 'yellow' ? '#D97706' : '#059669';
                      const semBg = h.semaphore === 'red' ? '#FEE2E2' : h.semaphore === 'yellow' ? '#FEF3C7' : '#D1FAE5';
                      return (
                        <tr key={h.id || i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '6px 12px', fontSize: '0.78rem', color: '#374151' }}>
                            {h.timestamp ? new Date(h.timestamp).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td style={{ padding: '6px 12px' }}>
                            <span style={{ padding: '1px 6px', borderRadius: 4, background: '#F3F4F6', fontSize: '0.68rem', fontWeight: 600, color: '#6B7280' }}>
                              {h.trigger || '-'}
                            </span>
                          </td>
                          <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: semColor }} />
                          </td>
                          <td style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 700, fontSize: '0.82rem', color: semColor }}>
                            {h.score ?? '-'}
                          </td>
                          <td style={{ padding: '6px 12px', textAlign: 'center', fontSize: '0.78rem', color: (h.errors || 0) > 0 ? '#DC2626' : '#9CA3AF', fontWeight: (h.errors || 0) > 0 ? 700 : 400 }}>{h.errors ?? '-'}</td>
                          <td style={{ padding: '6px 12px', textAlign: 'center', fontSize: '0.78rem', color: (h.warnings || 0) > 0 ? '#D97706' : '#9CA3AF', fontWeight: (h.warnings || 0) > 0 ? 700 : 400 }}>{h.warnings ?? '-'}</td>
                          <td style={{ padding: '6px 12px', fontSize: '0.72rem', color: '#6B7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {h.event ? `${h.event}: ${h.programa_nombre || ''}` : h.actions_applied !== undefined ? `${h.actions_applied} aplicadas` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * MapeoSincronizacionPTA — Panel de Mapeo, Importacion, Validacion, Alertas y Auditoria
 * 
 * Cinco pestanas:
 * 1. Mapeo de Programas: Configura catalogo estatico → programa real
 * 2. Importacion Masiva: CSV/Excel de asignaturas + Exportacion CSV
 * 3. Validacion Cruzada: Detecta inconsistencias entre modulos
 * 4. Alertas de Cambios: Notificaciones de cambios en programas que afectan PTAs
 * 5. Auditoria de Sincronizacion: Historial de eventos
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RefreshCw, ArrowRight, Check, X, Upload, FileText, Clock,
  Building2, BookOpen, Search, Save, Loader2, ChevronLeft,
  AlertTriangle, CheckCircle2, Trash2, Link2, Database,
  History, Filter, Download, Plus, ChevronDown, Edit3,
  ShieldAlert, Bell, XCircle, Info, ChevronRight, Eye,
  AlertOctagon, Zap,
} from 'lucide-react';
import {
  getCatalogoProgramas, getSyncProgramasStatus, getSyncMappings,
  saveSyncMapping, bulkImportAsignaturas, getSyncAuditLog,
  logSyncAuditEvent, getCatalogoAsignaturas, validateSync,
  getChangeAlerts, dismissChangeAlerts, getExportAsignaturasUrl,
  autoResolveSync,
} from '../../services/api/ptaApi';
import { toast } from 'sonner';
import { publicAnonKey } from '../../utils/supabase/info';

interface Props {
  onBack?: () => void;
}

type TabView = 'mapeo' | 'importacion' | 'validacion' | 'alertas' | 'auditoria';

const STATIC_PROGRAMS = [
  { id: 'ap-diurno', nombre: 'Administracion Publica (Diurno)', nivel: 'Pregrado' },
  { id: 'ap-nocturno', nombre: 'Administracion Publica (Nocturno)', nivel: 'Pregrado' },
  { id: 'apt', nombre: 'Administracion Publica Territorial', nivel: 'Pregrado' },
  { id: 'ep', nombre: 'Economia Publica', nivel: 'Pregrado' },
  { id: 'egp', nombre: 'Especializacion en Gestion Publica', nivel: 'Posgrado' },
  { id: 'epp', nombre: 'Especializacion en Politicas Publicas', nivel: 'Posgrado' },
  { id: 'efp', nombre: 'Especializacion en Finanzas Publicas', nivel: 'Posgrado' },
  { id: 'mgp', nombre: 'Maestria en Gestion Publica', nivel: 'Maestria' },
  { id: 'mpp', nombre: 'Maestria en Politicas Publicas', nivel: 'Maestria' },
];

export function MapeoSincronizacionPTA({ onBack }: Props) {
  const [tab, setTab] = useState<TabView>('mapeo');
  const [loading, setLoading] = useState(true);
  const [realProgramas, setRealProgramas] = useState<any[]>([]);
  const [allProgramas, setAllProgramas] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<string, any>>({});
  const [syncInfo, setSyncInfo] = useState<any>(null);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [changeAlerts, setChangeAlerts] = useState<any>(null);

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [progsRes, syncRes, mappingsRes, auditRes, validateRes, alertsRes] = await Promise.all([
        getCatalogoProgramas(),
        getSyncProgramasStatus(),
        getSyncMappings(),
        getSyncAuditLog(),
        validateSync(),
        getChangeAlerts(),
      ]);
      if (progsRes.success) {
        setAllProgramas(progsRes.data || []);
        setRealProgramas((progsRes.data || []).filter((p: any) => p.source === 'programas-academicos'));
      }
      if (syncRes.success) setSyncInfo(syncRes.data);
      if (mappingsRes.success) setMappings(mappingsRes.data || {});
      if (auditRes.success) setAuditLog(auditRes.data || []);
      if (validateRes.success) setValidationResult(validateRes.data);
      if (alertsRes.success) setChangeAlerts(alertsRes.data);
    } catch (err) {
      console.error('Error loading sync data:', err);
      toast.error('Error cargando datos de sincronizacion');
    }
    setLoading(false);
  };

  const totalIssues = validationResult?.summary?.total || 0;
  const totalAlerts = changeAlerts?.summary?.total || 0;
  const errorCount = (validationResult?.summary?.errors || 0) + (changeAlerts?.summary?.errors || 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#003DA5' }} />
        <span style={{ fontSize: '0.95rem', color: '#6B7280' }}>Cargando panel de sincronizacion...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            {onBack && (
              <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
                <ChevronLeft style={{ width: 20, height: 20, color: '#6B7280' }} />
              </button>
            )}
            <Link2 style={{ width: 28, height: 28, color: '#003DA5' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              Mapeo y Sincronizacion de Programas
            </h2>
            {errorCount > 0 && (
              <span style={{
                padding: '2px 8px', borderRadius: 20, background: '#FEE2E2',
                color: '#DC2626', fontSize: '0.7rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <AlertOctagon style={{ width: 12, height: 12 }} />
                {errorCount} errores
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.88rem', color: '#6B7280', marginLeft: onBack ? 34 : 38 }}>
            Configurar mapeos, importar asignaturas, validar integridad y monitorear cambios entre modulos
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            padding: '6px 12px', borderRadius: 8,
            background: realProgramas.length > 0 ? '#D1FAE5' : '#FEF3C7',
            border: `1px solid ${realProgramas.length > 0 ? '#A7F3D0' : '#FDE68A'}`,
            fontSize: '0.78rem', fontWeight: 600,
            color: realProgramas.length > 0 ? '#065F46' : '#92400E',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Database style={{ width: 14, height: 14 }} />
            {realProgramas.length} reales | {STATIC_PROGRAMS.length} estaticos
          </div>
          <button onClick={loadAllData} style={{
            padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB',
            background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}>
            <RefreshCw style={{ width: 15, height: 15, color: '#6B7280' }} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'Programas Reales', value: realProgramas.length, icon: Building2, color: '#003DA5', bg: '#EFF6FF' },
          { label: 'Mapeos Manuales', value: Object.keys(mappings).length, icon: Link2, color: '#059669', bg: '#D1FAE5' },
          { label: 'Con Asig. Propias', value: syncInfo?.programas?.filter((p: any) => p.asignaturas_custom > 0).length || 0, icon: BookOpen, color: '#7C3AED', bg: '#F3E8FF' },
          { label: 'Inconsistencias', value: totalIssues, icon: ShieldAlert, color: totalIssues > 0 ? '#DC2626' : '#059669', bg: totalIssues > 0 ? '#FEE2E2' : '#D1FAE5' },
          { label: 'Alertas Cambios', value: totalAlerts, icon: Bell, color: totalAlerts > 0 ? '#D97706' : '#059669', bg: totalAlerts > 0 ? '#FEF3C7' : '#D1FAE5' },
          { label: 'Eventos Audit.', value: auditLog.length, icon: History, color: '#6B7280', bg: '#F3F4F6' },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            style={{
              padding: '10px 12px', borderRadius: 10, background: s.bg,
              border: `1px solid ${s.color}20`, display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <s.icon style={{ width: 16, height: 16, color: s.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 500 }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '2px solid #E5E7EB', overflowX: 'auto' }}>
        {[
          { key: 'mapeo' as TabView, label: 'Mapeo', icon: Link2, count: Object.keys(mappings).length },
          { key: 'importacion' as TabView, label: 'Importar / Exportar', icon: Upload, count: 0 },
          { key: 'validacion' as TabView, label: 'Validacion', icon: ShieldAlert, count: totalIssues, alert: (validationResult?.summary?.errors || 0) > 0 },
          { key: 'alertas' as TabView, label: 'Alertas Cambios', icon: Bell, count: totalAlerts, alert: (changeAlerts?.summary?.errors || 0) > 0 },
          { key: 'auditoria' as TabView, label: 'Auditoria', icon: History, count: auditLog.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '9px 14px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              borderBottom: tab === t.key ? '3px solid #003DA5' : '3px solid transparent',
              background: tab === t.key ? '#EFF6FF' : 'transparent',
              color: tab === t.key ? '#003DA5' : '#6B7280',
              fontWeight: 600, fontSize: '0.84rem', borderRadius: '8px 8px 0 0',
              display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s ease',
            }}
          >
            <t.icon style={{ width: 15, height: 15 }} />
            {t.label}
            {t.count > 0 && (
              <span style={{
                background: (t as any).alert ? '#DC2626' : tab === t.key ? '#003DA5' : '#9CA3AF',
                color: 'white', borderRadius: 20, padding: '1px 6px',
                fontSize: '0.68rem', fontWeight: 700,
                animation: (t as any).alert ? 'pulse 2s infinite' : undefined,
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {tab === 'mapeo' && (
          <motion.div key="mapeo" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <MapeoTab
              realProgramas={realProgramas}
              mappings={mappings}
              syncInfo={syncInfo}
              onSave={async (progId: string, mappedIds: string[]) => {
                const res = await saveSyncMapping(progId, mappedIds, 'admin');
                if (res.success) {
                  setMappings(prev => ({ ...prev, [progId]: { mapped_to_ids: mappedIds, mapped_at: new Date().toISOString() } }));
                  toast.success('Mapeo guardado exitosamente');
                  loadAllData();
                }
              }}
            />
          </motion.div>
        )}
        {tab === 'importacion' && (
          <motion.div key="importacion" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <ImportacionTab realProgramas={realProgramas} onImportComplete={() => loadAllData()} />
          </motion.div>
        )}
        {tab === 'validacion' && (
          <motion.div key="validacion" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <ValidacionTab data={validationResult} onRefresh={loadAllData} onNavigate={(target: TabView) => setTab(target)} />
          </motion.div>
        )}
        {tab === 'alertas' && (
          <motion.div key="alertas" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <AlertasTab data={changeAlerts} onRefresh={loadAllData} onNavigate={(target: TabView) => setTab(target)} />
          </motion.div>
        )}
        {tab === 'auditoria' && (
          <motion.div key="auditoria" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <AuditoriaTab auditLog={auditLog} onRefresh={loadAllData} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Tab 1: Mapeo de Programas
// ═══════════════════════════════════════════════════════════════════════

function MapeoTab({ realProgramas, mappings, syncInfo, onSave }: {
  realProgramas: any[];
  mappings: Record<string, any>;
  syncInfo: any;
  onSave: (progId: string, mappedIds: string[]) => Promise<void>;
}) {
  const [editingProg, setEditingProg] = useState<string | null>(null);
  const [selectedMappings, setSelectedMappings] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const filteredProgs = realProgramas.filter(p =>
    !search || p.nombre?.toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (progId: string) => {
    const current = mappings[progId]?.mapped_to_ids || [];
    setSelectedMappings(new Set(current));
    setEditingProg(progId);
  };

  const handleSave = async () => {
    if (!editingProg) return;
    setSaving(true);
    await onSave(editingProg, Array.from(selectedMappings));
    setSaving(false);
    setEditingProg(null);
  };

  return (
    <div>
      <div style={{
        padding: '12px 16px', borderRadius: 10, marginBottom: 16,
        background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
        border: '1px solid #BFDBFE', fontSize: '0.82rem', color: '#1E40AF',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <Info style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>Mapeo Manual:</strong> Vincule programas reales de BD con catalogos estaticos PTA.
          Reemplaza el mapeo heuristico automatico. Los mapeos persisten en KV.
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search style={{ width: 14, height: 14, color: '#9CA3AF', position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" placeholder="Buscar programa real..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: '0.82rem', outline: 'none' }}
          />
        </div>
      </div>

      {filteredProgs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
          <Building2 style={{ width: 32, height: 32, margin: '0 auto 8px', opacity: 0.4 }} />
          <p style={{ fontSize: '0.9rem' }}>
            {realProgramas.length === 0 ? 'No hay programas reales registrados' : 'Sin resultados'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredProgs.map((prog: any) => {
            const mapping = mappings[prog.id];
            const isEditing = editingProg === prog.id;
            const progSync = syncInfo?.programas?.find((p: any) => p.id === prog.id);
            return (
              <div key={prog.id} style={{
                borderRadius: 12, border: `1px solid ${isEditing ? '#BFDBFE' : '#E5E7EB'}`,
                background: isEditing ? '#FAFBFF' : 'white', overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 style={{ width: 18, height: 18, color: '#003DA5' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>{prog.nombre}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: '#6B7280' }}>
                        <span>{prog.nivel || 'Pregrado'}</span>
                        <span style={{ padding: '0px 6px', borderRadius: 4, background: '#DBEAFE', color: '#1E40AF', fontWeight: 600 }}>BD</span>
                        {progSync?.asignaturas_custom > 0 && (
                          <span style={{ padding: '0px 6px', borderRadius: 4, background: '#D1FAE5', color: '#065F46', fontWeight: 600 }}>
                            {progSync.asignaturas_custom} asig. propias
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {mapping ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <ArrowRight style={{ width: 14, height: 14, color: '#059669' }} />
                        {mapping.mapped_to_ids?.map((id: string) => {
                          const sp = STATIC_PROGRAMS.find(s => s.id === id);
                          return <span key={id} style={{ padding: '2px 8px', borderRadius: 6, background: '#D1FAE5', color: '#065F46', fontSize: '0.72rem', fontWeight: 600 }}>{sp?.nombre || id}</span>;
                        })}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#D97706', fontStyle: 'italic' }}>Heuristico</span>
                    )}
                    <button onClick={() => isEditing ? setEditingProg(null) : startEdit(prog.id)}
                      style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${isEditing ? '#DC2626' : '#003DA5'}`, background: isEditing ? '#FEF2F2' : '#EFF6FF', color: isEditing ? '#DC2626' : '#003DA5', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {isEditing ? <X style={{ width: 13, height: 13 }} /> : <Edit3 style={{ width: 13, height: 13 }} />}
                      {isEditing ? 'Cancelar' : 'Editar'}
                    </button>
                  </div>
                </div>
                <AnimatePresence>
                  {isEditing && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                        <p style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: 10 }}>
                          Seleccione catalogos PTA para <strong>{prog.nombre}</strong>:
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
                          {STATIC_PROGRAMS.map(sp => (
                            <label key={sp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${selectedMappings.has(sp.id) ? '#059669' : '#E5E7EB'}`, background: selectedMappings.has(sp.id) ? '#F0FDF4' : 'white', transition: 'all 0.1s ease' }}>
                              <input type="checkbox" checked={selectedMappings.has(sp.id)}
                                onChange={e => { const s = new Set(selectedMappings); e.target.checked ? s.add(sp.id) : s.delete(sp.id); setSelectedMappings(s); }}
                                style={{ accentColor: '#059669' }} />
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827' }}>{sp.nombre}</div>
                                <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>{sp.nivel}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                          <button onClick={() => setSelectedMappings(new Set())} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', fontSize: '0.78rem', cursor: 'pointer' }}>Limpiar</button>
                          <button onClick={handleSave} disabled={saving} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: saving ? '#D1D5DB' : '#059669', color: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {saving ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : <Save style={{ width: 14, height: 14 }} />}
                            Guardar ({selectedMappings.size})
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Tab 2: Importacion Masiva + Exportacion CSV
// ═══════════════════════════════════════════════════════════════════════

function ImportacionTab({ realProgramas, onImportComplete }: {
  realProgramas: any[];
  onImportComplete: () => void;
}) {
  const [selectedPrograma, setSelectedPrograma] = useState('');
  const [csvText, setCsvText] = useState('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [existingAsigs, setExistingAsigs] = useState<any[]>([]);

  useEffect(() => {
    if (selectedPrograma) {
      getCatalogoAsignaturas(selectedPrograma).then(res => {
        if (res.success) setExistingAsigs(res.data || []);
      });
    } else { setExistingAsigs([]); }
  }, [selectedPrograma]);

  const parseCSV = () => {
    if (!csvText.trim()) { toast.warning('Pegue datos CSV primero'); return; }
    const lines = csvText.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) { toast.warning('No se encontraron datos'); return; }
    const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
    const header = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/["']/g, ''));
    const nameIdx = header.findIndex(h => ['nombre', 'asignatura', 'materia', 'name', 'subject'].includes(h));
    const nucleoIdx = header.findIndex(h => ['nucleo', 'area', 'nucleus', 'campo'].includes(h));
    const creditosIdx = header.findIndex(h => ['creditos', 'credits', 'cred'].includes(h));
    const semestreIdx = header.findIndex(h => ['semestre', 'semester', 'sem', 'periodo'].includes(h));
    if (nameIdx === -1) {
      const parsed = lines.map(line => {
        const parts = line.split(sep).map(p => p.trim().replace(/["']/g, ''));
        return { nombre: parts[0] || '', nucleo: parts[1] || 'General', creditos: parseInt(parts[2]) || 3, semestre: parseInt(parts[3]) || 1 };
      }).filter(p => p.nombre);
      setParsedData(parsed);
      toast.success(`${parsed.length} asignaturas detectadas (sin encabezado)`);
      return;
    }
    const parsed = lines.slice(1).map(line => {
      const parts = line.split(sep).map(p => p.trim().replace(/["']/g, ''));
      return { nombre: parts[nameIdx] || '', nucleo: nucleoIdx >= 0 ? parts[nucleoIdx] : 'General', creditos: creditosIdx >= 0 ? parseInt(parts[creditosIdx]) || 3 : 3, semestre: semestreIdx >= 0 ? parseInt(parts[semestreIdx]) || 1 : 1 };
    }).filter(p => p.nombre);
    setParsedData(parsed);
    parsed.length > 0 ? toast.success(`${parsed.length} asignaturas parseadas`) : toast.warning('No se pudieron parsear');
  };

  const handleImport = async () => {
    if (!selectedPrograma || parsedData.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await bulkImportAsignaturas(selectedPrograma, parsedData, 'admin');
      if (res.success) {
        setImportResult(res);
        toast.success(`${res.imported} importadas (${res.duplicates} duplicadas omitidas)`);
        setParsedData([]); setCsvText('');
        onImportComplete();
        const asigRes = await getCatalogoAsignaturas(selectedPrograma);
        if (asigRes.success) setExistingAsigs(asigRes.data || []);
      } else toast.error('Error al importar');
    } catch (err) { toast.error('Error al importar'); }
    setImporting(false);
  };

  const handleExport = () => {
    if (!selectedPrograma) { toast.warning('Seleccione programa primero'); return; }
    // Build CSV from existingAsigs directly (client-side for immediate response)
    const header = 'nombre;nucleo;creditos;semestre;fuente';
    const rows = existingAsigs.map(a => `${a.nombre};${a.nucleo || 'General'};${a.creditos || 3};${a.semestre || 1};${a.source || 'static'}`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const progName = realProgramas.find(p => p.id === selectedPrograma)?.nombre || selectedPrograma;
    link.download = `asignaturas_${progName.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${existingAsigs.length} asignaturas exportadas a CSV`);
  };

  return (
    <div>
      <div style={{
        padding: '12px 16px', borderRadius: 10, marginBottom: 16,
        background: 'linear-gradient(135deg, #F3E8FF 0%, #FAF5FF 100%)',
        border: '1px solid #DDD6FE', fontSize: '0.82rem', color: '#6B21A8',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <Upload style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>Importar / Exportar Asignaturas:</strong> Importe desde CSV/Excel con columnas
          <code style={{ background: '#EDE9FE', padding: '0 4px', borderRadius: 3, margin: '0 3px' }}>nombre</code>,
          <code style={{ background: '#EDE9FE', padding: '0 4px', borderRadius: 3, margin: '0 3px' }}>nucleo</code>,
          <code style={{ background: '#EDE9FE', padding: '0 4px', borderRadius: 3, margin: '0 3px' }}>creditos</code>,
          <code style={{ background: '#EDE9FE', padding: '0 4px', borderRadius: 3, margin: '0 3px' }}>semestre</code>.
          Exporte las asignaturas existentes a CSV para edicion fuera de linea.
        </div>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 250 }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4, color: '#374151' }}>Programa Destino *</label>
          <select value={selectedPrograma} onChange={e => { setSelectedPrograma(e.target.value); setParsedData([]); setImportResult(null); }}
            style={{ width: '100%', maxWidth: 500, padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.85rem' }}>
            <option value="">Seleccionar programa de BD...</option>
            {realProgramas.map((p: any) => <option key={p.id} value={p.id}>{p.nombre} ({p.nivel || 'Pregrado'})</option>)}
          </select>
        </div>
        {selectedPrograma && existingAsigs.length > 0 && (
          <button onClick={handleExport} style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid #059669', background: '#F0FDF4',
            color: '#059669', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          }}>
            <Download style={{ width: 15, height: 15 }} />
            Exportar CSV ({existingAsigs.length})
          </button>
        )}
      </div>

      {selectedPrograma && (
        <>
          {existingAsigs.length > 0 && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Asignaturas existentes ({existingAsigs.length}):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {existingAsigs.slice(0, 20).map((a: any, i: number) => (
                  <span key={i} style={{
                    padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 500,
                    background: a.source === 'custom' || a.source === 'import' ? '#D1FAE5' : a.source === 'manual' ? '#DBEAFE' : '#E5E7EB',
                    color: a.source === 'custom' || a.source === 'import' ? '#065F46' : a.source === 'manual' ? '#1E40AF' : '#4B5563',
                  }}>
                    {a.nombre}
                  </span>
                ))}
                {existingAsigs.length > 20 && <span style={{ padding: '2px 8px', fontSize: '0.72rem', color: '#9CA3AF' }}>+{existingAsigs.length - 20} mas...</span>}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4, color: '#374151' }}>Datos CSV / Pegue desde Excel</label>
              <textarea value={csvText} onChange={e => setCsvText(e.target.value)}
                placeholder={`nombre;nucleo;creditos;semestre\nGerencia Publica;Gestion;3;5\nDerecho Administrativo II;Derecho;4;6`}
                style={{ width: '100%', height: 200, padding: '10px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.82rem', fontFamily: 'monospace', resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={parseCSV} disabled={!csvText.trim()} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: csvText.trim() ? '#003DA5' : '#D1D5DB', color: 'white', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText style={{ width: 14, height: 14 }} /> Parsear CSV
                </button>
                <button onClick={() => { setCsvText(''); setParsedData([]); setImportResult(null); }}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', fontSize: '0.82rem', cursor: 'pointer' }}>Limpiar</button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4, color: '#374151' }}>Vista Previa ({parsedData.length})</label>
              <div style={{ height: 200, overflow: 'auto', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white' }}>
                {parsedData.length === 0 ? (
                  <div style={{ padding: 30, textAlign: 'center', color: '#9CA3AF', fontSize: '0.82rem' }}>Pegue CSV y presione "Parsear CSV"</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead><tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700 }}>Nombre</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700 }}>Nucleo</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>Cr.</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>Sem.</th>
                      <th style={{ padding: '6px 8px', width: 30 }}></th>
                    </tr></thead>
                    <tbody>
                      {parsedData.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '5px 8px', fontWeight: 600, color: '#111827' }}>{row.nombre}</td>
                          <td style={{ padding: '5px 8px', color: '#6B7280' }}>{row.nucleo}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'center' }}>{row.creditos}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'center' }}>{row.semestre}</td>
                          <td style={{ padding: '5px 8px' }}>
                            <button onClick={() => setParsedData(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                              <X style={{ width: 12, height: 12, color: '#DC2626' }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {parsedData.length > 0 && (
                <button onClick={handleImport} disabled={importing} style={{
                  marginTop: 8, padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: importing ? '#D1D5DB' : '#059669', color: 'white',
                  fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center',
                }}>
                  {importing ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : <Upload style={{ width: 16, height: 16 }} />}
                  {importing ? 'Importando...' : `Importar ${parsedData.length} Asignaturas`}
                </button>
              )}
            </div>
          </div>

          {importResult && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{
              padding: '14px 18px', borderRadius: 10, background: '#D1FAE5', border: '1px solid #6EE7B7',
              display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.85rem', color: '#065F46',
            }}>
              <CheckCircle2 style={{ width: 22, height: 22, flexShrink: 0 }} />
              <div><strong>Exitoso:</strong> {importResult.imported} nuevas, {importResult.duplicates} duplicadas, total: <strong>{importResult.total}</strong>.</div>
            </motion.div>
          )}
        </>
      )}

      {!selectedPrograma && realProgramas.length === 0 && (
        <div style={{ textAlign: 'center', padding: 50, color: '#9CA3AF', background: '#F9FAFB', borderRadius: 12, border: '2px dashed #E5E7EB' }}>
          <Database style={{ width: 36, height: 36, margin: '0 auto 10px', opacity: 0.4 }} />
          <p style={{ fontSize: '0.92rem', marginBottom: 4 }}>No hay programas reales registrados</p>
          <p style={{ fontSize: '0.78rem' }}>Cree programas en <strong>Programas Academicos</strong> y sincronice.</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Tab 3: Validacion Cruzada
// ═══════════════════════════════════════════════════════════════════════

function ValidacionTab({ data, onRefresh, onNavigate }: {
  data: any;
  onRefresh: () => void;
  onNavigate: (tab: TabView) => void;
}) {
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterType, setFilterType] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleAutoResolve = async (issue: any) => {
    setResolvingId(issue.id);
    let actionType = '';
    let params: any = {};
    if (issue.type === 'mapeo_huerfano') {
      actionType = 'delete_orphan_mapping';
      params = { programa_id: issue.programa_id };
    } else if (issue.type === 'programa_inexistente') {
      actionType = 'remove_orphan_oferta';
      params = { programa_id: issue.programa_id };
    } else {
      setResolvingId(null);
      return;
    }
    try {
      const res = await autoResolveSync([{ type: actionType, params }]);
      if (res.success) {
        toast.success(`Resuelto: ${issue.title}`);
        onRefresh();
      } else {
        toast.error('Error al resolver');
      }
    } catch { toast.error('Error al resolver'); }
    setResolvingId(null);
  };

  const issues = data?.issues || [];
  const summary = data?.summary || { total: 0, errors: 0, warnings: 0, info: 0 };
  const context = data?.context || {};

  const filtered = useMemo(() => {
    let items = issues;
    if (filterSeverity) items = items.filter((i: any) => i.severity === filterSeverity);
    if (filterType) items = items.filter((i: any) => i.type === filterType);
    return items;
  }, [issues, filterSeverity, filterType]);

  const issueTypes = [...new Set(issues.map((i: any) => i.type))] as string[];

  const severityConfig: Record<string, { label: string; color: string; bg: string; icon: any; border: string }> = {
    error: { label: 'Error', color: '#DC2626', bg: '#FEE2E2', icon: XCircle, border: '#FCA5A5' },
    warning: { label: 'Advertencia', color: '#D97706', bg: '#FEF3C7', icon: AlertTriangle, border: '#FDE68A' },
    info: { label: 'Info', color: '#2563EB', bg: '#DBEAFE', icon: Info, border: '#93C5FD' },
  };

  const typeLabels: Record<string, string> = {
    sin_configuracion: 'Sin Configuracion',
    programa_inexistente: 'Programa Inexistente',
    mapeo_invalido: 'Mapeo Invalido',
    mapeo_huerfano: 'Mapeo Huerfano',
    pta_programa_inexistente: 'PTA Huerfano',
    sin_docentes: 'Sin Docentes',
  };

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Errores Criticos', value: summary.errors, ...severityConfig.error },
          { label: 'Advertencias', value: summary.warnings, ...severityConfig.warning },
          { label: 'Informativos', value: summary.info, ...severityConfig.info },
        ].map((s, i) => (
          <div key={i} onClick={() => setFilterSeverity(filterSeverity === ['error', 'warning', 'info'][i] ? '' : ['error', 'warning', 'info'][i])}
            style={{
              padding: '14px 16px', borderRadius: 10, background: s.bg, border: `2px solid ${filterSeverity === ['error', 'warning', 'info'][i] ? s.color : s.border}`,
              cursor: 'pointer', transition: 'all 0.15s ease',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
            <s.icon style={{ width: 24, height: 24, color: s.color }} />
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
        {summary.total === 0 && (
          <div style={{ padding: '14px 16px', borderRadius: 10, background: '#D1FAE5', border: '2px solid #A7F3D0', display: 'flex', alignItems: 'center', gap: 12, gridColumn: '1 / -1' }}>
            <CheckCircle2 style={{ width: 28, height: 28, color: '#059669' }} />
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#065F46' }}>Sin inconsistencias detectadas</div>
              <div style={{ fontSize: '0.78rem', color: '#047857' }}>Todos los modulos estan sincronizados correctamente.</div>
            </div>
          </div>
        )}
      </div>

      {/* Context */}
      {context.real_programs !== undefined && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap', fontSize: '0.72rem', color: '#6B7280' }}>
          <span>Periodo: <strong>{data?.periodo}</strong></span>
          <span>|</span>
          <span>{context.real_programs} prog. reales</span>
          <span>|</span>
          <span>{context.static_programs} prog. estaticos</span>
          <span>|</span>
          <span>{context.oferta_items} items oferta</span>
          <span>|</span>
          <span>{context.active_ptas} PTAs activos</span>
          <span>|</span>
          <span>{context.mappings_count} mapeos</span>
          <span>|</span>
          <span>Verificado: {data?.checked_at ? new Date(data.checked_at).toLocaleTimeString('es-CO') : '-'}</span>
        </div>
      )}

      {/* Filters */}
      {issues.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: '0.8rem', cursor: 'pointer' }}>
            <option value="">Todos los tipos</option>
            {issueTypes.map(t => <option key={t} value={t}>{typeLabels[t] || t}</option>)}
          </select>
          <button onClick={onRefresh} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
            <RefreshCw style={{ width: 13, height: 13 }} /> Re-validar
          </button>
          {(filterSeverity || filterType) && (
            <button onClick={() => { setFilterSeverity(''); setFilterType(''); }}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer', fontSize: '0.78rem' }}>
              Limpiar filtros
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#9CA3AF', alignSelf: 'center' }}>
            {filtered.length} de {issues.length}
          </span>
        </div>
      )}

      {/* Issues list */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((issue: any, idx: number) => {
            const cfg = severityConfig[issue.severity] || severityConfig.info;
            const Icon = cfg.icon;
            return (
              <motion.div key={issue.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                style={{
                  padding: '12px 16px', borderRadius: 10,
                  border: `1px solid ${cfg.border}`, background: 'white',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ width: 16, height: 16, color: cfg.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ padding: '1px 8px', borderRadius: 6, background: cfg.bg, color: cfg.color, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>{cfg.label}</span>
                    <span style={{ padding: '1px 6px', borderRadius: 4, background: '#F3F4F6', color: '#6B7280', fontSize: '0.68rem', fontWeight: 600 }}>{typeLabels[issue.type] || issue.type}</span>
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827', marginBottom: 2 }}>{issue.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#4B5563' }}>{issue.description}</div>
                  {issue.action && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: '0.75rem', color: '#003DA5', fontWeight: 600, flexWrap: 'wrap' }}>
                      <Zap style={{ width: 12, height: 12 }} />
                      Accion sugerida: {issue.action}
                      {(issue.type === 'sin_configuracion' || issue.type === 'mapeo_invalido') && (
                        <button onClick={() => onNavigate('mapeo')} style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 4, background: '#003DA5', color: 'white', border: 'none', fontSize: '0.68rem', cursor: 'pointer' }}>
                          Ir a Mapeo
                        </button>
                      )}
                      {(issue.type === 'mapeo_huerfano' || issue.type === 'programa_inexistente') && (
                        <button
                          onClick={() => handleAutoResolve(issue)}
                          disabled={resolvingId === issue.id}
                          style={{ marginLeft: 4, padding: '2px 8px', borderRadius: 4, background: '#059669', color: 'white', border: 'none', fontSize: '0.68rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                        >
                          {resolvingId === issue.id ? <Loader2 className="animate-spin" style={{ width: 10, height: 10 }} /> : <Check style={{ width: 10, height: 10 }} />}
                          Auto-resolver
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Tab 4: Alertas de Cambios
// ═══════════════════════════════════════════════════════════════════════

function AlertasTab({ data, onRefresh, onNavigate }: {
  data: any;
  onRefresh: () => void;
  onNavigate: (tab: TabView) => void;
}) {
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const [propagating, setPropagating] = useState<string | null>(null);
  const alerts = data?.alerts || [];
  const summary = data?.summary || { total: 0, errors: 0, warnings: 0, info: 0 };

  const handlePropagate = async (alert: any) => {
    if (alert.type !== 'programa_renombrado') return;
    setPropagating(alert.id);
    try {
      const res = await autoResolveSync([{
        type: 'propagate_rename',
        params: { programa_id: alert.programa_id, old_name: alert.old_name, new_name: alert.new_name },
      }]);
      if (res.success) {
        toast.success(`Rename propagado: "${alert.old_name}" → "${alert.new_name}"`);
        // Dismiss after propagation
        await dismissChangeAlerts([alert.id]);
        onRefresh();
      } else { toast.error('Error propagando rename'); }
    } catch { toast.error('Error propagando rename'); }
    setPropagating(null);
  };

  const handleDismiss = async (alertId: string) => {
    setDismissing(prev => new Set([...prev, alertId]));
    const res = await dismissChangeAlerts([alertId]);
    if (res.success) {
      toast.success('Alerta descartada');
      onRefresh();
    } else {
      toast.error('Error al descartar alerta');
    }
    setDismissing(prev => { const s = new Set(prev); s.delete(alertId); return s; });
  };

  const handleDismissAll = async () => {
    if (alerts.length === 0) return;
    const ids = alerts.map((a: any) => a.id);
    const res = await dismissChangeAlerts(ids);
    if (res.success) {
      toast.success(`${ids.length} alertas descartadas`);
      onRefresh();
    }
  };

  const alertTypeConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    programa_nuevo: { label: 'Nuevo Programa', color: '#2563EB', bg: '#DBEAFE', icon: Plus },
    programa_eliminado: { label: 'Programa Eliminado', color: '#DC2626', bg: '#FEE2E2', icon: Trash2 },
    programa_renombrado: { label: 'Renombrado', color: '#D97706', bg: '#FEF3C7', icon: Edit3 },
    programa_inactivado: { label: 'Inactivado', color: '#DC2626', bg: '#FEE2E2', icon: XCircle },
  };

  const severityConfig: Record<string, { color: string; bg: string }> = {
    error: { color: '#DC2626', bg: '#FEE2E2' },
    warning: { color: '#D97706', bg: '#FEF3C7' },
    info: { color: '#2563EB', bg: '#DBEAFE' },
  };

  return (
    <div>
      {/* Info banner */}
      <div style={{
        padding: '12px 16px', borderRadius: 10, marginBottom: 16,
        background: 'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)',
        border: '1px solid #FDE68A', fontSize: '0.82rem', color: '#92400E',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <Bell style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>Deteccion de Cambios:</strong> El sistema compara automaticamente el estado actual de los programas
          reales con un snapshot previo. Cuando un programa se agrega, elimina, renombra o inactiva, se genera una alerta
          indicando los PTAs y oferta afectados. Las alertas descartadas no reaparecen.
        </div>
      </div>

      {/* Summary + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {summary.errors > 0 && (
            <span style={{ padding: '4px 10px', borderRadius: 8, background: '#FEE2E2', color: '#DC2626', fontSize: '0.78rem', fontWeight: 700 }}>
              {summary.errors} criticas
            </span>
          )}
          {summary.warnings > 0 && (
            <span style={{ padding: '4px 10px', borderRadius: 8, background: '#FEF3C7', color: '#D97706', fontSize: '0.78rem', fontWeight: 700 }}>
              {summary.warnings} advertencias
            </span>
          )}
          {summary.info > 0 && (
            <span style={{ padding: '4px 10px', borderRadius: 8, background: '#DBEAFE', color: '#2563EB', fontSize: '0.78rem', fontWeight: 700 }}>
              {summary.info} informativas
            </span>
          )}
          {summary.total === 0 && (
            <span style={{ padding: '4px 10px', borderRadius: 8, background: '#D1FAE5', color: '#059669', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 style={{ width: 14, height: 14 }} /> Sin alertas pendientes
            </span>
          )}
          <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
            Snapshot: {data?.snapshot_size || 0} programas | {data?.checked_at ? new Date(data.checked_at).toLocaleTimeString('es-CO') : '-'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onRefresh} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
            <RefreshCw style={{ width: 13, height: 13 }} /> Verificar
          </button>
          {alerts.length > 0 && (
            <button onClick={handleDismissAll} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer', fontSize: '0.8rem', color: '#6B7280' }}>
              Descartar todas
            </button>
          )}
        </div>
      </div>

      {/* Alerts list */}
      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: '#9CA3AF', background: '#F9FAFB', borderRadius: 12, border: '2px dashed #E5E7EB' }}>
          <Bell style={{ width: 36, height: 36, margin: '0 auto 10px', opacity: 0.4 }} />
          <p style={{ fontSize: '0.92rem' }}>No hay alertas de cambios pendientes</p>
          <p style={{ fontSize: '0.78rem' }}>Las alertas se generan cuando se detectan cambios en Programas Academicos que afectan PTAs.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.map((alert: any, idx: number) => {
            const typeCfg = alertTypeConfig[alert.type] || { label: alert.type, color: '#6B7280', bg: '#F3F4F6', icon: Info };
            const sevCfg = severityConfig[alert.severity] || severityConfig.info;
            const Icon = typeCfg.icon;
            const isDismissing = dismissing.has(alert.id);
            return (
              <motion.div key={alert.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                style={{
                  padding: '14px 18px', borderRadius: 12,
                  border: `1px solid ${sevCfg.color}30`, background: 'white',
                  borderLeft: `4px solid ${sevCfg.color}`,
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: typeCfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon style={{ width: 18, height: 18, color: typeCfg.color }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 6, background: typeCfg.bg, color: typeCfg.color, fontSize: '0.7rem', fontWeight: 700 }}>{typeCfg.label}</span>
                        <span style={{ padding: '2px 6px', borderRadius: 4, background: sevCfg.bg, color: sevCfg.color, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>{alert.severity}</span>
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', marginBottom: 3 }}>{alert.title}</div>
                      <div style={{ fontSize: '0.82rem', color: '#4B5563', marginBottom: 6 }}>{alert.description}</div>
                      <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: '#6B7280', flexWrap: 'wrap' }}>
                        {alert.affected_ptas > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <FileText style={{ width: 12, height: 12 }} />
                            <strong>{alert.affected_ptas}</strong> PTAs afectados
                          </span>
                        )}
                        {alert.affected_oferta > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <BookOpen style={{ width: 12, height: 12 }} />
                            <strong>{alert.affected_oferta}</strong> items oferta
                          </span>
                        )}
                        {alert.old_name && alert.new_name && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <ArrowRight style={{ width: 12, height: 12 }} />
                            "{alert.old_name}" → "{alert.new_name}"
                          </span>
                        )}
                      </div>
                      {alert.action && (
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', color: '#003DA5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Zap style={{ width: 12, height: 12 }} /> {alert.action}
                          </span>
                          {alert.type === 'programa_nuevo' && (
                            <button onClick={() => onNavigate('mapeo')} style={{ padding: '2px 8px', borderRadius: 4, background: '#003DA5', color: 'white', border: 'none', fontSize: '0.68rem', cursor: 'pointer' }}>
                              Ir a Mapeo
                            </button>
                          )}
                          {alert.type === 'programa_renombrado' && (
                            <button
                              onClick={() => handlePropagate(alert)}
                              disabled={propagating === alert.id}
                              style={{ padding: '2px 8px', borderRadius: 4, background: '#059669', color: 'white', border: 'none', fontSize: '0.68rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                            >
                              {propagating === alert.id ? <Loader2 className="animate-spin" style={{ width: 10, height: 10 }} /> : <ArrowRight style={{ width: 10, height: 10 }} />}
                              Propagar Nombre
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                    {alert.detected_at && (
                      <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>
                        {new Date(alert.detected_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                    <button onClick={() => handleDismiss(alert.id)} disabled={isDismissing}
                      style={{
                        padding: '4px 10px', borderRadius: 6, border: '1px solid #D1D5DB',
                        background: 'white', cursor: 'pointer', fontSize: '0.72rem', color: '#6B7280',
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                      {isDismissing ? <Loader2 className="animate-spin" style={{ width: 12, height: 12 }} /> : <Check style={{ width: 12, height: 12 }} />}
                      Descartar
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Tab 5: Auditoria de Sincronizacion
// ═══════════════════════════════════════════════════════════════════════

function AuditoriaTab({ auditLog, onRefresh }: { auditLog: any[]; onRefresh: () => void }) {
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  const typeConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    mapping_updated: { label: 'Mapeo', color: '#003DA5', bg: '#EFF6FF', icon: Link2 },
    bulk_import: { label: 'Importacion', color: '#7C3AED', bg: '#F3E8FF', icon: Upload },
    sync_programas: { label: 'Sincronizacion', color: '#059669', bg: '#D1FAE5', icon: RefreshCw },
    custom_asignatura: { label: 'Asignatura', color: '#D97706', bg: '#FEF3C7', icon: BookOpen },
    alert_dismissed: { label: 'Alerta Descartada', color: '#6B7280', bg: '#F3F4F6', icon: Check },
  };

  const filtered = useMemo(() => {
    let items = auditLog;
    if (filterType) items = items.filter(e => e.type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(e => e.details?.toLowerCase().includes(q) || e.actor?.toLowerCase().includes(q) || e.programa_id?.toLowerCase().includes(q));
    }
    return items;
  }, [auditLog, filterType, search]);

  const eventTypes = [...new Set(auditLog.map(e => e.type))];

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ width: 14, height: 14, color: '#9CA3AF', position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px 8px 32px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: '0.82rem', width: 260, outline: 'none' }} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: '0.82rem', color: '#374151', cursor: 'pointer' }}>
          <option value="">Todos los tipos</option>
          {eventTypes.map(t => <option key={t} value={t}>{typeConfig[t]?.label || t}</option>)}
        </select>
        <button onClick={onRefresh} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem' }}>
          <RefreshCw style={{ width: 14, height: 14 }} /> Actualizar
        </button>
        <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#9CA3AF', alignSelf: 'center' }}>{filtered.length} de {auditLog.length}</span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: '#9CA3AF' }}>
          <History style={{ width: 36, height: 36, margin: '0 auto 10px', opacity: 0.4 }} />
          <p style={{ fontSize: '0.92rem' }}>Sin eventos de auditoria</p>
          <p style={{ fontSize: '0.78rem' }}>Se registran al mapear, importar, sincronizar o descartar alertas.</p>
        </div>
      ) : (
        <div style={{ borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden', background: 'white' }}>
          {filtered.map((event, idx) => {
            const cfg = typeConfig[event.type] || { label: event.type, color: '#6B7280', bg: '#F3F4F6', icon: Clock };
            const Icon = cfg.icon;
            const time = event.timestamp ? new Date(event.timestamp) : null;
            return (
              <div key={event.id || idx} style={{
                padding: '12px 16px', borderBottom: idx < filtered.length - 1 ? '1px solid #F3F4F6' : 'none',
                display: 'flex', alignItems: 'flex-start', gap: 12, background: idx % 2 === 0 ? 'white' : '#FAFAFA',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <Icon style={{ width: 16, height: 16, color: cfg.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ padding: '1px 8px', borderRadius: 6, background: cfg.bg, color: cfg.color, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>{cfg.label}</span>
                    {event.actor && <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>por <strong>{event.actor}</strong></span>}
                    {event.count !== undefined && <span style={{ padding: '1px 6px', borderRadius: 4, background: '#D1FAE5', color: '#065F46', fontSize: '0.68rem', fontWeight: 600 }}>+{event.count}</span>}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#374151' }}>{event.details || 'Sin detalles'}</div>
                  {event.programa_id && <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 2 }}>Programa: {event.programa_id}</div>}
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {time && (
                    <>
                      <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 600 }}>{time.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</div>
                      <div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{time.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import {
  Mail, CheckCircle2, Clock, AlertCircle, Send, Search, Copy, RefreshCw,
  Eye, ChevronLeft, ChevronRight, MailPlus, ExternalLink, Sparkles,
  CheckSquare, Square, Filter, BarChart2, XCircle, Inbox, ArrowUpRight
} from 'lucide-react';
import { apiClient } from '../../../../../shell/src/services/api';
import { getBancoDocentes } from '../../../services/api/ptaApi';

/* ═══════════════════════════════════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════════════════════════════════ */

interface Invitacion {
  id: string;
  correoInstitucional: string;
  estado: string;
  tokenAcceso: string;
  fechaExpiracion: string;
  createdAt: string;
  updatedAt: string;
  borradorJson?: any;
  intentosOtp?: number;
}

type EstadoFiltro = 'TODOS' | 'Enviada' | 'Abierta' | 'OTP validado' | 'En proceso' | 'Gestionada' | 'Vencida';

const ESTADOS_FILTRO: EstadoFiltro[] = ['TODOS', 'Enviada', 'Abierta', 'OTP validado', 'En proceso', 'Gestionada', 'Vencida'];

const BADGE_CONFIG: Record<string, { bg: string; text: string; icon: any; glow: string }> = {
  'Enviada':      { bg: '#e0e7ff', text: '#3730a3', icon: Send,         glow: '#818cf820' },
  'Abierta':      { bg: '#fef3c7', text: '#92400e', icon: Eye,          glow: '#fbbf2420' },
  'OTP validado': { bg: '#dbeafe', text: '#1e40af', icon: CheckCircle2, glow: '#3b82f620' },
  'En proceso':   { bg: '#f3e8ff', text: '#6b21a8', icon: Clock,        glow: '#a855f720' },
  'Gestionada':   { bg: '#dcfce7', text: '#166534', icon: CheckCircle2, glow: '#22c55e20' },
  'Vencida':      { bg: '#fee2e2', text: '#991b1b', icon: XCircle,      glow: '#ef444420' },
};

const PAGE_SIZE = 50;

/* ═══════════════════════════════════════════════════════════════════
   Subcomponents
   ═══════════════════════════════════════════════════════════════════ */

function MetricCard({ label, value, icon: Icon, color, subtitle }: {
  label: string; value: number; icon: any; color: string; subtitle?: string;
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid #e2e8f0',
      display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `linear-gradient(135deg, ${color}15, ${color}08)`,
        border: `1px solid ${color}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>{label}</div>
        {subtitle && <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 1 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function StateBadge({ estado }: { estado: string }) {
  const config = BADGE_CONFIG[estado] || { bg: '#f1f5f9', text: '#475569', icon: Mail, glow: 'transparent' };
  const Icon = config.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 20,
      fontSize: '0.7rem', fontWeight: 700,
      background: config.bg, color: config.text,
      boxShadow: `0 0 0 3px ${config.glow}`,
    }}>
      <Icon size={11} />
      {estado}
    </span>
  );
}

function TimeAgo({ date }: { date: string }) {
  if (!date) return <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>—</span>;
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  let text = '';
  if (days > 0) text = `hace ${days}d`;
  else if (hours > 0) text = `hace ${hours}h`;
  else if (mins > 0) text = `hace ${mins}m`;
  else text = 'ahora';
  return <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{text}</span>;
}

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export function TableroInvitacionesRUND() {
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Bulk input
  const [bulkEmails, setBulkEmails] = useState('');
  const [creating, setCreating] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>('TODOS');
  const [page, setPage] = useState(1);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Preview
  const [showPreview, setShowPreview] = useState(false);

  // Duplicate check results
  const [duplicateCheck, setDuplicateCheck] = useState<{ existing: string[]; new: string[] } | null>(null);

  // ─── Data loading ────────────────────────────────────────────
  const fetchInvitaciones = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/pta/banco-docentes/invitaciones');
      if (res.data?.success) {
        setInvitaciones(res.data.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar invitaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvitaciones(); }, []);

  // ─── Metrics ─────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = invitaciones.length;
    const counts: Record<string, number> = {};
    invitaciones.forEach((inv) => {
      // Check for expired
      const isExpired = new Date(inv.fechaExpiracion) < new Date() && inv.estado !== 'Gestionada';
      const estado = isExpired ? 'Vencida' : inv.estado;
      counts[estado] = (counts[estado] || 0) + 1;
    });
    return {
      total,
      gestionadas: counts['Gestionada'] || 0,
      enProceso: (counts['En proceso'] || 0) + (counts['OTP validado'] || 0) + (counts['Abierta'] || 0),
      sinAbrir: counts['Enviada'] || 0,
      vencidas: counts['Vencida'] || 0,
    };
  }, [invitaciones]);

  // ─── Filtered & paginated data ───────────────────────────────
  const filtered = useMemo(() => {
    return invitaciones.filter((inv) => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        if (!inv.correoInstitucional?.toLowerCase().includes(q)) return false;
      }
      // Estado filter (considering expired)
      if (filtroEstado !== 'TODOS') {
        const isExpired = new Date(inv.fechaExpiracion) < new Date() && inv.estado !== 'Gestionada';
        const effectiveEstado = isExpired ? 'Vencida' : inv.estado;
        if (effectiveEstado !== filtroEstado) return false;
      }
      return true;
    });
  }, [invitaciones, search, filtroEstado]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ─── Bulk create ─────────────────────────────────────────────
  const parseEmails = (text: string): string[] => {
    return text
      .split(/[,;\n\r]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && e.includes('@'));
  };

  const handleBulkCreate = async () => {
    const emails = parseEmails(bulkEmails);
    if (emails.length === 0) {
      setError('No se encontraron correos válidos. Sepáralos por coma, punto y coma o salto de línea.');
      return;
    }

    const invalidEmails = emails.filter((e) => !e.endsWith('@esap.edu.co'));
    if (invalidEmails.length > 0) {
      setError(`Los siguientes correos no son @esap.edu.co: ${invalidEmails.slice(0, 3).join(', ')}${invalidEmails.length > 3 ? ` y ${invalidEmails.length - 3} más` : ''}`);
      return;
    }

    setCreating(true);
    setError(null);
    setDuplicateCheck(null);

    // ── Validación contra banco de docentes existente ──
    const existingEmails: string[] = [];
    const newEmails: string[] = [];
    try {
      for (const email of emails) {
        const res = await getBancoDocentes({ search: email, limit: 5 });
        const items = res.data?.data || [];
        const match = items.find((d: any) =>
          d.correo_institucional?.toLowerCase() === email.toLowerCase()
        );
        if (match) {
          existingEmails.push(email);
        } else {
          newEmails.push(email);
        }
      }
    } catch {
      // Si falla la validación, no bloqueamos — el backend tiene su propia validación
    }

    if (existingEmails.length > 0) {
      setDuplicateCheck({ existing: existingEmails, new: newEmails });
    }

    // Enviamos las invitaciones para TODOS (existentes → actualización, nuevos → creación)
    let success = 0;
    let failed = 0;

    for (const email of emails) {
      try {
        const res = await apiClient.post('/pta/banco-docentes/invitaciones', { correoInstitucional: email });
        if (res.data?.success) success++;
        else failed++;
      } catch {
        failed++;
      }
    }

    setCreating(false);
    setBulkEmails('');
    const msgParts = [`✅ ${success} invitación(es) enviada(s)`];
    if (existingEmails.length > 0) msgParts.push(`(${existingEmails.length} para actualización de datos)`);
    if (failed > 0) msgParts.push(`${failed} fallida(s)`);
    setSuccessMsg(msgParts.join(', '));
    setTimeout(() => setSuccessMsg(null), 6000);
    fetchInvitaciones();
  };

  // ─── Resend ──────────────────────────────────────────────────
  const handleResend = async (inv: Invitacion) => {
    try {
      await apiClient.post('/pta/banco-docentes/invitaciones', { correoInstitucional: inv.correoInstitucional });
      setSuccessMsg(`🔄 Invitación reenviada a ${inv.correoInstitucional}`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchInvitaciones();
    } catch (err: any) {
      setError(err.message || 'Error al reenviar');
    }
  };

  const handleBulkResend = async () => {
    const pending = invitaciones.filter((inv) => {
      const isExpired = new Date(inv.fechaExpiracion) < new Date();
      return inv.estado === 'Enviada' || isExpired;
    });
    if (pending.length === 0) { setError('No hay invitaciones pendientes para reenviar.'); return; }

    setCreating(true);
    let count = 0;
    for (const inv of pending) {
      try {
        await apiClient.post('/pta/banco-docentes/invitaciones', { correoInstitucional: inv.correoInstitucional });
        count++;
      } catch { /* skip */ }
    }
    setCreating(false);
    setSuccessMsg(`🔄 ${count} recordatorio(s) enviado(s)`);
    setTimeout(() => setSuccessMsg(null), 5000);
    fetchInvitaciones();
  };

  // ─── Copy link ───────────────────────────────────────────────
  const handleCopyLink = (inv: Invitacion) => {
    const link = `${window.location.origin}/autogestion/docentes?token=${inv.tokenAcceso}`;
    navigator.clipboard.writeText(link);
    setSuccessMsg(`📋 Link copiado para ${inv.correoInstitucional}`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // ─── Selection ───────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((i) => i.id)));
    }
  };

  const allSelected = paginated.length > 0 && selectedIds.size === paginated.length;

  // ─── Styles ──────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
    fontSize: '0.82rem', color: '#0f172a', outline: 'none', background: '#f8fafc',
    width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
    transition: 'all 0.2s',
  };

  const btnStyle = (variant: 'primary' | 'secondary' | 'ghost' | 'success'): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
    border: variant === 'ghost' ? '1.5px solid #e2e8f0' : 'none',
    background: variant === 'primary' ? 'linear-gradient(135deg, #4f46e5, #4338ca)' :
                variant === 'success' ? 'linear-gradient(135deg, #22c55e, #16a34a)' :
                variant === 'ghost' ? '#fff' : '#eef2ff',
    color: variant === 'primary' || variant === 'success' ? '#fff' : variant === 'ghost' ? '#475569' : '#4338ca',
    boxShadow: variant === 'primary' ? '0 4px 14px rgba(79,70,229,0.25)' :
               variant === 'success' ? '0 4px 14px rgba(22,163,74,0.25)' : 'none',
  });

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ═══ Notifications ═══ */}
      {error && (
        <div style={{ padding: '12px 18px', borderRadius: 12, background: 'linear-gradient(135deg, #fef2f2, #fff1f2)', border: '1px solid #fecaca', fontSize: '0.82rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '1rem', fontWeight: 700 }}>×</button>
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '12px 18px', borderRadius: 12, background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1px solid #bbf7d0', fontSize: '0.82rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ═══ Metrics Row ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        <MetricCard label="Total Invitados" value={metrics.total} icon={MailPlus} color="#4f46e5" />
        <MetricCard label="Gestionadas" value={metrics.gestionadas} icon={CheckCircle2} color="#16a34a" subtitle="Formulario completado" />
        <MetricCard label="En Proceso" value={metrics.enProceso} icon={Clock} color="#8b5cf6" subtitle="Abierta / OTP / Draft" />
        <MetricCard label="Sin Abrir" value={metrics.sinAbrir} icon={Inbox} color="#f59e0b" subtitle="Invitación sin abrir" />
        <MetricCard label="Vencidas" value={metrics.vencidas} icon={XCircle} color="#ef4444" subtitle="Link expirado" />
      </div>

      {/* ═══ Bulk Send Section ═══ */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4f46e5, #4338ca)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Send size={16} color="#fff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>Enviar Invitaciones</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>Pega uno o múltiples correos @esap.edu.co separados por coma, punto y coma o salto de línea</p>
          </div>
        </div>
        <div style={{ padding: '16px 22px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <textarea
            value={bulkEmails}
            onChange={(e) => setBulkEmails(e.target.value)}
            placeholder="profesor1@esap.edu.co, profesor2@esap.edu.co&#10;profesor3@esap.edu.co"
            rows={3}
            style={{ ...inputStyle, flex: 1, resize: 'vertical', minHeight: 72, fontFamily: 'monospace', fontSize: '0.78rem' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.1)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
            <button
              onClick={handleBulkCreate}
              disabled={creating || !bulkEmails.trim()}
              style={{ ...btnStyle('primary'), opacity: creating || !bulkEmails.trim() ? 0.6 : 1, cursor: creating || !bulkEmails.trim() ? 'not-allowed' : 'pointer', justifyContent: 'center' }}
            >
              <Send size={14} /> {creating ? 'Enviando...' : `Enviar ${parseEmails(bulkEmails).length > 1 ? `(${parseEmails(bulkEmails).length})` : 'Invitación'}`}
            </button>
            <button onClick={handleBulkResend} disabled={creating} style={{ ...btnStyle('ghost'), justifyContent: 'center', fontSize: '0.73rem' }}>
              <RefreshCw size={13} /> Reenviar pendientes
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Duplicate Check Results ═══ */}
      {duplicateCheck && (
        <div style={{ background: '#fffbeb', borderRadius: 12, border: '1px solid #fde68a', padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
              Docentes ya registrados detectados
            </div>
            <div style={{ fontSize: '0.75rem', color: '#78350f', lineHeight: 1.5 }}>
              <strong>{duplicateCheck.existing.length}</strong> correo(s) ya existen en el Banco de Docentes.
              La invitación les permitirá <strong>actualizar únicamente</strong> sus datos editables (formación, contacto alternativo, etc.).
              Los campos de identidad (nombre, documento, tipo documento, correo institucional) <strong>no podrán ser modificados</strong> por el docente.
            </div>
            {duplicateCheck.existing.length <= 5 && (
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {duplicateCheck.existing.map((e) => (
                  <span key={e} style={{ padding: '2px 8px', borderRadius: 6, background: '#fef3c7', fontSize: '0.68rem', fontWeight: 600, color: '#92400e' }}>{e}</span>
                ))}
              </div>
            )}
            <button onClick={() => setDuplicateCheck(null)} style={{ marginTop: 8, background: 'none', border: 'none', fontSize: '0.7rem', color: '#b45309', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>Cerrar</button>
          </div>
        </div>
      )}

      {/* ═══ Info Banner: Anti-duplicados ═══ */}
      <div style={{ background: '#f0f9ff', borderRadius: 12, border: '1px solid #bae6fd', padding: '12px 18px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <AlertCircle size={16} color="#0284c7" style={{ flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '0.73rem', color: '#0c4a6e', lineHeight: 1.5 }}>
          <strong>Protección anti-duplicados:</strong> Si el correo ya existe en el Banco de Docentes, la invitación será para <strong>actualizar datos complementarios</strong> (formación, teléfono, perfil).
          Los campos de identidad (nombre, documento, tipo de documento, correo institucional) son <strong>de solo lectura</strong> y no pueden ser modificados por el docente.
        </p>
      </div>

      {/* ═══ Filters + Actions Bar ═══ */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 250px', padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff' }}>
          <Search size={15} color="#94a3b8" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por correo..."
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.82rem', color: '#0f172a', width: '100%' }}
          />
        </div>

        {/* Estado filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={14} color="#64748b" />
          <select
            value={filtroEstado}
            onChange={(e) => { setFiltroEstado(e.target.value as EstadoFiltro); setPage(1); }}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '0.8rem', color: '#0f172a', background: '#fff', cursor: 'pointer' }}
          >
            {ESTADOS_FILTRO.map((e) => <option key={e} value={e}>{e === 'TODOS' ? 'Todos los estados' : e}</option>)}
          </select>
        </div>

        {/* Count */}
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
          {filtered.length} resultado(s)
        </span>

        {/* Preview toggle */}
        <button
          onClick={() => setShowPreview(!showPreview)}
          style={{ ...btnStyle('ghost'), marginLeft: 'auto', gap: 5, fontSize: '0.75rem' }}
        >
          <Eye size={14} /> {showPreview ? 'Ocultar Preview' : 'Ver Formulario Docente'}
        </button>
      </div>

      {/* ═══ Preview Panel ═══ */}
      {showPreview && (
        <div style={{ background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', borderRadius: 14, border: '1px solid #bae6fd', padding: '20px 24px', display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Sparkles size={18} color="#0284c7" />
              <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#0369a1' }}>Vista previa del Formulario de Autogestión</h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#0c4a6e', lineHeight: 1.6 }}>
              Este es el formulario público que el docente verá al abrir su link de invitación. Incluye:
              verificación OTP con código de 6 dígitos → formulario de datos personales, contacto y formación académica →
              aceptación de Habeas Data → envío a validación GGP.
            </p>
            <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: '#0e7490' }}>
              El docente puede <strong>guardar borrador</strong> y continuar después con el mismo link + nuevo OTP.
            </p>
          </div>
          <a
            href="/autogestion/docentes"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...btnStyle('primary'),
              textDecoration: 'none', padding: '12px 24px',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              boxShadow: '0 4px 14px rgba(2,132,199,0.3)',
            }}
          >
            <ExternalLink size={15} /> Abrir Formulario
          </a>
        </div>
      )}

      {/* ═══ Table ═══ */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', width: 40 }}>
                  <button onClick={toggleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {allSelected ? <CheckSquare size={16} color="#4f46e5" /> : <Square size={16} color="#94a3b8" />}
                  </button>
                </th>
                {['CORREO INSTITUCIONAL', 'ESTADO', 'ENVIADA', 'ÚLTIMA ACTIVIDAD', 'EXPIRA', 'ACCIONES'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.68rem', whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span>Cargando invitaciones...</span>
                  </div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <Mail size={36} color="#cbd5e1" />
                    <div style={{ fontWeight: 600 }}>No hay invitaciones{filtroEstado !== 'TODOS' || search ? ' con estos filtros' : ''}</div>
                    <div style={{ fontSize: '0.78rem' }}>Envía la primera invitación usando el panel superior</div>
                  </div>
                </td></tr>
              ) : paginated.map((inv) => {
                const isExpired = new Date(inv.fechaExpiracion) < new Date() && inv.estado !== 'Gestionada';
                const effectiveEstado = isExpired ? 'Vencida' : inv.estado;
                const isSelected = selectedIds.has(inv.id);

                return (
                  <tr
                    key={inv.id}
                    style={{ borderBottom: '1px solid #f1f5f9', background: isSelected ? '#eef2ff' : 'transparent', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#fafbfc'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => toggleSelect(inv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        {isSelected ? <CheckSquare size={16} color="#4f46e5" /> : <Square size={16} color="#cbd5e1" />}
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {inv.correoInstitucional?.split('@')[0]?.slice(0, 2)?.toUpperCase() || '??'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.82rem' }}>{inv.correoInstitucional}</div>
                          {inv.borradorJson?.nombreCompleto && (
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{inv.borradorJson.nombreCompleto}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StateBadge estado={effectiveEstado} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: '#475569' }}>
                      {new Date(inv.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <TimeAgo date={inv.updatedAt} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.78rem' }}>
                      {isExpired ? (
                        <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.72rem' }}>Expirada</span>
                      ) : (
                        <span style={{ color: '#475569' }}>
                          {new Date(inv.fechaExpiracion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => handleCopyLink(inv)}
                          title="Copiar link"
                          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                        >
                          <Copy size={13} color="#4f46e5" />
                        </button>
                        {(effectiveEstado === 'Enviada' || effectiveEstado === 'Vencida') && (
                          <button
                            onClick={() => handleResend(inv)}
                            title="Reenviar invitación"
                            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #fde68a', background: '#fffbeb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fef3c7'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fffbeb'; }}
                          >
                            <RefreshCw size={13} color="#d97706" />
                          </button>
                        )}
                        <a
                          href={`${window.location.origin}/autogestion/docentes?token=${inv.tokenAcceso}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir formulario"
                          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #bbf7d0', background: '#f0fdf4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transition: 'all 0.15s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#dcfce7'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#f0fdf4'; }}
                        >
                          <ArrowUpRight size={13} color="#16a34a" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #f1f5f9', background: '#fafbfc' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: page === 1 ? '#f1f5f9' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
              >
                <ChevronLeft size={14} color={page === 1 ? '#94a3b8' : '#475569'} />
              </button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 6, page - 3)) + i;
                if (p > totalPages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)} style={{
                    padding: '6px 11px', borderRadius: 8, border: '1px solid #e2e8f0',
                    background: p === page ? '#4f46e5' : '#fff',
                    color: p === page ? '#fff' : '#475569',
                    fontWeight: p === page ? 700 : 400, cursor: 'pointer', fontSize: '0.78rem',
                  }}>
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: page === totalPages ? '#f1f5f9' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
              >
                <ChevronRight size={14} color={page === totalPages ? '#94a3b8' : '#475569'} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Download,
  Eye,
  FileImage,
  FileSearch,
  FileText,
  History,
  IdCard,
  Inbox,
  Loader2,
  Mail,
  MessageSquareText,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  User,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@esap-mfe/shared-ui/dialog';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import {
  certificadosService,
  type CorrectionCertificatePreview,
  type CertificateCorrectionRequest,
  type CorrectionEvidence,
  type CorrectionStatus,
  type CorrectionTraceEvent,
} from '../../services/api/certificados.service';

type CorrectionStats = {
  total: number;
  pending: number;
  in_review: number;
  approved: number;
  rejected: number;
  overdue: number;
};

type EditableCertificate = {
  full_name: string;
  document_type: string;
  id_number: string;
  career_category: string;
  position_category: string;
  position_location: string;
  department: string;
  cod_cargo: string;
  cod_grade: string;
  encargo_type: 'E' | 'N';
  campus: string;
  hiring_date: string;
  monthly_salary: string;
  technical_bonus: string;
  include_salary: boolean;
  include_technical_bonus: boolean;
};

const EMPTY_STATS: CorrectionStats = {
  total: 0,
  pending: 0,
  in_review: 0,
  approved: 0,
  rejected: 0,
  overdue: 0,
};

const STATUS_META: Record<CorrectionStatus, { label: string; classes: string; dot: string }> = {
  PENDING: { label: 'Pendiente', classes: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  IN_REVIEW: { label: 'En revisión', classes: 'border-blue-200 bg-blue-50 text-blue-800', dot: 'bg-blue-500' },
  APPROVED: { label: 'Corregida', classes: 'border-emerald-200 bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Rechazada', classes: 'border-red-200 bg-red-50 text-red-800', dot: 'bg-red-500' },
};

const asDateOnly = (value: unknown) => String(value || '').match(/^\d{4}-\d{2}-\d{2}/)?.[0] || '';

const formatDate = (value: unknown, withTime = false) => {
  const raw = String(value || '');
  if (!raw) return '—';
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = dateOnly && !withTime
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

const formatMoney = (value: unknown) =>
  Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });

const formatBytes = (value: number) =>
  value < 1024 * 1024
    ? `${Math.max(1, Math.round(value / 1024))} KB`
    : `${(value / (1024 * 1024)).toFixed(1)} MB`;

const downloadLocalEvidence = (file: File) => {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name || 'evidencia';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const sanitizePreviewHtml = (html: string) => {
  if (typeof DOMParser === 'undefined') return '';
  const documentNode = new DOMParser().parseFromString(String(html || ''), 'text/html');
  documentNode.querySelectorAll('script,style,iframe,object,embed,link,meta,form,input,button').forEach((node) => node.remove());
  const allowedTags = new Set(['P', 'BR', 'DIV', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'MARK']);
  Array.from(documentNode.body.querySelectorAll('*')).forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
    if (!allowedTags.has(element.tagName)) element.replaceWith(...Array.from(element.childNodes));
  });
  return documentNode.body.innerHTML;
};

const isOpenStatus = (status: CorrectionStatus) => status === 'PENDING' || status === 'IN_REVIEW';

const normalizeRenderedCargoCode = (value: unknown) => {
  const raw = String(value ?? '').trim();
  const digits = raw.replace(/\D+/g, '');
  if (!digits) return raw;
  if (/^0+$/.test(digits) || digits.length <= 4) return digits;
  return digits.slice(0, 4);
};

const normalizeEncargoType = (value: unknown): 'E' | 'N' => {
  const normalized = String(value ?? '').trim().toUpperCase();
  return normalized === 'E' || normalized.startsWith('E') ? 'E' : 'N';
};

const normalizeWholeMoneyValue = (value: unknown): string => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? String(Math.round(parsed)) : '0';
};

const normalizeWholeMoneyInput = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\d+$/.test(trimmed)) return trimmed;

  // Admite pegar valores ya formateados, pero descarta la parte decimal.
  const withoutDecimalPart = trimmed.replace(/[.,]\d{1,2}$/, '');
  return withoutDecimalPart.replace(/\D+/g, '');
};

const editableCertificateFrom = (
  source: Record<string, any>,
  encargoFallback?: unknown,
): EditableCertificate => {
  return {
    full_name: String(source.full_name || ''),
    document_type: String(source.document_type || 'CC'),
    id_number: String(source.id_number || ''),
    career_category: String(source.career_category || ''),
    position_category: String(source.position_category || ''),
    position_location: String(source.position_location || ''),
    department: String(source.department || ''),
    cod_cargo: normalizeRenderedCargoCode(source.cod_cargo),
    cod_grade: String(source.cod_grade || ''),
    encargo_type: normalizeEncargoType(source.encargo_type ?? encargoFallback),
    campus: String(source.campus || ''),
    hiring_date: asDateOnly(source.hiring_date),
    monthly_salary: normalizeWholeMoneyValue(source.monthly_salary),
    technical_bonus: normalizeWholeMoneyValue(source.technical_bonus),
    include_salary: source.include_salary !== false,
    include_technical_bonus: source.include_technical_bonus === true,
  };
};

const toEditData = (request: CertificateCorrectionRequest): EditableCertificate => {
  const source = request.certificate || request.corrected_data || request.certificate_snapshot || {};
  return editableCertificateFrom(
    source,
    source.request?.observations ??
      request.certificate?.request?.observations ??
      request.certificate_snapshot?.encargo_type,
  );
};

const restrictComplementaryDataToActiveTemplate = (
  data: EditableCertificate,
  request: CertificateCorrectionRequest,
  preview: CorrectionCertificatePreview | null,
): EditableCertificate => {
  if (!preview) return data;

  const activeSourceFields = new Set(
    (preview.template_variables || []).flatMap((variable) => variable.source_fields || []),
  );
  const original = editableCertificateFrom(
    request.certificate_snapshot || {},
    request.certificate_snapshot?.encargo_type ??
      request.certificate?.encargo_type ??
      request.certificate?.request?.observations,
  );

  return {
    ...data,
    position_location: activeSourceFields.has('position_location')
      ? data.position_location
      : original.position_location,
    campus: activeSourceFields.has('campus') ? data.campus : original.campus,
  };
};

function StatusBadge({ status }: { status: CorrectionStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant="outline" className={`${meta.classes} gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </Badge>
  );
}

function TemplateVariableIndicator({
  codes,
  templateReady,
}: {
  codes: string[];
  templateReady: boolean;
}) {
  if (codes.length > 0) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        {codes.map((code) => (
          <span key={code} title="Variable utilizada por la plantilla activa" className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[9px] font-black tracking-tight text-[#003DA5] ring-1 ring-inset ring-blue-200">
            {code}
          </span>
        ))}
      </span>
    );
  }
  return templateReady ? (
    <span title="Este dato se conserva en el registro, pero la plantilla activa no lo imprime" className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
      Dato complementario
    </span>
  ) : null;
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  disabled,
  changed,
  originalValue,
  helper,
  inputMode,
  pattern,
  templateVariables = [],
  templateReady = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  changed?: boolean;
  originalValue?: string;
  helper?: string;
  inputMode?: 'numeric';
  pattern?: string;
  templateVariables?: string[];
  templateReady?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex min-h-4 items-center justify-between gap-2 text-xs font-bold text-slate-700">
        <span className="flex flex-wrap items-center gap-1.5"><span>{label}{required && <span className="text-red-500"> *</span>}</span><TemplateVariableIndicator codes={templateVariables} templateReady={templateReady} /></span>
        {changed && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800">Modificado</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        disabled={disabled}
        inputMode={inputMode}
        pattern={pattern}
        onChange={(event) => onChange(event.target.value)}
        className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#003DA5] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500 ${changed ? 'border-amber-300 bg-amber-50/40' : 'border-slate-300'}`}
      />
      {helper && !changed && <span className="block text-[10px] leading-4 text-slate-500">{helper}</span>}
      {changed && originalValue !== undefined && (
        <span className="block truncate text-[10px] text-amber-700" title={originalValue}>Original: {originalValue || 'Sin información'}</span>
      )}
    </label>
  );
}

function FormSection({
  number,
  icon,
  title,
  description,
  children,
}: {
  number: number;
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3.5">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-50 text-[#003DA5] ring-1 ring-blue-100">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className="text-[10px] font-black uppercase tracking-widest text-[#003DA5]">Sección {number}</span></div>
          <h3 className="mt-0.5 text-sm font-bold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

const TRACE_EVENT_META: Record<CorrectionTraceEvent['type'], { icon: typeof History; color: string; bg: string }> = {
  REQUEST_CREATED: { icon: MessageSquareText, color: 'text-sky-700', bg: 'bg-sky-50 ring-sky-200' },
  REVIEW_STARTED: { icon: UserCheck, color: 'text-blue-700', bg: 'bg-blue-50 ring-blue-200' },
  CERTIFICATE_SENT: { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50 ring-emerald-200' },
  REQUEST_REJECTED: { icon: XCircle, color: 'text-red-700', bg: 'bg-red-50 ring-red-200' },
};

function TraceabilityPanel({ events }: { events: CorrectionTraceEvent[] }) {
  const ordered = [...events].sort(
    (first, second) => new Date(first.occurred_at).getTime() - new Date(second.occurred_at).getTime(),
  );
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-blue-50 text-[#003DA5] ring-1 ring-blue-100"><History className="h-5 w-5" /></div>
          <div><h2 className="font-bold text-slate-900">Trazabilidad del caso</h2><p className="mt-0.5 text-xs leading-5 text-slate-500">Registro cronológico de acciones, mensajes, responsables y resultado.</p></div>
        </div>
        <Badge variant="outline" className="w-fit rounded-full bg-white text-slate-600">{ordered.length} movimiento{ordered.length === 1 ? '' : 's'}</Badge>
      </div>
      <div className="p-5">
        <ol className="space-y-0">
          {ordered.map((event, index) => {
            const meta = TRACE_EVENT_META[event.type];
            const Icon = meta.icon;
            const deliveryStatus = event.metadata?.delivery_status;
            const evidenceCount = Number(event.metadata?.evidence_count || 0);
            const changes = Array.isArray(event.metadata?.changes) ? event.metadata.changes : [];
            const isLast = index === ordered.length - 1;
            return (
              <li key={event.id} className="correction-trace-row relative gap-3 pb-5 last:pb-0">
                {!isLast && <span className="absolute bottom-0 left-[19px] top-10 w-px bg-slate-200" />}
                <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ring-1 ${meta.bg}`}><Icon className={`h-4 w-4 ${meta.color}`} /></div>
                <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div><h3 className="text-sm font-bold text-slate-900">{event.title}</h3><p className="mt-1 text-xs font-medium text-slate-500">{event.actor_name} · {event.actor_role === 'SOLICITANTE' ? 'Solicitante' : 'Coordinador'}</p></div>
                    <time className="whitespace-nowrap text-[11px] font-medium text-slate-500">{formatDate(event.occurred_at, true)}</time>
                  </div>
                  <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-700">{event.description}</p>
                  {(event.metadata?.recipient || deliveryStatus || evidenceCount > 0) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                      {event.metadata?.recipient && <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-blue-800"><Mail className="h-3 w-3 flex-none" /><span className="max-w-64 truncate">{String(event.metadata.recipient)}</span></span>}
                      {deliveryStatus && <span className={`rounded-full px-2.5 py-1 font-bold ${deliveryStatus === 'SENT' ? 'bg-emerald-50 text-emerald-700' : deliveryStatus === 'FAILED' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{deliveryStatus === 'SENT' ? 'Notificación enviada' : deliveryStatus === 'FAILED' ? 'Falló la notificación' : 'Notificación sin confirmar'}</span>}
                      {evidenceCount > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700"><Paperclip className="h-3 w-3" />{evidenceCount} evidencia{evidenceCount === 1 ? '' : 's'} enviada{evidenceCount === 1 ? '' : 's'}</span>}
                    </div>
                  )}
                  {changes.length > 0 && (
                    <details className="group mt-3 overflow-hidden rounded-lg border border-amber-200 bg-amber-50/60">
                      <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-bold text-amber-900 marker:hidden">{changes.length} campo{changes.length === 1 ? '' : 's'} modificado{changes.length === 1 ? '' : 's'} <span className="ml-1 text-amber-700 group-open:hidden">· Ver detalle</span></summary>
                      <div className="space-y-2 border-t border-amber-200 p-3">{changes.map((change) => <div key={change.field} className="correction-change-row grid gap-1 rounded-lg bg-white p-2.5 text-[11px] sm:items-center"><strong className="text-slate-700">{change.label}</strong><span className="break-words text-slate-500">{change.before || 'Sin información'}</span><ChevronRight className="hidden h-3.5 w-3.5 text-amber-500 sm:block" /><span className="break-words font-semibold text-slate-800">{change.after || 'Sin información'}</span></div>)}</div>
                    </details>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function DecisionEvidencePicker({
  files,
  onAdd,
  onRemove,
  tone,
  disabled,
}: {
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  tone: 'approval' | 'rejection';
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isApproval = tone === 'approval';
  const accent = isApproval
    ? 'border-blue-200 bg-blue-50/70 text-[#003DA5] hover:border-blue-400 hover:bg-blue-50'
    : 'border-red-200 bg-red-50/60 text-red-700 hover:border-red-400 hover:bg-red-50';

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-700">Evidencias de la decisión <span className="font-normal text-slate-500">(opcional)</span></p>
          <p className="mt-1 text-xs text-slate-500">Máximo 2 imágenes PNG, JPG o JPEG · 10 MB por archivo.</p>
        </div>
        <span className={`flex-none rounded-full px-2.5 py-1 text-[11px] font-bold ${isApproval ? 'bg-blue-50 text-[#003DA5]' : 'bg-red-50 text-red-700'}`}>{files.length}/2</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
        className="hidden"
        disabled={disabled || files.length >= 2}
        onChange={(event) => {
          onAdd(Array.from(event.target.files || []));
          event.target.value = '';
        }}
      />
      <motion.button
        layout
        type="button"
        disabled={disabled || files.length >= 2}
        onClick={() => inputRef.current?.click()}
        whileHover={disabled || files.length >= 2 ? undefined : { y: -1 }}
        whileTap={disabled || files.length >= 2 ? undefined : { scale: 0.995 }}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${accent}`}
      >
        <Paperclip className="h-4 w-4" />
        {files.length >= 2 ? 'Cupo de evidencias completo' : 'Adjuntar imágenes de soporte'}
      </motion.button>
      <motion.div layout className="mt-2 space-y-2">
        <AnimatePresence initial={false}>
          {files.map((file, index) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              key={`${file.name}-${file.size}`}
              className={`flex min-w-0 items-center gap-2 rounded-lg border p-2.5 text-xs ${isApproval ? 'border-blue-100 bg-blue-50/40' : 'border-red-100 bg-red-50/40'}`}
            >
              <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${isApproval ? 'bg-blue-100 text-[#003DA5]' : 'bg-red-100 text-red-700'}`}><FileImage className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-slate-800">{file.name}</span><span className="text-slate-500">{formatBytes(file.size)}</span></span>
              <div className="flex flex-none items-center gap-1.5">
                <motion.button
                  type="button"
                  disabled={disabled}
                  aria-label={`Descargar ${file.name}`}
                  title={`Descargar ${file.name}`}
                  onClick={() => downloadLocalEvidence(file)}
                  whileHover={disabled ? undefined : { y: -1, scale: 1.04 }}
                  whileTap={disabled ? undefined : { scale: 0.94 }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-white text-[#003DA5] shadow-sm transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-[#002D7A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                </motion.button>
                <motion.button
                  type="button"
                  disabled={disabled}
                  aria-label={`Eliminar ${file.name}`}
                  title={`Eliminar ${file.name}`}
                  onClick={() => onRemove(index)}
                  whileHover={disabled ? undefined : { y: -1, scale: 1.04 }}
                  whileTap={disabled ? undefined : { scale: 0.94 }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 shadow-sm transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function MinimumDescriptionFeedback({
  value,
  minimum = 20,
}: {
  value: string;
  minimum?: number;
}) {
  const current = value.trim().length;
  const remaining = Math.max(0, minimum - current);
  const complete = remaining === 0;
  const progress = Math.min(100, (current / minimum) * 100);

  return (
    <div className="mt-2" role="status" aria-live="polite">
      <div className={`flex items-center justify-between gap-3 text-xs font-semibold ${complete ? 'text-emerald-700' : current > 0 ? 'text-amber-700' : 'text-slate-600'}`}>
        <span className="flex items-center gap-1.5">
          {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {complete
            ? 'Descripción lista para enviar.'
            : current > 0
              ? `Faltan ${remaining} carácter${remaining === 1 ? '' : 'es'} para habilitar el envío.`
              : `Escribe al menos ${minimum} caracteres para continuar.`}
        </span>
        <span className="flex-none tabular-nums">{current}/{minimum} mín.</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <motion.div
          className={`h-full rounded-full ${complete ? 'bg-emerald-500' : 'bg-amber-500'}`}
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export function CertificateCorrectionRequests() {
  const previewSequenceRef = useRef(0);
  const [items, setItems] = useState<CertificateCorrectionRequest[]>([]);
  const [stats, setStats] = useState<CorrectionStats>(EMPTY_STATS);
  const [status, setStatus] = useState<CorrectionStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<CertificateCorrectionRequest | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editData, setEditData] = useState<EditableCertificate | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approvalFiles, setApprovalFiles] = useState<File[]>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectFiles, setRejectFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [evidenceLoading, setEvidenceLoading] = useState('');
  const [certificatePreview, setCertificatePreview] = useState<CorrectionCertificatePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [approvalNote, setApprovalNote] = useState('');

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setLoadError('');
    try {
      const [listResponse, statsResponse] = await Promise.all([
        certificadosService.correcciones.listar({ page, limit: 10, status, search: search.trim() }),
        certificadosService.correcciones.estadisticas(),
      ]);
      // ApiClient unwraps legacy responses that contain a top-level `data` key.
      // Accept that shape as well as the current paginated contract so a mixed
      // frontend/backend deployment never hides requests that were loaded.
      const responseItems = Array.isArray(listResponse)
        ? listResponse
        : listResponse.items || listResponse.data || [];
      const responseTotal = Array.isArray(listResponse)
        ? responseItems.length
        : Number(listResponse.total ?? responseItems.length);
      const responseTotalPages = Array.isArray(listResponse)
        ? Math.max(1, Math.ceil(responseTotal / 10))
        : Math.max(1, Number(listResponse.totalPages) || 1);

      setItems(responseItems);
      setTotal(responseTotal);
      setTotalPages(responseTotalPages);
      setStats(statsResponse || EMPTY_STATS);
    } catch (error: any) {
      setLoadError(error?.message || 'No fue posible consultar las solicitudes en este momento.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), search ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [loadData, search]);

  useEffect(() => setPage(1), [status, search]);

  const openRequest = async (request: CertificateCorrectionRequest) => {
    setDetailLoading(true);
    try {
      let detail = await certificadosService.correcciones.obtener(request.id);
      if (detail.status === 'PENDING') detail = await certificadosService.correcciones.iniciarRevision(request.id);
      setSelected(detail);
      setEditData(toEditData(detail));
      setApprovalNote(detail.resolution_description || '');
      setApprovalFiles([]);
      setRejectReason('');
      setRejectFiles([]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (request.status === 'PENDING') void loadData(false);
    } catch (error: any) {
      toast.error('No fue posible abrir la solicitud', { description: error?.message });
    } finally {
      setDetailLoading(false);
    }
  };

  const openEvidence = async (kind: 'submitted' | 'resolution', evidence: CorrectionEvidence) => {
    if (!selected) return;
    const key = `${kind}-${evidence.index}`;
    setEvidenceLoading(key);
    try {
      const blob = await certificadosService.correcciones.evidencia(selected.id, kind, evidence.index);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error: any) {
      toast.error('No fue posible abrir la evidencia', { description: error?.message });
    } finally {
      setEvidenceLoading('');
    }
  };

  const validateEditData = () => {
    if (!editData) return false;
    const required = [editData.full_name, editData.document_type, editData.id_number, editData.career_category, editData.position_category, editData.hiring_date];
    if (required.some((value) => !String(value).trim())) {
      toast.error('Completa todos los campos obligatorios.');
      return false;
    }
    if (!/^\d+$/.test(editData.monthly_salary)) {
      toast.error('El salario debe escribirse en pesos enteros, sin decimales.');
      return false;
    }
    if (editData.include_technical_bonus && !/^\d+$/.test(editData.technical_bonus)) {
      toast.error('La prima debe escribirse en pesos enteros, sin decimales.');
      return false;
    }
    return true;
  };

  const approve = async () => {
    if (!selected || !editData || !validateEditData()) return;
    if (approvalNote.trim().length < 20) {
      toast.error('Escribe una descripción de la aprobación de al menos 20 caracteres.');
      return;
    }
    setSaving(true);
    setUploadProgress(1);
    try {
      const response = await certificadosService.correcciones.aprobar(
        selected.id,
        {
          ...restrictComplementaryDataToActiveTemplate(
            editData,
            selected,
            certificatePreview,
          ),
          resolution_description: approvalNote.trim(),
        },
        approvalFiles,
        setUploadProgress,
      );
      setSelected(response);
      setEditData(toEditData(response));
      setApproveOpen(false);
      setApprovalFiles([]);
      toast.success('Certificado corregido y enviado', { description: `El PDF fue remitido a ${response.email}.` });
      void loadData(false);
    } catch (error: any) {
      toast.error('No se pudo enviar el certificado corregido', { description: error?.message || 'Verifica el correo e intenta nuevamente.' });
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const addDecisionFiles = (
    currentFiles: File[],
    setFiles: (files: File[]) => void,
    incoming: File[],
  ) => {
    const next = [...currentFiles];
    for (const file of incoming) {
      if (next.length >= 2) {
        toast.error('Puedes adjuntar máximo dos imágenes.');
        break;
      }
      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        toast.error(`${file.name}: usa una imagen PNG, JPG o JPEG.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: supera el máximo de 10 MB.`);
        continue;
      }
      if (!next.some((current) => current.name === file.name && current.size === file.size)) next.push(file);
    }
    setFiles(next);
  };

  const reject = async () => {
    if (!selected) return;
    if (rejectReason.trim().length < 20) {
      toast.error('El motivo debe tener al menos 20 caracteres.');
      return;
    }
    setSaving(true);
    setUploadProgress(1);
    try {
      const response = await certificadosService.correcciones.rechazar(
        selected.id,
        rejectReason.trim(),
        rejectFiles,
        setUploadProgress,
      );
      setSelected(response);
      setRejectOpen(false);
      setRejectReason('');
      setRejectFiles([]);
      toast.success('Solicitud rechazada', {
        description: response.email_sent
          ? 'La decisión quedó registrada y el usuario fue notificado.'
          : 'La decisión quedó registrada; no fue posible enviar el correo de aviso.',
      });
      void loadData(false);
    } catch (error: any) {
      toast.error('No fue posible rechazar la solicitud', { description: error?.message });
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const setField = <K extends keyof EditableCertificate>(field: K, value: EditableCertificate[K]) =>
    setEditData((current) => current ? { ...current, [field]: value } : current);

  const overdue = useMemo(() => selected && isOpenStatus(selected.status) && asDateOnly(selected.due_date) < asDateOnly(new Date().toISOString()), [selected]);

  useEffect(() => {
    if (!selected || !editData) {
      setCertificatePreview(null);
      setPreviewError('');
      return;
    }
    const sequence = ++previewSequenceRef.current;
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError('');
      try {
        const response = await certificadosService.correcciones.previsualizar(selected.id, editData);
        if (previewSequenceRef.current === sequence) setCertificatePreview(response);
      } catch (error: any) {
        if (previewSequenceRef.current === sequence) {
          setPreviewError(error?.message || 'No fue posible actualizar la vista previa.');
        }
      } finally {
        if (previewSequenceRef.current === sequence) setPreviewLoading(false);
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [editData, selected]);

  if (selected && editData) {
    const editable = isOpenStatus(selected.status);
    const original = selected.certificate_snapshot || {};
    const originalEditData = editableCertificateFrom(
      original,
      original.encargo_type ??
        selected.certificate?.encargo_type ??
        selected.certificate?.request?.observations,
    );
    const traceability: CorrectionTraceEvent[] = Array.isArray(selected.traceability) && selected.traceability.length
      ? selected.traceability
      : [
          {
            id: `${selected.id}-created`, type: 'REQUEST_CREATED', title: 'Solicitud de corrección recibida',
            description: selected.description, status: 'PENDING', occurred_at: selected.created_at,
            actor_name: selected.requester_name, actor_email: selected.requester_email, actor_role: 'SOLICITANTE',
          },
          ...(selected.review_started_at ? [{
            id: `${selected.id}-review`, type: 'REVIEW_STARTED' as const, title: 'Revisión iniciada por el coordinador',
            description: 'El caso fue abierto y quedó en revisión.', status: 'IN_REVIEW' as const,
            occurred_at: selected.review_started_at, actor_name: selected.reviewed_by_name || 'Coordinador Certificados Laborales',
            actor_email: selected.reviewed_by_email, actor_role: 'COORDINADOR' as const,
          }] : []),
        ];
    const comparableValue = (value: unknown) => {
      if (typeof value === 'boolean') return value ? 'Sí' : 'No';
      const raw = String(value ?? '').trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
      const numeric = Number(raw);
      return raw !== '' && Number.isFinite(numeric) ? String(numeric) : raw;
    };
    const isFieldChanged = (field: keyof EditableCertificate) => comparableValue(originalEditData[field]) !== comparableValue(editData[field]);
    const originalFieldValue = (field: keyof EditableCertificate) => {
      const value = originalEditData[field];
      if (field === 'hiring_date') return formatDate(value);
      if (field === 'monthly_salary' || field === 'technical_bonus') return `$${formatMoney(value)} COP`;
      return comparableValue(value);
    };
    const resolvedTemplateVariables = Array.isArray(certificatePreview?.template_variables)
      ? certificatePreview.template_variables
      : [];
    const templateReady = Boolean(certificatePreview);
    const variableCodesFor = (field: keyof EditableCertificate) =>
      resolvedTemplateVariables
        .filter((variable) => variable.source_fields.includes(field))
        .map((variable) => variable.code);
    const fieldIsUsedByTemplate = (field: keyof EditableCertificate) =>
      variableCodesFor(field).length > 0;
    const showPositionLocation = templateReady && fieldIsUsedByTemplate('position_location');
    const showCampus = templateReady && fieldIsUsedByTemplate('campus');
    const showEncargoField = originalEditData.encargo_type === 'E' &&
      (!templateReady || fieldIsUsedByTemplate('encargo_type'));
    const changedFieldCount = (Object.keys(editData) as Array<keyof EditableCertificate>)
      .filter((field) => {
        if (field === 'encargo_type' && !showEncargoField) return false;
        if (field === 'position_location' && !showPositionLocation) return false;
        if (field === 'campus' && !showCampus) return false;
        return isFieldChanged(field);
      }).length;
    const safePreviewHtml = sanitizePreviewHtml(certificatePreview?.content_html || '');
    return (
      <div className="mx-auto w-full max-w-[1680px] space-y-5 px-3 pb-10 sm:px-6 lg:px-8">
        <div className="sticky top-0 z-20 -mx-3 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="outline" onClick={() => { setSelected(null); setEditData(null); }} className="h-10 flex-none rounded-md border-slate-300 bg-white hover:bg-slate-50 hover:text-slate-900">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver
              </Button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">{selected.request_number}</h1>
                  <StatusBadge status={selected.status} />
                  {overdue && <Badge className="rounded-full bg-red-600 text-white">Plazo vencido</Badge>}
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">Certificado {original.certificate_number} · {selected.requester_name}</p>
              </div>
            </div>
            {editable && (
              <div className="flex gap-2 sm:justify-end">
                <Button variant="outline" onClick={() => setRejectOpen(true)} className="h-10 flex-1 rounded-md border-red-200 bg-white font-semibold text-red-700 hover:bg-red-50 hover:text-red-800 sm:flex-none">
                  <XCircle className="mr-2 h-4 w-4" /> Rechazar
                </Button>
                <Button onClick={() => validateEditData() && setApproveOpen(true)} className="h-10 flex-1 rounded-md bg-[#003DA5] font-bold text-white hover:bg-[#002D7A] hover:text-white sm:flex-none">
                  <Send className="mr-2 h-4 w-4" /> Enviar certificado
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              { label: 'Solicitud recibida', value: formatDate(selected.created_at, true), done: true },
              { label: 'Revisión del coordinador', value: selected.review_started_at ? formatDate(selected.review_started_at, true) : 'Pendiente', done: !!selected.review_started_at },
              { label: 'Respuesta', value: selected.resolved_at ? formatDate(selected.resolved_at, true) : `Máximo ${formatDate(selected.due_date)}`, done: !!selected.resolved_at },
            ].map((step, index) => (
              <div key={step.label} className="flex items-center gap-3 p-4">
                <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${step.done ? 'bg-[#003DA5] text-white' : 'bg-slate-50 text-slate-400 ring-1 ring-slate-300'}`}>
                  {step.done ? <Check className="h-4 w-4" /> : <span className="text-xs font-bold">{index + 1}</span>}
                </div>
                <div><p className="text-xs font-bold text-slate-800">{step.label}</p><p className="mt-0.5 text-[11px] text-slate-500">{step.value}</p></div>
              </div>
            ))}
          </div>
        </div>

        <div className="correction-overview-grid">
          <aside className="space-y-5">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2"><FileSearch className="h-5 w-5 text-[#003DA5]" /><h2 className="font-bold text-slate-900">Solicitud del usuario</h2></div>
              <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-slate-700">{selected.description}</div>
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm">
                <div className="flex items-start gap-3"><User className="mt-0.5 h-4 w-4 text-slate-400" /><div><p className="font-semibold text-slate-800">{selected.requester_name}</p><p className="text-xs text-slate-500">CC {original.id_number || editData.id_number}</p></div></div>
                <div className="flex items-start gap-3"><Mail className="mt-0.5 h-4 w-4 text-slate-400" /><p className="break-all text-xs text-slate-600">{selected.requester_email}</p></div>
                <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" /><div><p className="text-xs text-slate-500">Fecha límite</p><p className={`font-semibold ${overdue ? 'text-red-700' : 'text-slate-800'}`}>{formatDate(selected.due_date)}</p></div></div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Paperclip className="h-5 w-5 text-[#003DA5]" /><h2 className="font-bold text-slate-900">Evidencias</h2></div><Badge variant="outline">{selected.submitted_evidence.length}/3</Badge></div>
              {selected.submitted_evidence.length ? (
                <div className="mt-4 space-y-2">
                  {selected.submitted_evidence.map((evidence) => {
                    const key = `submitted-${evidence.index}`;
                    return (
                      <button key={key} type="button" onClick={() => void openEvidence('submitted', evidence)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50">
                        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-100 text-blue-700">{evidence.mimeType === 'application/pdf' ? <FileText className="h-4 w-4" /> : <FileImage className="h-4 w-4" />}</div>
                        <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800">{evidence.originalName}</p><p className="text-[11px] text-slate-500">{formatBytes(evidence.size)}</p></div>
                        {evidenceLoading === key ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : <Eye className="h-4 w-4 text-slate-400" />}
                      </button>
                    );
                  })}
                </div>
              ) : <div className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">El usuario no adjuntó evidencias.</div>}
            </section>

            {!editable && (
              <section className={`rounded-xl border p-5 ${selected.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center gap-2">{selected.status === 'APPROVED' ? <CheckCircle2 className="h-5 w-5 text-emerald-700" /> : <XCircle className="h-5 w-5 text-red-700" />}<h2 className="font-black text-slate-900">Decisión registrada</h2></div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{selected.resolution_description}</p>
                <p className="mt-3 text-xs text-slate-500">Por {selected.reviewed_by_name || 'Coordinador'} · {formatDate(selected.resolved_at, true)}</p>
                {selected.resolution_evidence.length > 0 && <div className="mt-4 space-y-2">{selected.resolution_evidence.map((evidence) => <button key={evidence.index} onClick={() => void openEvidence('resolution', evidence)} className="flex w-full items-center gap-2 rounded-lg border border-white/70 bg-white/70 p-2 text-xs font-semibold text-slate-700"><Download className="h-4 w-4" /><span className="truncate">{evidence.originalName}</span></button>)}</div>}
              </section>
            )}
          </aside>

          <div className="min-w-0"><TraceabilityPanel events={traceability} /></div>
        </div>

        <main className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-blue-50 text-[#003DA5] ring-1 ring-blue-100"><ClipboardCheck className="h-5 w-5" /></div>
              <div><h2 className="text-lg font-bold text-slate-900">{editable ? 'Revisión y corrección del certificado' : 'Contenido final del certificado'}</h2><p className="mt-1 text-xs leading-5 text-slate-500">Edita únicamente los datos que requieran ajuste. La previsualización usa la misma plantilla del PDF final.</p></div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {changedFieldCount > 0 && <Badge className="rounded-full bg-amber-100 text-amber-800">{changedFieldCount} cambio{changedFieldCount === 1 ? '' : 's'}</Badge>}
              <Badge className="rounded-full bg-blue-50 text-[#003DA5]">Vista sincronizada</Badge>
            </div>
          </div>

          <div className="correction-editor-grid">
            <div className="correction-editor-grid__form border-b border-slate-200 bg-slate-50/50 p-4 sm:p-6">
              <fieldset disabled={!editable} className="space-y-4">
                <FormSection number={1} icon={<IdCard className="h-4.5 w-4.5" />} title="Identificación del empleado" description="Valida el nombre y el documento tal como deben figurar en el certificado.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2"><Field label="Nombre completo" value={editData.full_name} onChange={(value) => setField('full_name', value)} required disabled={!editable} changed={isFieldChanged('full_name')} originalValue={originalFieldValue('full_name')} templateVariables={variableCodesFor('full_name')} templateReady={templateReady} /></div>
                    <label className="block space-y-1.5"><span className="flex min-h-4 items-center justify-between gap-2 text-xs font-bold text-slate-700"><span className="flex flex-wrap items-center gap-1.5"><span>Tipo de documento <span className="text-red-500">*</span></span><TemplateVariableIndicator codes={variableCodesFor('document_type')} templateReady={templateReady} /></span>{isFieldChanged('document_type') && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] uppercase tracking-wide text-amber-800">Modificado</span>}</span><select value={editData.document_type} onChange={(event) => setField('document_type', event.target.value)} className={`h-10 w-full rounded-lg border px-3 text-sm outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-blue-100 ${isFieldChanged('document_type') ? 'border-amber-300 bg-amber-50/40' : 'border-slate-300 bg-white'}`} disabled={!editable}><option value="CC">Cédula de ciudadanía</option><option value="CE">Cédula de extranjería</option><option value="PP">Pasaporte</option></select>{isFieldChanged('document_type') && <span className="block text-[10px] text-amber-700">Original: {originalFieldValue('document_type')}</span>}</label>
                    <Field label="Número de documento" value={editData.id_number} onChange={(value) => setField('id_number', value)} required disabled={!editable} changed={isFieldChanged('id_number')} originalValue={originalFieldValue('id_number')} templateVariables={variableCodesFor('id_number')} templateReady={templateReady} />
                  </div>
                </FormSection>

                <FormSection number={2} icon={<Building2 className="h-4.5 w-4.5" />} title="Vinculación, cargo y ubicación" description="Organiza la información laboral que alimenta el párrafo principal de la plantilla.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2"><Field label="Cargo" value={editData.career_category} onChange={(value) => setField('career_category', value)} required disabled={!editable} changed={isFieldChanged('career_category')} originalValue={originalFieldValue('career_category')} templateVariables={variableCodesFor('career_category')} templateReady={templateReady} /></div>
                    <Field label="Tipo de vinculación" value={editData.position_category} onChange={(value) => setField('position_category', value)} required disabled={!editable} changed={isFieldChanged('position_category')} originalValue={originalFieldValue('position_category')} templateVariables={variableCodesFor('position_category')} templateReady={templateReady} />
                    <Field label="Fecha de vinculación" type="date" value={editData.hiring_date} onChange={(value) => setField('hiring_date', value)} required disabled={!editable} changed={isFieldChanged('hiring_date')} originalValue={originalFieldValue('hiring_date')} templateVariables={variableCodesFor('hiring_date')} templateReady={templateReady} />
                    <Field label="Código de cargo (sin grado)" value={editData.cod_cargo} onChange={(value) => setField('cod_cargo', normalizeRenderedCargoCode(value))} disabled={!editable} changed={isFieldChanged('cod_cargo')} originalValue={originalFieldValue('cod_cargo')} helper="Corresponde al código de cuatro dígitos que se imprime; el grado se controla en el campo contiguo." templateVariables={variableCodesFor('cod_cargo')} templateReady={templateReady} />
                    <Field label="Grado / código de grado" value={editData.cod_grade} onChange={(value) => setField('cod_grade', value)} disabled={!editable} changed={isFieldChanged('cod_grade')} originalValue={originalFieldValue('cod_grade')} templateVariables={variableCodesFor('cod_grade')} templateReady={templateReady} />
                    {showEncargoField && (
                      <label className="block space-y-1.5 sm:col-span-2">
                        <span className="flex min-h-4 items-center justify-between gap-2 text-xs font-bold text-slate-700">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span>Indicador de encargo</span>
                            <TemplateVariableIndicator codes={variableCodesFor('encargo_type')} templateReady={templateReady} />
                          </span>
                          {isFieldChanged('encargo_type') && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800">Modificado</span>}
                        </span>
                        <select
                          value={editData.encargo_type}
                          onChange={(event) => setField('encargo_type', event.target.value as 'E' | 'N')}
                          disabled={!editable}
                          className={`h-10 w-full rounded-lg border px-3 text-sm text-slate-900 outline-none transition focus:border-[#003DA5] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500 ${isFieldChanged('encargo_type') ? 'border-amber-300 bg-amber-50/40' : 'border-slate-300 bg-white'}`}
                        >
                          <option value="E">Encargo — mostrar (E) en el cargo</option>
                          <option value="N">Sin indicador — ocultar (E)</option>
                        </select>
                        <span className="block text-[10px] leading-4 text-slate-500">Solo aparece para certificados cuyo registro laboral fue identificado como encargo.</span>
                        {isFieldChanged('encargo_type') && <span className="block text-[10px] text-amber-700">Original: Encargo — mostrar (E)</span>}
                      </label>
                    )}
                    <div className="sm:col-span-2"><Field label="Dependencia" value={editData.department} onChange={(value) => setField('department', value)} disabled={!editable} changed={isFieldChanged('department')} originalValue={originalFieldValue('department')} templateVariables={variableCodesFor('department')} templateReady={templateReady} /></div>
                    {showPositionLocation && <Field label="Grupo o ubicación" value={editData.position_location} onChange={(value) => setField('position_location', value)} disabled={!editable} changed={isFieldChanged('position_location')} originalValue={originalFieldValue('position_location')} templateVariables={variableCodesFor('position_location')} templateReady={templateReady} />}
                    {showCampus && <Field label="Sede" value={editData.campus} onChange={(value) => setField('campus', value)} disabled={!editable} changed={isFieldChanged('campus')} originalValue={originalFieldValue('campus')} templateVariables={variableCodesFor('campus')} templateReady={templateReady} />}
                  </div>
                </FormSection>

                <FormSection number={3} icon={<CircleDollarSign className="h-4.5 w-4.5" />} title="Información salarial" description="Define si el salario y la prima deben aparecer en el documento corregido.">
                  <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 transition ${isFieldChanged('include_salary') ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-white'}`}>
                    <div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-slate-800">Incluir salario</p><TemplateVariableIndicator codes={variableCodesFor('include_salary')} templateReady={templateReady} />{isFieldChanged('include_salary') && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-800">Modificado</span>}</div><p className="mt-0.5 text-xs text-slate-500">Muestra u oculta las secciones salariales de la plantilla.</p></div>
                    <input type="checkbox" checked={editData.include_salary} onChange={(event) => setField('include_salary', event.target.checked)} className="h-5 w-5 accent-[#003DA5]" />
                  </label>
                  {editData.include_salary && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2"><Field label="Salario mensual (COP)" value={editData.monthly_salary} onChange={(value) => setField('monthly_salary', normalizeWholeMoneyInput(value))} inputMode="numeric" pattern="[0-9]*" helper="El valor en letras se calcula automáticamente y se actualiza en la vista previa." disabled={!editable} changed={isFieldChanged('monthly_salary')} originalValue={originalFieldValue('monthly_salary')} templateVariables={variableCodesFor('monthly_salary')} templateReady={templateReady} /></div>
                      <Field label="Prima técnica / coordinación" value={editData.technical_bonus} onChange={(value) => setField('technical_bonus', normalizeWholeMoneyInput(value))} inputMode="numeric" pattern="[0-9]*" helper="Ingresa el valor en pesos enteros, sin decimales." disabled={!editable} changed={isFieldChanged('technical_bonus')} originalValue={originalFieldValue('technical_bonus')} templateVariables={variableCodesFor('technical_bonus')} templateReady={templateReady} />
                      <label className={`flex items-center justify-between gap-3 self-end rounded-lg border p-3 text-xs font-bold text-slate-700 ${isFieldChanged('include_technical_bonus') ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-white'}`}><span className="flex flex-wrap items-center gap-1.5">Incluir prima <TemplateVariableIndicator codes={variableCodesFor('include_technical_bonus')} templateReady={templateReady} /></span><input type="checkbox" checked={editData.include_technical_bonus} onChange={(event) => setField('include_technical_bonus', event.target.checked)} className="h-4 w-4 accent-[#003DA5]" /></label>
                    </div>
                  )}
                </FormSection>
              </fieldset>
            </div>

            <div className="min-w-0 bg-slate-100/70 p-4 sm:p-6">
              <div className="space-y-3 xl:sticky xl:top-24">
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" />Resultado real de la plantilla institucional</span><span className="flex items-center gap-1.5 font-semibold text-blue-700">{previewLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{previewLoading ? 'Aplicando variables…' : certificatePreview ? `Plantilla ${certificatePreview.template_type === 'docente' ? 'docente' : 'administrativa'} · v${certificatePreview.template_version || 'activa'}` : 'Preparando vista…'}</span></div>
                  {resolvedTemplateVariables.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-2.5 border-t border-blue-200/70 pt-2.5">
                      <span className="flex-none text-[11px] font-bold leading-4 text-blue-800 sm:text-xs">Variables activas:</span>
                      <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
                        {resolvedTemplateVariables.map((variable) => <span key={variable.code} title={`${variable.label}: ${variable.value || 'Sin valor'}`} className="flex-none rounded-md bg-white/90 px-2 py-1 font-mono text-[10px] font-black leading-none text-[#003DA5] shadow-sm ring-1 ring-inset ring-blue-200 sm:text-[11px]">{variable.code}</span>)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-lg">
                  {previewError && !certificatePreview ? (
                    <div className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center"><AlertCircle className="h-8 w-8 text-red-500" /><p className="mt-3 text-sm font-bold text-slate-800">No fue posible generar la vista previa</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{previewError}</p></div>
                  ) : !certificatePreview ? (
                    <div className="flex min-h-[520px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#003DA5]" /></div>
                  ) : (
                    <div className={`correction-certificate-sheet relative bg-white transition-opacity duration-200 ${previewLoading ? 'opacity-75' : 'opacity-100'}`} style={{ fontFamily: certificatePreview.typography_font }}>
                      <div className="flex-1 border-l-4 border-slate-800 px-6 pb-10 pt-7 sm:px-10 sm:pt-9">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#00549C] text-white"><ShieldCheck className="h-6 w-6" /></div><div className="text-[12px] font-black uppercase leading-3.5 text-slate-900">Escuela Superior de<br />Administración Pública</div></div>
                          <span className="font-mono text-[10px] text-slate-500">{certificatePreview.certificate_number}</span>
                        </div>
                        <div className="mx-auto mt-16 max-w-xl text-center"><p className="whitespace-pre-line text-sm font-black uppercase leading-5 text-slate-900">{certificatePreview.cargo_title}</p><p className="mt-16 text-sm font-black uppercase text-slate-900">HACE CONSTAR</p></div>
                        <div className="correction-certificate-preview mx-auto mt-8 max-w-[620px] break-words text-[14px] leading-7 text-slate-900 [&_b]:font-bold [&_div]:mb-5 [&_strong]:font-bold" dangerouslySetInnerHTML={{ __html: safePreviewHtml }} />
                        <div className="mx-auto max-w-xs text-center" style={{ marginTop: '3rem' }}><div className="mx-auto mb-2 w-44 border-t border-slate-600" /><p className="text-[11px] font-bold text-slate-800">{certificatePreview.signer_name || 'Dirección de Talento Humano'}</p><p className="mt-0.5 text-[9px] text-slate-500">{certificatePreview.signer_position || 'Firma electrónica'}</p></div>
                      </div>
                      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-center text-[10px] font-medium leading-4 text-slate-600 sm:px-6 sm:text-[11px]"><strong className="font-bold text-[#003DA5]">Los valores resaltados corresponden a variables de la plantilla.</strong> El PDF final conservará el contenido sin el resaltado e incorporará firma, QR y validación institucional.</div>
                    </div>
                  )}
                </div>
                {previewError && certificatePreview && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[10px] text-amber-800">Se conserva la última vista válida mientras corriges el campo: {previewError}</p>}
              </div>
            </div>
          </div>
        </main>

        <Dialog open={approveOpen} onOpenChange={(open: boolean) => !saving && setApproveOpen(open)}>
          <DialogContent
            overlayClassName="correction-decision-overlay"
            className="correction-decision-dialog w-[calc(100vw-1.5rem)] max-w-xl max-h-[92dvh] overflow-y-auto rounded-xl border border-slate-200 border-t-4 border-t-[#003DA5] bg-white p-0 shadow-2xl"
          >
            <div className="border-b border-slate-200 bg-white p-6">
              <div className="flex items-start gap-3.5 pr-6"><div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-blue-50 text-[#003DA5] ring-1 ring-blue-100"><Send className="h-5 w-5" /></div><DialogHeader className="text-left"><DialogTitle className="text-xl font-bold text-slate-900">Enviar certificado corregido</DialogTitle><DialogDescription className="leading-5 text-slate-500">Esta acción resolverá la solicitud y enviará automáticamente el nuevo PDF.</DialogDescription></DialogHeader></div>
            </div>
            <div className="space-y-4 p-6">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700"><p className="font-bold text-slate-900">Destino del certificado y la respuesta</p><p className="mt-1 break-all">{selected.requester_email}</p></div>
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold text-slate-700">
                  <span>Descripción de la aprobación <span className="text-red-500">*</span></span>
                  <span className="font-normal tabular-nums text-slate-400">{approvalNote.trim().length}/1000</span>
                </div>
                <Textarea
                  value={approvalNote}
                  maxLength={1000}
                  aria-describedby="approval-description-progress"
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setApprovalNote(event.target.value)}
                  className={`min-h-28 resize-none rounded-xl transition-colors ${approvalNote.trim().length > 0 && approvalNote.trim().length < 20 ? 'border-amber-300 focus-visible:ring-amber-200' : approvalNote.trim().length >= 20 ? 'border-emerald-300 focus-visible:ring-emerald-200' : ''}`}
                  placeholder="Explica qué se corrigió y cómo quedó el certificado…"
                />
                <div id="approval-description-progress"><MinimumDescriptionFeedback value={approvalNote} /></div>
                <p className="mt-1.5 text-[11px] leading-4 text-slate-500">Esta descripción se incluirá en el correo y en la trazabilidad del caso.</p>
              </div>
              <DecisionEvidencePicker files={approvalFiles} tone="approval" disabled={saving} onAdd={(incoming) => addDecisionFiles(approvalFiles, setApprovalFiles, incoming)} onRemove={(index) => setApprovalFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} />
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"><strong>Envío completo:</strong> el correo indicará que la solicitud fue aprobada e incluirá esta descripción, las evidencias adjuntas y el certificado PDF corregido con su plantilla, firma, QR y validación.</div>
              {saving && uploadProgress > 0 && <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[#003DA5] transition-all" style={{ width: `${Math.max(3, uploadProgress)}%` }} /></div>}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><Button variant="outline" disabled={saving} onClick={() => setApproveOpen(false)} className="border-slate-300 bg-white hover:bg-slate-50 hover:text-slate-900">Cancelar</Button><Button disabled={saving || approvalNote.trim().length < 20} title={approvalNote.trim().length < 20 ? `Faltan ${20 - approvalNote.trim().length} caracteres` : 'Confirmar envío'} onClick={() => void approve()} className="bg-[#003DA5] font-bold text-white hover:bg-[#002D7A] hover:text-white">{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generando y enviando...</> : approvalNote.trim().length < 20 ? <><AlertCircle className="mr-2 h-4 w-4" />Faltan {20 - approvalNote.trim().length}</> : <><Send className="mr-2 h-4 w-4" />Confirmar envío</>}</Button></div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={rejectOpen} onOpenChange={(open: boolean) => !saving && setRejectOpen(open)}>
          <DialogContent
            overlayClassName="correction-decision-overlay"
            className="correction-decision-dialog w-[calc(100vw-1.5rem)] max-w-xl max-h-[92dvh] overflow-y-auto rounded-xl border border-slate-200 border-t-4 border-t-red-600 bg-white shadow-2xl"
          >
            <DialogHeader><div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 ring-1 ring-red-100"><XCircle className="h-5 w-5 text-red-700" /></div><DialogTitle className="text-xl font-bold text-slate-900">Rechazar solicitud</DialogTitle><DialogDescription>Explica de forma clara por qué el certificado actual es correcto o por qué no procede el cambio.</DialogDescription></DialogHeader>
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-1.5 flex justify-between gap-3 text-xs font-bold text-slate-700">
                  <span>Descripción del rechazo <span className="text-red-500">*</span></span>
                  <span className="font-normal tabular-nums text-slate-400">{rejectReason.trim().length}/2000</span>
                </div>
                <Textarea
                  value={rejectReason}
                  maxLength={2000}
                  aria-describedby="rejection-description-progress"
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setRejectReason(event.target.value)}
                  placeholder="Describe el resultado de la revisión..."
                  className={`min-h-32 resize-none rounded-xl transition-colors ${rejectReason.trim().length > 0 && rejectReason.trim().length < 20 ? 'border-amber-300 focus-visible:ring-amber-200' : rejectReason.trim().length >= 20 ? 'border-emerald-300 focus-visible:ring-emerald-200' : ''}`}
                />
                <div id="rejection-description-progress"><MinimumDescriptionFeedback value={rejectReason} /></div>
              </div>
              <DecisionEvidencePicker files={rejectFiles} tone="rejection" disabled={saving} onAdd={(incoming) => addDecisionFiles(rejectFiles, setRejectFiles, incoming)} onRemove={(index) => setRejectFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} />
              <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-800">El usuario recibirá un correo institucional con el resultado, esta descripción y las evidencias adjuntas. La solicitud solo se cerrará si el correo es aceptado por el servicio de notificaciones.</div>
              {saving && uploadProgress > 0 && <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-red-600 transition-all" style={{ width: `${Math.max(3, uploadProgress)}%` }} /></div>}
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button variant="outline" disabled={saving} onClick={() => setRejectOpen(false)} className="border-slate-300 bg-white hover:bg-slate-50 hover:text-slate-900">Cancelar</Button><Button disabled={saving || rejectReason.trim().length < 20} title={rejectReason.trim().length < 20 ? `Faltan ${20 - rejectReason.trim().length} caracteres` : 'Confirmar rechazo'} onClick={() => void reject()} className="bg-red-600 font-bold text-white hover:bg-red-700 hover:text-white">{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando respuesta...</> : rejectReason.trim().length < 20 ? <><AlertCircle className="mr-2 h-4 w-4" />Faltan {20 - rejectReason.trim().length}</> : 'Confirmar rechazo'}</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const filterOptions: Array<{ id: CorrectionStatus | 'ALL'; label: string; count: number }> = [
    { id: 'ALL', label: 'Todas', count: stats.total },
    { id: 'PENDING', label: 'Pendientes', count: stats.pending },
    { id: 'IN_REVIEW', label: 'En revisión', count: stats.in_review },
    { id: 'APPROVED', label: 'Corregidas', count: stats.approved },
    { id: 'REJECTED', label: 'Rechazadas', count: stats.rejected },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 px-3 pb-10 sm:px-6 lg:px-8">
      <motion.section initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-blue-50 text-[#003DA5] ring-1 ring-blue-100">
              <Inbox className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Solicitudes de corrección</h1>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">
                Revisa la información reportada, gestiona las evidencias y comunica la decisión al solicitante.
              </p>
            </div>
          </div>
          <Button onClick={() => void loadData()} variant="outline" className="h-10 rounded-md border-[#003DA5] bg-white px-4 font-semibold text-[#003DA5] hover:bg-blue-50 hover:text-[#002D7A]">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar
          </Button>
        </div>
      </motion.section>

      <section className="overflow-hidden rounded-xl border border-blue-200 bg-blue-50/60">
        <div className="flex flex-col gap-2 border-b border-blue-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Resumen de atención</h2>
            <p className="mt-0.5 text-xs text-slate-500">Estado actual de las solicitudes recibidas.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#003DA5]">
            <CalendarDays className="h-4 w-4" /> Plazo máximo: 15 días hábiles
          </div>
        </div>
        <div className="grid grid-cols-2 bg-white/60 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: 'Pendientes', value: stats.pending, icon: Clock3, color: 'text-amber-700', bg: 'bg-amber-50' },
            { label: 'En revisión', value: stats.in_review, icon: FileSearch, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Corregidas', value: stats.approved, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Rechazadas', value: stats.rejected, icon: XCircle, color: 'text-red-700', bg: 'bg-red-50' },
            { label: 'Fuera de plazo', value: stats.overdue, icon: AlertCircle, color: 'text-rose-700', bg: 'bg-rose-50' },
          ].map((card, index) => (
            <div key={card.label} className={`flex items-center gap-3 px-4 py-4 sm:px-5 ${index > 0 ? 'border-l border-blue-100' : ''} ${index > 1 ? 'border-t border-blue-100 sm:border-t-0' : ''}`}>
              <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg ${card.bg}`}><card.icon className={`h-4 w-4 ${card.color}`} /></div>
              <div><p className="text-xl font-bold leading-6 text-slate-900">{loading ? '—' : card.value}</p><p className="text-xs font-medium text-slate-500">{card.label}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div><h2 className="text-sm font-bold text-slate-900">Bandeja de solicitudes</h2><p className="mt-0.5 text-xs text-slate-500">Consulta y gestiona cada caso desde un único lugar.</p></div>
            <span className="whitespace-nowrap text-xs font-semibold text-slate-500">{total} resultado{total === 1 ? '' : 's'}</span>
          </div>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por radicado, certificado, nombre, correo o documento..." className="h-10 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#003DA5] focus:ring-2 focus:ring-blue-100" /></div>
            <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">{filterOptions.map((option) => <button key={option.id} type="button" onClick={() => setStatus(option.id)} className={`flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition ${status === option.id ? 'bg-white text-[#003DA5] shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'}`}>{option.label}<span className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] ${status === option.id ? 'bg-blue-50 text-[#003DA5]' : 'bg-white/80 text-slate-500'}`}>{option.count}</span></button>)}</div>
          </div>
        </div>

        {loading || detailLoading ? <div className="flex min-h-64 items-center justify-center"><div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-[#003DA5]" /><p className="mt-3 text-sm font-medium text-slate-500">Cargando solicitudes...</p></div></div> : loadError ? <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50"><AlertCircle className="h-5 w-5 text-red-600" /></div><h3 className="mt-4 font-bold text-slate-900">No fue posible cargar la bandeja</h3><p className="mt-1 max-w-md text-sm leading-5 text-slate-500">{loadError}</p><Button variant="outline" onClick={() => void loadData()} className="mt-4 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"><RefreshCw className="mr-2 h-4 w-4" />Intentar nuevamente</Button></div> : items.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50"><Inbox className="h-5 w-5 text-slate-400" /></div><h3 className="mt-4 font-bold text-slate-800">No hay solicitudes en esta vista</h3><p className="mt-1 text-sm text-slate-500">Cuando se reciba una solicitud aparecerá aquí para su revisión.</p></div> : <>
          <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1050px] text-left"><thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Solicitud</th><th className="px-5 py-4">Solicitante</th><th className="px-5 py-4">Certificado</th><th className="px-5 py-4">Recibida</th><th className="px-5 py-4">Fecha límite</th><th className="px-5 py-4 text-right">Acción</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((request) => { const isOverdue = isOpenStatus(request.status) && asDateOnly(request.due_date) < asDateOnly(new Date().toISOString()); return <tr key={request.id} className="group hover:bg-blue-50/40"><td className="px-5 py-4"><StatusBadge status={request.status} /></td><td className="px-5 py-4"><p className="font-mono text-xs font-bold text-[#003DA5]">{request.request_number}</p><p className="mt-1 max-w-56 truncate text-xs text-slate-500">{request.description}</p></td><td className="px-5 py-4"><p className="text-sm font-bold text-slate-800">{request.requester_name}</p><p className="text-xs text-slate-500">{request.requester_email}</p></td><td className="px-5 py-4"><p className="font-mono text-xs font-semibold text-slate-700">{String(request.certificate_snapshot?.certificate_number || '—')}</p><p className="text-xs text-slate-500">{String(request.certificate_snapshot?.id_number || '')}</p></td><td className="px-5 py-4 text-xs text-slate-600">{formatDate(request.created_at, true)}</td><td className="px-5 py-4"><p className={`text-xs font-bold ${isOverdue ? 'text-red-700' : 'text-slate-700'}`}>{formatDate(request.due_date)}</p>{isOverdue && <p className="mt-1 text-[10px] font-bold text-red-600">Plazo vencido</p>}</td><td className="px-5 py-4 text-right"><Button variant="outline" size="sm" onClick={() => void openRequest(request)} className="rounded-lg font-bold text-[#003DA5]">{isOpenStatus(request.status) ? 'Revisar' : 'Ver detalle'}<ChevronRight className="ml-1 h-4 w-4" /></Button></td></tr>; })}</tbody></table></div>
          <div className="divide-y divide-slate-100 lg:hidden">{items.map((request) => <button key={request.id} type="button" onClick={() => void openRequest(request)} className="block w-full p-4 text-left hover:bg-slate-50"><div className="flex items-start justify-between gap-3"><StatusBadge status={request.status} /><span className="text-[11px] text-slate-500">{formatDate(request.created_at)}</span></div><p className="mt-3 font-bold text-slate-900">{request.requester_name}</p><p className="mt-1 font-mono text-xs font-bold text-[#003DA5]">{request.request_number}</p><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{request.description}</p><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-xs text-slate-500">Límite: <strong className="text-slate-700">{formatDate(request.due_date)}</strong></span><ChevronRight className="h-4 w-4 text-[#003DA5]" /></div></button>)}</div>
        </>}
        {!loading && items.length > 0 && <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between"><p className="text-slate-500">{total} solicitud{total === 1 ? '' : 'es'} · Página {page} de {totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Siguiente</Button></div></div>}
      </section>
    </div>
  );
}

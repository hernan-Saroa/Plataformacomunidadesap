import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  Award,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileText,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import graduadosService, {
  SolicitudCertificadoGraduado,
} from '../../services/api/graduados.service';
import { authService } from '../../services/api/authService';

type ApprovalAction = 'APPROVED' | 'REJECTED' | 'OBSERVATION';
type ApprovalMode = 'approver' | 'head';
type PreviewFileType = 'image' | 'pdf' | 'office' | 'other';

type OfficePreviewState = {
  status: 'loading' | 'ready' | 'error' | 'unsupported';
  kind: 'word' | 'spreadsheet' | 'unsupported';
  data?: ArrayBuffer;
  rows?: string[][];
  sheetName?: string;
  totalRows?: number;
  totalColumns?: number;
  error?: string;
};

interface ApprovalRequestsModuleProps {
  onPendingCountChange?: (count: number) => void;
  mode?: ApprovalMode;
}

const reviewConceptLabel = (decision?: string | null) => {
  if (decision === 'APPROVED') return 'Revisor: favorable';
  if (decision === 'REJECTED') return 'Revisor: desfavorable';
  if (decision === 'OBSERVATION') return 'Revisor: observación';
  return null;
};

const reviewConceptBadgeClass = (decision?: string | null) => {
  if (decision === 'APPROVED') return 'bg-green-50 text-green-700 border border-green-200 text-xs';
  if (decision === 'REJECTED') return 'bg-red-50 text-red-700 border border-red-200 text-xs';
  if (decision === 'OBSERVATION') return 'bg-amber-50 text-amber-700 border border-amber-200 text-xs';
  return 'bg-gray-50 text-gray-500 border border-gray-200 text-xs';
};

const approverConceptLabel = (decision?: string | null) => {
  if (decision === 'APPROVED') return 'Aprobador: preaprobado';
  if (decision === 'REJECTED') return 'Aprobador: prerechazado';
  if (decision === 'OBSERVATION') return 'Aprobador: observación';
  return null;
};

const approverConceptBadgeClass = (decision?: string | null) => {
  if (decision === 'APPROVED') return 'bg-blue-50 text-blue-700 border border-blue-200 text-xs';
  if (decision === 'REJECTED') return 'bg-orange-50 text-orange-700 border border-orange-200 text-xs';
  if (decision === 'OBSERVATION') return 'bg-cyan-50 text-cyan-700 border border-cyan-200 text-xs';
  return 'bg-gray-50 text-gray-500 border border-gray-200 text-xs';
};

const approverDecisionLabel = (decision?: string | null) => {
  if (decision === 'APPROVED') return 'Preaprobo la solicitud';
  if (decision === 'REJECTED') return 'Prerechazo la solicitud';
  if (decision === 'OBSERVATION') return 'Devolvio con observacion al revisor';
  return 'Sin preconcepto registrado';
};

const headDecisionLabel = (decision?: string | null) => {
  if (decision === 'APPROVED') return 'Aprobo definitivamente';
  if (decision === 'REJECTED') return 'Rechazo definitivamente';
  if (decision === 'OBSERVATION') return 'Devolvio con observacion al aprobador';
  return 'Sin decision final registrada';
};

const decisionLabel = (decision?: string | null) => {
  if (decision === 'APPROVED') return 'Favorable (recomienda aprobar)';
  if (decision === 'REJECTED') return 'Desfavorable (recomienda rechazar)';
  if (decision === 'OBSERVATION') return 'Con observación';
  return 'Sin concepto';
};

const approvalStatusLabel = (status?: string | null) => {
  if (status === 'PENDING_APPROVAL') return 'Pendiente aprobador';
  if (status === 'PENDING_HEAD_APPROVAL') return 'Pendiente jefe';
  if (status === 'APPROVED_FINAL') return 'Aprobada';
  if (status === 'REJECTED_FINAL') return 'Rechazada';
  if (status === 'OBSERVATION') return 'Devuelta a revisor';
  if (status === 'HEAD_OBSERVATION') return 'Devuelta a aprobador';
  return 'Sin estado';
};

const approvalStatusBadgeClass = (status?: string | null) => {
  if (status === 'PENDING_APPROVAL') return 'bg-orange-50 text-orange-700 border border-orange-200 text-xs';
  if (status === 'PENDING_HEAD_APPROVAL') return 'bg-sky-50 text-sky-700 border border-sky-200 text-xs';
  if (status === 'APPROVED_FINAL') return 'bg-green-50 text-green-700 border border-green-200 text-xs';
  if (status === 'REJECTED_FINAL') return 'bg-red-50 text-red-700 border border-red-200 text-xs';
  if (status === 'OBSERVATION') return 'bg-amber-50 text-amber-700 border border-amber-200 text-xs';
  if (status === 'HEAD_OBSERVATION') return 'bg-amber-50 text-amber-700 border border-amber-200 text-xs';
  return 'bg-gray-50 text-gray-500 border border-gray-200 text-xs';
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha';
  return parsed.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatBytes = (bytes?: number) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getMojibakeScore = (value: string) => (value.match(/[ÃÂ�]/g) || []).length;

const normalizeDisplayText = (value?: string | null) => {
  const text = String(value || '').trim();
  if (!text || !getMojibakeScore(text)) {
    return text;
  }

  try {
    const bytes = new Uint8Array(
      Array.from(text, (char) => char.charCodeAt(0) & 0xff),
    );
    const decoded = new TextDecoder('utf-8', { fatal: true })
      .decode(bytes)
      .trim();
    if (decoded && getMojibakeScore(decoded) < getMojibakeScore(text)) {
      return decoded;
    }
  } catch (_) {
    return text;
  }

  return text;
};

const getFileType = (fileName: string): 'image' | 'pdf' | 'office' | 'other' => {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx', 'xls', 'xlsx'].includes(ext)) return 'office';
  return 'other';
};

const getOfficeKind = (fileName: string): OfficePreviewState['kind'] => {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (ext === 'docx') return 'word';
  if (['xls', 'xlsx'].includes(ext)) return 'spreadsheet';
  return 'unsupported';
};

const buildOfficePreview = async (
  blob: Blob,
  fileName: string,
): Promise<OfficePreviewState> => {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const arrayBuffer = await blob.arrayBuffer();

  if (ext === 'docx') {
    return {
      status: 'ready',
      kind: 'word',
      data: arrayBuffer,
    };
  }

  if (['xls', 'xlsx'].includes(ext)) {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellText: false,
    });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return {
        status: 'ready',
        kind: 'spreadsheet',
        sheetName: 'Sin hoja',
        rows: [],
        totalRows: 0,
        totalColumns: 0,
      };
    }

    const sheet = workbook.Sheets[sheetName];
    const allRows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    });
    const normalizedRows = allRows.map((row) =>
      row.map((cell) => String(cell ?? '').trim()),
    );
    const totalColumns = normalizedRows.reduce(
      (max, row) => Math.max(max, row.length),
      0,
    );

    return {
      status: 'ready',
      kind: 'spreadsheet',
      sheetName,
      rows: normalizedRows.slice(0, 80).map((row) => row.slice(0, 20)),
      totalRows: normalizedRows.length,
      totalColumns,
    };
  }

  return {
    status: 'unsupported',
    kind: 'unsupported',
    error:
      'Este formato de Word antiguo no permite una previsualizacion segura en el navegador. Descargalo para abrirlo.',
  };
};

const getFileExtStyle = (fileName: string): { color: string; bg: string; border: string } => {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
  if (['doc', 'docx'].includes(ext)) return { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' };
  if (['xls', 'xlsx'].includes(ext)) return { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' };
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' };
  return { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' };
};

const getCurrentUserName = () => {
  const user = authService.getCurrentUser() as any;
  const personName = user?.person?.full_name || '';
  const fullName = user?.fullName || user?.name || '';
  const email = user?.email || user?.person?.email || '';
  return String(personName || fullName || email || 'Aprobador').trim();
};

const getCurrentUserId = () => {
  const user = authService.getCurrentUser() as any;
  return user?.id || user?.id_user || user?.userId || undefined;
};

const getCurrentUserEmail = () => {
  const user = authService.getCurrentUser() as any;
  const email = user?.email || user?.person?.email || '';
  return String(email).trim() || undefined;
};

const formatTimelineActor = (
  actorName?: string,
  actorEmail?: string,
  actorId?: string,
) => {
  const name = (actorName || '').trim();
  const email = (actorEmail || '').trim();
  const id = (actorId || '').trim();

  if (name && email && name.toLowerCase() !== email.toLowerCase()) {
    return `${name} (${email})`;
  }
  return name || email || (id ? `Usuario ${id}` : '');
};

const getTimelineFileCount = (notes?: string) => {
  const match = String(notes || '').match(/(\d+)/);
  return match ? Number(match[1]) || 0 : 0;
};

const compactReviewTimeline = (
  events: NonNullable<SolicitudCertificadoGraduado['reviewTimeline']>,
) =>
  events.reduce<NonNullable<SolicitudCertificadoGraduado['reviewTimeline']>>(
    (acc, event) => {
      const previous = acc[acc.length - 1];
      const previousTime = previous?.createdAt
        ? new Date(previous.createdAt).getTime()
        : Number.NaN;
      const currentTime = event.createdAt
        ? new Date(event.createdAt).getTime()
        : Number.NaN;
      const sameActor =
        (previous?.actorEmail || '') === (event.actorEmail || '') &&
        (previous?.actorName || '') === (event.actorName || '');
      const withinUploadWindow =
        !Number.isNaN(previousTime) &&
        !Number.isNaN(currentTime) &&
        Math.abs(currentTime - previousTime) <= 15 * 60 * 1000;

      if (
        previous?.type === 'review_files_uploaded' &&
        event.type === 'review_files_uploaded' &&
        sameActor &&
        withinUploadWindow
      ) {
        const nextCount =
          getTimelineFileCount(previous.notes) + getTimelineFileCount(event.notes);
        acc[acc.length - 1] = {
          ...previous,
          label: 'Archivos de soporte cargados',
          notes: `${nextCount || 1} archivo(s) adjunto(s)`,
          createdAt: event.createdAt || previous.createdAt,
        };
        return acc;
      }

      acc.push(
        event.type === 'review_files_uploaded'
          ? { ...event, label: 'Archivos de soporte cargados' }
          : event,
      );
      return acc;
    },
    [],
  );

export function ApprovalRequestsModule({
  onPendingCountChange,
  mode = 'approver',
}: ApprovalRequestsModuleProps) {
  const [requests, setRequests] = useState<SolicitudCertificadoGraduado[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] =
    useState<SolicitudCertificadoGraduado | null>(null);
  const [action, setAction] = useState<ApprovalAction>('APPROVED');
  const [notes, setNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [activeView, setActiveView] = useState<'pending' | 'managed'>('pending');
  const [previewState, setPreviewState] = useState<{
    url: string;
    name: string;
    fileType: PreviewFileType;
    officePreview?: OfficePreviewState;
  } | null>(null);
  const wordPreviewRef = useRef<HTMLDivElement | null>(null);

  const isHeadMode = mode === 'head';
  const pendingStatuses = useMemo(
    () =>
      isHeadMode
        ? ['PENDING_HEAD_APPROVAL']
        : ['PENDING_APPROVAL', 'HEAD_OBSERVATION'],
    [isHeadMode],
  );
  const pendingRequests = useMemo(
    () =>
      requests.filter((request) =>
        pendingStatuses.includes(request.approvalStatus || ''),
      ),
    [requests, pendingStatuses],
  );
  const managedRequests = useMemo(
    () =>
      requests.filter(
        (request) => !pendingStatuses.includes(request.approvalStatus || ''),
      ),
    [requests, pendingStatuses],
  );
  const pendingCount = pendingRequests.length;
  const managedCount = managedRequests.length;
  const favorablePendingCount = pendingRequests.filter(
    (item) =>
      (isHeadMode ? item.approverDecision : item.reviewRecommendation) ===
      'APPROVED',
  ).length;
  const rejectionPendingCount = pendingRequests.filter(
    (item) =>
      (isHeadMode ? item.approverDecision : item.reviewRecommendation) ===
      'REJECTED',
  ).length;

  const getRequestActivityTime = (request: SolicitudCertificadoGraduado) => {
    const values = [
      request.updatedAt,
      request.headReviewedAt,
      request.approvedAt,
      request.reviewSubmittedAt,
      request.completionDate,
      request.requestDate,
    ];
    return Math.max(
      ...values.map((value) => {
        const time = value ? new Date(value).getTime() : 0;
        return Number.isNaN(time) ? 0 : time;
      }),
    );
  };

  const sortedRequests = useMemo(
    () =>
      [...(activeView === 'pending' ? pendingRequests : managedRequests)].sort((a, b) => {
        return getRequestActivityTime(b) - getRequestActivityTime(a);
      }),
    [activeView, pendingRequests, managedRequests],
  );

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await graduadosService.solicitudes.listarAprobacion();
      setRequests(Array.isArray(data) ? data : []);
      onPendingCountChange?.(
        Array.isArray(data)
          ? data.filter((item) =>
              pendingStatuses.includes(item.approvalStatus || ''),
            ).length
          : 0,
      );
    } catch (error: any) {
      console.error('Error cargando aprobaciones de revision:', error);
      toast.error('No se pudieron cargar las aprobaciones pendientes', {
        description: error?.response?.data?.message || error?.message,
      });
      setRequests([]);
      onPendingCountChange?.(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    const target = wordPreviewRef.current;
    const officePreview = previewState?.officePreview;

    if (
      !target ||
      previewState?.fileType !== 'office' ||
      officePreview?.status !== 'ready' ||
      officePreview.kind !== 'word' ||
      !officePreview.data
    ) {
      return;
    }

    let cancelled = false;
    target.innerHTML = '';

    const renderDocx = async () => {
      try {
        const { renderAsync } = await import('docx-preview');
        if (cancelled) return;

        await renderAsync(officePreview.data, target, undefined, {
          className: 'docx-preview-rendered',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          useBase64URL: true,
          renderChanges: false,
          renderComments: false,
        });
      } catch (error: any) {
        if (cancelled) return;
        console.error('Error renderizando DOCX:', error);
        setPreviewState((current) =>
          current?.name === previewState.name && current.fileType === 'office'
            ? {
                ...current,
                officePreview: {
                  status: 'error',
                  kind: 'word',
                  error:
                    error?.message ||
                    'No se pudo renderizar el documento Word.',
                },
              }
            : current,
        );
      }
    };

    void renderDocx();

    return () => {
      cancelled = true;
      target.innerHTML = '';
    };
  }, [
    previewState?.name,
    previewState?.fileType,
    previewState?.officePreview?.status,
    previewState?.officePreview?.kind,
    previewState?.officePreview?.data,
  ]);

  const openActionModal = (
    request: SolicitudCertificadoGraduado,
    nextAction: ApprovalAction,
  ) => {
    setSelectedRequest(request);
    setAction(nextAction);
    setNotes('');
  };

  const handleDownloadFile = async (
    request: SolicitudCertificadoGraduado,
    fileId: string,
    fileName: string,
  ) => {
    try {
      const blob = await graduadosService.solicitudes.descargarArchivoRevision(
        request.id,
        fileId,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = normalizeDisplayText(fileName) || 'archivo-revision';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error('No se pudo descargar el archivo', {
        description: error?.response?.data?.message || error?.message,
      });
    }
  };

  const closePreview = () => {
    if (previewState?.url) URL.revokeObjectURL(previewState.url);
    setPreviewState(null);
  };

  const handlePreviewFile = async (
    request: SolicitudCertificadoGraduado,
    fileId: string,
    fileName: string,
  ) => {
    const fileType = getFileType(fileName);
    const displayName = normalizeDisplayText(fileName) || fileName;
    if (fileType === 'other') {
      setPreviewState({
        url: '',
        name: displayName,
        fileType,
        officePreview: {
          status: 'unsupported',
          kind: 'unsupported',
          error:
            'Este tipo de archivo no tiene previsualizacion disponible. Puedes descargarlo para abrirlo.',
        },
      });
      return;
    }

    if (fileType === 'office') {
      setPreviewState({
        url: '',
        name: displayName,
        fileType,
        officePreview: {
          status: 'loading',
          kind: getOfficeKind(displayName),
        },
      });

      try {
        const blob = await graduadosService.solicitudes.descargarArchivoRevision(
          request.id,
          fileId,
        );
        const officePreview = await buildOfficePreview(blob, displayName);
        setPreviewState((current) =>
          current?.name === displayName && current.fileType === 'office'
            ? { ...current, officePreview }
            : current,
        );
      } catch (error: any) {
        setPreviewState((current) =>
          current?.name === displayName && current.fileType === 'office'
            ? {
                ...current,
                officePreview: {
                  status: 'error',
                  kind: getOfficeKind(displayName),
                  error:
                    error?.response?.data?.message ||
                    error?.message ||
                    'No se pudo generar la previsualizacion del archivo.',
                },
              }
            : current,
        );
      }
      return;
    }
    try {
      const blob = await graduadosService.solicitudes.descargarArchivoRevision(
        request.id,
        fileId,
      );
      const url = URL.createObjectURL(blob);
      setPreviewState({ url, name: displayName, fileType });
    } catch (error: any) {
      toast.error('No se pudo cargar el archivo para visualización', {
        description: error?.response?.data?.message || error?.message,
      });
    }
  };

  const handleResolve = async () => {
    if (!selectedRequest) return;

    const trimmedNotes = notes.trim();
    if ((isHeadMode || action === 'REJECTED' || action === 'OBSERVATION') && !trimmedNotes) {
      toast.error(
        isHeadMode
          ? 'Debes escribir el comentario final para el solicitante'
          : 'Debes escribir una justificacion',
      );
      return;
    }

    setIsResolving(true);
    try {
      await graduadosService.solicitudes.resolverAprobacion(
        selectedRequest.id,
        {
          decision: action,
          reason: trimmedNotes,
          approverName: getCurrentUserName(),
          approverId: getCurrentUserId(),
          approverEmail: getCurrentUserEmail(),
          finalDecision: isHeadMode,
        },
      );
      toast.success(
        isHeadMode
          ? action === 'APPROVED'
            ? 'Solicitud aprobada definitivamente'
            : action === 'REJECTED'
              ? 'Solicitud rechazada definitivamente'
              : 'Observacion enviada al aprobador'
          : action === 'APPROVED'
            ? 'Solicitud enviada al jefe con preaprobacion'
            : action === 'REJECTED'
              ? 'Solicitud enviada al jefe con prerechazo'
              : 'Observacion enviada al revisor',
      );
      setSelectedRequest(null);
      setActiveView('managed');
      await loadRequests();
    } catch (error: any) {
      console.error('Error resolviendo aprobacion:', error);
      toast.error('No se pudo resolver la aprobacion', {
        description: error?.response?.data?.message || error?.message,
      });
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card className="border-2 border-orange-200 bg-orange-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-800">
                {isHeadMode ? 'Pendientes de decision final' : 'Esperando tu preconcepto'}
              </p>
              <p className="mt-2 text-3xl font-bold text-orange-900">
                {pendingCount}
              </p>
              <p className="mt-2 text-xs text-orange-700">
                {isHeadMode
                  ? 'El aprobador ya emitio su preconcepto'
                  : 'El revisor ya emitio su concepto'}
              </p>
            </div>
            <ShieldCheck className="w-10 h-10 text-orange-600" />
          </div>
        </Card>
        <Card className="border-2 border-green-200 bg-green-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">
                {isHeadMode ? 'Preaprobadas' : 'Con concepto favorable'}
              </p>
              <p className="mt-2 text-3xl font-bold text-green-900">
                {favorablePendingCount}
              </p>
              <p className="mt-2 text-xs text-green-700">
                {isHeadMode
                  ? 'Listas para aprobacion final'
                  : 'El revisor recomienda aprobar'}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </Card>
        <Card className="border-2 border-red-200 bg-red-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-800">
                {isHeadMode ? 'Prerechazadas' : 'Con concepto desfavorable'}
              </p>
              <p className="mt-2 text-3xl font-bold text-red-900">
                {rejectionPendingCount}
              </p>
              <p className="mt-2 text-xs text-red-700">
                {isHeadMode
                  ? 'Requieren decision final'
                  : 'El revisor recomienda rechazar'}
              </p>
            </div>
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
        </Card>
      </motion.div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-lg font-semibold text-[#1F2937]">
              {isHeadMode ? 'Decision Final de Revision' : 'Aprobaciones de Revision'}
            </h2>
            <p className="text-sm text-[#6B7280]">
              {isHeadMode
                ? 'Define la aprobacion final, rechazo final u observacion al aprobador.'
                : 'Revisa datos, concepto y archivos cargados por el revisor.'}
            </p>
          </div>
          <button
            onClick={loadRequests}
            className="inline-flex items-center gap-2 rounded-lg bg-[#003DA5] px-4 py-2 text-sm font-semibold text-white"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-[#E5E7EB] bg-gray-50 px-5 py-3">
          <button
            type="button"
            onClick={() => setActiveView('pending')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeView === 'pending'
                ? 'bg-[#003DA5] text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            Pendientes ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveView('managed')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeView === 'managed'
                ? 'bg-[#003DA5] text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            Gestionadas ({managedCount})
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <Clock className="w-14 h-14 mx-auto mb-3 text-gray-300 animate-pulse" />
            <p className="font-semibold text-gray-700">Cargando solicitudes...</p>
          </div>
        ) : sortedRequests.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-14 h-14 mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-700">
              {activeView === 'pending'
                ? 'No hay aprobaciones pendientes'
                : 'No hay aprobaciones gestionadas'}
            </p>
            <p className="text-sm text-gray-500">
              {activeView === 'pending'
                ? isHeadMode
                  ? 'Cuando un aprobador envie un preconcepto, aparecera aqui.'
                  : 'Cuando un revisor envie un concepto, aparecera aqui.'
                : isHeadMode
                  ? 'Cuando el jefe apruebe, rechace o devuelva con observacion, aparecera aqui.'
                  : 'Cuando el aprobador preapruebe, prerechace o devuelva con observacion, aparecera aqui.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB]">
            {sortedRequests.map((request) => {
              const payload = (request.reviewPayload || {}) as Record<string, unknown>;
              const files = request.reviewFiles || [];
              const isExpanded = expandedId === request.id;
              const isPendingApproval = pendingStatuses.includes(
                request.approvalStatus || '',
              );

              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_auto] gap-4 items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {request.requestNumber}
                        </h3>
                        <Badge className={approvalStatusBadgeClass(request.approvalStatus)}>
                          {approvalStatusLabel(request.approvalStatus)}
                        </Badge>
                        {reviewConceptLabel(request.reviewRecommendation) && (
                          <Badge className={reviewConceptBadgeClass(request.reviewRecommendation)}>
                            {reviewConceptLabel(request.reviewRecommendation)}
                          </Badge>
                        )}
                        {approverConceptLabel(request.approverDecision) && (
                          <Badge className={approverConceptBadgeClass(request.approverDecision)}>
                            {approverConceptLabel(request.approverDecision)}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        Documento: <strong>{request.idNumber}</strong>
                      </p>
                      <p className="text-sm text-gray-600">
                        Solicitante: <strong>{request.requesterName || request.fullName}</strong>
                      </p>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>
                        Revisor:{' '}
                        <strong>{request.reviewSubmittedByName || request.reviewerName || 'No registrado'}</strong>
                      </p>
                      <p>Enviado: {formatDate(request.reviewSubmittedAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : request.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                      {isPendingApproval && (
                        <>
                          <button
                            onClick={() => openActionModal(request, 'OBSERVATION')}
                            className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Observacion
                          </button>
                          <button
                            onClick={() => openActionModal(request, 'REJECTED')}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                          >
                            <XCircle className="w-4 h-4" />
                            {isHeadMode ? 'Rechazar final' : 'Prerechazar'}
                          </button>
                          <button
                            onClick={() => openActionModal(request, 'APPROVED')}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#003DA5] px-3 py-2 text-sm font-semibold text-white hover:bg-[#002E7D]"
                          >
                            <Award className="w-4 h-4" />
                            {isHeadMode ? 'Aprobar final' : 'Preaprobar'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-900">
                              <FileText className="w-4 h-4" />
                              Datos revisados
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                              {[
                                ['Nombre', payload.fullName || request.fullName],
                                ['Documento', payload.idNumber || request.idNumber],
                                ['Email', payload.email || request.graduateEmail],
                                ['Programa', payload.programName || request.programName],
                                ['Fecha grado', payload.graduationDate || request.graduationDate],
                                ['Sede', payload.campus],
                                ['Territorial', payload.seccionalName],
                                ['Registro', payload.numRegistro],
                                ['Folio', payload.numFolio],
                                ['Libro', payload.numLibro],
                              ].map(([label, value]) => (
                                <div key={String(label)} className="rounded bg-white p-2 border border-blue-100">
                                  <p className="text-xs text-gray-500">{String(label)}</p>
                                  <p className="font-semibold text-gray-900">
                                    {value ? String(value) : 'Sin registrar'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                              <MessageSquare className="w-4 h-4" />
                              Concepto y adjuntos
                            </h4>
                            <div className="space-y-3 text-sm">
                              <div className="rounded bg-white p-3 border border-gray-200">
                                <p className="text-xs text-gray-500">Notas del revisor</p>
                                <p className="font-medium text-gray-900">
                                  {request.reviewRecommendationReason || request.reviewNotes || 'Sin notas'}
                                </p>
                              </div>
                              {request.approverDecision && (
                                <div className={`rounded bg-white p-3 border ${
                                  request.approverDecision === 'APPROVED'
                                    ? 'border-blue-200'
                                    : request.approverDecision === 'REJECTED'
                                      ? 'border-orange-200'
                                      : 'border-cyan-200'
                                }`}>
                                  <p className={`text-xs ${
                                    request.approverDecision === 'APPROVED'
                                      ? 'text-blue-700'
                                      : request.approverDecision === 'REJECTED'
                                        ? 'text-orange-700'
                                        : 'text-cyan-700'
                                  }`}>Preconcepto del aprobador</p>
                                  <p className="font-semibold text-gray-900">
                                    {approverDecisionLabel(request.approverDecision)}
                                  </p>
                                  {request.approverName && (
                                    <p className="mt-1 text-xs text-gray-600">
                                      Aprobador: {request.approverName}
                                    </p>
                                  )}
                                  {request.approverNotes && (
                                    <p className="mt-2 text-sm text-gray-800">
                                      {request.approverNotes}
                                    </p>
                                  )}
                                </div>
                              )}
                              {request.headDecision && (
                                <div className="rounded bg-white p-3 border border-sky-200">
                                  <p className="text-xs text-sky-700">Decision del jefe</p>
                                  <p className="font-semibold text-gray-900">
                                    {headDecisionLabel(request.headDecision)}
                                  </p>
                                  {request.headReviewerName && (
                                    <p className="mt-1 text-xs text-gray-600">
                                      Jefe: {request.headReviewerName}
                                    </p>
                                  )}
                                  {request.headNotes && (
                                    <p className="mt-2 text-sm text-gray-800">
                                      {request.headNotes}
                                    </p>
                                  )}
                                </div>
                              )}
                              <div className="space-y-2">
                                {files.length === 0 ? (
                                  <p className="text-xs text-gray-500">
                                    El revisor no cargo archivos.
                                  </p>
                                ) : (
                                  files.map((file) => {
                                    const extStyle = getFileExtStyle(normalizeDisplayText(file.originalName));
                                    const ext = (normalizeDisplayText(file.originalName).split('.').pop() || '').toUpperCase();
                                    return (
                                    <div
                                      key={file.id}
                                      className="flex items-center justify-between gap-3 rounded bg-white p-2 border border-gray-200"
                                    >
                                      <div className="min-w-0 flex items-center gap-2">
                                        <span
                                          className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide"
                                          style={{ color: extStyle.color, background: extStyle.bg, border: `1px solid ${extStyle.border}` }}
                                        >
                                          {ext}
                                        </span>
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-semibold" style={{ color: extStyle.color }}>
                                            {normalizeDisplayText(file.originalName)}
                                          </p>
                                          <p className="text-xs text-gray-400">
                                            {formatBytes(file.sizeBytes)} · {formatDate(file.uploadedAt)}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() =>
                                            handlePreviewFile(
                                              request,
                                              file.id,
                                              normalizeDisplayText(file.originalName),
                                            )
                                          }
                                          className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100"
                                          title="Visualizar archivo"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleDownloadFile(
                                              request,
                                              file.id,
                                              normalizeDisplayText(file.originalName),
                                            )
                                          }
                                          className="rounded-lg bg-gray-100 p-2 text-gray-700 hover:bg-gray-200"
                                          title="Descargar archivo"
                                        >
                                          <Download className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                  })
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        {compactReviewTimeline(request.reviewTimeline || []).length > 0 && (() => {
                          const timelineEvents = compactReviewTimeline(request.reviewTimeline || []);
                          const getDot = (label: string) => {
                            const l = label.toLowerCase();
                            // approver events — must be checked before generic patterns
                            if (l.includes('preaprob')) return { ring: '#DBEAFE', dot: '#1D4ED8' };
                            if (l.includes('prerechaz')) return { ring: '#FFEDD5', dot: '#EA580C' };
                            if (l.includes('preconcepto') || l.includes('concepto del aprobador')) return { ring: '#CFFAFE', dot: '#0891B2' };
                            // head events
                            if (l.includes('decision final') || l.includes('aprobacion final')) return { ring: '#DCFCE7', dot: '#15803D' };
                            if (l.includes('rechazo final')) return { ring: '#FEE2E2', dot: '#B91C1C' };
                            if (l.includes('devuelto al aprobador') || l.includes('observacion al aprobador')) return { ring: '#CFFAFE', dot: '#0891B2' };
                            // generic events
                            if (l.includes('aprobar') || l.includes('aprobado')) return { ring: '#DCFCE7', dot: '#16A34A' };
                            if (l.includes('rechaz')) return { ring: '#FEE2E2', dot: '#DC2626' };
                            if (l.includes('observac')) return { ring: '#FEF3C7', dot: '#D97706' };
                            if (l.includes('archivo') || l.includes('soporte')) return { ring: '#DBEAFE', dot: '#2563EB' };
                            return { ring: '#F3F4F6', dot: '#9CA3AF' };
                          };
                          return (
                            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                              <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <Clock className="w-4 h-4 text-gray-400" />
                                Línea de tiempo
                              </h4>
                              <div className="relative">
                                <div className="absolute left-3 top-1 bottom-1 w-px bg-gray-200" />
                                <div className="space-y-1">
                                  {timelineEvents.map((event, index) => {
                                    const { ring, dot } = getDot(event.label || '');
                                    const actor = formatTimelineActor(event.actorName, event.actorEmail, event.actorId);
                                    return (
                                      <div key={`${request.id}-tl-${index}`} className="flex gap-3 relative">
                                        <div
                                          className="relative z-10 mt-1 flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full"
                                          style={{ background: ring }}
                                        >
                                          <div className="w-2 h-2 rounded-full" style={{ background: dot }} />
                                        </div>
                                        <div className="flex-1 pb-4 min-w-0">
                                          <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                              <p className="text-xs font-semibold text-gray-900">{event.label}</p>
                                              {actor && (
                                                <p className="mt-0.5 text-xs text-gray-500">{actor}</p>
                                              )}
                                              {event.notes && (
                                                <p className="mt-0.5 text-xs text-gray-500 italic">{event.notes}</p>
                                              )}
                                            </div>
                                            <span className="flex-shrink-0 text-xs font-medium whitespace-nowrap" style={{ color: '#2563EB' }}>
                                              {formatDate(event.createdAt)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="w-[92vw] max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#003DA5]" />
              {isHeadMode
                ? action === 'APPROVED'
                  ? 'Aprobar definitivamente'
                  : action === 'REJECTED'
                    ? 'Rechazar definitivamente'
                    : 'Enviar observacion al aprobador'
                : action === 'APPROVED'
                  ? 'Enviar preaprobacion'
                  : action === 'REJECTED'
                    ? 'Enviar prerechazo'
                    : 'Enviar observacion al revisor'}
            </DialogTitle>
            <DialogDescription>
              {isHeadMode
                ? 'Esta decision final queda registrada en la trazabilidad de la solicitud.'
                : 'Este preconcepto queda registrado y pasara al jefe cuando aplique.'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                <p>
                  Solicitud: <strong>{selectedRequest.requestNumber}</strong>
                </p>
                <p>
                  Concepto del revisor:{' '}
                  <strong>{decisionLabel(selectedRequest.reviewRecommendation)}</strong>
                </p>
                {selectedRequest.approverDecision && (
                  <p>
                    Preconcepto del aprobador:{' '}
                    <strong>{decisionLabel(selectedRequest.approverDecision)}</strong>
                  </p>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">
                  {isHeadMode
                    ? action === 'APPROVED'
                      ? 'Comentario final para el solicitante *'
                      : action === 'REJECTED'
                        ? 'Motivo final para el solicitante *'
                        : 'Observacion interna para el aprobador *'
                    : action === 'APPROVED'
                      ? 'Comentario de preaprobacion (opcional)'
                      : 'Justificacion (obligatoria)'}
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-[120px] w-full resize-none rounded-lg border-2 border-gray-300 p-3 text-sm focus:border-[#003DA5]"
                  placeholder={
                    isHeadMode
                      ? action === 'OBSERVATION'
                        ? 'Describe que debe revisar o corregir el aprobador...'
                        : 'Este texto se incluira en el correo enviado al solicitante...'
                      : action === 'APPROVED'
                        ? 'Agrega una nota para el jefe si aplica...'
                        : 'Describe el motivo de la decision...'
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <button
              onClick={() => setSelectedRequest(null)}
              className="rounded-lg border-2 border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
              disabled={isResolving}
            >
              Cancelar
            </button>
            <button
              onClick={handleResolve}
              className="inline-flex items-center gap-2 rounded-lg bg-[#003DA5] px-4 py-2 text-sm font-semibold text-white"
              disabled={isResolving}
            >
              <CheckCircle className="w-4 h-4" />
              {isResolving ? 'Procesando...' : 'Confirmar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de visualización de archivos */}
      <Dialog open={!!previewState} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent
          size="xl"
          className="flex flex-col gap-0 p-0 overflow-hidden rounded-xl border border-gray-200 shadow-xl"
          style={{ width: 'min(90vw, 860px)', maxHeight: '88vh' }}
        >
          {/* Header estilo plataforma */}
          <DialogHeader className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-gray-200 bg-gradient-to-r from-[#1e5da8]/5 to-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                previewState?.fileType === 'pdf'    ? 'bg-red-50'         :
                previewState?.fileType === 'image'  ? 'bg-blue-50'        :
                previewState?.fileType === 'office' ? 'bg-[#1e5da8]/10'   : 'bg-gray-100'
              }`}>
                <FileText className={`w-5 h-5 ${
                  previewState?.fileType === 'pdf'    ? 'text-red-600'   :
                  previewState?.fileType === 'image'  ? 'text-blue-600'  :
                  previewState?.fileType === 'office' ? 'text-[#1e5da8]' : 'text-gray-500'
                }`} />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-sm font-semibold text-gray-900 truncate leading-snug">
                  {previewState?.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                  {previewState?.fileType === 'pdf'    ? 'Documento PDF'   :
                   previewState?.fileType === 'image'  ? 'Imagen'          :
                   previewState?.fileType === 'office' ? 'Documento Office' : 'Archivo adjunto'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Área de contenido con scroll */}
          <div className="flex-1 overflow-auto min-h-0 bg-gray-50">
            {previewState?.fileType === 'image' && (
              <div className="flex items-center justify-center p-5 min-h-[260px]">
                <img
                  src={previewState.url}
                  alt={previewState.name}
                  className="max-w-full object-contain rounded-lg shadow-md"
                  style={{ maxHeight: '58vh' }}
                />
              </div>
            )}

            {previewState?.fileType === 'pdf' && (
              <iframe
                src={previewState.url}
                className="w-full border-0 block"
                style={{ height: 'clamp(320px, 60vh, 680px)' }}
                title={previewState?.name}
              />
            )}

            {previewState?.fileType === 'office' && (
              <div className="min-h-[320px] bg-white">
                {previewState.officePreview?.status === 'loading' && (
                  <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-8 py-12 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-[#1e5da8]" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Preparando previsualizacion
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Estamos leyendo el archivo localmente en el navegador.
                      </p>
                    </div>
                  </div>
                )}

                {previewState.officePreview?.status === 'ready' &&
                  previewState.officePreview.kind === 'word' && (
                    <div className="bg-[#2f2f2f]">
                      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#3a3a3a] px-5 py-3 text-white">
                        <div className="flex items-center gap-3 text-sm">
                          <FileText className="h-4 w-4" />
                          <span>Vista previa DOCX</span>
                        </div>
                        <span className="rounded bg-black/25 px-2 py-1 text-xs font-semibold">
                          Render tipo Word
                        </span>
                      </div>
                      <div className="px-3 py-4 sm:px-6">
                        <div
                          ref={wordPreviewRef}
                          className="min-h-[700px] overflow-auto [&_.docx-wrapper]:!bg-transparent [&_.docx-wrapper]:!p-0 [&_.docx-wrapper>section.docx]:!mx-auto [&_.docx-wrapper>section.docx]:!mb-5 [&_.docx-wrapper>section.docx]:!shadow-[0_12px_42px_-18px_rgba(0,0,0,0.75)]"
                        />
                      </div>
                    </div>
                  )}

                {previewState.officePreview?.status === 'ready' &&
                  previewState.officePreview.kind === 'spreadsheet' && (
                    <div className="p-5">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-100 bg-green-50 px-4 py-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                            Vista previa de Excel
                          </p>
                          <p className="mt-1 text-xs text-green-700/80">
                            Hoja: {previewState.officePreview.sheetName || 'Principal'}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-green-700 shadow-sm">
                          {previewState.officePreview.totalRows || 0} filas,{' '}
                          {previewState.officePreview.totalColumns || 0} columnas
                        </span>
                      </div>

                      {previewState.officePreview.rows?.length ? (
                        <div className="overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                          <table className="min-w-full border-collapse text-left text-xs">
                            <tbody>
                              {previewState.officePreview.rows.map((row, rowIndex) => (
                                <tr
                                  key={`sheet-row-${rowIndex}`}
                                  className={rowIndex === 0 ? 'bg-gray-100' : 'odd:bg-white even:bg-gray-50'}
                                >
                                  {Array.from({
                                    length: Math.max(
                                      previewState.officePreview?.rows?.[0]?.length || 1,
                                      row.length,
                                    ),
                                  }).map((_, columnIndex) => (
                                    <td
                                      key={`sheet-cell-${rowIndex}-${columnIndex}`}
                                      className={`max-w-[260px] border border-gray-200 px-3 py-2 align-top ${
                                        rowIndex === 0
                                          ? 'font-semibold text-gray-900'
                                          : 'text-gray-700'
                                      }`}
                                    >
                                      <span className="block truncate" title={row[columnIndex] || ''}>
                                        {row[columnIndex] || ''}
                                      </span>
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
                          La hoja no contiene datos visibles para previsualizar.
                        </div>
                      )}

                      {(previewState.officePreview.totalRows || 0) > 80 ||
                      (previewState.officePreview.totalColumns || 0) > 20 ? (
                        <p className="mt-3 text-xs text-gray-500">
                          Vista limitada a las primeras 80 filas y 20 columnas para evitar
                          bloqueos del navegador. Descarga el archivo para revisar todo el contenido.
                        </p>
                      ) : null}
                    </div>
                  )}

                {(previewState.officePreview?.status === 'error' ||
                  previewState.officePreview?.status === 'unsupported') && (
                  <div className="flex min-h-[320px] flex-col items-center justify-center gap-5 px-8 py-12 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <p className="mb-1 text-sm font-semibold text-gray-800">
                        No se pudo previsualizar este archivo
                      </p>
                      <p className="text-xs leading-relaxed text-gray-500">
                        {previewState.officePreview?.error ||
                          'Descargalo para abrirlo correctamente.'}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1e5da8]/10 px-3 py-1.5 text-xs font-medium text-[#1e5da8]">
                      <Download className="h-3.5 w-3.5" />
                      Usa el boton de descarga
                    </span>
                  </div>
                )}
              </div>
            )}

            {previewState?.fileType === 'other' && (
              <div className="flex flex-col items-center justify-center gap-5 px-8 py-12 text-center min-h-[280px]">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-800 font-semibold mb-1 text-sm">
                    Vista previa no disponible
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {previewState.officePreview?.error ||
                      'Descarga el archivo para abrirlo correctamente.'}
                  </p>
                  <p className="hidden">
                    Los archivos Word y Excel requieren una aplicación de escritorio.<br />
                    Descárgalo para abrirlo correctamente.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                  <Download className="w-3.5 h-3.5" />
                  Usa el boton de descarga
                </span>
                <span className={`hidden ${
                  previewState?.fileType === 'office'
                    ? 'bg-[#1e5da8]/10 text-[#1e5da8]'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <Download className="w-3.5 h-3.5" />
                  Usa el botón de descarga
                </span>
              </div>
            )}
          </div>

          {/* Footer estilo plataforma */}
          <DialogFooter className="flex-shrink-0 px-5 py-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={closePreview}
              className="px-5 py-2 text-sm font-medium rounded-lg bg-[#1e5da8] text-white hover:bg-[#154a85] active:bg-[#123f75] transition-colors shadow-sm"
            >
              Cerrar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

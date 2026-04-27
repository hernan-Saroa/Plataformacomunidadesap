import { useEffect, useMemo, useState } from 'react';
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

interface ApprovalRequestsModuleProps {
  onPendingCountChange?: (count: number) => void;
}

const decisionLabel = (decision?: string | null) => {
  if (decision === 'APPROVED') return 'Aprobar';
  if (decision === 'REJECTED') return 'Rechazar';
  if (decision === 'OBSERVATION') return 'Observacion';
  return 'Sin concepto';
};

const approvalStatusLabel = (status?: string | null) => {
  if (status === 'PENDING_APPROVAL') return 'Pendiente aprobador';
  if (status === 'APPROVED_FINAL') return 'Aprobada final';
  if (status === 'REJECTED_FINAL') return 'Rechazada final';
  if (status === 'OBSERVATION') return 'Devuelta con observacion';
  return 'Sin estado';
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
    fileType: 'image' | 'pdf' | 'office' | 'other';
  } | null>(null);

  const pendingRequests = useMemo(
    () =>
      requests.filter(
        (request) => request.approvalStatus === 'PENDING_APPROVAL',
      ),
    [requests],
  );
  const managedRequests = useMemo(
    () =>
      requests.filter(
        (request) => request.approvalStatus !== 'PENDING_APPROVAL',
      ),
    [requests],
  );
  const pendingCount = pendingRequests.length;
  const managedCount = managedRequests.length;
  const favorablePendingCount = pendingRequests.filter(
    (item) => item.reviewRecommendation === 'APPROVED',
  ).length;
  const rejectionPendingCount = pendingRequests.filter(
    (item) => item.reviewRecommendation === 'REJECTED',
  ).length;

  const sortedRequests = useMemo(
    () =>
      [...(activeView === 'pending' ? pendingRequests : managedRequests)].sort((a, b) => {
        const aTime = new Date(a.reviewSubmittedAt || a.requestDate).getTime();
        const bTime = new Date(b.reviewSubmittedAt || b.requestDate).getTime();
        return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
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
          ? data.filter((item) => item.approvalStatus === 'PENDING_APPROVAL').length
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
    if (fileType === 'office' || fileType === 'other') {
      setPreviewState({ url: '', name: normalizeDisplayText(fileName) || fileName, fileType });
      return;
    }
    try {
      const blob = await graduadosService.solicitudes.descargarArchivoRevision(
        request.id,
        fileId,
      );
      const url = URL.createObjectURL(blob);
      setPreviewState({ url, name: normalizeDisplayText(fileName) || fileName, fileType });
    } catch (error: any) {
      toast.error('No se pudo cargar el archivo para visualización', {
        description: error?.response?.data?.message || error?.message,
      });
    }
  };

  const handleResolve = async () => {
    if (!selectedRequest) return;

    const trimmedNotes = notes.trim();
    if ((action === 'REJECTED' || action === 'OBSERVATION') && !trimmedNotes) {
      toast.error('Debes escribir una justificacion');
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
        },
      );
      toast.success(
        action === 'APPROVED'
          ? 'Solicitud aprobada definitivamente'
          : action === 'REJECTED'
            ? 'Solicitud rechazada definitivamente'
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
                Pendientes de aprobador
              </p>
              <p className="mt-2 text-3xl font-bold text-orange-900">
                {pendingCount}
              </p>
              <p className="mt-2 text-xs text-orange-700">
                Conceptos enviados por revisores
              </p>
            </div>
            <ShieldCheck className="w-10 h-10 text-orange-600" />
          </div>
        </Card>
        <Card className="border-2 border-green-200 bg-green-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">
                Favorables pendientes
              </p>
              <p className="mt-2 text-3xl font-bold text-green-900">
                {favorablePendingCount}
              </p>
              <p className="mt-2 text-xs text-green-700">
                Por validar por aprobador
              </p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </Card>
        <Card className="border-2 border-red-200 bg-red-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-800">
                Rechazos pendientes
              </p>
              <p className="mt-2 text-3xl font-bold text-red-900">
                {rejectionPendingCount}
              </p>
              <p className="mt-2 text-xs text-red-700">
                Por validar por aprobador
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
              Aprobaciones de Revision
            </h2>
            <p className="text-sm text-[#6B7280]">
              Revisa datos, concepto y archivos cargados por el revisor.
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
                ? 'Cuando un revisor envie un concepto, aparecera aqui.'
                : 'Cuando el aprobador apruebe, rechace o devuelva con observacion, aparecera aqui.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB]">
            {sortedRequests.map((request) => {
              const payload = (request.reviewPayload || {}) as Record<string, unknown>;
              const files = request.reviewFiles || [];
              const isExpanded = expandedId === request.id;
              const isPendingApproval = request.approvalStatus === 'PENDING_APPROVAL';

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
                        <Badge className="bg-orange-100 text-orange-800 border-orange-200 border">
                          {approvalStatusLabel(request.approvalStatus)}
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 border">
                          {decisionLabel(request.reviewRecommendation)}
                        </Badge>
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
                            Rechazar
                          </button>
                          <button
                            onClick={() => openActionModal(request, 'APPROVED')}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#003DA5] px-3 py-2 text-sm font-semibold text-white hover:bg-[#002E7D]"
                          >
                            <Award className="w-4 h-4" />
                            Aprobar
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
                                <div className="rounded bg-white p-3 border border-orange-200">
                                  <p className="text-xs text-orange-700">Decision del aprobador</p>
                                  <p className="font-semibold text-gray-900">
                                    {decisionLabel(request.approverDecision)}
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
                              <div className="space-y-2">
                                {files.length === 0 ? (
                                  <p className="text-xs text-gray-500">
                                    El revisor no cargo archivos.
                                  </p>
                                ) : (
                                  files.map((file) => (
                                    <div
                                      key={file.id}
                                      className="flex items-center justify-between gap-3 rounded bg-white p-2 border border-gray-200"
                                    >
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-gray-900">
                                          {normalizeDisplayText(file.originalName)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {formatBytes(file.sizeBytes)} - {formatDate(file.uploadedAt)}
                                        </p>
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
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        {compactReviewTimeline(request.reviewTimeline || []).length > 0 && (
                          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                            <h4 className="mb-3 text-sm font-semibold text-gray-900">
                              Linea de tiempo
                            </h4>
                            <div className="space-y-2 text-xs">
                              {compactReviewTimeline(request.reviewTimeline || []).map((event, index) => (
                                <div
                                  key={`${request.id}-${index}`}
                                  className="flex items-start justify-between gap-3 rounded bg-gray-50 p-3"
                                >
                                  <div className="min-w-0 text-gray-800">
                                    <p className="font-semibold">{event.label}</p>
                                    {formatTimelineActor(event.actorName, event.actorEmail, event.actorId) && (
                                      <p className="mt-0.5 text-gray-600">
                                        Usuario: {formatTimelineActor(event.actorName, event.actorEmail, event.actorId)}
                                      </p>
                                    )}
                                    {event.notes && (
                                      <p className="mt-1 text-gray-600">
                                        Nota: {event.notes}
                                      </p>
                                    )}
                                  </div>
                                  <span className="font-semibold text-gray-900 whitespace-nowrap">
                                    {formatDate(event.createdAt)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
              {action === 'APPROVED'
                ? 'Aprobar definitivamente'
                : action === 'REJECTED'
                  ? 'Rechazar definitivamente'
                  : 'Enviar observacion'}
            </DialogTitle>
            <DialogDescription>
              Esta decision queda registrada en la trazabilidad de la solicitud.
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
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">
                  {action === 'APPROVED'
                    ? 'Comentario final (opcional)'
                    : 'Justificacion (obligatoria)'}
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-[120px] w-full resize-none rounded-lg border-2 border-gray-300 p-3 text-sm focus:border-[#003DA5]"
                  placeholder={
                    action === 'APPROVED'
                      ? 'Agrega una nota interna si aplica...'
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

            {(previewState?.fileType === 'office' || previewState?.fileType === 'other') && (
              <div className="flex flex-col items-center justify-center gap-5 px-8 py-12 text-center min-h-[280px]">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-800 font-semibold mb-1 text-sm">
                    Este archivo no puede visualizarse en el navegador
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Los archivos Word y Excel requieren una aplicación de escritorio.<br />
                    Descárgalo para abrirlo correctamente.
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
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

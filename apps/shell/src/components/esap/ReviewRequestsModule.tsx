/**
 * MÓDULO: SOLICITUDES DE REVISIÓN
 * - Gestión de solicitudes de verificación de graduados no encontrados
 * - Formato de TABLA con columnas igual a Casos Pendientes
 */

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  FileText, 
  Building2, 
  User, 
  UserCircle,
  Calendar, 
  Mail, 
  Hash,
  TrendingUp, 
  RefreshCw, 
  MessageSquare,
  Award, 
  X,
  MoreVertical,
  Copy,
  Shield
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { PaginationPremium } from '../shared/PaginationPremium';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Card } from '../ui/card';
import { toast } from 'sonner';
import type { ReviewRequest, ReviewRequestStats } from '../../types';
import graduadosService, { SolicitudCertificadoGraduado } from '../../services/api/graduados.service';
import estructuraService from '../../services/estructuraService';
import { authService } from '../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';
import type { Seccional, Sede } from '../../services/api/types';

type ApprovalForm = {
  fullName: string;
  idNumber: string;
  email: string;
  programName: string;
  graduationDate: string;
  campus: string;
  seccionalName: string;
  numRegistro: string;
  numFolio: string;
  numLibro: string;
};

export function ReviewRequestsModule() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [timeNow, setTimeNow] = useState(() => Date.now());
  
  // Estados para modal de revisión
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReviewRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [isLoadingApprovalData, setIsLoadingApprovalData] = useState(false);
  const [approvalForm, setApprovalForm] = useState<ApprovalForm>({
    fullName: '',
    idNumber: '',
    email: '',
    programName: '',
    graduationDate: '',
    campus: '',
    seccionalName: '',
    numRegistro: '',
    numFolio: '',
    numLibro: '',
  });
  const [approvalFiles, setApprovalFiles] = useState<File[]>([]);
  const [approvalUploadProgress, setApprovalUploadProgress] = useState({
    totalFiles: 0,
    processedFiles: 0,
    currentFileName: '',
    currentFilePercent: 0,
    overallPercent: 0,
  });
  const [sedesOptions, setSedesOptions] = useState<string[]>([]);
  const [seccionalesOptions, setSeccionalesOptions] = useState<string[]>([]);
  const [seccionalBySede, setSeccionalBySede] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<ReviewRequestStats>({
    total: 0,
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    avgResolutionTime: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'start_review' | 'approve' | 'reject';
    request: ReviewRequest;
    notes?: string;
    approvalDetails?: ApprovalForm;
  } | null>(null);
  const currentUser = authService.getCurrentUser();
  const resolveReviewerName = (user: any): string | undefined => {
    if (!user) return undefined;
    const personFullName =
      typeof user.person?.full_name === 'string' ? user.person.full_name.trim() : '';
    if (personFullName) return personFullName;
    const personFirstName =
      typeof user.person?.first_name === 'string' ? user.person.first_name.trim() : '';
    const personLastName =
      typeof user.person?.last_name === 'string' ? user.person.last_name.trim() : '';
    const personComposed = `${personFirstName} ${personLastName}`.trim();
    if (personComposed) return personComposed;
    const directFullName = typeof user.fullName === 'string' ? user.fullName.trim() : '';
    if (directFullName) return directFullName;
    const firstName = typeof user.firstName === 'string' ? user.firstName.trim() : '';
    const lastName = typeof user.lastName === 'string' ? user.lastName.trim() : '';
    const composedName = `${firstName} ${lastName}`.trim();
    if (composedName) return composedName;
    const username = typeof user.username === 'string' ? user.username.trim() : '';
    if (username) return username;
    const email = typeof user.email === 'string' ? user.email.trim() : '';
    if (email) return email;
    const personEmail = typeof user.person?.email === 'string' ? user.person.email.trim() : '';
    return personEmail || undefined;
  };
  const resolveReviewerId = (user: any): string | undefined =>
    user?.id || user?.id_user || user?.userId || undefined;
  const reviewerName = resolveReviewerName(currentUser);
  const reviewerId = resolveReviewerId(currentUser);
  const PROGRAMAS_ESAP = [
    'ADMINISTRACIÓN PÚBLICA',
    'ADMINISTRACIÓN PÚBLICA TERRITORIAL',
    'ESPECIALIZACIÓN EN ALTA DIRECCIÓN DEL ESTADO',
    'ESPECIALIZACIÓN EN DERECHOS HUMANOS',
    'ESPECIALIZACIÓN EN FINANZAS PÚBLICAS',
    'ESPECIALIZACIÓN EN GERENCIA SOCIAL',
    'ESPECIALIZACIÓN EN GESTIÓN PÚBLICA',
    'ESPECIALIZACIÓN EN GESTIÓN Y PLANIFICACIÓN DEL DESARROLLO URBANO Y REGIONAL',
    'ESPECIALIZACIÓN EN PROYECTOS DE DESARROLLO',
    'MAESTRÍA EN ADMINISTRACIÓN PÚBLICA',
    'MAESTRÍA EN DERECHOS HUMANOS, GESTIÓN DE LA TRANSICIÓN Y POSCONFLICTO',
  ];
  const MAX_APPROVAL_FILES = 5;
  const MAX_APPROVAL_FILE_SIZE_BYTES = 10 * 1024 * 1024;
  const MAX_APPROVAL_FILE_SIZE_LABEL = '10 MB';

  const normalizeKey = (value?: string) =>
    (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const normalizeName = (value?: string) => {
    const normalized = (value || '').trim();
    return normalized || '';
  };

  const getArrayFromUnknown = <T,>(source: unknown): T[] => {
    if (Array.isArray(source)) return source as T[];
    if (source && typeof source === 'object' && Array.isArray((source as { data?: unknown }).data)) {
      return (source as { data?: T[] }).data || [];
    }
    return [];
  };

  const parseEstructuraCatalog = (source: unknown): { sedes: Sede[]; seccionales: Seccional[] } => {
    if (!source || typeof source !== 'object') {
      return { sedes: [], seccionales: [] };
    }

    const root = source as {
      sedes?: unknown;
      seccionales?: unknown;
      data?: {
        sedes?: unknown;
        seccionales?: unknown;
      };
    };

    const directSedes = getArrayFromUnknown<Sede>(root.sedes);
    const directSeccionales = getArrayFromUnknown<Seccional>(root.seccionales);
    const nestedSedes = getArrayFromUnknown<Sede>(root.data?.sedes);
    const nestedSeccionales = getArrayFromUnknown<Seccional>(root.data?.seccionales);

    return {
      sedes: directSedes.length ? directSedes : nestedSedes,
      seccionales: directSeccionales.length ? directSeccionales : nestedSeccionales,
    };
  };

  // Funciones auxiliares
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock },
      under_review: { label: 'En Revisión', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: RefreshCw },
      approved: { label: 'Aprobada', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
      rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border px-2.5 py-1 flex items-center gap-1.5`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </Badge>
    );
  };

  const getRequesterTypeIcon = (type: string) => {
    return type === 'empresa' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />;
  };

  const getRequesterTypeBadge = (type: string) => {
    const isCompany = type === 'empresa';
    return (
      <Badge className={`${isCompany ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-blue-100 text-blue-800 border-blue-300'} border text-xs`}>
        {isCompany ? 'Empresa' : 'Graduado'}
      </Badge>
    );
  };

  const getResolutionBadge = (resolution?: string) => {
    if (!resolution) return null;

    const resolutionConfig = {
      graduate_found: { label: 'Graduado Encontrado', color: 'bg-green-50 text-green-700 border-green-200' },
      graduate_not_found: { label: 'No Encontrado', color: 'bg-red-50 text-red-700 border-red-200' },
      invalid_data: { label: 'Datos Inválidos', color: 'bg-orange-50 text-orange-700 border-orange-200' },
      duplicate_request: { label: 'Solicitud Duplicada', color: 'bg-gray-50 text-gray-700 border-gray-200' }
    };

    const config = resolutionConfig[resolution as keyof typeof resolutionConfig];
    if (!config) return null;

    return (
      <Badge className={`${config.color} border px-2 py-1 text-xs`}>
        {config.label}
      </Badge>
    );
  };

  const parseDateSafe = (value?: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const isBusinessDay = (date: Date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  };

  const calculateBusinessHoursBetween = (start: Date, end: Date) => {
    if (end.getTime() <= start.getTime()) return 0;

    let totalMs = 0;
    let cursor = new Date(start.getTime());

    while (cursor.getTime() < end.getTime()) {
      const nextDay = new Date(cursor.getTime());
      nextDay.setHours(24, 0, 0, 0);
      const segmentEnd = nextDay.getTime() < end.getTime() ? nextDay : end;

      if (isBusinessDay(cursor)) {
        totalMs += segmentEnd.getTime() - cursor.getTime();
      }

      cursor = segmentEnd;
    }

    return totalMs / (1000 * 60 * 60);
  };

  const calculateTimeSince = (dateString: string, nowMs: number) => {
    const date = new Date(dateString);
    const dateMs = date.getTime();
    if (Number.isNaN(dateMs)) return '-';

    const diffMs = Math.max(0, nowMs - dateMs);
    const seconds = Math.max(1, Math.floor(diffMs / 1000));
    if (seconds < 60) {
      return `Hace ${seconds} segundo${seconds !== 1 ? 's' : ''}`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `Hace ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`;
    }

    const days = Math.floor(hours / 24);
    return `Hace ${days} día${days !== 1 ? 's' : ''}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toDateInputValue = (value?: string | Date | null) => {
    if (!value) return '';

    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const trimmed = value.trim();
    if (!trimmed) return '';

    const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateMatch) return trimmed;

    const isoDateTimeMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (isoDateTimeMatch) {
      return `${isoDateTimeMatch[1]}-${isoDateTimeMatch[2]}-${isoDateTimeMatch[3]}`;
    }

    const slashDateMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashDateMatch) {
      return `${slashDateMatch[3]}-${slashDateMatch[2]}-${slashDateMatch[1]}`;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateOnly = (value?: string | Date | null) => {
    const normalized = toDateInputValue(value);
    if (!normalized) {
      return 'Sin fecha';
    }

    const [yearRaw, monthRaw, dayRaw] = normalized.split('-');
    const year = Number(yearRaw);
    const month = Number(monthRaw) - 1;
    const day = Number(dayRaw);
    const localDate = new Date(year, month, day, 12, 0, 0);

    return localDate.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    const { copyToClipboard } = await import('@/utils/browser');
    const success = await copyToClipboard(text);
    if (success) {
      toast.success(`${label} copiado al portapapeles`);
    } else {
      toast.error('No se pudo copiar. Por favor, cópialo manualmente.');
    }
  };

  const allowedFileExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.webp'];
  const allowedFileMimeTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/webp',
  ]);
  const getApprovalFileChipClass = (file: File) => {
    const name = file.name.toLowerCase();
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
    if (ext === 'pdf') return 'border-red-200 bg-red-50 text-red-700';
    if (ext === 'doc' || ext === 'docx') return 'border-blue-200 bg-blue-50 text-blue-700';
    if (ext === 'xls' || ext === 'xlsx') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') {
      return 'border-gray-300 bg-gray-100 text-gray-700';
    }
    return 'border-gray-300 bg-gray-100 text-gray-700';
  };
  const isAllowedFile = (file: File) => {
    const lowerName = file.name.toLowerCase();
    const ext = lowerName.includes('.') ? lowerName.slice(lowerName.lastIndexOf('.')) : '';
    return allowedFileExtensions.includes(ext) || allowedFileMimeTypes.has(file.type);
  };
  const isPayloadTooLargeError = (error: unknown) => {
    const normalizedError = error as {
      statusCode?: number;
      message?: string;
      response?: {
        status?: number;
        data?: { message?: string } | string;
      };
    };
    const responseMessage =
      typeof normalizedError?.response?.data === 'string'
        ? normalizedError.response.data
        : normalizedError?.response?.data?.message;
    const message = responseMessage || normalizedError?.message || '';
    const statusCode = normalizedError?.statusCode ?? normalizedError?.response?.status;
    return statusCode === 413 || /413|request entity too large|payload too large/i.test(message);
  };
  const handleApprovalFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) {
      return;
    }
    const nextFiles = [...approvalFiles, ...selected];
    if (nextFiles.length > MAX_APPROVAL_FILES) {
      toast.error(`Solo puedes adjuntar máximo ${MAX_APPROVAL_FILES} archivos`);
      event.target.value = '';
      return;
    }
    const invalidFile = nextFiles.find((file) => !isAllowedFile(file));
    if (invalidFile) {
      toast.error('Solo se permiten archivos PDF, Word, Excel o imágenes');
      event.target.value = '';
      return;
    }
    const oversizedFile = selected.find((file) => file.size > MAX_APPROVAL_FILE_SIZE_BYTES);
    if (oversizedFile) {
      toast.error('El archivo es muy pesado', {
        description: `El archivo "${oversizedFile.name}" supera el límite de ${MAX_APPROVAL_FILE_SIZE_LABEL} por archivo.`,
      });
      event.target.value = '';
      return;
    }
    setApprovalFiles(nextFiles);
    event.target.value = '';
  };
  const handleRemoveApprovalFile = (index: number) => {
    setApprovalFiles((prev) => prev.filter((_, idx) => idx !== index));
  };
  const resetApprovalUploadProgress = () => {
    setApprovalUploadProgress({
      totalFiles: 0,
      processedFiles: 0,
      currentFileName: '',
      currentFilePercent: 0,
      overallPercent: 0,
    });
  };

  const mapStatus = (status: SolicitudCertificadoGraduado['status']): ReviewRequest['status'] => {
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'PROCESSING':
        return 'under_review';
      case 'COMPLETED':
        return 'approved';
      case 'REJECTED':
        return 'rejected';
      default:
        return 'pending';
    }
  };

  const mapRequesterType = (
    type: SolicitudCertificadoGraduado['requesterType']
  ): ReviewRequest['requester']['type'] => (type === 'COMPANY' ? 'empresa' : 'graduado');

  const mapRequest = (request: SolicitudCertificadoGraduado): ReviewRequest => {
    const requesterType = mapRequesterType(request.requesterType);
    const requesterName = (request.requesterName || '').trim();
    const companyName = (request.companyName || '').trim();
    const contactPerson = (request.contactPerson || '').trim();
    const requesterDisplayName =
      requesterType === 'empresa'
        ? companyName || requesterName || 'Solicitante'
        : requesterName || request.fullName || request.graduateLastName || 'Solicitante';
    const requesterContactPerson =
      requesterType === 'empresa'
        ? contactPerson ||
          (requesterName && requesterName !== requesterDisplayName ? requesterName : undefined)
        : undefined;

    return {
      id: request.id,
      requestNumber: request.requestNumber,
      graduateDocumentNumber: request.idNumber,
      graduateDocumentIssueDate: request.idIssueDate || '',
      graduationDate: toDateInputValue(request.graduationDate) || undefined,
      graduateLastName: request.graduateLastName,
      graduateEmail: request.graduateEmail,
      requester: {
        name: requesterDisplayName,
        email: request.requesterEmail,
        type: requesterType,
        companyName: requesterType === 'empresa' ? companyName || requesterDisplayName : undefined,
        contactPerson: requesterContactPerson,
        companyNit: request.companyNit,
      },
      status: mapStatus(request.status),
      createdAt: request.requestDate,
      reviewedAt: request.reviewedAt || request.completionDate,
      reviewedBy: request.reviewedBy,
      reviewerName: request.reviewerName,
      reviewNotes: request.reviewNotes || request.rejectionReason,
      resolution: request.reviewResolution as ReviewRequest['resolution'],
      certificateGenerated: request.status === 'COMPLETED',
    };
  };

  const calculateStats = (items: ReviewRequest[]): ReviewRequestStats => {
    const totals = {
      total: items.length,
      pending: 0,
      underReview: 0,
      approved: 0,
      rejected: 0,
      avgResolutionTime: 0,
    };

    let resolvedCount = 0;
    let totalHours = 0;

    items.forEach((item) => {
      switch (item.status) {
        case 'pending':
          totals.pending += 1;
          break;
        case 'under_review':
          totals.underReview += 1;
          break;
        case 'approved':
          totals.approved += 1;
          break;
        case 'rejected':
          totals.rejected += 1;
          break;
        default:
          break;
      }

      const isResolved = item.status === 'approved' || item.status === 'rejected';
      if (isResolved && item.reviewedAt) {
        const createdAt = parseDateSafe(item.createdAt);
        const reviewedAt = parseDateSafe(item.reviewedAt);
        if (createdAt && reviewedAt && reviewedAt.getTime() >= createdAt.getTime()) {
          totalHours += calculateBusinessHoursBetween(createdAt, reviewedAt);
          resolvedCount += 1;
        }
      }
    });

    totals.avgResolutionTime =
      resolvedCount > 0 ? Number((totalHours / resolvedCount).toFixed(1)) : 0;

    return totals;
  };

  const loadRequests = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      let data = await graduadosService.solicitudes.listarRevision();

      if (!Array.isArray(data) || data.length === 0) {
        const all = await graduadosService.solicitudes.listar();
        data = all.filter((item) => {
          const observation = item.observations?.toLowerCase() || '';
          return item.manualReview || observation.includes('revision manual') || observation.includes('revisión manual');
        });
      }

      const mapped = data.map(mapRequest);
      setRequests(mapped);
      setStats(calculateStats(mapped));
    } catch (error) {
      console.error('Error cargando solicitudes de revisión:', error);
      setLoadError('No se pudieron cargar las solicitudes de revisión.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeNow(Date.now());
    }, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCatalogs = async () => {
      try {
        const estructuraResponse = await estructuraService.obtenerEstructura().catch(() => null);

        if (!isMounted) return;

        let { sedes, seccionales } = parseEstructuraCatalog(estructuraResponse);

        if (!sedes.length || !seccionales.length) {
          const [sedesResponse, seccionalesResponse] = await Promise.all([
            estructuraService.listarSedes().catch(() => null),
            estructuraService.listarSeccionales().catch(() => null),
          ]);

          if (!sedes.length) {
            sedes = getArrayFromUnknown<Sede>(sedesResponse);
          }
          if (!seccionales.length) {
            seccionales = getArrayFromUnknown<Seccional>(seccionalesResponse);
          }
        }

        const sedesList = sedes
          .map((sede) => normalizeName(sede?.nomSede))
          .filter(Boolean);
        const seccionalesList = seccionales
          .map((seccional) => normalizeName(seccional?.nomSeccional))
          .filter(Boolean);

        const seccionalNameById = new Map<number, string>();
        seccionales.forEach((seccional) => {
          if (!seccional?.idSeccional) return;
          const name = normalizeName(seccional.nomSeccional);
          if (name) {
            seccionalNameById.set(seccional.idSeccional, name);
          }
        });

        const territorialMap: Record<string, string> = {};
        sedes.forEach((sede) => {
          const sedeName = normalizeName(sede?.nomSede);
          if (!sedeName) return;
          const seccionalName =
            normalizeName(sede?.seccional?.nomSeccional) ||
            (sede?.idSeccional ? seccionalNameById.get(sede.idSeccional) || '' : '');
          if (seccionalName) {
            territorialMap[normalizeKey(sedeName)] = seccionalName;
          }
        });

        setSedesOptions(Array.from(new Set(sedesList)).sort((a, b) => a.localeCompare(b, 'es')));
        setSeccionalesOptions(Array.from(new Set(seccionalesList)).sort((a, b) => a.localeCompare(b, 'es')));
        setSeccionalBySede(territorialMap);

      } catch (error) {
        console.error('Error cargando catalogos de aprobacion:', error);
      }
    };

    loadCatalogs();

    return () => {
      isMounted = false;
    };
  }, []);

  const programNameOptions = useMemo(() => PROGRAMAS_ESAP, []);

  const campusOptions = useMemo(() => {
    const options = new Set<string>(sedesOptions);
    if (approvalForm.campus) {
      options.add(approvalForm.campus);
    }
    return Array.from(options).sort((a, b) => a.localeCompare(b, 'es'));
  }, [approvalForm.campus, sedesOptions]);

  const seccionalSelectOptions = useMemo(() => {
    const options = new Set<string>(seccionalesOptions);
    const matchedSeccionalBySede = approvalForm.campus
      ? seccionalBySede[normalizeKey(approvalForm.campus)]
      : '';
    if (matchedSeccionalBySede) {
      options.add(matchedSeccionalBySede);
    }
    if (approvalForm.seccionalName) {
      options.add(approvalForm.seccionalName);
    }
    const ordered = Array.from(options)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'es'));
    if (matchedSeccionalBySede) {
      return [matchedSeccionalBySede, ...ordered.filter((item) => item !== matchedSeccionalBySede)];
    }
    return ordered;
  }, [approvalForm.campus, approvalForm.seccionalName, seccionalBySede, seccionalesOptions]);

  useEffect(() => {
    if (!approvalForm.campus || approvalForm.seccionalName) {
      return;
    }

    const mappedSeccional = seccionalBySede[normalizeKey(approvalForm.campus)] || '';
    if (!mappedSeccional) {
      return;
    }

    setApprovalForm((prev) => {
      if (prev.seccionalName) {
        return prev;
      }
      return {
        ...prev,
        seccionalName: mappedSeccional,
      };
    });
  }, [approvalForm.campus, approvalForm.seccionalName, seccionalBySede]);

  const getRequestSortTime = (request: ReviewRequest) => {
    const createdAt = parseDateSafe(request.createdAt)?.getTime() ?? 0;
    const reviewedAt = parseDateSafe(request.reviewedAt)?.getTime() ?? 0;
    return createdAt || reviewedAt;
  };

  const orderedRequests = useMemo(
    () =>
      [...requests].sort(
        (a, b) => getRequestSortTime(b) - getRequestSortTime(a),
      ),
    [requests],
  );

  // Filtros
  const filteredRequests = useMemo(
    () =>
      orderedRequests.filter((request) => {
        const matchesSearch =
          request.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          request.graduateDocumentNumber.includes(searchQuery) ||
          request.requester.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (request.requester.companyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (request.requester.contactPerson || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          request.requester.email.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          statusFilter === 'all' || request.status === statusFilter;

        return matchesSearch && matchesStatus;
      }),
    [orderedRequests, searchQuery, statusFilter],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Paginación
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleViewDetails = (request: ReviewRequest) => {
    setExpandedRequestId(expandedRequestId === request.id ? null : request.id);
  };

  const handleStartReview = (request: ReviewRequest) => {
    setConfirmAction({ type: 'start_review', request });
    setShowConfirmModal(true);
  };

  const handleOpenReviewModal = async (
    request: ReviewRequest,
    action: 'approve' | 'reject'
  ) => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNotes('');
    setShowReviewModal(true);
    setApprovalFiles([]);
    resetApprovalUploadProgress();

    if (action !== 'approve') {
      return;
    }

    setIsLoadingApprovalData(true);
    try {
      const detail = await graduadosService.solicitudes.obtenerPorId(request.id);
      const graduationDate = toDateInputValue(
        detail.graduationDate || request.graduationDate
      );
      const detailData = detail as SolicitudCertificadoGraduado & {
        campus?: string;
        seccionalName?: string;
        graduate?: {
          campus?: string;
          seccionalName?: string;
        };
      };
      const isCompanyRequester =
        detail.requesterType === 'COMPANY' || request.requester.type === 'empresa';
      const resolvedFullName =
        [
          isCompanyRequester ? detail.graduateLastName : detail.fullName,
          request.graduateLastName,
          isCompanyRequester ? detail.fullName : detail.graduateLastName,
          detail.requesterType === 'GRADUATE' ? detail.requesterName : '',
          request.requester.type === 'graduado' ? request.requester.name : '',
        ]
          .map((value) => (value || '').trim())
          .find((value) => value.length > 0) || '';
      const resolvedEmail =
        (
          isCompanyRequester
            ? [detail.graduateEmail, request.graduateEmail]
            : [
                detail.graduateEmail,
                detail.requesterEmail,
                request.graduateEmail,
                request.requester.email,
              ]
        )
          .map((value) => (value || '').trim())
          .find((value) => value.length > 0) || '';

      let nextForm: ApprovalForm = {
        fullName: resolvedFullName,
        idNumber: detail.idNumber || request.graduateDocumentNumber,
        email: resolvedEmail,
        programName: PROGRAMAS_ESAP.includes((detail.programName || '').trim())
          ? (detail.programName || '').trim()
          : '',
        graduationDate,
        campus: detailData.campus || detailData.graduate?.campus || '',
        seccionalName: detailData.seccionalName || detailData.graduate?.seccionalName || '',
        numRegistro: '',
        numFolio: '',
        numLibro: '',
      };

      if (detail.graduateId) {
        try {
          const graduate = await graduadosService.graduados.obtenerPorId(detail.graduateId);
          nextForm = {
            ...nextForm,
            fullName: graduate.fullName || nextForm.fullName,
            idNumber: graduate.idNumber || nextForm.idNumber,
            email: graduate.email || nextForm.email,
            programName: PROGRAMAS_ESAP.includes((graduate.programName || '').trim())
              ? (graduate.programName || '').trim()
              : nextForm.programName,
            graduationDate:
              toDateInputValue(graduate.graduationDate) || nextForm.graduationDate,
            campus: graduate.campus || nextForm.campus,
            seccionalName: graduate.seccionalName || nextForm.seccionalName,
            numRegistro: graduate.numRegistro || nextForm.numRegistro,
            numFolio: graduate.numFolio || nextForm.numFolio,
            numLibro: graduate.numLibro || nextForm.numLibro,
          };
        } catch (error) {
          console.error('Error cargando graduado asociado:', error);
        }
      }

      setApprovalForm(nextForm);
    } catch (error) {
      console.error('Error cargando solicitud:', error);
      toast.error('No se pudo cargar la solicitud para aprobar');
    } finally {
      setIsLoadingApprovalData(false);
    }
  };

  const handleSubmitReview = () => {
    if (!reviewNotes.trim()) {
      toast.error('Por favor ingresa notas de revision');
      return;
    }
    let approvalDetails: ApprovalForm | undefined;
    if (reviewAction === 'approve') {
      const trimmedFullName = approvalForm.fullName.trim();
      const trimmedEmail = approvalForm.email.trim();
      const trimmedRegistro = approvalForm.numRegistro.trim();
      const trimmedFolio = approvalForm.numFolio.trim();
      const trimmedLibro = approvalForm.numLibro.trim();
      const digitsOnly = /^\d{1,10}$/;

      if (!trimmedFullName) {
        toast.error('El nombre del graduado es obligatorio');
        return;
      }
      if (!trimmedEmail) {
        toast.error('El email es obligatorio');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        toast.error('El email no tiene un formato valido');
        return;
      }
      if (!approvalForm.programName) {
        toast.error('Selecciona el programa');
        return;
      }
      if (!approvalForm.graduationDate) {
        toast.error('Selecciona la fecha de graduacion');
        return;
      }
      if (!approvalForm.campus) {
        toast.error('Selecciona la sede');
        return;
      }
      if (!approvalForm.seccionalName) {
        toast.error('Selecciona la seccional');
        return;
      }
      if (!trimmedRegistro || !digitsOnly.test(trimmedRegistro)) {
        toast.error('El numero de registro es obligatorio y debe tener maximo 10 digitos');
        return;
      }
      if (!trimmedFolio || !digitsOnly.test(trimmedFolio)) {
        toast.error('El numero de folio es obligatorio y debe tener maximo 10 digitos');
        return;
      }
      if (!trimmedLibro || !digitsOnly.test(trimmedLibro)) {
        toast.error('El numero de libro es obligatorio y debe tener maximo 10 digitos');
        return;
      }

      approvalDetails = {
        ...approvalForm,
        fullName: trimmedFullName,
        email: trimmedEmail,
        numRegistro: trimmedRegistro,
        numFolio: trimmedFolio,
        numLibro: trimmedLibro,
      };
    }

    setShowReviewModal(false);
    if (selectedRequest) {
      setConfirmAction({
        type: reviewAction,
        request: selectedRequest,
        notes: reviewNotes.trim(),
        approvalDetails,
      });
      setShowConfirmModal(true);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) {
      return;
    }

    setIsUpdating(true);

    try {
      if (confirmAction.type === 'start_review') {
        await graduadosService.solicitudes.marcarEnRevision(
          confirmAction.request.id,
          reviewerName,
          reviewerId,
        );
        toast.success('Solicitud marcada como en revision', {
          description:
            'Se envio un correo de actualizacion sobre el proceso al solicitante.',
        });
      } else if (confirmAction.type === 'approve') {
        const approvalPayload = {
          reviewNotes: confirmAction.notes || 'Aprobado por revision manual',
          reviewerName,
          reviewerId,
          ...(confirmAction.approvalDetails || {}),
        };
        const approvalResponse = await graduadosService.solicitudes.aprobar(
          confirmAction.request.id,
          approvalPayload
        );
        const graduateId =
          approvalResponse?.request?.graduateId ||
          (approvalResponse as any)?.request?.graduate?.id;
        if (graduateId && approvalFiles.length > 0) {
          const totalFiles = approvalFiles.length;
          setApprovalUploadProgress({
            totalFiles,
            processedFiles: 0,
            currentFileName: approvalFiles[0]?.name || '',
            currentFilePercent: 0,
            overallPercent: 0,
          });
          for (const [currentIndex, file] of approvalFiles.entries()) {
            setApprovalUploadProgress((prev) => ({
              ...prev,
              processedFiles: currentIndex,
              currentFileName: file.name,
              currentFilePercent: 0,
              overallPercent: Number(((currentIndex / totalFiles) * 100).toFixed(1)),
            }));
            try {
              // Subir archivo por archivo evita errores 413 por payload acumulado.
              await graduadosService.graduados.subirArchivos(
                graduateId,
                [file],
                reviewerName,
                (progress) => {
                  setApprovalUploadProgress((prev) => ({
                    ...prev,
                    currentFileName: file.name,
                    currentFilePercent: progress,
                    overallPercent: Number((((currentIndex + progress / 100) / totalFiles) * 100).toFixed(1)),
                  }));
                },
              );
            } catch (uploadError: any) {
              console.error('Error subiendo archivo del graduado:', uploadError);
              if (isPayloadTooLargeError(uploadError)) {
                toast.error('El archivo es muy pesado', {
                  description: `El archivo "${file.name}" supera el límite de ${MAX_APPROVAL_FILE_SIZE_LABEL} por archivo.`,
                });
              } else {
                toast.error(`No se pudo subir "${file.name}"`, {
                  description: uploadError?.response?.data?.message || uploadError?.message,
                });
              }
            }
            const processedFiles = currentIndex + 1;
            setApprovalUploadProgress((prev) => ({
              ...prev,
              processedFiles,
              currentFilePercent: 100,
              overallPercent: Number(((processedFiles / totalFiles) * 100).toFixed(1)),
            }));
          }
        }
        toast.success('Solicitud aprobada y certificado generado');
      } else if (confirmAction.type === 'reject') {
        await graduadosService.solicitudes.rechazar(
          confirmAction.request.id,
          confirmAction.notes || 'Solicitud rechazada',
          reviewerName,
          reviewerId,
        );
        toast.success('Solicitud rechazada');
      }

      setSelectedRequest(null);
      setConfirmAction(null);
      setShowConfirmModal(false);
      setApprovalFiles([]);
      resetApprovalUploadProgress();
      await loadRequests();
    } catch (error: any) {
      console.error('Error actualizando solicitud:', error);
      toast.error('No se pudo actualizar la solicitud', {
        description: error?.response?.data?.message || error?.message,
      });
    } finally {
      setIsUpdating(false);
      resetApprovalUploadProgress();
    }
  };

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all';

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const reviewActionLabel = reviewAction === 'approve' ? 'Aprobar' : 'Rechazar';
  const confirmActionLabel =
    confirmAction?.type === 'start_review'
      ? 'Enviar a revisión'
      : confirmAction?.type === 'approve'
        ? 'Aprobar solicitud'
        : 'Rechazar solicitud';

  return (
    <div className="space-y-6">
      {/* Banner informativo de solicitudes */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4"
      >
        {/* Card 1: Total */}
        <Card className="border-2 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  Total
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#1F2937' }}>
                  {stats.total}
                </p>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  Solicitudes
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)' }}
              >
                <FileText className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </Card>

        {/* Card 2: Pendientes */}
        <Card className="border-2 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  Pendientes
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#1F2937' }}>
                  {stats.pending}
                </p>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  Sin revisar
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
              >
                <Clock className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </Card>

        {/* Card 3: En Revisión */}
        <Card className="border-2 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  En Revisión
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#1F2937' }}>
                  {stats.underReview}
                </p>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  En proceso
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)' }}
              >
                <RefreshCw className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </Card>

        {/* Card 4: Aprobadas */}
        <Card className="border-2 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  Aprobadas
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#1F2937' }}>
                  {stats.approved}
                </p>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  Resueltas
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
              >
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </Card>

        {/* Card 5: Rechazadas */}
        <Card className="border-2 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  Rechazadas
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#1F2937' }}>
                  {stats.rejected}
                </p>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  No aprobadas
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
              >
                <XCircle className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </Card>

        {/* Card 6: Tiempo Promedio */}
        <Card className="border-2 hover:shadow-lg transition-shadow" style={{ borderColor: '#E5E7EB' }}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  Tiempo Promedio
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#1F2937' }}>
                  {stats.avgResolutionTime}h
                </p>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  Resolución
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' }}
              >
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Filtros y Búsqueda */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white rounded-xl border-2 p-6"
        style={{ borderColor: '#E5E7EB' }}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: '#1F2937' }}>
              Filtros de Búsqueda
            </h2>
            {hasActiveFilters && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 border">
                Filtros activos
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Búsqueda */}
            <div className="relative flex-1 min-w-[250px]">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                style={{ color: '#6B7280' }}
              />
              <input
                type="text"
                placeholder="Buscar por número, cédula, nombre o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 rounded-lg text-sm transition-all"
                style={{
                  borderColor: '#D1D5DB',
                  color: '#1F2937',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#003DA5';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 61, 165, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#D1D5DB';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Filtro de Estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-2 rounded-lg px-4 py-2.5 text-sm transition-all"
              style={{
                borderColor: '#D1D5DB',
                color: '#1F2937',
                minWidth: '180px',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#003DA5';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 61, 165, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#D1D5DB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="under_review">En Revisión</option>
              <option value="approved">Aprobadas</option>
              <option value="rejected">Rechazadas</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all"
                style={{
                  background: '#FEF2F2',
                  color: '#991B1B',
                  border: '1px solid #FEE2E2'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#FEE2E2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#FEF2F2';
                }}
              >
                <X className="w-4 h-4" />
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Lista de Solicitudes - FORMATO TABLA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="space-y-3"
      >
        {isLoading ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
            <Clock className="w-16 h-16 mx-auto mb-4 animate-pulse" style={{ color: '#D1D5DB' }} />
            <h3 className="text-lg font-semibold text-[#1F2937] mb-2">
              Cargando solicitudes...
            </h3>
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#EF4444' }} />
            <h3 className="text-lg font-semibold text-[#1F2937] mb-2">
              No se pudieron cargar las solicitudes
            </h3>
            <p className="text-sm text-[#6B7280] mb-6">{loadError}</p>
            <button
              onClick={loadRequests}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </button>
          </div>
        ) : paginatedRequests.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#D1D5DB' }} />
            <h3 className="text-lg font-semibold text-[#1F2937] mb-2">
              No se encontraron solicitudes
            </h3>
            <p className="text-sm text-[#6B7280] mb-6">
              {hasActiveFilters
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'No hay solicitudes en este momento'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg"
                style={{
                  background: '#003DA5',
                  color: '#FFFFFF'
                }}
              >
                <X className="w-4 h-4" />
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Header de Tabla */}
            <div className="bg-white rounded-t-xl border border-[#E5E7EB] border-b-0">
              <div className="grid grid-cols-12 gap-4 p-4 text-xs font-semibold" style={{ color: '#6B7280' }}>
                <div className="col-span-3">SOLICITUD / SOLICITANTE</div>
                <div className="col-span-2">GRADUADO BUSCADO</div>
                <div className="col-span-2">FECHA SOLICITUD</div>
                <div className="col-span-2">ESTADO</div>
                <div className="col-span-2">TIEMPO</div>
                <div className="col-span-1 text-right">ACCIONES</div>
              </div>
            </div>

            {/* Filas de Solicitudes */}
            {paginatedRequests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                className="bg-white border-x border-b border-[#E5E7EB] last:rounded-b-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Fila Principal */}
                <div className="p-4">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Columna 1: Solicitud / Solicitante (3 cols) */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback
                            className="text-white font-semibold text-sm"
                            style={{ 
                              background: request.requester.type === 'empresa' 
                                ? 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' 
                                : 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)' 
                            }}
                          >
                            {request.requester.type === 'empresa' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate" style={{ color: '#1F2937' }}>
                            {request.requester.type === 'empresa' && request.requester.contactPerson
                              ? request.requester.contactPerson
                              : request.requester.name}
                          </h3>
                          <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                            {request.requestNumber}
                          </p>
                          {request.requester.type === 'empresa' && (
                            <p className="text-xs truncate flex items-center gap-1" style={{ color: '#6B7280' }}>
                              <Building2 className="w-3 h-3" />
                              {request.requester.companyName || request.requester.name}
                            </p>
                          )}
                          <p className="text-xs truncate flex items-center gap-1" style={{ color: '#6B7280' }}>
                            <Mail className="w-3 h-3" />
                            {request.requester.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Columna 2: Graduado Buscado (2 cols) */}
                    <div className="col-span-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#6B7280' }} />
                          <p className="text-sm font-mono font-semibold truncate" style={{ color: '#1F2937' }}>
                            {request.graduateDocumentNumber}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Columna 3: Fecha Solicitud (2 cols) */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                          style={{ background: '#F3F4F6' }}
                        >
                          <Calendar className="w-4 h-4" style={{ color: '#6B7280' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: '#1F2937' }}>
                            {request.createdAt
                              ? new Date(request.createdAt).toLocaleDateString('es-CO')
                              : '-'}
                          </p>
                          <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                            Solicitud
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Columna 4: Estado (2 cols) */}
                    <div className="col-span-2">
                      <div className="space-y-1.5">
                        {getStatusBadge(request.status)}
                        {getRequesterTypeBadge(request.requester.type)}
                      </div>
                    </div>

                    {/* Columna 5: Tiempo (2 cols) */}
                    <div className="col-span-2">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>
                          {calculateTimeSince(request.createdAt, timeNow)}
                        </p>
                        {request.reviewerName && (
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#6B7280' }} />
                            <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                              {request.reviewerName}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Columna 6: Acciones (1 col) */}
                    <div className="col-span-1 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewDetails(request)}
                        className="p-2 rounded-lg transition-all"
                        style={{
                          background: expandedRequestId === request.id ? '#003DA5' : '#F3F4F6',
                          color: expandedRequestId === request.id ? '#FFFFFF' : '#6B7280'
                        }}
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-2 rounded-lg transition-all"
                            style={{
                              background: '#F9FAFB',
                              color: '#6B7280'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#F3F4F6';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#F9FAFB';
                            }}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {request.status === 'pending' && authService.hasPermission(Permissions.GRADUATES_SOLICITUDE_REVIEW) && (
                            <>
                              <DropdownMenuItem onClick={() => handleStartReview(request)}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Enviar a Revisión
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {request.status === 'under_review' && (
                            <>
                              {authService.hasPermission(Permissions.GRADUATES_SOLICITUDE_APROBAR) && (
                              <DropdownMenuItem onClick={() => handleOpenReviewModal(request, 'approve')}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Aprobar
                              </DropdownMenuItem>
                              )}
                              {authService.hasPermission(Permissions.GRADUATES_SOLICITUDE_RECHAZAR) && (
                              <DropdownMenuItem onClick={() => handleOpenReviewModal(request, 'reject')}>
                                <XCircle className="w-4 h-4 mr-2" />
                                Rechazar
                              </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem onClick={() => handleCopyToClipboard(request.graduateDocumentNumber, 'Cédula')}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar Cédula
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyToClipboard(request.requestNumber, 'Número de solicitud')}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar Número de Solicitud
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* Panel Expandido - Detalles Completos */}
                <AnimatePresence>
                  {expandedRequestId === request.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-[#E5E7EB] bg-[#F9FAFB] overflow-hidden"
                    >
                      <div className="p-6 space-y-4">
                        {/* Título */}
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: '#1F2937' }}>
                            <Shield className="w-5 h-5" style={{ color: '#003DA5' }} />
                            Detalles Completos de la Solicitud
                          </h3>
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 border text-xs">
                            {request.requestNumber}
                          </Badge>
                        </div>

                        {/* Grid 2 columnas */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Info del Graduado Buscado */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Hash className="w-4 h-4 text-blue-600" />
                              Graduado Buscado
                            </h4>
                            <div className="space-y-2.5 text-sm">
                              <div className="flex items-start gap-2">
                                <Hash className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Cédula</p>
                                  <p className="font-semibold text-gray-900 font-mono">{request.graduateDocumentNumber}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <User className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Apellido</p>
                                  <p className="font-semibold text-gray-900">
                                    {request.graduateLastName || 'Sin registrar'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Calendar className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Fecha de Grado</p>
                                  <p className="font-semibold text-gray-900">
                                    {formatDateOnly(request.graduationDate)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Info del Solicitante */}
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              {getRequesterTypeIcon(request.requester.type)}
                              Solicitante
                            </h4>
                            <div className="space-y-2.5 text-sm">
                              <div className="flex items-start gap-2">
                                {request.requester.type === 'empresa' ? <Building2 className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" /> : <User className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />}
                                <div>
                                  <p className="text-xs text-gray-600">
                                    {request.requester.type === 'empresa' ? 'Empresa' : 'Nombre'}
                                  </p>
                                  <p className="font-semibold text-gray-900">
                                    {request.requester.type === 'empresa'
                                      ? request.requester.companyName || request.requester.name
                                      : request.requester.name}
                                  </p>
                                </div>
                              </div>
                              {request.requester.type === 'empresa' && (
                                <div className="flex items-start gap-2">
                                  <UserCircle className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs text-gray-600">Persona que Solicita</p>
                                    <p className="font-semibold text-gray-900">
                                      {request.requester.contactPerson || 'No registrado'}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {request.requester.type === 'empresa' && (
                                <div className="flex items-start gap-2">
                                  <Hash className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs text-gray-600">NIT</p>
                                    <p className="font-semibold text-gray-900">
                                      {request.requester.companyNit || 'No informado'}
                                    </p>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-start gap-2">
                                <Mail className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Email</p>
                                  <p className="font-semibold text-gray-900">{request.requester.email}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Tipo</p>
                                {getRequesterTypeBadge(request.requester.type)}
                              </div>
                              <div className="flex items-start gap-2">
                                <Calendar className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Fecha de Solicitud</p>
                                  <p className="font-semibold text-gray-900">
                                    {request.createdAt
                                      ? new Date(request.createdAt).toLocaleDateString('es-CO', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric',
                                        })
                                      : 'Sin fecha'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Botones de Acción Rápida */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">
                            Acciones Rápidas
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {request.status === 'pending' && (
                              <button
                                onClick={() => handleStartReview(request)}
                                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                                style={{
                                  background: '#F57C00',
                                  color: '#FFFFFF'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#E65100';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#F57C00';
                                }}
                              >
                                <Eye className="w-4 h-4" />
                                Revisar Solicitud
                              </button>
                            )}
                            <button
                              onClick={() => handleCopyToClipboard(request.graduateDocumentNumber, 'Cédula')}
                              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                              style={{
                                background: '#E0EDFF',
                                color: '#003DA5'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#C5DDFF';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#E0EDFF';
                              }}
                            >
                              <Copy className="w-4 h-4" />
                              Copiar Cédula
                            </button>
                            <button
                              onClick={() => handleCopyToClipboard(request.requestNumber, 'Número de solicitud')}
                              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                              style={{
                                background: '#E0EDFF',
                                color: '#003DA5'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#C5DDFF';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#E0EDFF';
                              }}
                            >
                              <Copy className="w-4 h-4" />
                              Copiar Número de Solicitud
                            </button>
                          </div>
                        </div>

                        {/* Detalles de Revisión */}
                        {request.reviewedAt && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-gray-700" />
                              Detalles de Revisión
                            </h4>
                            <div className="space-y-2 text-sm">
                              {request.reviewerName && (
                                <div>
                                  <span className="text-gray-600">Revisado por:</span>
                                  <span className="ml-2 font-semibold text-gray-900">{request.reviewerName}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-600">Fecha:</span>
                                <span className="ml-2 font-semibold text-gray-900">{formatDate(request.reviewedAt)}</span>
                              </div>
                              {request.resolution && (
                                <div className="mt-2">
                                  {getResolutionBadge(request.resolution)}
                                </div>
                              )}
                              {request.reviewNotes && (
                                <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                                  <p className="text-xs text-gray-700">{request.reviewNotes}</p>
                                </div>
                              )}
                              {request.certificateGenerated && request.certificateId && (
                                <div className="mt-2 p-2 bg-green-100 rounded border border-green-300 flex items-center gap-2">
                                  <Award className="w-4 h-4 text-green-700" />
                                  <span className="text-xs text-green-800 font-semibold">
                                    Certificado generado: {request.certificateId}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Timeline */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-700" />
                            Línea de Tiempo
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">Solicitud creada</span>
                              <span className="font-semibold text-gray-900">
                                {formatDate(request.createdAt)}
                              </span>
                            </div>
                            {request.reviewedAt && (
                              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                                <span className="text-gray-600">Revisión completada</span>
                                <span className="font-semibold text-gray-900">
                                  {formatDate(request.reviewedAt)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </>
        )}
      </motion.div>

      {/* Paginación */}
      {paginatedRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <PaginationPremium
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={itemsPerPage}
          />
        </motion.div>
      )}

      {/* Modal: Revisar Solicitud */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent
          className="review-approval-dialog w-[92vw] max-w-4xl !p-0 !top-1/2 !-translate-y-1/2 !max-h-[calc(100vh-1.25rem)] !overflow-hidden !flex !flex-col"
        >
          <DialogHeader className="px-6 pt-3 pb-1">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              {reviewActionLabel} Solicitud
            </DialogTitle>
            <DialogDescription>
              Confirma los detalles antes de {reviewActionLabel.toLowerCase()} la solicitud
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-1 pb-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 mt-0.5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    {selectedRequest?.requestNumber}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Cédula buscada:</strong> {selectedRequest?.graduateDocumentNumber}
                  </p>
                  {selectedRequest?.requester.type === 'empresa' ? (
                    <>
                      <p className="text-sm text-gray-600">
                        <strong>Empresa:</strong>{' '}
                        {selectedRequest?.requester.companyName || selectedRequest?.requester.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Persona que solicita:</strong>{' '}
                        {selectedRequest?.requester.contactPerson || 'No registrado'}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">
                      <strong>Solicitante:</strong> {selectedRequest?.requester.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Notas de Revisión<span className="text-red-500"> *</span>
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Describe los hallazgos de la revisión..."
                className="review-approval-input w-full p-3 border-2 border-gray-300 rounded-lg text-sm resize-none focus:border-[#003DA5]"
                style={{ minHeight: '120px' }}
              />
            </div>

            {reviewAction === 'approve' && (
              <div className="review-approval-card space-y-3 rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Datos del graduado</p>
                  <span className="text-xs text-gray-500">Acta y diploma se generan automaticamente</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Nombre completo<span className="text-red-500"> *</span>
                    </label>
                    <input
                      value={approvalForm.fullName}
                      onChange={(e) => setApprovalForm({ ...approvalForm, fullName: e.target.value })}
                      className="review-approval-input w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                      placeholder="Nombre completo"
                      disabled={isLoadingApprovalData}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Documento<span className="text-red-500"> *</span>
                    </label>
                    <input
                      value={approvalForm.idNumber || selectedRequest?.graduateDocumentNumber || ''}
                      onChange={(e) => setApprovalForm({ ...approvalForm, idNumber: e.target.value })}
                      className="review-approval-input w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                      disabled
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Email<span className="text-red-500"> *</span>
                    </label>
                    <input
                      type="email"
                      value={approvalForm.email}
                      onChange={(e) => setApprovalForm({ ...approvalForm, email: e.target.value })}
                      className="review-approval-input w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                      placeholder="correo@ejemplo.com"
                      disabled={isLoadingApprovalData}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Numero de registro<span className="text-red-500"> *</span>
                    </label>
                    <input
                      type="text"
                      value={approvalForm.numRegistro}
                      onChange={(e) =>
                        setApprovalForm({
                          ...approvalForm,
                          numRegistro: e.target.value.replace(/\D+/g, ''),
                        })
                      }
                      className="review-approval-input w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                      placeholder="Registro"
                      disabled={isLoadingApprovalData}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Numero de folio<span className="text-red-500"> *</span>
                    </label>
                    <input
                      type="text"
                      value={approvalForm.numFolio}
                      onChange={(e) =>
                        setApprovalForm({
                          ...approvalForm,
                          numFolio: e.target.value.replace(/\D+/g, ''),
                        })
                      }
                      className="review-approval-input w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                      placeholder="Folio"
                      disabled={isLoadingApprovalData}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Numero de libro<span className="text-red-500"> *</span>
                    </label>
                    <input
                      type="text"
                      value={approvalForm.numLibro}
                      onChange={(e) =>
                        setApprovalForm({
                          ...approvalForm,
                          numLibro: e.target.value.replace(/\D+/g, ''),
                        })
                      }
                      className="review-approval-input w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                      placeholder="Libro"
                      disabled={isLoadingApprovalData}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Programa<span className="text-red-500"> *</span>
                    </label>
                    <select
                      value={approvalForm.programName}
                      onChange={(e) => setApprovalForm({ ...approvalForm, programName: e.target.value })}
                      className="review-approval-input w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                      disabled={isLoadingApprovalData}
                    >
                      <option value="">Seleccionar programa</option>
                      {programNameOptions.map((programa) => (
                        <option key={programa} value={programa}>
                          {programa}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Fecha de graduacion<span className="text-red-500"> *</span>
                    </label>
                    <input
                      type="date"
                      value={approvalForm.graduationDate}
                      onChange={(e) => setApprovalForm({ ...approvalForm, graduationDate: e.target.value })}
                      className="review-approval-input w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                      disabled={isLoadingApprovalData}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Sede<span className="text-red-500"> *</span>
                    </label>
                    <select
                      value={approvalForm.campus}
                      onChange={(e) => {
                        const nextCampus = e.target.value;
                        const mappedSeccional = nextCampus
                          ? seccionalBySede[normalizeKey(nextCampus)] || ''
                          : '';

                        setApprovalForm((prev) => ({
                          ...prev,
                          campus: nextCampus,
                          seccionalName: nextCampus
                            ? mappedSeccional || ''
                            : '',
                        }));
                      }}
                      className="review-approval-input w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                      disabled={isLoadingApprovalData}
                    >
                      <option value="">Seleccionar sede</option>
                      {campusOptions.map((sede) => (
                        <option key={sede} value={sede}>
                          {sede}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Territorial<span className="text-red-500"> *</span>
                    </label>
                    <select
                      value={approvalForm.seccionalName}
                      onChange={(e) =>
                        setApprovalForm({ ...approvalForm, seccionalName: e.target.value })
                      }
                      className="review-approval-input w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                      disabled={isLoadingApprovalData}
                    >
                      <option value="">Seleccionar seccional</option>
                      {seccionalSelectOptions.map((seccional) => (
                        <option key={seccional} value={seccional}>
                          {seccional}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2 border-t border-dashed border-gray-200 pt-3">
                  <div className="review-approval-file-header flex flex-wrap items-center justify-between gap-3">
                    <div className="review-approval-file-picker flex items-center gap-2">
                      <input
                        id="approval-files-input"
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                        onChange={handleApprovalFilesChange}
                        className="sr-only"
                        disabled={isLoadingApprovalData || approvalFiles.length >= MAX_APPROVAL_FILES}
                      />
                      <label
                        htmlFor="approval-files-input"
                        className={`inline-flex items-center rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                          isLoadingApprovalData || approvalFiles.length >= MAX_APPROVAL_FILES
                            ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                            : 'cursor-pointer border-[#003DA5] bg-[#EFF6FF] text-[#003DA5] hover:bg-[#DBEAFE]'
                        }`}
                        aria-disabled={isLoadingApprovalData || approvalFiles.length >= MAX_APPROVAL_FILES}
                      >
                        Elegir archivos
                      </label>
                    </div>
                    <label className="text-xs font-medium text-gray-700">
                      {`Archivos del título (opcional, máx. ${MAX_APPROVAL_FILES}, ${MAX_APPROVAL_FILE_SIZE_LABEL} por archivo)`}
                    </label>
                  </div>
                  {approvalFiles.length > 0 ? (
                    <>
                      <p className="text-xs text-gray-600">
                        Archivos seleccionados: <span className="font-semibold">{approvalFiles.length}</span>
                      </p>
                      <div className="review-approval-files flex flex-wrap gap-2">
                        {approvalFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className={`review-approval-chip flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${getApprovalFileChipClass(file)}`}
                          >
                            <span className="review-approval-chip__name">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveApprovalFile(index)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500">
                      {`Adjunta documentos PDF, Word, Excel o imágenes (máx. ${MAX_APPROVAL_FILE_SIZE_LABEL} por archivo).`}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600" />
                <div className="text-xs text-amber-800">
                  <p className="font-semibold mb-1">Al completar la revisión:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Se notificará al solicitante</li>
                    <li>El estado cambiará según la resolución</li>
                    <li>Esta acción quedará registrada en auditoría</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 pb-10 pt-4">
            <button
              onClick={() => {
                setShowReviewModal(false);
                setApprovalFiles([]);
                resetApprovalUploadProgress();
              }}
              className="review-approval-btn review-approval-btn--ghost px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmitReview}
              className="review-approval-btn review-approval-btn--primary px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
              disabled={isLoadingApprovalData}
            >
              <CheckCircle className="w-4 h-4" />
              Continuar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar Cambio de Estado */}
      <Dialog
        open={showConfirmModal}
        onOpenChange={(open) => {
          if (!open && isUpdating) {
            return;
          }
          setShowConfirmModal(open);
          if (!open) {
            setConfirmAction(null);
          }
        }}
      >
        <DialogContent
          className="w-[92vw] max-w-lg"
          onEscapeKeyDown={(event) => {
            if (isUpdating) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(event) => {
            if (isUpdating) {
              event.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Confirmar Acción
            </DialogTitle>
            <DialogDescription>
              Verifica que deseas continuar con esta acción.
            </DialogDescription>
          </DialogHeader>

          {confirmAction && (
            <div className="py-4 space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
                <p className="font-semibold text-gray-900 mb-1">{confirmActionLabel}</p>
                <p>
                  Solicitud: <strong>{confirmAction.request.requestNumber}</strong>
                </p>
                <p>
                  Cédula: <strong>{confirmAction.request.graduateDocumentNumber}</strong>
                </p>
                {confirmAction.notes && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">Notas:</p>
                    <p className="text-xs text-gray-700 bg-white border border-gray-200 rounded p-2">
                      {confirmAction.notes}
                    </p>
                  </div>
                )}
              </div>
              {confirmAction.type === 'approve' && isUpdating && approvalUploadProgress.totalFiles > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-blue-700">
                    <span>Subiendo archivos adjuntos del graduado...</span>
                    <span>
                      {approvalUploadProgress.processedFiles}/{approvalUploadProgress.totalFiles}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${Math.max(0, Math.min(100, approvalUploadProgress.overallPercent))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-blue-700">
                    <span className="truncate pr-3">
                      {approvalUploadProgress.currentFileName || 'Preparando archivo...'}
                    </span>
                    <span>{Math.round(approvalUploadProgress.currentFilePercent)}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <button
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
              disabled={isUpdating}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmAction}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
              disabled={isUpdating}
            >
              <CheckCircle className="w-4 h-4" />
              {isUpdating ? 'Procesando...' : 'Confirmar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

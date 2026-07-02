/**
 * MÓDULO: SOLICITUDES DE REVISIÓN
 * - Gestión de solicitudes de verificación de graduados no encontrados
 * - Formato de TABLA con columnas igual a Casos Pendientes
 */

import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from 'react';
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
  RefreshCw, 
  MessageSquare,
  Award, 
  X,
  MoreVertical,
  Copy,
  Shield,
  ClipboardCheck,
  UploadCloud,
  Paperclip,
  Trash2,
  FileCheck2,
  Download,
  BarChart3
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

const ESTRUCTURA_PERIOD_STORAGE_KEY = 'esap.periodo.estructura-organizacional';
const CATALOG_PERIOD_CHANGE_EVENT = 'esap:academic-catalog-period-changed';

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

type ReviewSupportPreview = {
  url: string;
  name: string;
  fileType: 'pdf' | 'image' | 'other';
};

type ReviewRequestsScope = 'all' | 'mine';
type MyReviewView = 'pending' | 'reviewed';

interface ReviewRequestsModuleProps {
  scope?: ReviewRequestsScope;
}

export function ReviewRequestsModule({
  scope = 'all',
}: ReviewRequestsModuleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [myReviewView, setMyReviewView] = useState<MyReviewView>('pending');
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
  const [existingGraduatePrograms, setExistingGraduatePrograms] = useState<string[]>([]);
  // Programas que llegan por integración (graduados creados por ese medio en
  // Verificación de títulos). Son la fuente del select de programa de este modal.
  const [integrationProgramOptions, setIntegrationProgramOptions] = useState<string[]>([]);
  const [isLoadingIntegrationPrograms, setIsLoadingIntegrationPrograms] = useState(true);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true);
  const [catalogRefreshToken, setCatalogRefreshToken] = useState(0);
  const [approvalFiles, setApprovalFiles] = useState<File[]>([]);
  const [isApprovalFileDragActive, setIsApprovalFileDragActive] = useState(false);
  const [existingApprovalFiles, setExistingApprovalFiles] = useState<
    NonNullable<ReviewRequest['reviewFiles']>
  >([]);
  const [approvalUploadProgress, setApprovalUploadProgress] = useState({
    totalFiles: 0,
    processedFiles: 0,
    currentFileName: '',
    currentFilePercent: 0,
    overallPercent: 0,
  });
  const [reviewSupportPreview, setReviewSupportPreview] =
    useState<ReviewSupportPreview | null>(null);
  const [seccionalesOptions, setSeccionalesOptions] = useState<string[]>([]);
  const [seccionalBySede, setSeccionalBySede] = useState<Record<string, string>>({});
  const [sedesBySeccional, setSedesBySeccional] = useState<Record<string, string[]>>({});
  const [structureCatalogNotice, setStructureCatalogNotice] = useState('');
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
  const resolveReviewerEmail = (user: any): string | undefined => {
    const email = typeof user?.email === 'string' ? user.email.trim() : '';
    if (email) return email;
    const personEmail = typeof user?.person?.email === 'string' ? user.person.email.trim() : '';
    return personEmail || undefined;
  };
  const normalizeIdentityValue = (value?: string | null) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  const reviewerName = resolveReviewerName(currentUser);
  const reviewerId = resolveReviewerId(currentUser);
  const reviewerEmail = resolveReviewerEmail(currentUser);
  const currentReviewerIdentity = useMemo(
    () => ({
      ids: new Set(
        [reviewerId].map(normalizeIdentityValue).filter(Boolean),
      ),
      emails: new Set(
        [reviewerEmail].map(normalizeIdentityValue).filter(Boolean),
      ),
      names: new Set(
        [reviewerName].map(normalizeIdentityValue).filter(Boolean),
      ),
    }),
    [reviewerEmail, reviewerId, reviewerName],
  );
  const canManageApprovalConcepts = authService.hasPermission(
    Permissions.GRADUATES_SOLICITUDE_APROBAR,
  );
  const canWorkReviewRequests = authService.hasPermission(
    Permissions.GRADUATES_SOLICITUDE_REVIEW,
  );
  const isReviewWorkLocked = (request: ReviewRequest) =>
    [
      'PENDING_APPROVAL',
      'PENDING_HEAD_APPROVAL',
      'APPROVED_FINAL',
      'REJECTED_FINAL',
    ].includes(request.approvalStatus || '');
  const canEditReviewWork = (request: ReviewRequest) =>
    canWorkReviewRequests &&
    request.status === 'under_review' &&
    !isReviewWorkLocked(request) &&
    (request.approvalStatus !== 'HEAD_OBSERVATION' ||
      canManageApprovalConcepts);
  const isMyReviewsScope = scope === 'mine';
  const MAX_APPROVAL_FILES = 5;
  const MAX_APPROVAL_FILE_SIZE_BYTES = 10 * 1024 * 1024;
  const MAX_APPROVAL_FILE_SIZE_LABEL = '10 MB';
  const REVIEW_NOTES_MIN_LENGTH = 10;
  const REVIEW_NOTES_MAX_LENGTH = 4000;
  const PERSON_NAME_MIN_LENGTH = 5;
  const PERSON_NAME_MAX_LENGTH = 150;
  const DOCUMENT_MIN_LENGTH = 5;
  const DOCUMENT_MAX_LENGTH = 20;
  const EMAIL_MIN_LENGTH = 5;
  const EMAIL_MAX_LENGTH = 254;
  const REGISTRY_NUMBER_MAX_LENGTH = 20;
  const FOLIO_BOOK_MAX_LENGTH = 10;
  const MIN_GRADUATION_YEAR = 1900;
  const MANUAL_REVIEW_EXPIRATION_BUSINESS_DAYS = 15;
  const PERSON_NAME_ALLOWED_REGEX = /^[\p{L}\s'’-]+$/u;
  const DOCUMENT_ALLOWED_REGEX = /^[A-Za-z0-9]+$/;

  const normalizeKey = (value?: string) =>
    (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  const hasCatalogKey = <T,>(catalog: Record<string, T>, key: string) =>
    Object.prototype.hasOwnProperty.call(catalog, key);

  const normalizeComparableProgram = (value?: string | null) =>
    (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const programAlreadyExistsForGraduate = (programName: string) => {
    const normalizedProgramName = normalizeComparableProgram(programName);
    if (!normalizedProgramName) {
      return false;
    }

    return existingGraduatePrograms.some(
      (program) => normalizeComparableProgram(program) === normalizedProgramName,
    );
  };

  const normalizeName = (value?: string) => {
    const normalized = (value || '').trim().replace(/\s+/g, ' ');
    return normalized || '';
  };

  const normalizeOptionKey = (value?: string | null) =>
    normalizeKey(value || '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const uniqueSortedNames = (values: Array<string | undefined | null>) => {
    const byKey = new Map<string, string>();

    values.forEach((value) => {
      const cleaned = normalizeName(value || '');
      const key = normalizeOptionKey(cleaned);
      if (!key || byKey.has(key)) return;
      byKey.set(key, cleaned);
    });

    return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, 'es'));
  };

  const isUnavailableCatalogValue = (value?: string | null) => {
    const normalized = normalizeKey(value || '');
    return (
      !normalized ||
      normalized === 'no disponible' ||
      normalized === 'no especificado' ||
      normalized === 'sin programa'
    );
  };

  // Un graduado proviene de integracion cuando no fue creado manualmente ni
  // por carga masiva ni por una solicitud de revision. El texto exacto del
  // origen puede cambiar entre local, API y vistas de servidores.
  const isIntegrationSource = (createdBy?: string | null) => {
    const normalized = normalizeKey(createdBy || '');
    if (
      normalized.startsWith('bulk_upload') ||
      normalized.includes('manual_review') ||
      normalized.includes('revision') ||
      normalized.includes('manual')
    ) {
      return false;
    }
    return true;
  };

  const normalizeSpaces = (value: string) => value.trim().replace(/\s+/g, ' ');

  const sanitizeDigits = (value: string, maxLength: number) =>
    value.replace(/\D+/g, '').slice(0, maxLength);

  const sanitizeAlphanumeric = (value: string, maxLength: number) =>
    value.replace(/[^A-Za-z0-9]+/g, '').slice(0, maxLength);

  const sanitizePersonName = (value: string) =>
    value.normalize('NFC').slice(0, PERSON_NAME_MAX_LENGTH);

  const getPersonNameValidationError = (value: string, fieldLabel: string) => {
    const normalized = normalizeSpaces(value);

    if (!normalized) {
      return `${fieldLabel} es obligatorio`;
    }

    if (normalized.length < PERSON_NAME_MIN_LENGTH) {
      return `${fieldLabel} debe tener al menos ${PERSON_NAME_MIN_LENGTH} caracteres`;
    }

    if (normalized.length > PERSON_NAME_MAX_LENGTH) {
      return `${fieldLabel} no puede superar ${PERSON_NAME_MAX_LENGTH} caracteres`;
    }

    if (/\d/.test(normalized)) {
      return `${fieldLabel} no debe contener números`;
    }

    if (!PERSON_NAME_ALLOWED_REGEX.test(normalized)) {
      return `${fieldLabel} solo debe contener letras, espacios, apóstrofes o guiones`;
    }

    return null;
  };

  const getArrayFromUnknown = <T,>(source: unknown): T[] => {
    if (Array.isArray(source)) return source as T[];
    if (source && typeof source === 'object' && Array.isArray((source as { data?: unknown }).data)) {
      return (source as { data?: T[] }).data || [];
    }
    return [];
  };

  const parseEstructuraCatalog = (source: unknown): { sedes: Sede[]; seccionales: Seccional[] } => {
    let current: unknown = source;

    for (let depth = 0; depth < 5; depth += 1) {
      if (!current || typeof current !== 'object') break;
      const root = current as {
        sedes?: unknown;
        seccionales?: unknown;
        data?: unknown;
      };
      const sedes = getArrayFromUnknown<Sede>(root.sedes);
      const seccionales = getArrayFromUnknown<Seccional>(root.seccionales);

      if (sedes.length > 0 || seccionales.length > 0) {
        return { sedes, seccionales };
      }
      current = root.data;
    }

    return { sedes: [], seccionales: [] };
  };

  // Funciones auxiliares
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock },
      under_review: { label: 'En Revisión', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: RefreshCw },
      approved: { label: 'Aprobada', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
      rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
      expired: { label: 'Expirada', color: 'bg-gray-100 text-gray-800 border-gray-300', icon: AlertCircle }
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
      duplicate_request: { label: 'Solicitud Duplicada', color: 'bg-gray-50 text-gray-700 border-gray-200' },
      expired: { label: 'Vencida por tiempo', color: 'bg-gray-50 text-gray-700 border-gray-200' }
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

  const getManualReviewExpirationDate = (createdAt?: string | null) => {
    const start = parseDateSafe(createdAt);
    if (!start) return null;

    const deadline = new Date(start.getTime());
    let addedBusinessDays = 0;

    while (addedBusinessDays < MANUAL_REVIEW_EXPIRATION_BUSINESS_DAYS) {
      deadline.setDate(deadline.getDate() + 1);
      if (isBusinessDay(deadline)) {
        addedBusinessDays += 1;
      }
    }

    deadline.setHours(23, 59, 59, 999);
    return deadline;
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

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  const parseDateInputAsLocal = (value: string) => {
    const [yearRaw, monthRaw, dayRaw] = value.split('-');
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);

    if (!year || !month || !day) {
      return null;
    }

    const parsed = new Date(year, month - 1, day, 12, 0, 0);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }

    return parsed;
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

  const getRequesterSupportFileType = (
    file: NonNullable<ReviewRequest['requesterSupportFile']>,
  ): ReviewSupportPreview['fileType'] => {
    const name = (file.originalName || '').toLowerCase();
    const mimeType = (file.mimeType || '').toLowerCase();
    if (name.endsWith('.pdf') || mimeType.includes('pdf')) return 'pdf';
    if (mimeType.startsWith('image/')) return 'image';
    return 'other';
  };

  const handleDownloadRequesterSupportFile = async (
    request: ReviewRequest,
    file: NonNullable<ReviewRequest['requesterSupportFile']>,
  ) => {
    try {
      const blob = await graduadosService.solicitudes.descargarSoporteSolicitante(request.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.originalName || 'soporte-solicitud.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error('No se pudo descargar el soporte', {
        description: error?.response?.data?.message || error?.message,
      });
    }
  };

  const handlePreviewRequesterSupportFile = async (
    request: ReviewRequest,
    file: NonNullable<ReviewRequest['requesterSupportFile']>,
  ) => {
    const fileType = getRequesterSupportFileType(file);
    if (fileType === 'other') {
      toast.info('Este archivo no tiene vista previa disponible', {
        description: 'Puedes descargarlo para abrirlo en tu equipo.',
      });
      return;
    }

    try {
      const blob = await graduadosService.solicitudes.descargarSoporteSolicitante(request.id);
      const url = URL.createObjectURL(blob);
      setReviewSupportPreview({
        url,
        name: file.originalName || 'Soporte de solicitud',
        fileType,
      });
    } catch (error: any) {
      toast.error('No se pudo visualizar el soporte', {
        description: error?.response?.data?.message || error?.message,
      });
    }
  };

  useEffect(() => {
    return () => {
      if (reviewSupportPreview?.url) {
        URL.revokeObjectURL(reviewSupportPreview.url);
      }
    };
  }, [reviewSupportPreview?.url]);

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
  const getApprovalFileExtension = (fileName: string) => {
    const normalizedName = fileName.toLowerCase();
    return normalizedName.includes('.')
      ? normalizedName.slice(normalizedName.lastIndexOf('.') + 1)
      : 'file';
  };
  const getApprovalFileToneClass = (fileName: string) => {
    const ext = getApprovalFileExtension(fileName);
    if (ext === 'pdf') return 'border-red-100 bg-red-50 text-red-700';
    if (ext === 'doc' || ext === 'docx') return 'border-blue-100 bg-blue-50 text-blue-700';
    if (ext === 'xls' || ext === 'xlsx') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') {
      return 'border-slate-200 bg-slate-50 text-slate-700';
    }
    return 'border-gray-200 bg-gray-50 text-gray-700';
  };
  const getApprovalFileKey = (file: File) =>
    `${file.name.toLowerCase()}-${file.size}-${file.lastModified}`;
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
  const addApprovalFiles = (files: File[] | FileList) => {
    const selected = Array.from(files);
    if (!selected.length || isLoadingApprovalData) {
      return;
    }

    const selectedKeys = new Set(approvalFiles.map(getApprovalFileKey));
    const uniqueFiles = selected.filter((file) => {
      const key = getApprovalFileKey(file);
      if (selectedKeys.has(key)) {
        return false;
      }
      selectedKeys.add(key);
      return true;
    });

    if (uniqueFiles.length !== selected.length) {
      toast.info('Se omitieron archivos duplicados');
    }

    if (!uniqueFiles.length) {
      return;
    }

    const currentTotal = existingApprovalFiles.length + approvalFiles.length;
    const availableSlots = MAX_APPROVAL_FILES - currentTotal;
    if (availableSlots <= 0) {
      toast.error(`Ya alcanzaste el máximo de ${MAX_APPROVAL_FILES} archivos`);
      return;
    }

    if (uniqueFiles.length > availableSlots) {
      toast.error(`Solo puedes adjuntar ${availableSlots} archivo(s) más`, {
        description: `La solicitud admite máximo ${MAX_APPROVAL_FILES} archivos en total.`,
      });
      return;
    }

    const invalidFile = uniqueFiles.find((file) => !isAllowedFile(file));
    if (invalidFile) {
      toast.error('Solo se permiten archivos PDF, Word, Excel o imágenes', {
        description: invalidFile.name,
      });
      return;
    }

    const oversizedFile = uniqueFiles.find((file) => file.size > MAX_APPROVAL_FILE_SIZE_BYTES);
    if (oversizedFile) {
      toast.error('El archivo es muy pesado', {
        description: `El archivo "${oversizedFile.name}" supera el límite de ${MAX_APPROVAL_FILE_SIZE_LABEL} por archivo.`,
      });
      return;
    }

    setApprovalFiles((prev) => [...prev, ...uniqueFiles]);
  };
  const handleApprovalFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) {
      return;
    }
    const nextFiles = [...approvalFiles, ...selected];
    const currentPersistedFiles = existingApprovalFiles.length;
    if (currentPersistedFiles + nextFiles.length > MAX_APPROVAL_FILES) {
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
  const handleApprovalFilesInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    addApprovalFiles(event.target.files || []);
    event.target.value = '';
  };
  const handleApprovalFilesDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (!isLoadingApprovalData && existingApprovalFiles.length + approvalFiles.length < MAX_APPROVAL_FILES) {
      setIsApprovalFileDragActive(true);
    }
  };
  const handleApprovalFilesDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsApprovalFileDragActive(false);
  };
  const handleApprovalFilesDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsApprovalFileDragActive(false);
    if (isLoadingApprovalData || existingApprovalFiles.length + approvalFiles.length >= MAX_APPROVAL_FILES) {
      return;
    }
    addApprovalFiles(event.dataTransfer.files);
  };
  const handleRemoveApprovalFile = (index: number) => {
    setApprovalFiles((prev) => prev.filter((_, idx) => idx !== index));
  };
  const handleRemoveExistingApprovalFile = async (fileId: string) => {
    if (!selectedRequest) {
      return;
    }

    try {
      await graduadosService.solicitudes.eliminarArchivoRevision(
        selectedRequest.id,
        fileId,
      );
      setExistingApprovalFiles((prev) =>
        prev.filter((file) => file.id !== fileId),
      );
      toast.success('Archivo retirado de la solicitud');
    } catch (error: any) {
      toast.error('No se pudo retirar el archivo', {
        description: error?.response?.data?.message || error?.message,
      });
    }
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
      case 'EXPIRED':
        return 'expired';
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
      approvalStatus: request.approvalStatus,
      reviewRecommendation: request.reviewRecommendation,
      reviewRecommendationReason: request.reviewRecommendationReason,
      reviewPayload: request.reviewPayload,
      reviewSubmittedAt: request.reviewSubmittedAt,
      reviewSubmittedBy: request.reviewSubmittedBy,
      reviewSubmittedByName: request.reviewSubmittedByName,
      approverDecision: request.approverDecision,
      approverNotes: request.approverNotes,
      approvedAt: request.approvedAt,
      approverName: request.approverName,
      headDecision: request.headDecision,
      headNotes: request.headNotes,
      headReviewedAt: request.headReviewedAt,
      headReviewerName: request.headReviewerName,
      reviewTimeline: request.reviewTimeline || [],
      reviewFiles: request.reviewFiles || [],
      requesterSupportFile: request.requesterSupportFile || null,
      updatedAt: request.updatedAt,
    };
  };

  const calculateStats = (items: ReviewRequest[]): ReviewRequestStats => {
    const totals = {
      total: items.length,
      pending: 0,
      underReview: 0,
      approved: 0,
      rejected: 0,
      expired: 0,
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
        case 'expired':
          totals.expired = (totals.expired || 0) + 1;
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

  // Carga los programas que traen los graduados integrados desde Registro
  // Académico, sin repetidos, para ofrecerlos en el select de programa.
  useEffect(() => {
    let isMounted = true;

    const loadIntegrationPrograms = async () => {
      setIsLoadingIntegrationPrograms(true);
      try {
        const graduados =
          await graduadosService.graduados.listarRegistroAcademico();
        if (!isMounted) return;

        const programas = (graduados || [])
          .filter((graduado) => isIntegrationSource(graduado?.createdBy))
          .flatMap((graduado) => [
            normalizeName(graduado?.programName),
            normalizeName(graduado?.degreeTitle),
          ])
          .filter((programa) => !!programa && !isUnavailableCatalogValue(programa));

        const unicos = Array.from(
          new Map(
            programas.map((programa) => [normalizeKey(programa), programa]),
          ).values(),
        ).sort((a, b) => a.localeCompare(b, 'es'));

        setIntegrationProgramOptions(unicos);
      } catch (error) {
        console.warn(
          'No se pudieron cargar los programas de los graduados integrados:',
          error,
        );
        if (isMounted) setIntegrationProgramOptions([]);
      } finally {
        if (isMounted) setIsLoadingIntegrationPrograms(false);
      }
    };

    loadIntegrationPrograms();

    return () => {
      isMounted = false;
    };
  }, [catalogRefreshToken]);

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
      setIsLoadingCatalogs(true);
      setStructureCatalogNotice('');
      try {
        const estructuraResponse = await estructuraService.obtenerEstructura().catch(() => null);

        if (!isMounted) return;

        const { sedes: sedesMaestras, seccionales: seccionalesMaestras } =
          parseEstructuraCatalog(estructuraResponse);

        const sedes = sedesMaestras;
        const seccionales = seccionalesMaestras;

        const seccionalesList = seccionales
          .map((seccional) => normalizeName(seccional?.nomSeccional))
          .filter(Boolean);

        const seccionalNameById = new Map<number, string>();
        seccionales.forEach((seccional) => {
          if (!seccional?.idSeccional) return;
          const name = normalizeName(seccional.nomSeccional);
          if (name) {
            seccionalNameById.set(Number(seccional.idSeccional), name);
          }
        });

        const territorialMap: Record<string, string> = {};
        const sedesBySeccionalMap: Record<string, string[]> = {};
        seccionales.forEach((seccional) => {
          const seccionalName = normalizeName(seccional?.nomSeccional);
          if (seccionalName) {
            sedesBySeccionalMap[normalizeKey(seccionalName)] = [];
          }
        });

        sedes.forEach((sede) => {
          const sedeName = normalizeName(sede?.nomSede);
          if (!sedeName) return;
          const seccionalName =
            normalizeName(sede?.seccional?.nomSeccional) ||
            (sede?.idSeccional
              ? seccionalNameById.get(Number(sede.idSeccional)) || ''
              : '');
          if (seccionalName) {
            territorialMap[normalizeKey(sedeName)] = seccionalName;
            const seccionalKey = normalizeKey(seccionalName);
            if (!sedesBySeccionalMap[seccionalKey]) {
              sedesBySeccionalMap[seccionalKey] = [];
            }
            sedesBySeccionalMap[seccionalKey].push(sedeName);
          }
        });

        const sedesBySeccionalCatalog: Record<string, string[]> = {};
        Object.entries(sedesBySeccionalMap).forEach(([seccionalKey, sedes]) => {
          sedesBySeccionalCatalog[seccionalKey] = sedes;
        });

        if (!isMounted) return;

        setSeccionalesOptions(seccionalesList);
        setSeccionalBySede(territorialMap);
        setSedesBySeccional(sedesBySeccionalCatalog);

      } catch (error) {
        console.error('Error cargando catálogos de aprobación:', error);
        if (isMounted) {
          setStructureCatalogNotice(
            'No se pudo actualizar el catálogo de Estructura Organizacional. Se conserva el último catálogo cargado; intenta nuevamente.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingCatalogs(false);
        }
      }
    };

    loadCatalogs();

    return () => {
      isMounted = false;
    };
  }, [catalogRefreshToken]);

  useEffect(() => {
    const refreshCatalogs = () => {
      setCatalogRefreshToken((current) => current + 1);
    };
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === ESTRUCTURA_PERIOD_STORAGE_KEY) {
        refreshCatalogs();
      }
    };

    window.addEventListener(CATALOG_PERIOD_CHANGE_EVENT, refreshCatalogs);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(CATALOG_PERIOD_CHANGE_EVENT, refreshCatalogs);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const programNameOptions = useMemo(
    () => {
      const currentProgram = isUnavailableCatalogValue(approvalForm.programName)
        ? ''
        : normalizeName(approvalForm.programName);

      return uniqueSortedNames([currentProgram, ...integrationProgramOptions]);
    },
    [approvalForm.programName, integrationProgramOptions],
  );
  const selectedProgramAlreadyExists = useMemo(
    () => programAlreadyExistsForGraduate(approvalForm.programName),
    [approvalForm.programName, existingGraduatePrograms],
  );
  const duplicateProgramMessage =
    'Este programa ya existe para el documento consultado. Selecciona un programa diferente para cargar la revisión.';

  const campusOptions = useMemo(() => {
    const selectedSeccionalKey = normalizeKey(approvalForm.seccionalName);
    const hasSelectedSeccionalCatalog =
      !!selectedSeccionalKey && hasCatalogKey(sedesBySeccional, selectedSeccionalKey);
    const baseOptions = hasSelectedSeccionalCatalog
      ? sedesBySeccional[selectedSeccionalKey]
      : [];
    return [approvalForm.campus, ...baseOptions].map(normalizeName).filter(Boolean);
  }, [
    approvalForm.campus,
    approvalForm.seccionalName,
    sedesBySeccional,
  ]);

  const seccionalSelectOptions = useMemo(() => {
    const options = [...seccionalesOptions];
    const matchedSeccionalBySede = approvalForm.campus
      ? seccionalBySede[normalizeKey(approvalForm.campus)]
      : '';
    const currentOptions = [matchedSeccionalBySede, approvalForm.seccionalName]
      .map(normalizeName)
      .filter(Boolean);
    const ordered = [...currentOptions, ...options].filter(Boolean);
    return ordered;
  }, [approvalForm.campus, approvalForm.seccionalName, seccionalBySede, seccionalesOptions]);

  const approvalFileSlotsUsed = existingApprovalFiles.length + approvalFiles.length;
  const approvalFileSlotsRemaining = Math.max(0, MAX_APPROVAL_FILES - approvalFileSlotsUsed);
  const isApprovalFilePickerDisabled =
    isLoadingApprovalData || approvalFileSlotsRemaining <= 0;

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
    const reviewSubmittedAt =
      parseDateSafe(request.reviewSubmittedAt)?.getTime() ?? 0;
    const approvedAt = parseDateSafe(request.approvedAt)?.getTime() ?? 0;
    const headReviewedAt =
      parseDateSafe(request.headReviewedAt)?.getTime() ?? 0;
    const updatedAt = parseDateSafe(request.updatedAt)?.getTime() ?? 0;
    return Math.max(
      updatedAt,
      headReviewedAt,
      approvedAt,
      reviewSubmittedAt,
      reviewedAt,
      createdAt,
    );
  };

  const orderedRequests = useMemo(
    () =>
      [...requests].sort(
        (a, b) => getRequestSortTime(b) - getRequestSortTime(a),
      ),
    [requests],
  );

  const isReviewTimelineEvent = (
    event: NonNullable<ReviewRequest['reviewTimeline']>[number],
  ) =>
    event.type === 'review_started' ||
    event.type === 'review_decision_submitted' ||
    event.type === 'review_files_uploaded' ||
    event.type.startsWith('review_');

  const hasCurrentReviewerIdentity =
    currentReviewerIdentity.ids.size > 0 ||
    currentReviewerIdentity.emails.size > 0 ||
    currentReviewerIdentity.names.size > 0;

  const requestBelongsToCurrentReviewer = (request: ReviewRequest) => {
    if (!hasCurrentReviewerIdentity) {
      return false;
    }

    const reviewEvents = (request.reviewTimeline || []).filter(isReviewTimelineEvent);
    const matchesAny = (
      values: Array<string | null | undefined>,
      identitySet: Set<string>,
    ) =>
      values
        .map(normalizeIdentityValue)
        .filter(Boolean)
        .some((value) => identitySet.has(value));

    if (
      matchesAny(
        [
          request.reviewedBy,
          request.reviewSubmittedBy,
          ...reviewEvents.map((event) => event.actorId),
        ],
        currentReviewerIdentity.ids,
      )
    ) {
      return true;
    }

    if (
      matchesAny(
        reviewEvents.map((event) => event.actorEmail),
        currentReviewerIdentity.emails,
      )
    ) {
      return true;
    }

    return matchesAny(
      [
        request.reviewerName,
        request.reviewSubmittedByName,
        ...reviewEvents.map((event) => event.actorName),
      ],
      currentReviewerIdentity.names,
    );
  };

  const requestNeedsReviewerWork = (request: ReviewRequest) =>
    requestBelongsToCurrentReviewer(request) &&
    request.status === 'under_review' &&
    !isReviewWorkLocked(request) &&
    request.approvalStatus !== 'HEAD_OBSERVATION';

  const myRequests = useMemo(
    () => orderedRequests.filter(requestBelongsToCurrentReviewer),
    [orderedRequests, currentReviewerIdentity],
  );

  const myPendingRequests = useMemo(
    () => myRequests.filter(requestNeedsReviewerWork),
    [myRequests, currentReviewerIdentity],
  );

  const myReviewedRequests = useMemo(
    () => myRequests.filter((request) => !requestNeedsReviewerWork(request)),
    [myRequests, currentReviewerIdentity],
  );

  const scopedRequests = useMemo(
    () =>
      isMyReviewsScope
        ? myReviewView === 'pending'
          ? myPendingRequests
          : myReviewedRequests
        : orderedRequests,
    [
      isMyReviewsScope,
      myPendingRequests,
      myReviewView,
      myReviewedRequests,
      orderedRequests,
    ],
  );

  const displayStats = useMemo(
    () => (isMyReviewsScope ? calculateStats(myRequests) : stats),
    [isMyReviewsScope, myRequests, stats],
  );

  const myReturnedCount = useMemo(
    () =>
      myPendingRequests.filter(
        (request) => request.approvalStatus === 'OBSERVATION',
      ).length,
    [myPendingRequests],
  );

  const mySubmittedCount = useMemo(
    () =>
      myReviewedRequests.filter((request) =>
        [
          'PENDING_APPROVAL',
          'PENDING_HEAD_APPROVAL',
          'HEAD_OBSERVATION',
        ].includes(request.approvalStatus || ''),
      ).length,
    [myReviewedRequests],
  );

  const myClosedCount = useMemo(
    () =>
      myReviewedRequests.filter(
        (request) =>
          ['APPROVED_FINAL', 'REJECTED_FINAL'].includes(
            request.approvalStatus || '',
          ) ||
          request.status === 'approved' ||
          request.status === 'rejected',
      ).length,
    [myReviewedRequests],
  );

  // Filtros
  const filteredRequests = useMemo(
    () =>
      scopedRequests.filter((request) => {
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
    [scopedRequests, searchQuery, statusFilter],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [myReviewView, scope, searchQuery, statusFilter]);

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

  const getPayloadText = (
    payload: Record<string, unknown>,
    key: keyof ApprovalForm,
  ) => {
    const value = payload[key];
    return value === null || value === undefined ? '' : String(value).trim();
  };

  const mergeSavedReviewPayload = (
    baseForm: ApprovalForm,
    payload: Record<string, unknown>,
  ): ApprovalForm => {
    const savedProgram = getPayloadText(payload, 'programName');
    const baseProgram = isUnavailableCatalogValue(baseForm.programName)
      ? ''
      : baseForm.programName;

    return {
      fullName: getPayloadText(payload, 'fullName') || baseForm.fullName,
      idNumber:
        sanitizeAlphanumeric(
          getPayloadText(payload, 'idNumber') || baseForm.idNumber,
          DOCUMENT_MAX_LENGTH,
        ) || baseForm.idNumber,
      email: getPayloadText(payload, 'email') || baseForm.email,
      programName: isUnavailableCatalogValue(savedProgram)
        ? baseProgram
        : savedProgram,
      graduationDate:
        toDateInputValue(getPayloadText(payload, 'graduationDate')) ||
        baseForm.graduationDate,
      campus: getPayloadText(payload, 'campus') || baseForm.campus,
      seccionalName:
        getPayloadText(payload, 'seccionalName') || baseForm.seccionalName,
      numRegistro:
        sanitizeDigits(
          getPayloadText(payload, 'numRegistro') || baseForm.numRegistro,
          REGISTRY_NUMBER_MAX_LENGTH,
        ) || baseForm.numRegistro,
      numFolio:
        sanitizeDigits(
          getPayloadText(payload, 'numFolio') || baseForm.numFolio,
          FOLIO_BOOK_MAX_LENGTH,
        ) || baseForm.numFolio,
      numLibro:
        sanitizeDigits(
          getPayloadText(payload, 'numLibro') || baseForm.numLibro,
          FOLIO_BOOK_MAX_LENGTH,
        ) || baseForm.numLibro,
    };
  };

  const handleOpenReviewModal = async (
    request: ReviewRequest,
    action: 'approve' | 'reject'
  ) => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNotes(
      action === 'approve'
        ? request.reviewRecommendationReason || request.reviewNotes || ''
        : '',
    );
    setShowReviewModal(true);
    setApprovalFiles([]);
    setExistingApprovalFiles(action === 'approve' ? request.reviewFiles || [] : []);
    setExistingGraduatePrograms([]);
    resetApprovalUploadProgress();

    if (action !== 'approve') {
      return;
    }

    const initialForm: ApprovalForm = {
      fullName:
        (request.graduateLastName || '').trim() ||
        (request.requester.type === 'graduado' ? request.requester.name.trim() : ''),
      idNumber: sanitizeAlphanumeric(
        request.graduateDocumentNumber,
        DOCUMENT_MAX_LENGTH,
      ),
      email:
        (request.graduateEmail || '').trim() ||
        (request.requester.type === 'graduado' ? request.requester.email.trim() : ''),
      programName: '',
      graduationDate: toDateInputValue(request.graduationDate),
      campus: '',
      seccionalName: '',
      numRegistro: '',
      numFolio: '',
      numLibro: '',
    };
    const initialSavedPayload =
      request.reviewPayload && typeof request.reviewPayload === 'object'
        ? (request.reviewPayload as Record<string, unknown>)
        : {};
    setApprovalForm(mergeSavedReviewPayload(initialForm, initialSavedPayload));

    setIsLoadingApprovalData(true);
    try {
      const detail = await graduadosService.solicitudes.obtenerPorId(request.id);
      setExistingApprovalFiles(detail.reviewFiles || request.reviewFiles || []);
      const existingProgramsByKey = new Map<string, string>();
      const rememberExistingProgram = (programName?: string | null) => {
        const trimmedProgramName = (programName || '').trim();
        const normalizedProgramName = normalizeComparableProgram(trimmedProgramName);
        if (trimmedProgramName && normalizedProgramName) {
          existingProgramsByKey.set(normalizedProgramName, trimmedProgramName);
        }
      };
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

      try {
        const documentForExistingPrograms = sanitizeAlphanumeric(
          detail.idNumber || request.graduateDocumentNumber,
          DOCUMENT_MAX_LENGTH,
        );
        if (documentForExistingPrograms) {
          const existingTitles =
            await graduadosService.graduados.listarTitulosPorCedula(
              documentForExistingPrograms,
            );
          existingTitles.forEach((title) => {
            rememberExistingProgram(title.programName);
            rememberExistingProgram(title.degreeTitle);
          });
        }
      } catch (error) {
        console.warn('No se pudieron cargar los títulos existentes:', error);
      }

      let nextForm: ApprovalForm = {
        fullName: resolvedFullName,
        idNumber: sanitizeAlphanumeric(
          detail.idNumber || request.graduateDocumentNumber,
          DOCUMENT_MAX_LENGTH,
        ),
        email: resolvedEmail,
        programName: isUnavailableCatalogValue(detail.programName)
          ? ''
          : (detail.programName || '').trim(),
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
          rememberExistingProgram(graduate.programName);
          rememberExistingProgram(graduate.degreeTitle);
          nextForm = {
            ...nextForm,
            fullName: graduate.fullName || nextForm.fullName,
            idNumber: sanitizeAlphanumeric(
              graduate.idNumber || nextForm.idNumber,
              DOCUMENT_MAX_LENGTH,
            ),
            email: isCompanyRequester
              ? graduate.email || nextForm.email
              : nextForm.email || graduate.email,
            programName: isUnavailableCatalogValue(
              graduate.programName || graduate.degreeTitle,
            )
              ? nextForm.programName
              : (graduate.programName || graduate.degreeTitle || '').trim(),
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

      setExistingGraduatePrograms(Array.from(existingProgramsByKey.values()));

      const savedPayload =
        detail.reviewPayload && typeof detail.reviewPayload === 'object'
          ? (detail.reviewPayload as Record<string, unknown>)
          : request.reviewPayload && typeof request.reviewPayload === 'object'
            ? (request.reviewPayload as Record<string, unknown>)
            : {};

      setApprovalForm(mergeSavedReviewPayload(nextForm, savedPayload));
      setReviewNotes(
        detail.reviewRecommendationReason ||
          request.reviewRecommendationReason ||
          detail.reviewNotes ||
          request.reviewNotes ||
          '',
      );
    } catch (error) {
      console.error('Error cargando solicitud:', error);
      toast.error('No se pudo cargar la solicitud para aprobar');
    } finally {
      setIsLoadingApprovalData(false);
    }
  };

  const handleSubmitReview = () => {
    const trimmedReviewNotes = reviewNotes.trim();

    if (!trimmedReviewNotes) {
      toast.error(
        reviewAction === 'approve'
          ? 'Por favor ingresa notas de revisión'
          : 'Por favor ingresa la descripción del rechazo',
      );
      return;
    }
    if (trimmedReviewNotes.length < REVIEW_NOTES_MIN_LENGTH) {
      toast.error(
        `Las notas de revisión deben tener al menos ${REVIEW_NOTES_MIN_LENGTH} caracteres`,
      );
      return;
    }
    if (trimmedReviewNotes.length > REVIEW_NOTES_MAX_LENGTH) {
      toast.error(`Las notas de revisión no pueden superar ${REVIEW_NOTES_MAX_LENGTH} caracteres`);
      return;
    }

    let approvalDetails: ApprovalForm | undefined;
    if (reviewAction === 'approve') {
      const trimmedFullName = normalizeSpaces(approvalForm.fullName);
      const trimmedIdNumber = sanitizeAlphanumeric(
        approvalForm.idNumber || selectedRequest?.graduateDocumentNumber || '',
        DOCUMENT_MAX_LENGTH,
      );
      const trimmedEmail = approvalForm.email.trim();
      const trimmedRegistro = sanitizeDigits(
        approvalForm.numRegistro,
        REGISTRY_NUMBER_MAX_LENGTH,
      );
      const trimmedFolio = sanitizeDigits(
        approvalForm.numFolio,
        FOLIO_BOOK_MAX_LENGTH,
      );
      const trimmedLibro = sanitizeDigits(
        approvalForm.numLibro,
        FOLIO_BOOK_MAX_LENGTH,
      );
      const registryDigitsOnly = new RegExp(
        `^\\d{1,${REGISTRY_NUMBER_MAX_LENGTH}}$`,
      );
      const folioBookDigitsOnly = new RegExp(
        `^\\d{1,${FOLIO_BOOK_MAX_LENGTH}}$`,
      );
      const nameValidationError = getPersonNameValidationError(
        approvalForm.fullName,
        'El nombre del graduado',
      );
      const graduationDate = parseDateInputAsLocal(approvalForm.graduationDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (nameValidationError) {
        toast.error(nameValidationError);
        return;
      }
      if (
        !trimmedIdNumber ||
        trimmedIdNumber.length < DOCUMENT_MIN_LENGTH ||
        trimmedIdNumber.length > DOCUMENT_MAX_LENGTH ||
        !DOCUMENT_ALLOWED_REGEX.test(trimmedIdNumber)
      ) {
        toast.error(
          `El documento debe tener entre ${DOCUMENT_MIN_LENGTH} y ${DOCUMENT_MAX_LENGTH} caracteres, solo letras y números`,
        );
        return;
      }
      if (!trimmedEmail) {
        toast.error('El email es obligatorio');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (
        trimmedEmail.length < EMAIL_MIN_LENGTH ||
        trimmedEmail.length > EMAIL_MAX_LENGTH ||
        !emailRegex.test(trimmedEmail)
      ) {
        toast.error('El email no tiene un formato válido');
        return;
      }
      if (!approvalForm.programName) {
        toast.error('Selecciona el programa');
        return;
      }
      if (selectedProgramAlreadyExists) {
        toast.error(duplicateProgramMessage);
        return;
      }
      if (!approvalForm.graduationDate) {
        toast.error('Selecciona la fecha de graduación');
        return;
      }
      if (!graduationDate) {
        toast.error('La fecha de graduación no tiene un formato válido');
        return;
      }
      if (graduationDate.getFullYear() < MIN_GRADUATION_YEAR) {
        toast.error(`La fecha de graduación no puede ser anterior a ${MIN_GRADUATION_YEAR}`);
        return;
      }
      if (graduationDate.getTime() > today.getTime()) {
        toast.error('La fecha de graduación no puede ser futura');
        return;
      }
      if (!approvalForm.campus) {
        toast.error('Selecciona la sede');
        return;
      }
      if (!approvalForm.seccionalName) {
        toast.error('Selecciona la territorial');
        return;
      }
      const selectedSeccionalKey = normalizeKey(approvalForm.seccionalName);
      const selectedSeccionalHasCatalog = hasCatalogKey(
        sedesBySeccional,
        selectedSeccionalKey,
      );
      const sedesForSelectedSeccional = selectedSeccionalHasCatalog
        ? sedesBySeccional[selectedSeccionalKey]
        : [];
      if (
        selectedSeccionalHasCatalog &&
        sedesForSelectedSeccional.length > 0 &&
        !sedesForSelectedSeccional.some(
          (sede) => normalizeKey(sede) === normalizeKey(approvalForm.campus),
        )
      ) {
        toast.error('La sede seleccionada no pertenece a la territorial indicada');
        return;
      }
      if (!trimmedRegistro || !registryDigitsOnly.test(trimmedRegistro)) {
        toast.error(
          `El número de registro es obligatorio y debe tener máximo ${REGISTRY_NUMBER_MAX_LENGTH} dígitos`,
        );
        return;
      }
      if (!trimmedFolio || !folioBookDigitsOnly.test(trimmedFolio)) {
        toast.error(
          `El número de folio es obligatorio y debe tener máximo ${FOLIO_BOOK_MAX_LENGTH} dígitos`,
        );
        return;
      }
      if (!trimmedLibro || !folioBookDigitsOnly.test(trimmedLibro)) {
        toast.error(
          `El número de libro es obligatorio y debe tener máximo ${FOLIO_BOOK_MAX_LENGTH} dígitos`,
        );
        return;
      }

      approvalDetails = {
        ...approvalForm,
        fullName: trimmedFullName,
        idNumber: trimmedIdNumber,
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
        notes: trimmedReviewNotes,
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
          reviewerEmail,
        );
        toast.success('Revisión iniciada', {
          description:
            'Se envió un correo al solicitante informando que la revisión fue iniciada.',
        });
      } else if (
        confirmAction.type === 'approve' ||
        confirmAction.type === 'reject'
      ) {
        if (approvalFiles.length > 0) {
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
              await graduadosService.solicitudes.subirArchivosRevision(
                confirmAction.request.id,
                [file],
                reviewerName,
                reviewerEmail,
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
              console.error('Error subiendo archivo de revisión:', uploadError);
              if (isPayloadTooLargeError(uploadError)) {
                toast.error('El archivo es muy pesado', {
                  description: `El archivo "${file.name}" supera el límite de ${MAX_APPROVAL_FILE_SIZE_LABEL} por archivo.`,
                });
              } else {
                toast.error(`No se pudo subir "${file.name}"`, {
                  description: uploadError?.response?.data?.message || uploadError?.message,
                });
              }
              throw uploadError;
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
        await graduadosService.solicitudes.enviarDecisionRevision(
          confirmAction.request.id,
          {
            decision: confirmAction.type === 'approve' ? 'APPROVED' : 'REJECTED',
            reason: confirmAction.notes || 'Concepto registrado por revisión manual',
            reviewNotes: confirmAction.notes || 'Concepto registrado por revisión manual',
            reviewerName,
            reviewerId,
            reviewerEmail,
            ...(confirmAction.approvalDetails || {}),
          },
        );
        toast.success('Concepto enviado a aprobación final', {
          description:
            'El aprobador definirá la respuesta definitiva antes de enviar correos o certificados.',
        });
      }

      setSelectedRequest(null);
      setConfirmAction(null);
      setShowConfirmModal(false);
      setApprovalFiles([]);
      setExistingApprovalFiles([]);
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

  const reviewActionLabel =
    reviewAction === 'approve'
      ? 'Cargar información revisada'
      : 'Registrar novedad de rechazo';
  const confirmActionLabel =
    confirmAction?.type === 'start_review'
      ? 'Iniciar revisión'
      : confirmAction?.type === 'approve'
        ? 'Cargar información revisada'
        : 'Registrar novedad de rechazo';
  const confirmDialogTitle =
    confirmAction?.type === 'start_review'
      ? 'Iniciar revisión'
      : 'Confirmar Acción';
  const confirmDialogDescription =
    confirmAction?.type === 'start_review'
      ? 'Confirma que deseas iniciar la revisión. El solicitante recibirá una notificación por correo.'
      : 'Verifica que deseas continuar con esta acción.';
  const confirmButtonLabel =
    confirmAction?.type === 'start_review'
      ? 'Iniciar revisión'
      : 'Confirmar';

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

  const formatRequesterTimelineActor = (request: ReviewRequest) =>
    formatTimelineActor(request.requester.name, request.requester.email);

  const getTimelineFileCount = (notes?: string) => {
    const match = String(notes || '').match(/(\d+)/);
    return match ? Number(match[1]) || 0 : 0;
  };

  const compactReviewTimeline = (
    events: NonNullable<ReviewRequest['reviewTimeline']>,
  ) =>
    events.reduce<NonNullable<ReviewRequest['reviewTimeline']>>(
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

  const reviewDecisionLabel = (decision?: string | null) => {
    if (decision === 'APPROVED') return 'Aprobar';
    if (decision === 'REJECTED') return 'Rechazar';
    if (decision === 'OBSERVATION') return 'Observación';
    return 'Sin concepto';
  };

  const getLatestApproverEvent = (request: ReviewRequest) =>
    [...compactReviewTimeline(request.reviewTimeline || [])]
      .reverse()
      .find((event) =>
        [
          'approver_decision',
          'certificate_generated',
          'final_rejection_notified',
        ].includes(event.type),
      );

  const requestMetricCards = [
    {
      id: 'total',
      label: 'Total',
      value: displayStats.total,
      subtitle: isMyReviewsScope ? 'Mis revisiones' : 'Solicitudes',
      color: '#64748B',
    },
    {
      id: 'pending',
      label: isMyReviewsScope ? 'Por revisar' : 'Pendientes',
      value: isMyReviewsScope ? myPendingRequests.length : displayStats.pending,
      subtitle: isMyReviewsScope ? 'Pendientes y devueltas' : 'Sin revisar',
      color: '#D97706',
    },
    {
      id: 'under-review',
      label: isMyReviewsScope ? 'Devueltas' : 'En Revisión',
      value: isMyReviewsScope ? myReturnedCount : displayStats.underReview,
      subtitle: isMyReviewsScope ? 'Con observación' : 'En proceso',
      color: isMyReviewsScope ? '#D97706' : '#2563EB',
    },
    {
      id: 'approved',
      label: isMyReviewsScope ? 'Enviadas' : 'Aprobadas',
      value: isMyReviewsScope ? mySubmittedCount : displayStats.approved,
      subtitle: isMyReviewsScope ? 'Esperando validación' : 'Resueltas',
      color: '#059669',
    },
    {
      id: 'rejected',
      label: isMyReviewsScope ? 'Cerradas' : 'Rechazadas',
      value: isMyReviewsScope ? myClosedCount : displayStats.rejected,
      subtitle: isMyReviewsScope ? 'Finalizadas' : 'No aprobadas',
      color: isMyReviewsScope ? '#475569' : '#DC2626',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Indicadores de solicitudes */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm sm:p-4"
      >
        <div className="mb-3 flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-2.5">
            <BarChart3 className="mt-0.5 h-4 w-4 text-[#003DA5]" />
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-slate-900">
                Indicadores:
              </p>
              <p className="text-xs font-medium text-slate-500">
                Vista rápida del estado de las solicitudes
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Resumen actual
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {requestMetricCards.map((metric) => (
            <Card
              key={metric.id}
              aria-label={`${metric.label}: ${metric.value} ${metric.subtitle}`}
              className="gap-0 rounded-lg border border-l-4 border-slate-200 bg-white shadow-none cursor-default select-none"
              style={{ borderLeftColor: metric.color }}
            >
              <div className="flex min-h-[92px] items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-600">
                    {metric.label}
                  </p>
                  <p className="mt-2 truncate text-xs text-slate-500">
                    {metric.subtitle}
                  </p>
                </div>
                <p className="shrink-0 text-3xl font-semibold leading-none text-slate-900 tabular-nums">
                  {metric.value}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </motion.div>

      {isMyReviewsScope && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-white rounded-xl border-2 p-2"
          style={{ borderColor: '#E5E7EB' }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              {
                id: 'pending' as const,
                label: 'Por revisar',
                subtitle: 'Pendientes y devueltas',
                count: myPendingRequests.length,
                color: '#F59E0B',
                Icon: RefreshCw,
              },
              {
                id: 'reviewed' as const,
                label: 'Revisadas',
                subtitle: 'Enviadas o finalizadas',
                count: myReviewedRequests.length,
                color: '#10B981',
                Icon: ClipboardCheck,
              },
            ].map((view) => {
              const isActive = myReviewView === view.id;
              const Icon = view.Icon;
              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setMyReviewView(view.id)}
                  className="rounded-lg border-2 px-4 py-3 text-left transition-all"
                  style={{
                    borderColor: isActive ? view.color : '#E5E7EB',
                    background: isActive ? `${view.color}0F` : '#FFFFFF',
                    boxShadow: isActive ? `0 0 0 3px ${view.color}1F` : 'none',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{ background: isActive ? view.color : '#F3F4F6' }}
                    >
                      <Icon
                        className="h-5 w-5"
                        style={{ color: isActive ? '#FFFFFF' : '#6B7280' }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className="text-sm font-semibold"
                          style={{ color: isActive ? view.color : '#1F2937' }}
                        >
                          {view.label}
                        </p>
                        <span
                          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
                          style={{
                            background: isActive ? view.color : '#E5E7EB',
                            color: isActive ? '#FFFFFF' : '#374151',
                          }}
                        >
                          {view.count}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: '#6B7280' }}>
                        {view.subtitle}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

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
              <option value="expired">Expiradas</option>
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
              {isMyReviewsScope
                ? myReviewView === 'pending'
                  ? 'No tienes revisiones pendientes'
                  : 'No tienes revisiones revisadas'
                : 'No se encontraron solicitudes'}
            </h3>
            <p className="text-sm text-[#6B7280] mb-6">
              {hasActiveFilters
                ? 'Intenta ajustar los filtros de búsqueda'
                : isMyReviewsScope
                  ? myReviewView === 'pending'
                    ? 'No hay solicitudes propias por revisar o corregir en este momento'
                    : 'Todavía no tienes solicitudes propias enviadas o cerradas'
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
                        {request.approvalStatus === 'PENDING_APPROVAL' && (
                          <Badge className="bg-orange-100 text-orange-800 border-orange-200 border text-xs">
                            Pendiente aprobador
                          </Badge>
                        )}
                        {request.approvalStatus === 'PENDING_HEAD_APPROVAL' && (
                          <Badge className="bg-sky-100 text-sky-800 border-sky-200 border text-xs">
                            Pendiente jefe
                          </Badge>
                        )}
                        {request.approvalStatus === 'OBSERVATION' && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 border text-xs">
                            Observación aprobador
                          </Badge>
                        )}
                        {request.approvalStatus === 'HEAD_OBSERVATION' && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 border text-xs">
                            Observación jefe
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Columna 5: Tiempo (2 cols) */}
                    <div className="col-span-2">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>
                          {request.status === 'expired'
                            ? 'Expirada'
                            : calculateTimeSince(request.createdAt, timeNow)}
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
                          {request.status === 'pending' && canWorkReviewRequests && (
                            <>
                              <DropdownMenuItem onClick={() => handleStartReview(request)}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Iniciar revisión
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {request.status === 'under_review' && isReviewWorkLocked(request) && (
                            <>
                              <DropdownMenuItem disabled>
                                <Clock className="w-4 h-4 mr-2" />
                                Pendiente de validación
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {canEditReviewWork(request) && (
                            <>
                              <DropdownMenuItem onClick={() => handleOpenReviewModal(request, 'approve')}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Cargar información revisada
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenReviewModal(request, 'reject')}>
                                <XCircle className="w-4 h-4 mr-2" />
                                Registrar novedad de rechazo
                              </DropdownMenuItem>
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
                                  <p className="text-xs text-gray-600">Nombre completo</p>
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
                                      {request.requester.companyNit || ''}
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

                        <div className="bg-white border border-amber-200 rounded-lg p-4">
                          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                              <Paperclip className="w-4 h-4 text-amber-600" />
                              Soporte del solicitante
                            </h4>
                            <Badge className="w-fit border border-amber-200 bg-amber-50 text-amber-700 text-xs">
                              {request.requesterSupportFile ? '1 archivo' : 'Sin adjunto'}
                            </Badge>
                          </div>

                          {request.requesterSupportFile ? (
                            <div className="max-w-2xl">
                              {(() => {
                                const file = request.requesterSupportFile;
                                const fileType = getRequesterSupportFileType(file);
                                return (
                                  <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                                        <FileText className="h-5 w-5" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-gray-900">
                                          {file.originalName || 'Soporte de solicitud'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {formatBytes(file.sizeBytes)}
                                          {file.uploadedAt
                                            ? ` - ${formatDate(file.uploadedAt)}`
                                            : ''}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex flex-shrink-0 items-center gap-1">
                                      {fileType !== 'other' && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handlePreviewRequesterSupportFile(request, file)
                                          }
                                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                                          title="Visualizar soporte"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDownloadRequesterSupportFile(request, file)
                                        }
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        title="Descargar soporte"
                                      >
                                        <Download className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                              Esta solicitud no tiene soporte adjunto del solicitante.
                            </div>
                          )}
                        </div>

                        {/* Botones de Acción Rápida */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">
                            Acciones Rápidas
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {request.status === 'pending' && canWorkReviewRequests && (
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
                                Iniciar revisión
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
                        {(request.reviewRecommendation || request.reviewedAt) && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-gray-700" />
                              Concepto del revisor
                            </h4>
                            <div className="space-y-2 text-sm">
                              {(request.reviewSubmittedByName || request.reviewerName) && (
                                <div>
                                  <span className="text-gray-600">Revisor:</span>
                                  <span className="ml-2 font-semibold text-gray-900">
                                    {request.reviewSubmittedByName || request.reviewerName}
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-600">Fecha:</span>
                                <span className="ml-2 font-semibold text-gray-900">
                                  {formatDate(request.reviewSubmittedAt || request.reviewedAt)}
                                </span>
                              </div>
                              {request.reviewRecommendation ? (
                                <div className="mt-2">
                                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 border">
                                    {reviewDecisionLabel(request.reviewRecommendation)}
                                  </Badge>
                                </div>
                              ) : request.resolution && request.approvalStatus !== 'OBSERVATION' && (
                                <div className="mt-2">
                                  {getResolutionBadge(request.resolution)}
                                </div>
                              )}
                              {(request.reviewRecommendationReason ||
                                (!request.reviewRecommendation && request.reviewNotes)) && (
                                <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                                  <p className="text-xs text-gray-700">
                                    {request.reviewRecommendationReason ||
                                      request.reviewNotes}
                                  </p>
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

                        {(request.approverDecision || request.approverNotes) && (() => {
                          const approverEvent = getLatestApproverEvent(request);
                          const approverLabel =
                            formatTimelineActor(
                              approverEvent?.actorName || request.approverName,
                              approverEvent?.actorEmail,
                              approverEvent?.actorId,
                            ) || request.approverName || 'No registrado';

                          return (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-orange-700" />
                                Respuesta del aprobador
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="text-gray-600">Aprobador:</span>
                                  <span className="ml-2 font-semibold text-gray-900">
                                    {approverLabel}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Resultado:</span>
                                  <span className="ml-2 font-semibold text-gray-900">
                                    {reviewDecisionLabel(request.approverDecision)}
                                  </span>
                                </div>
                                {request.approvedAt && (
                                  <div>
                                    <span className="text-gray-600">Fecha:</span>
                                    <span className="ml-2 font-semibold text-gray-900">
                                      {formatDate(request.approvedAt)}
                                    </span>
                                  </div>
                                )}
                                {request.approverNotes && (
                                  <div className="mt-2 p-2 bg-white rounded border border-orange-200">
                                    <p className="text-xs font-semibold text-orange-800 mb-1">
                                      Nota del aprobador
                                    </p>
                                    <p className="text-xs text-gray-700">{request.approverNotes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Timeline */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-700" />
                            Línea de Tiempo
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded">
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-800">Solicitud creada</p>
                                <p className="mt-0.5 text-gray-600">
                                  Solicitante: {formatRequesterTimelineActor(request)}
                                </p>
                              </div>
                              <span className="font-semibold text-gray-900 whitespace-nowrap">
                                {formatDate(request.createdAt)}
                              </span>
                            </div>
                            {request.status === 'expired' && (() => {
                              const expiredAt =
                                request.reviewedAt ||
                                getManualReviewExpirationDate(request.createdAt)?.toISOString();

                              if (!expiredAt) {
                                return null;
                              }

                              return (
                                <div className="flex items-start justify-between gap-3 p-3 bg-red-50 rounded">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-red-800">
                                      Solicitud expirada por superar 15 días hábiles
                                    </p>
                                    <p className="mt-0.5 text-red-700">
                                      Sistema de vencimiento automatico
                                    </p>
                                  </div>
                                  <span className="font-semibold text-red-800 whitespace-nowrap">
                                    {formatDate(expiredAt)}
                                  </span>
                                </div>
                              );
                            })()}
                            {request.reviewedAt &&
                              request.status !== 'expired' &&
                              compactReviewTimeline(request.reviewTimeline || []).length === 0 && (
                              <div className="flex items-start justify-between gap-3 p-3 bg-green-50 rounded">
                                <div className="min-w-0">
                                  <p className="font-semibold text-green-900">Revisión completada</p>
                                  {request.reviewerName && (
                                    <p className="mt-0.5 text-green-800">
                                      Revisor: {request.reviewerName}
                                    </p>
                                  )}
                                </div>
                                <span className="font-semibold text-gray-900 whitespace-nowrap">
                                  {formatDate(request.reviewedAt)}
                                </span>
                              </div>
                            )}
                            {compactReviewTimeline(request.reviewTimeline || []).map((event, eventIndex) => (
                              <div
                                key={`${request.id}-timeline-${eventIndex}`}
                                className="flex items-start justify-between gap-3 p-3 bg-blue-50 rounded"
                              >
                                <div className="min-w-0 text-blue-900">
                                  <p className="font-semibold">{event.label}</p>
                                  {formatTimelineActor(event.actorName, event.actorEmail, event.actorId) && (
                                    <p className="mt-0.5 text-blue-800">
                                      Usuario: {formatTimelineActor(event.actorName, event.actorEmail, event.actorId)}
                                    </p>
                                  )}
                                  {event.notes && (
                                    <p className="mt-1 text-blue-800">
                                      Nota: {event.notes}
                                    </p>
                                  )}
                                </div>
                                <span className="font-semibold text-blue-900 whitespace-nowrap">
                                  {formatDate(event.createdAt)}
                                </span>
                              </div>
                            ))}
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

      {/* Modal: Gestionar solicitud */}
      <Dialog
        open={showReviewModal}
        onOpenChange={(open) => {
          setShowReviewModal(open);
          if (!open) {
            setApprovalFiles([]);
            setExistingApprovalFiles([]);
            resetApprovalUploadProgress();
          }
        }}
      >
        <DialogContent
          className="review-approval-dialog w-[92vw] max-w-4xl !p-0 !top-1/2 !-translate-y-1/2 !max-h-[calc(100vh-1.25rem)] !overflow-hidden !flex !flex-col"
        >
          <DialogHeader className="px-6 pt-3 pb-1">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              {reviewActionLabel}
            </DialogTitle>
            <DialogDescription>
              Registra el concepto del revisor para que el aprobador tome la decisión final
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

            {reviewAction === 'approve' &&
              selectedRequest &&
              ['OBSERVATION', 'HEAD_OBSERVATION'].includes(
                selectedRequest.approvalStatus || '',
              ) &&
              (selectedRequest.approverNotes || selectedRequest.headNotes) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="mt-0.5 h-5 w-5 text-amber-700" />
                    <div className="text-sm">
                      <p className="font-semibold text-amber-900">
                        {selectedRequest.approvalStatus === 'HEAD_OBSERVATION'
                          ? 'Observación del jefe'
                          : 'Observación del aprobador'}
                      </p>
                      <p className="mt-1 text-amber-800">
                        {selectedRequest.approvalStatus === 'HEAD_OBSERVATION'
                          ? selectedRequest.headNotes
                          : selectedRequest.approverNotes}
                      </p>
                      <p className="mt-2 text-xs text-amber-700">
                        Los datos y archivos cargados previamente se conservan.
                        Corrige solo lo necesario y vuelve a enviar.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                {reviewAction === 'approve' ? 'Notas de Revisión' : 'Descripción del rechazo'}
                <span className="text-red-500"> *</span>
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value.slice(0, REVIEW_NOTES_MAX_LENGTH))}
                onBlur={() => setReviewNotes((value) => value.trim())}
                placeholder={
                  reviewAction === 'approve'
                    ? 'Describe la información revisada y los soportes cargados...'
                    : 'Describe la novedad encontrada para que el aprobador la evalúe...'
                }
                className="review-approval-input w-full p-3 border-2 border-gray-300 rounded-lg text-sm resize-none focus:border-[#003DA5]"
                style={{ minHeight: '120px' }}
                minLength={REVIEW_NOTES_MIN_LENGTH}
                maxLength={REVIEW_NOTES_MAX_LENGTH}
              />
              <div className="mt-1 flex items-start justify-between gap-3 text-xs text-gray-500">
                <span>
                  Texto libre, incluidos signos de puntuación, caracteres especiales y saltos de línea.
                  Mínimo {REVIEW_NOTES_MIN_LENGTH} caracteres.
                </span>
                <span className="whitespace-nowrap">
                  {reviewNotes.length}/{REVIEW_NOTES_MAX_LENGTH}
                </span>
              </div>
            </div>

            {reviewAction === 'approve' && (
              <div className="review-approval-card space-y-3 rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Datos del graduado</p>
                  <span className="text-xs text-gray-500">Acta y diploma se generan automáticamente</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Nombre completo<span className="text-red-500"> *</span>
                    </label>
                    <input
                      value={approvalForm.fullName}
                      onChange={(e) =>
                        setApprovalForm({
                          ...approvalForm,
                          fullName: sanitizePersonName(e.target.value),
                        })
                      }
                      className="review-approval-input w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                      placeholder="Nombre completo"
                      disabled={isLoadingApprovalData}
                      minLength={PERSON_NAME_MIN_LENGTH}
                      maxLength={PERSON_NAME_MAX_LENGTH}
                    />
                    <p className="text-xs text-gray-500">
                      Entre {PERSON_NAME_MIN_LENGTH} y {PERSON_NAME_MAX_LENGTH} caracteres.
                      Solo letras, espacios, apóstrofes y guiones.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Documento<span className="text-red-500"> *</span>
                    </label>
                    <input
                      value={approvalForm.idNumber || selectedRequest?.graduateDocumentNumber || ''}
                      onChange={(e) =>
                        setApprovalForm({
                          ...approvalForm,
                          idNumber: sanitizeAlphanumeric(e.target.value, DOCUMENT_MAX_LENGTH),
                        })
                      }
                      className="review-approval-input w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                      inputMode="text"
                      minLength={DOCUMENT_MIN_LENGTH}
                      maxLength={DOCUMENT_MAX_LENGTH}
                      disabled
                    />
                    <p className="text-xs text-gray-500">
                      Entre {DOCUMENT_MIN_LENGTH} y {DOCUMENT_MAX_LENGTH} caracteres,
                      únicamente letras y números.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Email<span className="text-red-500"> *</span>
                    </label>
                    <input
                      type="email"
                      value={approvalForm.email}
                      onChange={(e) =>
                        setApprovalForm({
                          ...approvalForm,
                          email: e.target.value.slice(0, EMAIL_MAX_LENGTH),
                        })
                      }
                      onBlur={() =>
                        setApprovalForm((current) => ({
                          ...current,
                          email: current.email.trim(),
                        }))
                      }
                      className="review-approval-input w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                      placeholder="correo@ejemplo.com"
                      disabled={isLoadingApprovalData}
                      minLength={EMAIL_MIN_LENGTH}
                      maxLength={EMAIL_MAX_LENGTH}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Número de registro<span className="text-red-500"> *</span>
                    </label>
                    <input
                      type="text"
                      value={approvalForm.numRegistro}
                      onChange={(e) =>
                        setApprovalForm({
                          ...approvalForm,
                          numRegistro: sanitizeDigits(
                            e.target.value,
                            REGISTRY_NUMBER_MAX_LENGTH,
                          ),
                        })
                      }
                      className="review-approval-input w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                      placeholder="Registro"
                      disabled={isLoadingApprovalData}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      minLength={1}
                      maxLength={REGISTRY_NUMBER_MAX_LENGTH}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Solo números, máximo {REGISTRY_NUMBER_MAX_LENGTH} dígitos.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Número de folio<span className="text-red-500"> *</span>
                    </label>
                    <input
                      type="text"
                      value={approvalForm.numFolio}
                      onChange={(e) =>
                        setApprovalForm({
                          ...approvalForm,
                          numFolio: sanitizeDigits(e.target.value, FOLIO_BOOK_MAX_LENGTH),
                        })
                      }
                      className="review-approval-input w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                      placeholder="Folio"
                      disabled={isLoadingApprovalData}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      minLength={1}
                      maxLength={FOLIO_BOOK_MAX_LENGTH}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Número de libro<span className="text-red-500"> *</span>
                    </label>
                    <input
                      type="text"
                      value={approvalForm.numLibro}
                      onChange={(e) =>
                        setApprovalForm({
                          ...approvalForm,
                          numLibro: sanitizeDigits(e.target.value, FOLIO_BOOK_MAX_LENGTH),
                        })
                      }
                      className="review-approval-input w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                      placeholder="Libro"
                      disabled={isLoadingApprovalData}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      minLength={1}
                      maxLength={FOLIO_BOOK_MAX_LENGTH}
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
                      className={`review-approval-input w-full rounded-lg border-2 px-3 py-2 text-sm ${
                        selectedProgramAlreadyExists
                          ? 'border-red-300 bg-red-50 focus:border-red-500'
                          : 'border-gray-300'
                      }`}
                      disabled={isLoadingApprovalData || isLoadingIntegrationPrograms}
                    >
                      <option value="">
                        {isLoadingIntegrationPrograms ? 'Cargando programas...' : 'Seleccionar programa'}
                      </option>
                      {programNameOptions.map((programa) => {
                        const alreadyExists = programAlreadyExistsForGraduate(programa);
                        return (
                        <option
                          key={programa}
                          value={programa}
                          disabled={alreadyExists}
                        >
                          {programa}
                          {alreadyExists ? ' (ya existe)' : ''}
                        </option>
                        );
                      })}
                    </select>
                    {selectedProgramAlreadyExists && (
                      <p className="text-xs font-semibold leading-5 text-red-600">
                        {duplicateProgramMessage}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Fecha de graduación<span className="text-red-500"> *</span>
                    </label>
                    <input
                      type="date"
                      value={approvalForm.graduationDate}
                      onChange={(e) => setApprovalForm({ ...approvalForm, graduationDate: e.target.value })}
                      className="review-approval-input w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                      disabled={isLoadingApprovalData}
                      min={`${MIN_GRADUATION_YEAR}-01-01`}
                      max={toDateInputValue(new Date())}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Territorial<span className="text-red-500"> *</span>
                    </label>
                    <select
                      value={approvalForm.seccionalName}
                      onChange={(e) => {
                        const nextSeccional = e.target.value;
                        const nextSeccionalKey = normalizeKey(nextSeccional);
                        const sedesForSeccional =
                          nextSeccionalKey && hasCatalogKey(sedesBySeccional, nextSeccionalKey)
                            ? sedesBySeccional[nextSeccionalKey]
                            : null;

                        setApprovalForm((prev) => {
                          const keepCampus =
                            !nextSeccional ||
                            !prev.campus ||
                            !sedesForSeccional ||
                            sedesForSeccional.some(
                              (sede) => normalizeKey(sede) === normalizeKey(prev.campus),
                            );

                          return {
                            ...prev,
                            seccionalName: nextSeccional,
                            campus: keepCampus ? prev.campus : '',
                          };
                        });
                      }}
                      className="review-approval-input w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                      disabled={isLoadingApprovalData || isLoadingCatalogs}
                    >
                      <option value="">
                        {isLoadingCatalogs
                          ? 'Cargando territoriales...'
                          : seccionalSelectOptions.length > 0
                            ? 'Seleccionar territorial'
                            : 'No hay territoriales disponibles'}
                      </option>
                      {seccionalSelectOptions.map((seccional, index) => (
                        <option key={`${seccional}-${index}`} value={seccional}>
                          {seccional}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Sede (CETAP)<span className="text-red-500"> *</span>
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
                            ? mappedSeccional || prev.seccionalName
                            : prev.seccionalName,
                        }));
                      }}
                      className="review-approval-input w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-sm"
                      disabled={
                        isLoadingApprovalData ||
                        isLoadingCatalogs ||
                        !approvalForm.seccionalName
                      }
                    >
                      <option value="">
                        {isLoadingCatalogs
                          ? 'Cargando sedes...'
                          : approvalForm.seccionalName
                            ? campusOptions.length > 0
                              ? 'Seleccionar sede'
                              : 'No hay sedes para esta territorial'
                            : 'Selecciona primero una territorial'}
                      </option>
                      {campusOptions.map((sede, index) => (
                        <option key={`${sede}-${index}`} value={sede}>
                          {sede}
                        </option>
                      ))}
                    </select>
                  </div>
                  {structureCatalogNotice && (
                    <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                      {structureCatalogNotice}
                    </div>
                  )}
                </div>

                <div className="space-y-3 border-t border-dashed border-gray-200 pt-3">
                  <div className="sr-only">
                    <div className="review-approval-file-picker flex items-center gap-2">
                      <input
                        id="approval-files-input"
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                        onChange={handleApprovalFilesInputChange}
                        className="sr-only"
                        disabled={isApprovalFilePickerDisabled}
                      />
                      <label
                        htmlFor="approval-files-input"
                        className={`inline-flex items-center rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                          isLoadingApprovalData ||
                          existingApprovalFiles.length + approvalFiles.length >=
                            MAX_APPROVAL_FILES
                            ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                            : 'cursor-pointer border-[#003DA5] bg-[#EFF6FF] text-[#003DA5] hover:bg-[#DBEAFE]'
                        }`}
                        aria-disabled={
                          isLoadingApprovalData ||
                          existingApprovalFiles.length + approvalFiles.length >=
                            MAX_APPROVAL_FILES
                        }
                      >
                        Elegir archivos
                      </label>
                    </div>
                    <label className="text-xs font-medium text-gray-700">
                      {`Archivos del título (opcional, máx. ${MAX_APPROVAL_FILES}, ${MAX_APPROVAL_FILE_SIZE_LABEL} por archivo)`}
                    </label>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                          <Paperclip className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Soportes de revisión
                          </p>
                          <p className="text-xs text-gray-500">
                            PDF, Word, Excel o imágenes hasta {MAX_APPROVAL_FILE_SIZE_LABEL}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                        {approvalFileSlotsUsed}/{MAX_APPROVAL_FILES} archivos
                      </span>
                    </div>
                    <label
                      htmlFor="approval-files-input"
                      onDragOver={handleApprovalFilesDragOver}
                      onDragLeave={handleApprovalFilesDragLeave}
                      onDrop={handleApprovalFilesDrop}
                      aria-disabled={isApprovalFilePickerDisabled}
                      className={`flex min-h-[112px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors ${
                        isApprovalFilePickerDisabled
                          ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                          : isApprovalFileDragActive
                            ? 'border-[#003DA5] bg-blue-50 text-[#003DA5]'
                            : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-[#003DA5] hover:bg-blue-50'
                      }`}
                    >
                      <UploadCloud className="mb-2 h-7 w-7" />
                      <span className="text-sm font-semibold">
                        {isApprovalFilePickerDisabled
                          ? 'Límite de archivos alcanzado'
                          : 'Seleccionar o soltar archivos'}
                      </span>
                      <span className="mt-1 text-xs">
                        {approvalFileSlotsRemaining > 0
                          ? `${approvalFileSlotsRemaining} cupo(s) disponible(s)`
                          : 'Quita un archivo para adjuntar otro'}
                      </span>
                    </label>
                  </div>
                  {existingApprovalFiles.length > 0 && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                      <p className="mb-2 text-xs font-semibold text-blue-900">
                        Archivos ya cargados por el revisor
                      </p>
                      <div className="space-y-2">
                        {existingApprovalFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between gap-3 rounded-md border border-blue-100 bg-white px-3 py-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-gray-900">
                                {file.originalName}
                              </p>
                              <p className="text-gray-500">
                                {formatBytes(file.sizeBytes)}
                                {file.uploadedAt
                                  ? ` - ${formatDate(file.uploadedAt)}`
                                  : ''}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingApprovalFile(file.id)}
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 font-semibold text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Quitar
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-blue-800">
                        Si un archivo estaba mal, quítalo y adjunta la versión
                        corregida. Los demás se conservarán.
                      </p>
                    </div>
                  )}
                  {approvalFiles.length > 0 ? (
                    <>
                      <p className="text-xs text-gray-600">
                        Archivos seleccionados: <span className="font-semibold">{approvalFiles.length}</span>
                      </p>
                      <div className="grid gap-2">
                        {approvalFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${getApprovalFileToneClass(file.name)}`}>
                                <FileCheck2 className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-gray-900">{file.name}</p>
                                <p className="text-gray-500">
                                  {getApprovalFileExtension(file.name).toUpperCase()} - {formatBytes(file.size)}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveApprovalFile(index)}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-100 text-red-600 hover:bg-red-50"
                              aria-label={`Quitar ${file.name}`}
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
                  <p className="font-semibold mb-1">Al enviar el concepto:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>No se genera certificado ni correo final todavía</li>
                    <li>La solicitud queda pendiente de aprobación final</li>
                    <li>Esta acción queda registrada en la línea de tiempo</li>
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

      <Dialog
        open={Boolean(reviewSupportPreview)}
        onOpenChange={(open) => {
          if (!open) {
            setReviewSupportPreview(null);
          }
        }}
      >
        <DialogContent
          className="flex flex-col gap-0 overflow-hidden rounded-xl border-0 p-0 shadow-2xl"
          style={{
            width: 'min(92vw, 860px)',
            height: 'min(88vh, 900px)',
            maxWidth: 'none',
          }}
        >
          <div className="flex-shrink-0 bg-gradient-to-r from-[#003DA5] to-[#0052cc] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/20">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="truncate text-lg font-semibold text-white">
                    Vista previa - Soporte
                  </DialogTitle>
                  <DialogDescription className="truncate text-sm text-blue-100">
                    {reviewSupportPreview?.name}
                  </DialogDescription>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                {reviewSupportPreview?.url && (
                  <a
                    href={reviewSupportPreview.url}
                    download={reviewSupportPreview.name || 'soporte-solicitud.pdf'}
                    className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                    title="Descargar soporte"
                  >
                    <Download className="h-5 w-5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setReviewSupportPreview(null)}
                  className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                  title="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden bg-gray-100">
            {reviewSupportPreview?.fileType === 'pdf' && (
              <iframe
                src={`${reviewSupportPreview.url}#navpanes=0&zoom=page-width`}
                title={reviewSupportPreview.name}
                className="h-full w-full border-0"
              />
            )}
            {reviewSupportPreview?.fileType === 'image' && (
              <div className="flex h-full items-center justify-center p-4">
                <img
                  src={reviewSupportPreview.url}
                  alt={reviewSupportPreview.name}
                  className="max-h-full max-w-full rounded-lg object-contain shadow"
                />
              </div>
            )}
          </div>
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
          className="top-1/2 -translate-y-1/2"
          style={{
            width: 'min(360px, calc(100vw - 2rem), calc(100vh - 2rem))',
            height: 'min(360px, calc(100vw - 2rem), calc(100vh - 2rem))',
            maxWidth: 'none',
            gridTemplateRows: 'auto 1fr auto',
          }}
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
              {confirmDialogTitle}
            </DialogTitle>
            <DialogDescription>
              {confirmDialogDescription}
            </DialogDescription>
          </DialogHeader>

          {confirmAction && (
            <div className="flex flex-col justify-center py-2 space-y-4">
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
              {isUpdating ? 'Procesando...' : confirmButtonLabel}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

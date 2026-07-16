/**
 * MÓDULO: GESTIÓN DE GRADUADOS Y VERIFICACIÓN DE TÍTULOS
 * - Lista de usuarios con rol "Graduado" del sistema
 * - Mismo diseño que el módulo de Usuarios
 * - Generación de certificados de verificación de títulos
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Download, 
  Upload, 
  UserCheck, 
  UserX, 
  TrendingUp, 
  Search, 
  Filter, 
  X, 
  MoreVertical, 
  ChevronDown, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  FileText, 
  Hash,
  Shield,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  QrCode,
  Lock,
  Unlock,
  GraduationCap,
  Award,
  BadgeCheck,
  Send,
  AlertTriangle,
  Building2,  // ✅ NUEVO: Para filtro de sedes
  Database,
  FileCheck2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@esap-mfe/shared-ui/sonner';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@esap-mfe/shared-ui/avatar';
import { PaginationPremium } from '../shared/PaginationPremium';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@esap-mfe/shared-ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@esap-mfe/shared-ui/dropdown-menu';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import React from 'react';
import graduadosService, {
  CertificadoGraduado,
  GraduadoArchivo,
  GraduadoData,
} from '../../services/api/graduados.service';
import estructuraService from '../../services/estructuraService';
import type { Seccional, Sede } from '../../services/api/types';
import { ValidarCertificadoGrado } from './registro-academico/ValidarCertificadoGrado';
import { BulkGraduatesUploadModal } from './BulkGraduatesUploadModal';
import { authService } from '../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';
import { buildServiceAssetUrl } from '../../config/environment';
import { Container4K } from '@esap-mfe/shared-ui';

type GraduateRow = {
  id: string;
  personId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: 'active' | 'blocked' | 'inactive';
  roles: Array<{
    name: string;
    color: string;
    since?: string;
  }>;
  location: string;
  program?: string;
  programName?: string;
  degreeTitle?: string;
  document: string;
  enrollmentMethod: 'qr' | 'manual' | 'request' | 'massive' | 'integration';
  enrollmentDate: string;
  graduationDate: string;
  documentsCount: number;
  createdBy?: string;
  asignacionesSedes?: Array<{ nombreSede: string }>;
  territorial?: string;
  sourceTerritorial?: string;
  certificatesCount: number;
  numRegistro?: string;
  numFolio?: string;
  numLibro?: string;
  createdAt?: string;
  updatedAt?: string;
};

const ESTRUCTURA_PERIOD_STORAGE_KEY = 'esap.periodo.estructura-organizacional';
const CATALOG_PERIOD_CHANGE_EVENT = 'esap:academic-catalog-period-changed';
const INTEGRATION_PROGRAM_SOURCE_LABEL = 'graduados integrados';

export function GraduatesManagementModule() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sedeFilter, setSedeFilter] = useState<string>('all'); // ✅ NUEVO: Filtro por sede
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [graduates, setGraduates] = useState<GraduateRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sedesCatalog, setSedesCatalog] = useState<Sede[]>([]);
  const [seccionalesCatalog, setSeccionalesCatalog] = useState<Seccional[]>([]);
  const [estructuraPeriodoCatalogo, setEstructuraPeriodoCatalogo] = useState('');
  const [catalogRefreshToken, setCatalogRefreshToken] = useState(0);
  const [mostrarValidador, setMostrarValidador] = useState(false); // ✅ NUEVO: Estado para vista de validación

  // Estados para modales
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVerifyTitleModalOpen, setIsVerifyTitleModalOpen] = useState(false);
  const [isGenerateCertModalOpen, setIsGenerateCertModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingGraduate, setIsDeletingGraduate] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [filesModalUser, setFilesModalUser] = useState<GraduateRow | null>(null);
  const [filesModalItems, setFilesModalItems] = useState<GraduadoArchivo[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [filesUploadQueue, setFilesUploadQueue] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [filesUploadProgress, setFilesUploadProgress] = useState({
    totalFiles: 0,
    processedFiles: 0,
    currentFileName: '',
    currentFilePercent: 0,
    overallPercent: 0,
  });
  const [isDeleteFileModalOpen, setIsDeleteFileModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<GraduadoArchivo | null>(null);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<GraduateRow | null>(null);
  const canEditGraduates = authService.hasPermission(Permissions.GRADUATES_EDIT);
  const canBulkUploadGraduates = authService.hasPermission(Permissions.GRADUATES_BULK_UPLOAD);
  const canExportGraduates = authService.hasPermission(Permissions.GRADUATES_EXPORT);
  const canVerifyGraduateCertificates = authService.hasPermission(Permissions.GRADUATES_VERIFY_CERTIFICATE);
  const canShowGraduateRowActions = canEditGraduates || canVerifyGraduateCertificates;
  const MAX_FILES_PER_GRADUATE = 5;
  const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
  const MAX_UPLOAD_SIZE_LABEL = '10 MB';
  const PERSON_NAME_MIN_LENGTH = 5;
  const PERSON_NAME_MAX_LENGTH = 150;
  const DOCUMENT_MIN_LENGTH = 5;
  const DOCUMENT_MAX_LENGTH = 20;
  const EMAIL_MIN_LENGTH = 5;
  const EMAIL_MAX_LENGTH = 254;
  const REGISTRY_NUMBER_MAX_LENGTH = 20;
  const FOLIO_BOOK_MAX_LENGTH = 10;
  const PERSON_NAME_ALLOWED_REGEX = /^[\p{L}\s'’-]+$/u;
  const DOCUMENT_ALLOWED_REGEX = /^[A-Za-z0-9]+$/;
  const getCurrentActorName = () => {
    const user = authService.getCurrentUser() as any;
    const fullName =
      user?.fullName ||
      user?.full_name ||
      [user?.firstName || user?.first_name, user?.lastName || user?.last_name]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      user?.name ||
      user?.email ||
      user?.username;

    return normalizeDisplayName(fullName) || undefined;
  };
  // Estados para formularios
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    document: '',
    program: '',
    location: '',
    territorial: '',
    numRegistro: '',
    numFolio: '',
    numLibro: '',
  });

  const [emailForm, setEmailForm] = useState({
    subject: '',
    message: ''
  });

  const [certForm, setCertForm] = useState({
    includeQR: true,
    includeDigitalSignature: true,
    format: 'pdf' as 'pdf' | 'docx'
  });

  const parseDateOnly = (value?: string) => {
    if (!value) return null;
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = new Date(isDateOnly ? `${value}T00:00:00` : value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDateOnly = (
    value?: string,
    options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
  ) => {
    const date = parseDateOnly(value);
    if (!date) return 'N/A';
    return date.toLocaleDateString('es-CO', options);
  };

  const formatDateShort = (value?: string) =>
    formatDateOnly(value, { year: 'numeric', month: 'short', day: 'numeric' });

  const formatDateISO = (value?: string) => {
    const date = parseDateOnly(value);
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const normalizeSpaces = (value: string) => value.trim().replace(/\s+/g, ' ');
  const sanitizeDigits = (value: string, maxLength: number) =>
    value.replace(/\D+/g, '').slice(0, maxLength);
  const sanitizeAlphanumeric = (value: string, maxLength: number) =>
    value.replace(/[^A-Za-z0-9]+/g, '').slice(0, maxLength);
  const sanitizePersonName = (value: string) =>
    value.normalize('NFC').slice(0, PERSON_NAME_MAX_LENGTH);
  const getPersonNameValidationError = (value: string, label: string) => {
    if (!value) return `${label} es obligatorio`;
    if (value.length > PERSON_NAME_MAX_LENGTH) {
      return `${label} no puede superar ${PERSON_NAME_MAX_LENGTH} caracteres`;
    }
    if (/\d/.test(value)) return `${label} no puede contener números`;
    if (!PERSON_NAME_ALLOWED_REGEX.test(value) || !/\p{L}/u.test(value)) {
      return `${label} solo puede contener letras, espacios, apóstrofes o guiones`;
    }
    return '';
  };
  const sanitizeRegistryInput = (value: string, maxLength: number) =>
    sanitizeDigits(value, maxLength);
  const formatRegistryInput = (value: string | undefined, maxLength: number) => {
    const digits = sanitizeRegistryInput(value || '', maxLength);
    if (!digits) return '';
    return digits.match(/.{1,4}/g)?.join('-') ?? digits;
  };
  const formatRegistroDisplay = (value?: string) => {
    const digits = sanitizeRegistryInput(value || '', REGISTRY_NUMBER_MAX_LENGTH);
    if (!digits) return 'N/A';
    return digits.match(/.{1,4}/g)?.join('-') ?? digits;
  };
  const formatFileCount = (count: number) => (count === 1 ? '1 archivo' : `${count} archivos`);
  const formatFileSize = (size?: number | string) => {
    if (size === undefined || size === null) return 'N/A';
    const numericSize = typeof size === 'string' ? Number(size) : size;
    if (!Number.isFinite(numericSize)) return 'N/A';
    if (numericSize < 1024) return `${numericSize} B`;
    const kb = numericSize / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };
  const getFileTypeLabel = (file: { originalName?: string; mimeType?: string }) => {
    const name = (file.originalName || '').toLowerCase();
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
    const mime = (file.mimeType || '').toLowerCase();
    if (ext === 'pdf' || mime === 'application/pdf') return 'PDF';
    if (ext === 'doc' || ext === 'docx' || mime.includes('wordprocessingml')) return 'Word';
    if (ext === 'xls' || ext === 'xlsx' || mime.includes('spreadsheetml')) return 'Excel';
    if (ext === 'png' || mime === 'image/png') return 'PNG';
    if (ext === 'jpg' || ext === 'jpeg' || mime === 'image/jpeg') return 'JPG';
    if (ext === 'webp' || mime === 'image/webp') return 'WEBP';
    if (mime.startsWith('image/')) return 'Imagen';
    if (ext) return ext.toUpperCase();
    return 'Archivo';
  };
  const getFileTypeBadgeVariant = (file: { originalName?: string; mimeType?: string }) => {
    const name = (file.originalName || '').toLowerCase();
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
    const mime = (file.mimeType || '').toLowerCase();
    if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
    if (ext === 'doc' || ext === 'docx' || mime.includes('wordprocessingml')) return 'word';
    if (ext === 'xls' || ext === 'xlsx' || mime.includes('spreadsheetml')) return 'excel';
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp' || mime.startsWith('image/')) {
      return 'image';
    }
    return 'generic';
  };
  const getFileTypeBadgeStyle = (file: { originalName?: string; mimeType?: string }) => {
    const variant = getFileTypeBadgeVariant(file);
    if (variant === 'pdf') {
      return { borderColor: '#FECACA', background: '#FEF2F2', color: '#B91C1C' };
    }
    if (variant === 'word') {
      return { borderColor: '#BFDBFE', background: '#EFF6FF', color: '#1D4ED8' };
    }
    if (variant === 'excel') {
      return { borderColor: '#A7F3D0', background: '#ECFDF5', color: '#047857' };
    }
    if (variant === 'image') {
      return { borderColor: '#D1D5DB', background: '#F3F4F6', color: '#4B5563' };
    }
    return { borderColor: '#E5E7EB', background: '#F9FAFB', color: '#6B7280' };
  };
  const getFileTypeIconStyle = (file: { originalName?: string; mimeType?: string }) => {
    const variant = getFileTypeBadgeVariant(file);
    if (variant === 'pdf') return { background: '#FEF2F2', color: '#B91C1C' };
    if (variant === 'word') return { background: '#EFF6FF', color: '#1D4ED8' };
    if (variant === 'excel') return { background: '#ECFDF5', color: '#047857' };
    if (variant === 'image') return { background: '#F3F4F6', color: '#4B5563' };
    return { background: '#F8FAFC', color: '#475569' };
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

  const splitFullName = (fullName?: string) => {
    const safeName = (fullName || '').trim();
    if (!safeName) {
      return { firstName: 'Graduado', lastName: '' };
    }
    const parts = safeName.split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }
    return { firstName: parts.slice(0, -1).join(' '), lastName: parts.slice(-1).join(' ') };
  };

  const mapGraduateStatus = (status: GraduadoData['status']): GraduateRow['status'] => {
    if (status === 'ACTIVE') return 'active';
    if (status === 'REVOKED') return 'blocked';
    return 'inactive';
  };

  const normalizeKey = (value?: string) =>
    normalizeSpaces(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const normalizeOptionKey = (value?: string) =>
    normalizeKey(value)
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const uniqueSortedText = (values: Array<string | undefined | null>) => {
    const byKey = new Map<string, string>();

    values.forEach((value) => {
      const cleaned = normalizeSpaces(value || '');
      const key = normalizeOptionKey(cleaned);
      if (!key || byKey.has(key)) return;
      byKey.set(key, cleaned);
    });

    return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, 'es'));
  };
  const normalizeDocumentKey = (value?: string) => {
    const digits = (value || '').replace(/\D+/g, '');
    return digits || normalizeKey(value);
  };
  const buildCertificateCountIndexes = (certificates: CertificadoGraduado[]) => {
    const countsByGraduateId = new Map<string, number>();
    const fallbackCountsByDocument = new Map<string, number>();
    const seenCertificates = new Set<string>();

    certificates.forEach((certificate) => {
      const uniqueKey =
        certificate.id ||
        certificate.certificateNumber ||
        certificate.verificationCode ||
        `${certificate.graduateId || ''}:${certificate.idNumber || ''}:${certificate.issueDate || ''}`;
      if (uniqueKey && seenCertificates.has(uniqueKey)) {
        return;
      }
      if (uniqueKey) {
        seenCertificates.add(uniqueKey);
      }

      const graduateId = (certificate.graduateId || '').trim();
      if (graduateId) {
        countsByGraduateId.set(
          graduateId,
          (countsByGraduateId.get(graduateId) || 0) + 1,
        );
        return;
      }

      const documentKey = normalizeDocumentKey(certificate.idNumber);
      if (documentKey) {
        fallbackCountsByDocument.set(
          documentKey,
          (fallbackCountsByDocument.get(documentKey) || 0) + 1,
        );
      }
    });

    return { countsByGraduateId, fallbackCountsByDocument };
  };
  const normalizeDisplayName = (value?: string) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return trimmed;
    const normalized = normalizeKey(trimmed);
    if (normalized === 'super user' || normalized === 'superuser') {
      return 'Super Usuario';
    }
    return trimmed;
  };
  const legacyIntegrationSource = ['registro', 'academico'].join(' ');
  const isIntegrationSource = (normalized: string) =>
    !normalized ||
    normalized === 'system' ||
    normalized === 'sistema' ||
    normalized === 'verificacion de titulos' ||
    normalized === legacyIntegrationSource ||
    normalized.includes('integracion') ||
    normalized.includes('integración') ||
    normalized.includes('integration');
  const extractSourceActor = (createdBy: string | undefined, prefix: string) => {
    const rawValue = (createdBy || '').trim();
    const separatorIndex = rawValue.indexOf(':');
    if (separatorIndex < 0) return '';
    const rawPrefix = normalizeKey(rawValue.slice(0, separatorIndex));
    if (rawPrefix !== normalizeKey(prefix)) return '';
    return rawValue.slice(separatorIndex + 1).trim();
  };
  const resolveEnrollmentMethod = (createdBy?: string): GraduateRow['enrollmentMethod'] => {
    const normalized = normalizeKey(createdBy);
    if (normalized.startsWith('bulk_upload')) {
      return 'massive';
    }
    if (
      normalized.includes('manual_review') ||
      normalized.includes('revision') ||
      normalized.includes('revisión')
    ) {
      return 'request';
    }
    if (normalized.includes('manual')) {
      return 'manual';
    }
    return 'integration';
  };
  const formatCreatedBy = (createdBy?: string): string => {
    const normalized = normalizeKey(createdBy);
    if (!normalized) {
      return 'Integración';
    }
    if (normalized.startsWith('manual_review:')) {
      const reviewer = extractSourceActor(createdBy, 'manual_review');
      return normalizeDisplayName(reviewer) || 'Solicitud';
    }
    if (normalized === 'manual_review') {
      return 'Solicitud';
    }
    if (normalized.startsWith('bulk_upload:')) {
      const uploader = extractSourceActor(createdBy, 'bulk_upload');
      return normalizeDisplayName(uploader) || 'Carga masiva';
    }
    if (normalized === 'bulk_upload') {
      return 'Carga masiva';
    }
    if (isIntegrationSource(normalized)) {
      return 'Integración';
    }
    return normalizeDisplayName(createdBy) || 'Integración';
  };

  const canDeleteGraduateRecord = (user?: GraduateRow | null) =>
    !!user &&
    canEditGraduates &&
    (user.enrollmentMethod === 'request' || user.enrollmentMethod === 'massive');

  const loadGraduateFiles = async (graduateId: string) => {
    setIsLoadingFiles(true);
    try {
      const files = await graduadosService.graduados.listarArchivos(graduateId);
      setFilesModalItems(files || []);
      setGraduates((prev) =>
        prev.map((item) =>
          item.id === graduateId
            ? { ...item, documentsCount: files?.length ?? 0 }
            : item,
        ),
      );
    } catch (error) {
      console.error('Error cargando archivos del graduado:', error);
      toast.error('No se pudieron cargar los archivos del graduado');
      setFilesModalItems([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleOpenFilesModal = async (user: GraduateRow) => {
    setFilesModalUser(user);
    setIsFilesModalOpen(true);
    setFilesUploadQueue([]);
    setFilesUploadProgress({
      totalFiles: 0,
      processedFiles: 0,
      currentFileName: '',
      currentFilePercent: 0,
      overallPercent: 0,
    });
    await loadGraduateFiles(user.id);
  };

  const handleCloseFilesModal = () => {
    setIsFilesModalOpen(false);
    setFilesModalUser(null);
    setFilesModalItems([]);
    setIsLoadingFiles(false);
    setFilesUploadQueue([]);
    setIsUploadingFiles(false);
    setFilesUploadProgress({
      totalFiles: 0,
      processedFiles: 0,
      currentFileName: '',
      currentFilePercent: 0,
      overallPercent: 0,
    });
  };

  const handleFilesQueueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    const currentCount = filesModalItems.length + filesUploadQueue.length;
    const nextCount = currentCount + selected.length;
    if (nextCount > MAX_FILES_PER_GRADUATE) {
      toast.error(`Solo puede tener máximo ${MAX_FILES_PER_GRADUATE} archivos en total`);
      event.target.value = '';
      return;
    }
    const invalidFile = selected.find((file) => !isAllowedFile(file));
    if (invalidFile) {
      toast.error('Solo se permiten archivos PDF, Word, Excel o imágenes');
      event.target.value = '';
      return;
    }
    const oversizedFile = selected.find((file) => file.size > MAX_UPLOAD_SIZE_BYTES);
    if (oversizedFile) {
      toast.error('El archivo es muy pesado', {
        description: `El archivo "${oversizedFile.name}" supera el límite de ${MAX_UPLOAD_SIZE_LABEL}.`,
      });
      event.target.value = '';
      return;
    }
    setFilesUploadQueue((prev) => [...prev, ...selected]);
    event.target.value = '';
  };

  const handleRemoveQueuedFile = (index: number) => {
    setFilesUploadQueue((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUploadFiles = async () => {
    if (!filesModalUser || filesUploadQueue.length === 0) {
      return;
    }
    const oversizedFile = filesUploadQueue.find((file) => file.size > MAX_UPLOAD_SIZE_BYTES);
    if (oversizedFile) {
      toast.error('El archivo es muy pesado', {
        description: `El archivo "${oversizedFile.name}" supera el límite de ${MAX_UPLOAD_SIZE_LABEL}.`,
      });
      return;
    }
    const totalFiles = filesUploadQueue.length;
    setIsUploadingFiles(true);
    setFilesUploadProgress({
      totalFiles,
      processedFiles: 0,
      currentFileName: filesUploadQueue[0]?.name || '',
      currentFilePercent: 0,
      overallPercent: 0,
    });
    const uploader =
      authService.getCurrentUser()?.fullName || authService.getCurrentUser()?.email || undefined;
    const failedUploadIndexes = new Set<number>();
    let uploadedCount = 0;
    try {
      for (const [index, file] of filesUploadQueue.entries()) {
        setFilesUploadProgress((prev) => ({
          ...prev,
          processedFiles: index,
          currentFileName: file.name,
          currentFilePercent: 0,
          overallPercent: Number(((index / totalFiles) * 100).toFixed(1)),
        }));
        try {
          // Subida 1 a 1 para respetar el límite del servidor en requests multipart
          await graduadosService.graduados.subirArchivos(
            filesModalUser.id,
            [file],
            uploader,
            (progress) => {
              setFilesUploadProgress((prev) => ({
                ...prev,
                currentFileName: file.name,
                currentFilePercent: progress,
                overallPercent: Number((((index + progress / 100) / totalFiles) * 100).toFixed(1)),
              }));
            },
          );
          uploadedCount += 1;
        } catch (error: any) {
          failedUploadIndexes.add(index);
          console.error('Error subiendo archivo:', error);
          if (isPayloadTooLargeError(error)) {
            toast.error('El archivo es muy pesado', {
              description: `El archivo "${file.name}" supera el límite de ${MAX_UPLOAD_SIZE_LABEL} por archivo.`,
            });
          } else {
            toast.error(`No se pudo subir "${file.name}"`, {
              description: error?.response?.data?.message || error?.message,
            });
          }
        }
        const processedFiles = index + 1;
        setFilesUploadProgress((prev) => ({
          ...prev,
          processedFiles,
          currentFilePercent: 100,
          overallPercent: Number(((processedFiles / totalFiles) * 100).toFixed(1)),
        }));
      }

      if (uploadedCount > 0) {
        toast.success(
          uploadedCount === 1
            ? 'Archivo subido correctamente'
            : `${uploadedCount} archivos subidos correctamente`,
        );
        await loadGraduateFiles(filesModalUser.id);
      }

      if (failedUploadIndexes.size === 0) {
        setFilesUploadQueue([]);
      } else {
        setFilesUploadQueue((prev) => prev.filter((_, idx) => failedUploadIndexes.has(idx)));
      }
    } finally {
      setIsUploadingFiles(false);
      setFilesUploadProgress({
        totalFiles: 0,
        processedFiles: 0,
        currentFileName: '',
        currentFilePercent: 0,
        overallPercent: 0,
      });
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!filesModalUser) return;
    try {
      await graduadosService.graduados.eliminarArchivo(filesModalUser.id, fileId);
      toast.success('Archivo eliminado');
      await loadGraduateFiles(filesModalUser.id);
    } catch (error: any) {
      console.error('Error eliminando archivo:', error);
      toast.error('No se pudo eliminar el archivo', {
        description: error?.response?.data?.message || error?.message,
      });
    }
  };

  const handleRequestDeleteFile = (file: GraduadoArchivo) => {
    setFileToDelete(file);
    setIsDeleteFileModalOpen(true);
  };

  const handleCloseDeleteFileModal = () => {
    setIsDeleteFileModalOpen(false);
    setFileToDelete(null);
  };

  const handleConfirmDeleteFile = async () => {
    if (!fileToDelete) return;
    await handleDeleteFile(fileToDelete.id);
    handleCloseDeleteFileModal();
  };

  const saveBlobAsFile = (blob: Blob, fileName: string) => {
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = fileName || 'archivo';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleDownloadFile = async (file: GraduadoArchivo) => {
    const graduateId = file.graduateId || filesModalUser?.id;

    if (graduateId) {
      try {
        const blob = await graduadosService.graduados.descargarArchivo(graduateId, file.id, {
          skipErrorToast: true,
        });
        saveBlobAsFile(blob, file.originalName || 'archivo');
        return;
      } catch (error) {
      console.warn('Falló la descarga por endpoint dedicado, se intentará ruta pública', error);
      }
    }

    const fileUrl = buildServiceAssetUrl(
      'registro-academico',
      file.url || `/uploads/graduate-files/${file.storedName}`,
    );

    try {
      const response = await fetch(fileUrl, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('No se pudo descargar el archivo');
      }
      const blob = await response.blob();
      saveBlobAsFile(blob, file.originalName || 'archivo');
    } catch (error) {
      console.error('Error descargando archivo:', error);
      toast.error('No se pudo descargar el archivo');
    }
  };

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

  useEffect(() => {
    let isMounted = true;

    const loadGraduates = async () => {
      setIsLoading(true);
      try {
        const [estructuraResponse, graduatesResponse] = await Promise.all([
          estructuraService.obtenerEstructura().catch(() => null),
          graduadosService.graduados.listarRegistroAcademico(),
        ]);

        const { sedes: estructuraSedesMaestras, seccionales: estructuraSeccionalesMaestras } =
          parseEstructuraCatalog(estructuraResponse);
        const estructuraSedes = estructuraSedesMaestras;
        const estructuraSeccionales = estructuraSeccionalesMaestras;

        if (isMounted) {
          setSedesCatalog(estructuraSedes);
          setSeccionalesCatalog(estructuraSeccionales);
          setEstructuraPeriodoCatalogo('catálogo maestro');
        }

        const seccionalByName = new Map<string, Seccional>();
        estructuraSeccionalesMaestras.forEach((seccional) => {
          if (seccional?.nomSeccional) {
            seccionalByName.set(normalizeKey(seccional.nomSeccional), seccional);
          }
        });

        const sedeByName = new Map<string, Sede>();
        estructuraSedesMaestras.forEach((sede) => {
          if (sede?.nomSede) {
            sedeByName.set(normalizeKey(sede.nomSede), sede);
          }
        });

        const mappedGraduates = (graduatesResponse || []).map((graduate) => {
          const derivedName = splitFullName(graduate.fullName);
          const firstName =
            (graduate.firstName || '').trim() || derivedName.firstName;
          const lastName =
            (graduate.lastName || '').trim() || derivedName.lastName;
          const campus = graduate.campus || 'Sin sede';
          const sedeMatch = sedeByName.get(normalizeKey(campus));
          const sedeName = sedeMatch?.nomSede || campus;
          const rawSeccionalName = (graduate.seccionalName || '').trim();
          const programName = (graduate.programName || '').trim();
          const degreeTitle = (graduate.degreeTitle || '').trim();
          const territorialName = rawSeccionalName
            ? seccionalByName.get(normalizeKey(rawSeccionalName))?.nomSeccional
            : undefined;
          const createdBy = graduate.createdBy;
          return {
            id: graduate.id,
            personId: graduate.personId,
            firstName,
            lastName,
            email: graduate.email || '',
            phone: graduate.phone || 'N/A',
            status: mapGraduateStatus(graduate.status),
            roles: [
              {
                name: 'Graduado',
                color: 'green',
                since: graduate.graduationDate,
              },
            ],
            location: sedeName,
            territorial: territorialName,
            sourceTerritorial: rawSeccionalName || undefined,
            program: programName || degreeTitle || 'No especificado',
            programName: programName || undefined,
            degreeTitle: degreeTitle || undefined,
            document: graduate.idNumber,
            enrollmentMethod: resolveEnrollmentMethod(createdBy),
            enrollmentDate: graduate.enrollmentDate || '',
            graduationDate: graduate.graduationDate,
            documentsCount: graduate.filesCount ?? 0,
            createdBy: createdBy?.trim() || undefined,
            asignacionesSedes: sedeName ? [{ nombreSede: sedeName }] : undefined,
            // Valor inicial para render rápido; luego se actualiza en segundo plano.
            certificatesCount: 0,
            numRegistro: graduate.numRegistro,
            numFolio: graduate.numFolio,
            numLibro: graduate.numLibro,
            createdAt: graduate.createdAt,
            updatedAt: graduate.updatedAt,
          } as GraduateRow;
        });

        const getGraduateSortTime = (value?: string) => {
          if (!value) return 0;
          const timestamp = new Date(value).getTime();
          return Number.isNaN(timestamp) ? 0 : timestamp;
        };

        const sortedGraduates = [...mappedGraduates].sort((a, b) => {
          const aTime =
            getGraduateSortTime(a.createdAt) ||
            getGraduateSortTime(a.updatedAt) ||
            getGraduateSortTime(a.enrollmentDate) ||
            getGraduateSortTime(a.graduationDate);
          const bTime =
            getGraduateSortTime(b.createdAt) ||
            getGraduateSortTime(b.updatedAt) ||
            getGraduateSortTime(b.enrollmentDate) ||
            getGraduateSortTime(b.graduationDate);
          return bTime - aTime;
        });

        if (isMounted) {
          setGraduates(sortedGraduates);
        }

        // Cargar conteos de certificados en segundo plano para no bloquear la primera renderización.
        void graduadosService.certificados
          .listar()
          .then((certificatesResponse) => {
            if (!isMounted) return;

            const { countsByGraduateId, fallbackCountsByDocument } =
              buildCertificateCountIndexes(certificatesResponse || []);

            setGraduates((prev) =>
              prev.map((graduate) => {
                const documentKey = normalizeDocumentKey(graduate.document);
                return {
                  ...graduate,
                  certificatesCount:
                    countsByGraduateId.get(graduate.id) ??
                    (documentKey
                      ? fallbackCountsByDocument.get(documentKey)
                      : undefined) ??
                    0,
                };
              }),
            );
          })
          .catch((error) => {
            console.warn('No se pudieron actualizar los conteos de certificados:', error);
          });
      } catch (error) {
        console.error('Error cargando graduados:', error);
        toast.error('No se pudieron cargar los graduados', {
          description: 'Intente recargar la página o verifique su conexión.',
        });
        if (isMounted) {
          setGraduates([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadGraduates();

    return () => {
      isMounted = false;
    };
  }, [catalogRefreshToken]);

  const graduatesOnly = useMemo(() => graduates, [graduates]);
  const totalQueuedFiles = filesModalItems.length + filesUploadQueue.length;
  const isFilesInputDisabled =
    isLoadingFiles || isUploadingFiles || totalQueuedFiles >= MAX_FILES_PER_GRADUATE;

  const stats = useMemo(() => {
    const active = graduatesOnly.filter(u => u.status === 'active').length;
    const blocked = graduatesOnly.filter(u => u.status === 'blocked').length;
    return {
      total: graduatesOnly.length,
      active,
      blocked,
      growth: 8.5,
    };
  }, [graduatesOnly]);

  // Programas provenientes de la integración: se toman de los graduados creados
  // por ese medio (enrollmentMethod === 'integration'), se descartan los vacíos
  // y "No especificado", y se muestran sin repetidos. Son la fuente dinámica de
  // los selects de programa (filtro y edición). En local, donde normalmente no
  // hay integración, esta lista queda vacía; en los servidores se llena sola.
  const integrationProgramOptions = useMemo(
    () =>
      uniqueSortedText(
        graduatesOnly
          .filter((graduate) => graduate.enrollmentMethod === 'integration')
          .flatMap((graduate) => [
            graduate.programName,
            graduate.degreeTitle,
            graduate.program,
          ]),
      ).filter((programa) => normalizeKey(programa) !== 'no especificado'),
    [graduatesOnly, normalizeKey],
  );
  const selectedIntegrationProgram = useMemo(
    () =>
      integrationProgramOptions.find(
        (programa) => normalizeKey(programa) === normalizeKey(editForm.program),
      ),
    [editForm.program, integrationProgramOptions, normalizeKey],
  );
  const externalEditProgram =
    editForm.program.trim() && !selectedIntegrationProgram
      ? editForm.program
      : '';
  const editProgramOptions = useMemo(
    () => uniqueSortedText([externalEditProgram, ...integrationProgramOptions]),
    [externalEditProgram, integrationProgramOptions],
  );

  const catalogTerritorialOptions = useMemo(
    () => {
      const seccionales = seccionalesCatalog
        .map((seccional) => normalizeSpaces(seccional?.nomSeccional || ''))
        .filter(Boolean);
      if (seccionales.length > 0) return seccionales;

      return sedesCatalog
        .map((sede) => normalizeSpaces(sede?.seccional?.nomSeccional || ''))
        .filter(Boolean);
    },
    [seccionalesCatalog, sedesCatalog],
  );

  const catalogSedeOptions = useMemo(
    () => sedesCatalog.map((sede) => normalizeSpaces(sede?.nomSede || '')).filter(Boolean),
    [sedesCatalog],
  );

  const graduateSedeOptions = useMemo(() => {
    return uniqueSortedText(
      graduatesOnly.flatMap((user) => [
        user.location,
        ...(user.asignacionesSedes?.map((asig) => asig?.nombreSede) || []),
      ]),
    );
  }, [graduatesOnly]);

  const knownSedeKeys = useMemo(
    () => new Set([...catalogSedeOptions, ...graduateSedeOptions].map((sede) => normalizeKey(sede))),
    [catalogSedeOptions, graduateSedeOptions, normalizeKey],
  );

  const territorialOptions = useMemo(() => {
    return catalogTerritorialOptions;
  }, [catalogTerritorialOptions]);

  const sedesOptions = useMemo(() => {
    return catalogSedeOptions;
  }, [catalogSedeOptions]);

  const seccionalById = useMemo(() => {
    const map = new Map<number, Seccional>();
    seccionalesCatalog.forEach((seccional) => {
      map.set(seccional.idSeccional, seccional);
    });
    return map;
  }, [seccionalesCatalog]);

  const territorialBySede = useMemo(() => {
    const map = new Map<string, string>();

    sedesCatalog.forEach((sede) => {
      if (!sede?.nomSede) return;
      const seccionalName =
        sede.seccional?.nomSeccional ||
        (sede.idSeccional ? seccionalById.get(sede.idSeccional)?.nomSeccional : undefined);
      if (seccionalName) {
        map.set(normalizeKey(sede.nomSede), seccionalName);
      }
    });

    if (map.size === 0) {
      graduatesOnly.forEach((user) => {
        const territorialName = user.territorial?.trim();
        if (!territorialName || knownSedeKeys.has(normalizeKey(territorialName))) return;

        const sedes = [
          user.location,
          ...(user.asignacionesSedes?.map((asig) => asig?.nombreSede) || []),
        ];

        sedes.forEach((sedeName) => {
          const sedeKey = normalizeKey(sedeName);
          if (sedeKey && !map.has(sedeKey)) {
            map.set(sedeKey, territorialName);
          }
        });
      });
    }

    return map;
  }, [sedesCatalog, seccionalById, graduatesOnly, knownSedeKeys, normalizeKey]);

  const sedesByTerritorial = useMemo(() => {
    const map = new Map<string, string[]>();

    seccionalesCatalog.forEach((seccional) => {
      const seccionalName = seccional?.nomSeccional?.trim();
      if (seccionalName) {
        map.set(normalizeKey(seccionalName), []);
      }
    });

    sedesCatalog.forEach((sede) => {
      const sedeName = sede?.nomSede?.trim();
      if (!sedeName) return;

      const seccionalName =
        sede.seccional?.nomSeccional ||
        (sede.idSeccional ? seccionalById.get(sede.idSeccional)?.nomSeccional : undefined);
      if (!seccionalName) return;

      const seccionalKey = normalizeKey(seccionalName);
      if (!map.has(seccionalKey)) {
        map.set(seccionalKey, []);
      }
      map.get(seccionalKey)?.push(sedeName);
    });

    const hasCatalogSedeRelations = Array.from(map.values()).some((sedes) => sedes.length > 0);

    if (!hasCatalogSedeRelations) {
      graduatesOnly.forEach((user) => {
        const seccionalName =
          user.territorial?.trim() ||
          (user.location ? territorialBySede.get(normalizeKey(user.location)) : '');
        if (!seccionalName || knownSedeKeys.has(normalizeKey(seccionalName))) return;

        const seccionalKey = normalizeKey(seccionalName);
        if (!map.has(seccionalKey)) {
          map.set(seccionalKey, []);
        }

        [
          user.location,
          ...(user.asignacionesSedes?.map((asig) => asig?.nombreSede) || []),
        ].forEach((sedeName) => {
          const cleanedSede = normalizeSpaces(sedeName || '');
          if (cleanedSede) {
            map.get(seccionalKey)?.push(cleanedSede);
          }
        });
      });
    }

    return new Map<string, string[]>(
      Array.from(map.entries()).map(([seccionalKey, sedes]): [string, string[]] => [
        seccionalKey,
        sedes,
      ]),
    );
  }, [
    seccionalesCatalog,
    sedesCatalog,
    seccionalById,
    graduatesOnly,
    territorialBySede,
    knownSedeKeys,
    normalizeKey,
  ]);

  const bulkSedeTerritorialOptions = useMemo(() => {
    const options: Array<{ territorial: string; sede: string }> = [];

    territorialOptions.forEach((territorial) => {
      const sedes = sedesByTerritorial.get(normalizeKey(territorial)) || [];
      sedes.forEach((sede) => {
        options.push({ territorial, sede });
      });
    });

    if (options.length === 0) {
      sedesOptions.forEach((sede) => {
        const territorial = territorialBySede.get(normalizeKey(sede)) || '';
        options.push({ territorial, sede });
      });
    }

    return options;
  }, [
    territorialOptions,
    sedesByTerritorial,
    sedesOptions,
    territorialBySede,
    normalizeKey,
  ]);

  const sedeFilterOptions = useMemo(() => {
    if (locationFilter === 'all') {
      return sedesOptions;
    }

    const sedesForTerritorial = sedesByTerritorial.get(normalizeKey(locationFilter)) || [];
    return sedesForTerritorial;
  }, [locationFilter, sedesOptions, sedesByTerritorial, normalizeKey]);

  const sedeFilterGroups = useMemo(() => {
    const groupedSedeKeys = new Set<string>();
    const groups = territorialOptions
      .map((territorial) => {
        const sedes = sedesByTerritorial.get(normalizeKey(territorial)) || [];
        sedes.forEach((sede) => groupedSedeKeys.add(normalizeKey(sede)));
        return { territorial, sedes };
      })
      .filter((group) => group.sedes.length > 0);

    const ungrouped = sedesOptions.filter((sede) => !groupedSedeKeys.has(normalizeKey(sede)));

    return { groups, ungrouped };
  }, [territorialOptions, sedesByTerritorial, sedesOptions, normalizeKey]);

  const editTerritorialOptions = useMemo(() => {
    const mappedTerritorial = editForm.location
      ? territorialBySede.get(normalizeKey(editForm.location))
      : '';
    return [
      editForm.territorial,
      mappedTerritorial,
      ...territorialOptions,
    ].map((territorial) => normalizeSpaces(territorial || '')).filter(Boolean);
  }, [
    editForm.location,
    editForm.territorial,
    territorialBySede,
    territorialOptions,
  ]);

  const editSedesOptions = useMemo(() => {
    const selectedTerritorialKey = normalizeKey(editForm.territorial);
    const hasSelectedTerritorialCatalog =
      !!selectedTerritorialKey && sedesByTerritorial.has(selectedTerritorialKey);
    const baseOptions = hasSelectedTerritorialCatalog
      ? sedesByTerritorial.get(selectedTerritorialKey) || []
      : [];

    // Los graduados integrados pueden conservar una territorial/sede externa al
    // catálogo vigente. En ese caso se mantiene únicamente su sede actual; no se
    // mezclan todas las sedes del catálogo ni se obliga al usuario a reemplazarla.
    return [editForm.location, ...baseOptions]
      .map((sede) => normalizeSpaces(sede || ''))
      .filter(Boolean);
  }, [
    editForm.location,
    editForm.territorial,
    sedesByTerritorial,
    normalizeKey,
  ]);

  useEffect(() => {
    if (
      programFilter !== 'all' &&
      !integrationProgramOptions.some(
        (programa) => normalizeKey(programa) === normalizeKey(programFilter),
      )
    ) {
      setProgramFilter('all');
    }
  }, [programFilter, integrationProgramOptions, normalizeKey]);

  useEffect(() => {
    if (
      locationFilter !== 'all' &&
      !territorialOptions.some(
        (territorial) => normalizeKey(territorial) === normalizeKey(locationFilter),
      )
    ) {
      setLocationFilter('all');
    }
  }, [locationFilter, territorialOptions, normalizeKey]);

  useEffect(() => {
    if (sedeFilter === 'all') {
      return;
    }

    const sedeStillBelongsToTerritorial = sedeFilterOptions.some(
      (sede) => normalizeKey(sede) === normalizeKey(sedeFilter),
    );

    if (!sedeStillBelongsToTerritorial) {
      setSedeFilter('all');
    }
  }, [locationFilter, sedeFilter, sedeFilterOptions, normalizeKey]);

  const filteredUsers = useMemo(() => {
    return graduatesOnly.filter(user => {
      const matchesSearch = searchQuery === '' ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.document.includes(searchQuery);
      
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const matchesProgram =
        programFilter === 'all' || normalizeKey(user.program) === normalizeKey(programFilter);
      const mappedTerritorial =
        user.location ? territorialBySede.get(normalizeKey(user.location)) : undefined;
      const storedTerritorial =
        user.territorial && !knownSedeKeys.has(normalizeKey(user.territorial))
          ? user.territorial
          : undefined;
      const effectiveTerritorial =
        mappedTerritorial || storedTerritorial;
      const matchesLocation =
        locationFilter === 'all' ||
        normalizeKey(effectiveTerritorial) === normalizeKey(locationFilter);
      const userSedes = [
        user.location,
        ...(user.asignacionesSedes?.map((asig) => asig?.nombreSede) || []),
      ];
      const matchesSede =
        sedeFilter === 'all' ||
        userSedes.some((sede) => normalizeKey(sede) === normalizeKey(sedeFilter));
      
      return matchesSearch && matchesStatus && matchesProgram && matchesLocation && matchesSede;
    });
  }, [
    graduatesOnly,
    searchQuery,
    statusFilter,
    programFilter,
    locationFilter,
    sedeFilter,
    territorialBySede,
    knownSedeKeys,
    normalizeKey,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, programFilter, locationFilter, sedeFilter]);

  // Paginación
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Helpers
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      active: { 
        label: 'Activo', 
        className: 'bg-[#ECFDF5] text-[#065F46] border-[#10B981]',
        icon: CheckCircle
      },
      blocked: { 
        label: 'Bloqueado', 
        className: 'bg-[#FEF2F2] text-[#991B1B] border-[#EF4444]',
        icon: XCircle
      },
      inactive: { 
        label: 'Inactivo', 
        className: 'bg-[#F3F4F6] text-[#374151] border-[#D1D5DB]',
        icon: AlertCircle
      }
    };
    
    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.className} border hover:${config.className}`}>
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">{config.label}</span>
        </div>
      </Badge>
    );
  };

  const getRoleBadge = (roleName: string, roleColor: string) => {
    const colorConfig: Record<string, string> = {
      blue: 'bg-[#EFF6FF] text-[#1E40AF] border-[#3B82F6]',
      purple: 'bg-[#EDE9FE] text-[#5B21B6] border-[#8B5CF6]',
      green: 'bg-[#D1FAE5] text-[#065F46] border-[#10B981]',
      orange: 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]',
      red: 'bg-[#FEE2E2] text-[#991B1B] border-[#EF4444]'
    };
    
    return (
      <Badge className={`${colorConfig[roleColor] || colorConfig.blue} border text-xs font-medium`}>
        {roleName}
      </Badge>
    );
  };

  const getEnrollmentBadge = (method: GraduateRow['enrollmentMethod']) => {
    const methodConfig: Record<string, { label: string; className: string; icon: any }> = {
      qr: { 
        label: 'QR Code', 
        className: 'bg-violet-50 text-violet-700 border-violet-200',
        icon: QrCode
      },
      manual: { 
        label: 'Manual', 
        className: 'bg-sky-50 text-sky-700 border-sky-200',
        icon: UserPlus
      },
      request: {
        label: 'Solicitud',
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: FileCheck2
      },
      integration: {
        label: 'Integración',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: Database
      },
      massive: { 
        label: 'Carga Masiva', 
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: Upload
      }
    };
    
    const config = methodConfig[method];
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.className} border shadow-sm transition-colors`}>
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">{config.label}</span>
        </div>
      </Badge>
    );
  };


  const handleEdit = (user: GraduateRow) => {
    if (!canEditGraduates) {
      toast.error('Permiso requerido', {
        description: 'Se requiere el permiso Editar Graduado para modificar este registro.',
      });
      return;
    }

    const sanitizedPhone = (user.phone || '').replace(/\D+/g, '').slice(0, 10);
    const rawStoredTerritorial =
      (user.sourceTerritorial || user.territorial || '').trim();
    const catalogTerritorial = territorialOptions.find(
      (territorial) =>
        normalizeKey(territorial) === normalizeKey(rawStoredTerritorial),
    );
    const storedTerritorial =
      catalogTerritorial ||
      rawStoredTerritorial ||
      (user.location
        ? territorialBySede.get(normalizeKey(user.location)) || ''
        : '');
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: (user.email || '').trim(),
      phone: sanitizedPhone,
      document: sanitizeAlphanumeric(user.document || '', DOCUMENT_MAX_LENGTH),
      program: user.program || '',
      location: user.location,
      territorial: storedTerritorial,
      numRegistro: sanitizeRegistryInput(
        user.numRegistro || '',
        REGISTRY_NUMBER_MAX_LENGTH,
      ),
      numFolio: sanitizeRegistryInput(user.numFolio || '', FOLIO_BOOK_MAX_LENGTH),
      numLibro: sanitizeRegistryInput(user.numLibro || '', FOLIO_BOOK_MAX_LENGTH),
    });
    setIsEditModalOpen(true);
  };

  const handleLocationChange = (value: string) => {
    setEditForm((prev) => ({
      ...prev,
      location: value,
    }));
  };

  const handleTerritorialChange = (value: string) => {
    const selectedTerritorialKey = normalizeKey(value);
    const sedesForTerritorial =
      selectedTerritorialKey && sedesByTerritorial.has(selectedTerritorialKey)
        ? sedesByTerritorial.get(selectedTerritorialKey) || []
        : null;

    setEditForm((prev) => {
      const keepLocation =
        !value ||
        !prev.location ||
        !sedesForTerritorial ||
        sedesForTerritorial.some(
          (sede) => normalizeKey(sede) === normalizeKey(prev.location),
        );

      return {
        ...prev,
        territorial: value,
        location: keepLocation ? prev.location : '',
      };
    });
  };

  const handleDelete = (user: GraduateRow) => {
    if (!canDeleteGraduateRecord(user)) {
      toast.error('No se puede eliminar este graduado', {
        description: 'Solo los graduados creados por solicitud o carga masiva pueden eliminarse desde esta vista.',
      });
      return;
    }

    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleViewDetails = (user: GraduateRow) => {
    setExpandedUserId((current) => (current === user.id ? null : user.id));
  };

  const handleBlockUser = (user: GraduateRow) => {
    setSelectedUser(user);
    setIsBlockModalOpen(true);
  };

  const handleActivateUser = (user: GraduateRow) => {
    toast.success('Graduado Activado', { 
      description: `${user.firstName} ${user.lastName} ha sido activado exitosamente.`
    });
  };

  const handleVerifyTitle = (user?: GraduateRow) => {
    if (!canVerifyGraduateCertificates) {
      toast.error('Permiso requerido', {
        description: 'Se requiere el permiso Verificar Certificado para abrir esta validación.',
      });
      return;
    }

    // setSelectedUser(user);
    // window.location.href = '/verificar-certificado-graduado';
    // ✅ NUEVO: Abrir vista completa de validación de certificados de grado
    setMostrarValidador(true);
  };

  const handleGenerateCertificate = (user: GraduateRow) => {
    setSelectedUser(user);
    setIsGenerateCertModalOpen(true);
  };

  const handleSendEmail = (user: GraduateRow) => {
    setSelectedUser(user);
    setEmailForm({
      subject: `Información importante para graduado - ${user.firstName} ${user.lastName}`,
      message: ''
    });
    setIsEmailModalOpen(true);
  };

  const handleOpenBulkUploadModal = () => {
    if (!canBulkUploadGraduates) {
      toast.error('Permiso requerido', {
        description: 'Se requiere el permiso de Carga Masiva de graduados.',
      });
      return;
    }
    setIsBulkUploadModalOpen(true);
  };

  const handleBulkGraduatesImported = (createdGraduates: GraduadoData[]) => {
    if (!createdGraduates.length) return;

    const importedRows = createdGraduates.map((graduate) => {
      const derivedName = splitFullName(graduate.fullName);
      const firstName = (graduate.firstName || '').trim() || derivedName.firstName;
      const lastName = (graduate.lastName || '').trim() || derivedName.lastName;
      const campus = graduate.campus || 'Sin sede';
      const programName = (graduate.programName || '').trim();
      const degreeTitle = (graduate.degreeTitle || '').trim();
      const mappedTerritorial = campus
        ? territorialBySede.get(normalizeKey(campus))
        : undefined;
      const storedTerritorial =
        graduate.seccionalName && !knownSedeKeys.has(normalizeKey(graduate.seccionalName))
          ? graduate.seccionalName
          : undefined;
      const territorial =
        mappedTerritorial || storedTerritorial;

      return {
        id: graduate.id,
        personId: graduate.personId,
        firstName,
        lastName,
        email: graduate.email || '',
        phone: graduate.phone || 'N/A',
        status: mapGraduateStatus(graduate.status),
        roles: [
          {
            name: 'Graduado',
            color: 'green',
            since: graduate.graduationDate,
          },
        ],
        location: campus,
        territorial,
        sourceTerritorial: graduate.seccionalName || undefined,
        program: programName || degreeTitle || 'No especificado',
        programName: programName || undefined,
        degreeTitle: degreeTitle || undefined,
        document: graduate.idNumber,
        enrollmentMethod: resolveEnrollmentMethod(graduate.createdBy || 'bulk_upload'),
        enrollmentDate: graduate.enrollmentDate || graduate.createdAt || '',
        graduationDate: graduate.graduationDate,
        documentsCount: graduate.filesCount ?? 0,
        createdBy: graduate.createdBy || 'bulk_upload',
        asignacionesSedes: campus ? [{ nombreSede: campus }] : undefined,
        certificatesCount: 0,
        numRegistro: graduate.numRegistro,
        numFolio: graduate.numFolio,
        numLibro: graduate.numLibro,
        createdAt: graduate.createdAt,
        updatedAt: graduate.updatedAt,
      } as GraduateRow;
    });

    setGraduates((prev) => {
      const existingIds = new Set(prev.map((graduate) => graduate.id));
      const newRows = importedRows.filter((graduate) => !existingIds.has(graduate.id));
      return [...newRows, ...prev];
    });
    setCurrentPage(1);
  };

  // Handlers para confirmar acciones en modales
  const confirmEdit = async () => {
    if (!selectedUser) return;
    if (!canEditGraduates) {
      toast.error('Permiso requerido', {
        description: 'Se requiere el permiso Editar Graduado para guardar cambios.',
      });
      return;
    }

    const trimmedFirstName = normalizeSpaces(editForm.firstName);
    const trimmedLastName = normalizeSpaces(editForm.lastName);
    const trimmedDocument = editForm.document.trim();
    const trimmedEmail = editForm.email.trim();
    const trimmedProgram = editForm.program.trim();
    const trimmedLocation = editForm.location.trim();
    const cleanNumRegistro = sanitizeRegistryInput(
      editForm.numRegistro,
      REGISTRY_NUMBER_MAX_LENGTH,
    );
    const cleanNumFolio = sanitizeRegistryInput(
      editForm.numFolio,
      FOLIO_BOOK_MAX_LENGTH,
    );
    const cleanNumLibro = sanitizeRegistryInput(
      editForm.numLibro,
      FOLIO_BOOK_MAX_LENGTH,
    );
    const effectiveTerritorial = editForm.territorial.trim();
    const firstNameError = getPersonNameValidationError(trimmedFirstName, 'El nombre');
    if (firstNameError) {
      toast.error(firstNameError);
      return;
    }
    const lastNameError = getPersonNameValidationError(trimmedLastName, 'El apellido');
    if (lastNameError) {
      toast.error(lastNameError);
      return;
    }
    const fullName = `${trimmedFirstName} ${trimmedLastName}`.trim();
    if (
      fullName.length < PERSON_NAME_MIN_LENGTH ||
      fullName.length > PERSON_NAME_MAX_LENGTH
    ) {
      toast.error(
        `El nombre completo debe tener entre ${PERSON_NAME_MIN_LENGTH} y ${PERSON_NAME_MAX_LENGTH} caracteres`,
      );
      return;
    }
    if (!trimmedDocument) {
      toast.error('El documento es obligatorio');
      return;
    }
    if (!DOCUMENT_ALLOWED_REGEX.test(trimmedDocument)) {
      toast.error('El documento solo puede contener letras y números');
      return;
    }
    if (
      trimmedDocument.length < DOCUMENT_MIN_LENGTH ||
      trimmedDocument.length > DOCUMENT_MAX_LENGTH
    ) {
      toast.error(
        `El documento debe tener entre ${DOCUMENT_MIN_LENGTH} y ${DOCUMENT_MAX_LENGTH} caracteres`,
      );
      return;
    }
    if (!trimmedEmail) {
      toast.error('El correo electrónico es obligatorio');
      return;
    }
    if (
      trimmedEmail.length < EMAIL_MIN_LENGTH ||
      trimmedEmail.length > EMAIL_MAX_LENGTH
    ) {
      toast.error(
        `El correo electrónico debe tener entre ${EMAIL_MIN_LENGTH} y ${EMAIL_MAX_LENGTH} caracteres`,
      );
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('El correo electrónico no tiene un formato válido');
      return;
    }
    if (!trimmedProgram) {
      toast.error('El programa académico es obligatorio');
      return;
    }
    if (!trimmedLocation) {
      toast.error('La sede es obligatoria');
      return;
    }
    if (!effectiveTerritorial) {
      toast.error('La territorial es obligatoria');
      return;
    }
    if (!cleanNumRegistro) {
      toast.error(
        `El número de registro es obligatorio y debe tener entre 1 y ${REGISTRY_NUMBER_MAX_LENGTH} caracteres numéricos`,
      );
      return;
    }
    if (!cleanNumFolio) {
      toast.error(
        `El número de folio es obligatorio y debe tener entre 1 y ${FOLIO_BOOK_MAX_LENGTH} caracteres numéricos`,
      );
      return;
    }
    if (!cleanNumLibro) {
      toast.error(
        `El número de libro es obligatorio y debe tener entre 1 y ${FOLIO_BOOK_MAX_LENGTH} caracteres numéricos`,
      );
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<GraduadoData> = {
        fullName,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        idNumber: trimmedDocument,
        programName: trimmedProgram,
        campus: trimmedLocation || undefined,
        seccionalName: effectiveTerritorial,
        numRegistro: cleanNumRegistro,
        numFolio: cleanNumFolio,
        numLibro: cleanNumLibro,
      };

      await graduadosService.graduados.actualizar(selectedUser.id, payload);

      setGraduates((prev) =>
        prev.map((graduate) =>
          graduate.id === selectedUser.id
            ? {
                ...graduate,
                firstName: trimmedFirstName,
                lastName: trimmedLastName,
                email: trimmedEmail,
                document: trimmedDocument,
                numRegistro: cleanNumRegistro,
                numFolio: cleanNumFolio,
                numLibro: cleanNumLibro,
                program: trimmedProgram,
                location: trimmedLocation || graduate.location,
                territorial: effectiveTerritorial,
                sourceTerritorial: effectiveTerritorial,
              }
            : graduate
        )
      );

      toast.success('Graduado Actualizado', {
        description: `Los datos de ${trimmedFirstName} ${trimmedLastName} han sido actualizados exitosamente.`,
      });
      setIsEditModalOpen(false);
    } catch (error: any) {
      console.error('Error actualizando graduado:', error);
      toast.error('No se pudo actualizar el graduado', {
        description: error?.response?.data?.message || error?.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    if (!canDeleteGraduateRecord(selectedUser)) {
      toast.error('No se puede eliminar este graduado', {
        description: 'Solo los graduados creados por solicitud o carga masiva pueden eliminarse desde esta vista.',
      });
      setIsDeleteModalOpen(false);
      return;
    }

    setIsDeletingGraduate(true);
    try {
      await graduadosService.graduados.eliminar(selectedUser.id);

      setGraduates((prev) => prev.filter((graduate) => graduate.id !== selectedUser.id));
      setExpandedUserId((current) => (current === selectedUser.id ? null : current));
      toast.success('Graduado eliminado', {
        description: `Se eliminó: ${selectedUser.firstName} ${selectedUser.lastName}`,
      });
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error eliminando graduado:', error);
      toast.error('No se pudo eliminar el graduado', {
        description: error?.response?.data?.message || error?.message,
      });
    } finally {
      setIsDeletingGraduate(false);
    }
  };

  const confirmBlock = () => {
    toast.success('Graduado Bloqueado', {
      description: `${selectedUser?.firstName} ${selectedUser?.lastName} ha sido bloqueado exitosamente.`
    });
    setIsBlockModalOpen(false);
  };

  const confirmVerifyTitle = () => {
    toast.success('Certificado Verificado', {
      description: `El certificado de ${selectedUser?.firstName} ${selectedUser?.lastName} ha sido verificado exitosamente.`
    });
    setIsVerifyTitleModalOpen(false);
  };

  const confirmGenerateCertificate = () => {
    toast.success('Certificado Generado', {
      description: `Certificado de ${selectedUser?.firstName} ${selectedUser?.lastName} generado en formato ${certForm.format.toUpperCase()}.`
    });
    setIsGenerateCertModalOpen(false);
  };

  const confirmSendEmail = () => {
    toast.success('Email Enviado', {
      description: `Email enviado exitosamente a ${selectedUser?.email}`
    });
    setIsEmailModalOpen(false);
  };

  const escapeCsvValue = (value: string | number | null | undefined) => {
    const safeValue = value === null || value === undefined ? '' : String(value);
    return `"${safeValue.replace(/"/g, '""')}"`;
  };

  const handleOpenExportModal = () => {
    if (!canExportGraduates) {
      toast.error('Permiso requerido', {
        description: 'Se requiere el permiso Exportar Graduados para descargar esta información.',
      });
      return;
    }

    if (filteredUsers.length > 0) {
      setIsExportModalOpen(true);
      return;
    }

    toast.info('No hay graduados para exportar', {
      description: hasActiveFilters
        ? 'Los filtros activos no tienen resultados. Ajústelos antes de exportar.'
        : 'Aún no existen graduados registrados para exportación.',
    });
  };

  const handleExportGraduates = () => {
    if (isExporting) return;
    if (!canExportGraduates) {
      toast.error('Permiso requerido', {
        description: 'Se requiere el permiso Exportar Graduados para descargar esta información.',
      });
      return;
    }

    const startDate = parseDateOnly(exportStartDate);
    const endDate = parseDateOnly(exportEndDate);

    if (startDate && endDate && startDate > endDate) {
      toast.error('Rango de fechas inválido', {
        description: 'La fecha inicial no puede ser mayor que la fecha final.',
      });
      return;
    }

    setIsExporting(true);

    if (filteredUsers.length === 0) {
      toast.info('No hay graduados para exportar', {
        description: hasActiveFilters
          ? 'Los filtros activos no tienen resultados. Ajústelos antes de exportar.'
          : 'Aún no existen graduados registrados para exportación.',
      });
      setIsExporting(false);
      return;
    }

    const rows = filteredUsers.filter((user) => {
      if (!startDate && !endDate) return true;
      const enrollmentDate = parseDateOnly(user.enrollmentDate);
      if (!enrollmentDate) return false;
      if (startDate && enrollmentDate < startDate) return false;
      if (endDate && enrollmentDate > endDate) return false;
      return true;
    });

    if (rows.length === 0) {
      toast.info('No hay graduados para exportar', {
        description:
          'No se encontraron graduados que cumplan con los filtros activos y el rango de fecha de enrolamiento seleccionado.',
      });
      setIsExporting(false);
      return;
    }

    const headers = [
      'Documento',
      'Nombre completo',
      'Correo',
      'Programa académico',
      'Territorial',
      'Sede (CETAP)',
      'Número de registro',
      'Número de folio',
      'Número de libro',
      'Fecha de grado',
      'Fecha de enrolamiento',
      'Certificados',
    ];

    const csvRows = [
      headers.map(escapeCsvValue).join(';'),
      ...rows.map((user) =>
        [
          user.document,
          `${user.firstName} ${user.lastName}`.trim(),
          user.email,
          user.program || '',
          user.territorial || '',
          user.location || '',
          formatRegistroDisplay(user.numRegistro) === 'N/A' ? '' : formatRegistroDisplay(user.numRegistro),
          formatRegistroDisplay(user.numFolio) === 'N/A' ? '' : formatRegistroDisplay(user.numFolio),
          formatRegistroDisplay(user.numLibro) === 'N/A' ? '' : formatRegistroDisplay(user.numLibro),
          formatDateISO(user.graduationDate),
          formatDateISO(user.enrollmentDate),
          user.certificatesCount,
        ]
          .map(escapeCsvValue)
          .join(';')
      ),
    ];

    const csvContent = `\uFEFF${csvRows.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `graduados_${stamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Exportación completada', {
      description: `Se exportaron ${rows.length} graduados.`,
    });
    setIsExportModalOpen(false);
    setIsExporting(false);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSedeFilter('all');
    setProgramFilter('all');
    setLocationFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || programFilter !== 'all' || locationFilter !== 'all' || sedeFilter !== 'all';
  const currentActorName = getCurrentActorName();
  const bulkUploadCreatedBy = currentActorName
    ? `bulk_upload:${currentActorName}`
    : 'bulk_upload';

  return (
    <>
      <Toaster position="bottom-right" richColors />
      <Container4K className="space-y-6">
      {/* ✅ Modal de Validador de Certificados */}
      <ValidarCertificadoGrado 
        isOpen={mostrarValidador} 
        onClose={() => setMostrarValidador(false)} 
      />

      {/* Modal de Carga Masiva de Graduados */}
      <BulkGraduatesUploadModal
        open={isBulkUploadModalOpen}
        onOpenChange={setIsBulkUploadModalOpen}
        onImported={handleBulkGraduatesImported}
        createdBy={bulkUploadCreatedBy}
        programOptions={integrationProgramOptions}
        territorialOptions={territorialOptions}
        sedeTerritorialOptions={bulkSedeTerritorialOptions}
        programsPeriod={INTEGRATION_PROGRAM_SOURCE_LABEL}
        structurePeriod={estructuraPeriodoCatalogo}
      />

      {/* Header propio de esta vista (responsive con wrap natural, sin colapsar a iconos/menú) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Izquierda: ícono + título + descripción */}
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#003DA5', boxShadow: '0 4px 12px rgba(0, 61, 165, 0.15)' }}
          >
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl lg:text-2xl font-extrabold text-gray-900 tracking-tight">
              Gestión de Graduados
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Administración de graduados y generación de certificados de verificación de títulos
            </p>
          </div>
        </div>

        {/* Derecha: acciones — mantienen su etiqueta y hacen wrap cuando falta espacio */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 lg:justify-end lg:flex-shrink-0">
          {canBulkUploadGraduates && (
            <button
              onClick={handleOpenBulkUploadModal}
              title="Carga Masiva"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all bg-white text-emerald-700 border-2 border-emerald-600 hover:bg-emerald-600 hover:text-white hover:shadow-md"
            >
              <Upload className="w-4 h-4 flex-shrink-0" />
              <span>Carga Masiva</span>
            </button>
          )}
          {canExportGraduates && (
            <button
              onClick={handleOpenExportModal}
              title="Exportar"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all bg-white text-[#003DA5] border-2 border-[#003DA5] hover:bg-[#003DA5] hover:text-white hover:shadow-md"
            >
              <Download className="w-4 h-4 flex-shrink-0" />
              <span>Exportar</span>
            </button>
          )}
          {canVerifyGraduateCertificates && (
            <button
              onClick={() => handleVerifyTitle()}
              title="Verificar Certificado"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all bg-[#003DA5] text-white hover:bg-[#002D7A] hover:shadow-lg hover:-translate-y-0.5"
            >
              <BadgeCheck className="w-4 h-4 flex-shrink-0" />
              <span>Verificar Certificado</span>
            </button>
          )}
        </div>
      </div>

      {/* Búsqueda y Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="rounded-2xl border border-[#E5E7EB] bg-white/95 p-3 sm:p-4"
        style={{ boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Input búsqueda */}
          <div className="min-w-0 lg:w-[430px] lg:flex-none xl:w-[500px]">
            <div className="relative">
              <Search 
                className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: '#9CA3AF' }}
              />
              <input
                type="text"
                placeholder="Buscar por nombre, correo o documento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border bg-white shadow-sm transition-all"
                style={{
                  paddingLeft: '42px',
                  paddingRight: searchQuery ? '42px' : '16px',
                  paddingTop: '11px',
                  paddingBottom: '11px',
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#1F2937',
                  borderColor: '#D1D5DB',
                  height: '44px',
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
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: '#9CA3AF' }}
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filtros */}
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Filtro Estado */}
            {/* <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-[42px] w-full min-w-0 rounded-xl border px-3.5 text-sm transition-all"
              style={{
                borderColor: '#D1D5DB',
                color: '#1F2937',
                minWidth: '150px',
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
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="blocked">Bloqueados</option>
              <option value="inactive">Inactivos</option>
            </select> */}

            {/* Filtro Programa */}
            <div className="relative min-w-0">
              <GraduationCap
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: '#64748B' }}
              />
              <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="h-11 w-full min-w-0 appearance-none rounded-lg border bg-white py-0 pl-11 pr-10 text-sm font-semibold shadow-sm transition-all hover:border-[#94A3B8] hover:bg-[#FBFDFF]"
                style={{
                  borderColor: '#CBD5E1',
                  color: '#1F2937',
                  height: '44px',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  backgroundImage: 'none',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#003DA5';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 61, 165, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#CBD5E1';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="all">Todos los programas</option>
                {integrationProgramOptions.map(prog => (
                  <option key={prog} value={prog}>{prog}</option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                strokeWidth={2.25}
                style={{ color: '#475569' }}
              />
            </div>

            {/* Filtro Territorial */}
            <div className="relative min-w-0">
              <Building2
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: '#64748B' }}
              />
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="h-11 w-full min-w-0 appearance-none rounded-lg border bg-white py-0 pl-11 pr-10 text-sm font-semibold shadow-sm transition-all hover:border-[#94A3B8] hover:bg-[#FBFDFF]"
                style={{
                  borderColor: '#CBD5E1',
                  color: '#1F2937',
                  height: '44px',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  backgroundImage: 'none',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#003DA5';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 61, 165, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#CBD5E1';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="all">Todas las territoriales</option>
                {territorialOptions.map((territorial, index) => (
                  <option key={`${territorial}-${index}`} value={territorial}>{territorial}</option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                strokeWidth={2.25}
                style={{ color: '#475569' }}
              />
            </div>

            {/* Filtro por Sede */}
            <div className="relative min-w-0">
              <MapPin
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: '#64748B' }}
              />
              <select
                value={sedeFilter}
                onChange={(e) => setSedeFilter(e.target.value)}
                className="h-11 w-full min-w-0 appearance-none rounded-lg border bg-white py-0 pl-11 pr-10 text-sm font-semibold shadow-sm transition-all hover:border-[#94A3B8] hover:bg-[#FBFDFF]"
                style={{
                  borderColor: '#CBD5E1',
                  color: '#1F2937',
                  height: '44px',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  backgroundImage: 'none',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#003DA5';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 61, 165, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#CBD5E1';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="all">
                  {locationFilter === 'all' ? 'Todas las sedes (CETAP)' : 'Todas las sedes de la territorial'}
                </option>
                {locationFilter === 'all' && sedeFilterGroups.groups.length > 0 ? (
                  <>
                    {sedeFilterGroups.groups.map((group, groupIndex) => (
                      <optgroup key={`${group.territorial}-${groupIndex}`} label={group.territorial}>
                        {group.sedes.map((sede, sedeIndex) => (
                          <option key={`${group.territorial}-${groupIndex}-${sede}-${sedeIndex}`} value={sede}>
                            {sede}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    {sedeFilterGroups.ungrouped.length > 0 && (
                      <optgroup label="Sedes sin territorial asociada">
                        {sedeFilterGroups.ungrouped.map((sede, sedeIndex) => (
                          <option key={`ungrouped-${sede}-${sedeIndex}`} value={sede}>
                            {sede}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                ) : (
                  <>
                    {sedeFilterOptions.map((sede, index) => (
                      <option key={`${sede}-${index}`} value={sede}>{sede}</option>
                    ))}
                    {locationFilter !== 'all' && sedeFilterOptions.length === 0 && (
                      <option value="" disabled>No hay sedes asociadas</option>
                    )}
                  </>
                )}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                strokeWidth={2.25}
                style={{ color: '#475569' }}
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-all sm:col-span-2 lg:col-span-3"
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

      {/* Lista de Graduados */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="space-y-3"
      >
        {isLoading ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
            <GraduationCap className="w-16 h-16 mx-auto mb-4" style={{ color: '#D1D5DB' }} />
            <h3 className="text-lg font-semibold text-[#1F2937] mb-2">
              Cargando graduados...
            </h3>
            <p className="text-sm text-[#6B7280]">
              Estamos consultando la base de datos académica.
            </p>
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
            <GraduationCap className="w-16 h-16 mx-auto mb-4" style={{ color: '#D1D5DB' }} />
            <h3 className="text-lg font-semibold text-[#1F2937] mb-2">
              No se encontraron graduados
            </h3>
            <p className="text-sm text-[#6B7280] mb-6">
              {hasActiveFilters 
                ? 'Intente ajustar los filtros de búsqueda'
                : 'Aún no hay graduados registrados en el sistema'}
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
                <div className="col-span-3">GRADUADO</div>
                <div className="col-span-2">FECHA DE GRADO</div>
                <div className="col-span-2">CERTIFICADOS</div>
                <div className="col-span-2">PROGRAMA</div>
                <div className="col-span-3 text-right">ACCIONES</div>
              </div>
            </div>

            {/* Filas de Graduados */}
            {paginatedUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                onClick={() => handleViewDetails(user)}
                className={`overflow-hidden border-r border-b border-l-4 border-r-[#E5E7EB] border-b-[#E5E7EB] bg-white transition-all duration-200 last:rounded-b-xl ${
                  expandedUserId === user.id
                    ? 'relative z-[1] border-l-[#003DA5] bg-[#F8FBFF]'
                    : 'border-l-transparent hover:shadow-md'
                }`}
              >
                {/* Fila Principal con Columnas */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={expandedUserId === user.id}
                  aria-label={`Ver detalles de ${user.firstName} ${user.lastName}`}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleViewDetails(user);
                    }
                  }}
                  className={`p-4 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003DA5] focus-visible:ring-offset-2 ${
                    expandedUserId === user.id
                      ? 'bg-gradient-to-r from-[#EFF6FF] via-white to-white'
                      : 'hover:bg-[#F8FBFF]'
                  }`}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Columna 1: Graduado (Avatar + Nombre + Contacto) */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback 
                            className="text-white font-semibold text-sm"
                            style={{ background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)' }}
                          >
                            {(user.firstName?.[0] || 'G')}{user.lastName?.[0] || ''}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <h3 
                            className="font-semibold truncate mb-0.5"
                            style={{ fontSize: '14px', color: '#1F2937' }}
                          >
                            {user.firstName} {user.lastName}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#6B7280' }}>
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Columna 2: Fecha de Grado */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: '#F0F6FF' }}
                        >
                          <Calendar className="w-4 h-4" style={{ color: '#003DA5' }} />
                        </div>
                        <div>
                          <p className="text-xs font-medium" style={{ color: '#6B7280' }}>
                            Graduado
                          </p>
                          <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                            {formatDateShort(user.graduationDate)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Columna 3: Certificados Descargados */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: '#ECFDF5' }}
                        >
                          <Award className="w-4 h-4" style={{ color: '#10B981' }} />
                        </div>
                        <div>
                          <p className="text-xs font-medium" style={{ color: '#6B7280' }}>
                            Certificados
                          </p>
                          <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                            {user.certificatesCount} {user.certificatesCount === 1 ? 'certificado' : 'certificados'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Columna 4: Programa */}
                    <div className="col-span-2">
                      <div className="flex items-start gap-2">
                        <GraduationCap className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#6B7280' }} />
                        <p className="text-sm font-medium line-clamp-2" style={{ color: '#1F2937' }}>
                          {user.program || 'No especificado'}
                        </p>
                      </div>
                    </div>

                    {/* Columna 5: Estado */}
                    {/* <div className="col-span-2">
                      {getStatusBadge(user.status)}
                    </div> */}

                    {/* Columna 6: Acciones */}
                    <div
                      className="col-span-3 flex items-center justify-end gap-2"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleViewDetails(user);
                        }}
                        className="p-2 rounded-lg transition-all"
                        style={{
                          background: expandedUserId === user.id ? '#F0F6FF' : '#F9FAFB',
                          color: '#003DA5'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#F0F6FF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = expandedUserId === user.id ? '#F0F6FF' : '#F9FAFB';
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {canShowGraduateRowActions && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(event) => event.stopPropagation()}
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
                          {canEditGraduates && (
                          <DropdownMenuItem onClick={() => handleEdit(user)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          )}
                          {canVerifyGraduateCertificates && (
                          <DropdownMenuItem onClick={() => handleVerifyTitle(user)}>
                            <BadgeCheck className="w-4 h-4 mr-2" />
                            Verificar Certificado
                          </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>

                {/* Panel Expandido */}
                <AnimatePresence>
                  {expandedUserId === user.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      className="overflow-hidden border-t border-blue-100 bg-gradient-to-br from-[#F8FBFF] via-white to-slate-50"
                    >
                      {/* Grid de 3 columnas con informaci\u00f3n completa del graduado */}
                      <div className="grid grid-cols-1 gap-3 p-4 sm:p-5 md:grid-cols-2 lg:grid-cols-3 [&>div]:rounded-lg [&>div]:border [&>div]:border-slate-200 [&>div]:bg-white [&>div]:p-3 [&>div]:shadow-sm">
                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Documento
                          </p>
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4" style={{ color: '#6B7280' }} />
                            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                              {user.document}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Correo
                          </p>
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4" style={{ color: '#6B7280' }} />
                            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                              {user.email || 'Sin correo'}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Territorial
                          </p>
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4" style={{ color: '#6B7280' }} />
                            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                              {user.territorial || 'Sin territorial'}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Sede (CETAP)
                          </p>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" style={{ color: '#6B7280' }} />
                            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                              {user.location}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            {'Programa acad\u00e9mico'}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4" style={{ color: '#6B7280' }} />
                            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                              {user.program || 'No especificado'}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Fecha de Enrolamiento
                          </p>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" style={{ color: '#6B7280' }} />
                            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                              {formatDateOnly(user.enrollmentDate)}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            {'N\u00famero de registro'}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <Hash className="w-4 h-4" style={{ color: '#6B7280' }} />
                            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                              {formatRegistroDisplay(user.numRegistro)}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            {'N\u00famero de folio'}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <Hash className="w-4 h-4" style={{ color: '#6B7280' }} />
                            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                              {formatRegistroDisplay(user.numFolio)}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            {'N\u00famero de libro'}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <Hash className="w-4 h-4" style={{ color: '#6B7280' }} />
                            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                              {formatRegistroDisplay(user.numLibro)}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            {'M\u00e9todo de Enrolamiento'}
                          </p>
                          {getEnrollmentBadge(user.enrollmentMethod)}
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Creado por
                          </p>
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-4 h-4" style={{ color: '#6B7280' }} />
                            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                              {formatCreatedBy(user.createdBy)}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Roles en el Sistema
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role, idx) => (
                              <React.Fragment key={idx}>
                                {getRoleBadge(role.name, role.color)}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Archivos
                          </p>
                          <button
                            type="button"
                            onClick={() => handleOpenFilesModal(user)}
                            className="inline-flex w-fit max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-blue-50"
                            style={{ borderColor: '#BFDBFE', color: '#003DA5', background: '#FFFFFF' }}
                            aria-label={`Gestionar archivos de ${user.firstName} ${user.lastName}`}
                          >
                            <span
                              className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
                              style={{ background: '#E0ECFF', color: '#003DA5' }}
                            >
                              <FileText className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 text-left">
                              <span className="block truncate" style={{ color: '#111827' }}>
                                {formatFileCount(user.documentsCount ?? 0)}
                              </span>
                              <span className="block text-[11px] font-medium" style={{ color: '#64748B' }}>
                                Gestionar archivos
                              </span>
                            </span>
                            <Eye className="h-3.5 w-3.5 flex-shrink-0" />
                          </button>
                        </div>

                        {canDeleteGraduateRecord(user) && (
                          <div>
                            <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                              Acciones
                            </p>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(user);
                              }}
                              className="inline-flex w-fit max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-100"
                              style={{ borderColor: '#FECACA', color: '#B91C1C', background: '#FFFFFF' }}
                              aria-label={`Eliminar graduado ${user.firstName} ${user.lastName}`}
                            >
                              <span
                                className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
                                style={{ background: '#FEF2F2', color: '#B91C1C' }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </span>
                              <span className="truncate">Eliminar graduado</span>
                            </button>
                          </div>
                        )}

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
      {paginatedUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <PaginationPremium
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredUsers.length}
            pageSize={itemsPerPage}
          />
        </motion.div>
      )}

      {/* ==================== MODALES ==================== */}

      {/* Modal: Exportar Graduados */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="w-[92vw] max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" style={{ color: '#003DA5' }} />
              Exportar Graduados
            </DialogTitle>
            <DialogDescription>
              Filtre por fecha de enrolamiento y descargue el listado en formato CSV.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="export-start">Fecha inicial</Label>
              <Input
                id="export-start"
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="export-end">Fecha final</Label>
              <Input
                id="export-end"
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                Se exportaran los graduados que cumplan con los filtros activos y el rango de fecha de enrolamiento.
              </p>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsExportModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
              disabled={isExporting}
            >
              Cancelar
            </button>
            <button
              onClick={handleExportGraduates}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
              disabled={isExporting}
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exportando...' : 'Exportar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Archivos del graduado */}
      <Dialog
        open={isFilesModalOpen}
        onOpenChange={(open) => {
          if (!open && isUploadingFiles) {
            return;
          }
          if (!open) {
            handleCloseFilesModal();
          }
        }}
      >
        <DialogContent
          className="graduate-files-dialog flex flex-col overflow-hidden"
          style={{
            width: 'min(72rem, calc(100vw - 2rem))',
            maxWidth: '72rem',
            height: 'min(76vh, 52rem)',
            maxHeight: 'calc(100vh - 7rem)',
          }}
          onEscapeKeyDown={(event) => {
            if (isUploadingFiles) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(event) => {
            if (isUploadingFiles) {
              event.preventDefault();
            }
          }}
        >
          <div className="flex h-full min-h-0 w-full flex-col gap-4">
            <DialogHeader className="space-y-3">
            <div
              className="rounded-2xl border px-4 py-4"
              style={{
                borderColor: '#BFDBFE',
                background: 'linear-gradient(135deg, #F8FAFF 0%, #FFFFFF 55%, #EFF6FF 100%)',
              }}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarFallback
                      className="text-white font-semibold text-sm"
                      style={{ background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)' }}
                    >
                      {(filesModalUser?.firstName?.[0] || 'G')}{filesModalUser?.lastName?.[0] || ''}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
                      Archivos del título
                    </DialogTitle>
                    <DialogDescription>
                      {filesModalUser
                        ? `Graduado: ${filesModalUser.firstName} ${filesModalUser.lastName} - Documento: ${filesModalUser.document}`
                        : 'Seleccione un graduado para ver sus archivos.'}
                    </DialogDescription>
                    {filesModalUser?.program && (
                      <p className="mt-1 truncate text-xs font-semibold" style={{ color: '#475569' }}>
                        {filesModalUser.program}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 md:w-[20rem]">
                  <div className="rounded-xl border bg-white px-3 py-2 text-center" style={{ borderColor: '#DBEAFE' }}>
                    <p className="text-lg font-bold leading-none" style={{ color: '#003DA5' }}>
                      {filesModalItems.length}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold" style={{ color: '#64748B' }}>
                      Cargados
                    </p>
                  </div>
                  <div className="rounded-xl border bg-white px-3 py-2 text-center" style={{ borderColor: '#DBEAFE' }}>
                    <p className="text-lg font-bold leading-none" style={{ color: '#047857' }}>
                      {Math.max(0, MAX_FILES_PER_GRADUATE - totalQueuedFiles)}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold" style={{ color: '#64748B' }}>
                      Libres
                    </p>
                  </div>
                  <div className="rounded-xl border bg-white px-3 py-2 text-center" style={{ borderColor: '#DBEAFE' }}>
                    <p className="text-lg font-bold leading-none" style={{ color: '#92400E' }}>
                      {MAX_FILES_PER_GRADUATE}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold" style={{ color: '#64748B' }}>
                      Límite
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

            <div className="graduate-files-body min-h-0 flex-1 overflow-y-auto py-4 pr-1 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div
                  className="rounded-xl border px-4 py-3 shadow-sm"
                  style={{ borderColor: '#FDE68A', background: '#FFFBEB' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#92400E' }}>
                        Capacidad de archivos
                      </p>
                      <p className="text-sm font-semibold" style={{ color: '#78350F' }}>
                        {totalQueuedFiles}/{MAX_FILES_PER_GRADUATE} espacios usados
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: '#92400E' }}>
                        Peso máximo por archivo: {MAX_UPLOAD_SIZE_LABEL}
                      </p>
                    </div>
                    <span
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ background: '#FEF3C7', color: '#92400E' }}
                    >
                      Límite {MAX_FILES_PER_GRADUATE}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: '#FEF3C7' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (totalQueuedFiles / MAX_FILES_PER_GRADUATE) * 100)}%`,
                        background: '#F59E0B',
                      }}
                    />
                  </div>
                </div>

                <div
                  className="rounded-xl border px-4 py-3 shadow-sm"
                  style={{ borderColor: '#DBEAFE', background: '#F8FAFF' }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#2563EB' }}>
                    Formatos permitidos
                  </p>
                  <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                    Documentos del graduado
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['PDF', 'Word', 'Excel', 'Imágenes'].map((type) => (
                      <span
                        key={type}
                        className="rounded-full border bg-white px-3 py-1 text-xs font-semibold"
                        style={{ borderColor: '#BFDBFE', color: '#1D4ED8' }}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

            <div className="rounded-xl border px-4 py-4 space-y-3 shadow-sm" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>
                    Agregar archivos
                  </p>
                  <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                    PDF, Word, Excel o imágenes
                  </p>
                </div>
                <span className="text-xs font-semibold rounded-full px-3 py-1" style={{ background: '#EEF2FF', color: '#3730A3' }}>
                  Opcional
                </span>
              </div>

              <div
                className={`graduate-files-dropzone rounded-lg border-2 border-dashed px-4 py-4 text-sm transition-colors ${
                  isFilesInputDisabled ? '' : 'hover:bg-blue-50/60'
                }`}
                style={{
                  borderColor: '#CBD5F5',
                  background: isFilesInputDisabled ? '#F3F4F6' : '#F8FAFF',
                }}
              >
                <input
                  id="graduate-files-input"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                  onChange={handleFilesQueueChange}
                  className="sr-only"
                  disabled={isFilesInputDisabled}
                />
                <label
                  htmlFor="graduate-files-input"
                  aria-disabled={isFilesInputDisabled}
                  className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                    isFilesInputDisabled
                      ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                      : 'cursor-pointer border-blue-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      isFilesInputDisabled
                        ? 'border-gray-300 bg-gray-200 text-gray-400'
                        : 'border-blue-200 bg-blue-100 text-blue-700 group-hover:bg-blue-200'
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold leading-none">
                    {isFilesInputDisabled ? 'Carga no disponible' : 'Haga clic para seleccionar archivos'}
                  </span>
                </label>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  Puede seleccionar varios archivos en una sola carga.
                </p>
                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                  Cada archivo debe pesar máximo {MAX_UPLOAD_SIZE_LABEL}. Se subirán uno por uno.
                </p>
              </div>

              {filesUploadQueue.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filesUploadQueue.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      title={file.name}
                      className="flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs shadow-sm"
                      style={getFileTypeBadgeStyle({ originalName: file.name, mimeType: file.type })}
                    >
                      <span
                        className="max-w-[22rem] font-semibold leading-4 sm:max-w-[28rem]"
                        style={{ overflowWrap: 'anywhere' }}
                      >
                        {file.name}
                      </span>
                      <span className="flex-shrink-0 rounded-full bg-white/75 px-2 py-0.5 text-[11px] font-semibold">
                        {getFileTypeLabel({ originalName: file.name, mimeType: file.type })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQueuedFile(index)}
                        disabled={isUploadingFiles}
                        aria-label={`Quitar ${file.name}`}
                        className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/75 transition hover:bg-white hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {isUploadingFiles && filesUploadProgress.totalFiles > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-blue-700">
                    <span>Subiendo archivos...</span>
                    <span>
                      {filesUploadProgress.processedFiles}/{filesUploadProgress.totalFiles}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${Math.max(0, Math.min(100, filesUploadProgress.overallPercent))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-blue-700">
                    <span className="truncate pr-3">
                      {filesUploadProgress.currentFileName || 'Preparando archivo...'}
                    </span>
                    <span>{Math.round(filesUploadProgress.currentFilePercent)}%</span>
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleUploadFiles}
                  disabled={isUploadingFiles || filesUploadQueue.length === 0}
                  className="graduate-files-upload-btn px-4 py-2 text-xs font-semibold rounded-lg border"
                  style={{
                    borderColor: filesUploadQueue.length === 0 ? '#D1D5DB' : '#1D4ED8',
                    color: filesUploadQueue.length === 0 ? '#6B7280' : '#FFFFFF',
                    background: filesUploadQueue.length === 0 ? '#F9FAFB' : '#1D4ED8',
                  }}
                >
                  {isUploadingFiles ? 'Subiendo...' : 'Subir archivos'}
                </button>
              </div>
            </div>

              {isLoadingFiles ? (
                <div
                  className="rounded-xl border border-dashed p-6 text-center"
                  style={{ borderColor: '#BFDBFE', background: '#F8FAFF' }}
                >
                  <div
                    className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ background: '#E0ECFF', color: '#003DA5' }}
                  >
                    <FileText className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                    Cargando archivos...
                  </p>
                </div>
              ) : filesModalItems.length === 0 ? (
                <div
                  className="rounded-xl border border-dashed p-6 text-center"
                  style={{ borderColor: '#CBD5E1', background: '#F8FAFC' }}
                >
                  <div
                    className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full"
                    style={{ background: '#E0ECFF', color: '#003DA5' }}
                  >
                    <FileText className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                    No hay archivos cargados
                  </p>
                  <p className="mt-1 text-xs" style={{ color: '#64748B' }}>
                    Aquí se mostrarán los documentos asociados al graduado.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                      Archivos cargados
                    </p>
                    <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#EEF2FF', color: '#3730A3' }}>
                      {formatFileCount(filesModalItems.length)}
                    </span>
                  </div>
                  {filesModalItems.map((file) => (
                    <div
                      key={file.id}
                      className="graduate-files-item flex flex-col gap-3 rounded-xl border px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                      style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                          style={getFileTypeIconStyle(file)}
                        >
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold" style={{ color: '#1F2937' }}>
                            {file.originalName}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-xs" style={{ color: '#6B7280' }}>
                              {formatFileSize(file.sizeBytes)}
                            </span>
                            <span
                              className="graduate-files-type-badge inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                              style={getFileTypeBadgeStyle(file)}
                            >
                              {getFileTypeLabel(file)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(file)}
                          className="graduate-files-action-btn inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition hover:bg-blue-50"
                          style={{ borderColor: '#BFDBFE', color: '#1D4ED8', background: '#FFFFFF' }}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Descargar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestDeleteFile(file)}
                          className="graduate-files-action-btn is-danger inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition hover:bg-red-50"
                          style={{ borderColor: '#FECACA', color: '#DC2626', background: '#FFFFFF' }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>

          <DialogFooter>
            <button
              onClick={handleCloseFilesModal}
              className="graduate-files-secondary-btn px-4 py-2 text-sm font-medium rounded-lg border-2 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
              disabled={isUploadingFiles}
            >
              Cerrar
            </button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar eliminación de archivo */}
      <AnimatePresence>
        {isDeleteFileModalOpen && (
          <motion.div
            className="pointer-events-auto fixed inset-0 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
            style={{ zIndex: 10040 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-file-confirm-title"
              aria-describedby="delete-file-confirm-description"
              className="w-full max-w-md overflow-hidden rounded-xl border bg-white ring-1 ring-slate-900/5"
              style={{
                borderColor: '#D1D5DB',
                boxShadow: '0 24px 80px rgba(15, 23, 42, 0.38), 0 4px 18px rgba(15, 23, 42, 0.16)',
              }}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
            >
            <div className="flex gap-3 px-5 pb-4 pt-5">
              <div
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: '#FEF3C7', color: '#B45309' }}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 pt-0.5">
                <h3 id="delete-file-confirm-title" className="text-base font-semibold leading-6" style={{ color: '#111827' }}>
                  Confirmar eliminación
                </h3>
                <p id="delete-file-confirm-description" className="mt-1 text-sm leading-5" style={{ color: '#6B7280' }}>
                  Se eliminara permanentemente el archivo{' '}
                  <span className="graduate-files-filename font-semibold text-gray-900">
                    {fileToDelete?.originalName}
                  </span>
                  .
                </p>
              </div>
            </div>
            <div
              className="flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end"
              style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}
            >
              <button
                onClick={handleCloseDeleteFileModal}
                className="graduate-files-secondary-btn px-4 py-2 text-sm font-medium rounded-lg border-2"
                style={{ borderColor: '#D1D5DB', color: '#4B5563', background: '#FFFFFF' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteFile}
                className="graduate-files-danger-btn px-4 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2"
                style={{ background: '#DC2626', color: '#FFFFFF' }}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar archivo
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Modal: Editar Graduado */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="w-[92vw] max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" style={{ color: '#003DA5' }} />
              Editar Graduado
            </DialogTitle>
            <DialogDescription>
              Actualice la información del graduado {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">

            <div className="space-y-2">

              <Label htmlFor="edit-firstName">

                Nombre

                <span className="text-red-500"> *</span>

              </Label>

              <Input

                id="edit-firstName"

                value={editForm.firstName}

                onChange={(e) =>
                  setEditForm({ ...editForm, firstName: sanitizePersonName(e.target.value) })
                }
                onBlur={() =>
                  setEditForm((current) => ({
                    ...current,
                    firstName: normalizeSpaces(current.firstName),
                  }))
                }

                placeholder="Nombre del graduado"

                maxLength={PERSON_NAME_MAX_LENGTH}

                required

              />

            </div>


            <div className="space-y-2">

              <Label htmlFor="edit-lastName">

                Apellido

                <span className="text-red-500"> *</span>

              </Label>

              <Input

                id="edit-lastName"

                value={editForm.lastName}

                onChange={(e) =>
                  setEditForm({ ...editForm, lastName: sanitizePersonName(e.target.value) })
                }
                onBlur={() =>
                  setEditForm((current) => ({
                    ...current,
                    lastName: normalizeSpaces(current.lastName),
                  }))
                }

                placeholder="Apellido del graduado"

                maxLength={PERSON_NAME_MAX_LENGTH}

                required

              />

            </div>


            <div className="space-y-2">

              <Label htmlFor="edit-document">

                Documento

                <span className="text-red-500"> *</span>

              </Label>

              <Input

                id="edit-document"

                value={editForm.document}

                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    document: e.target.value.slice(0, DOCUMENT_MAX_LENGTH),
                  })
                }

                placeholder="Número de documento"

                inputMode="text"

                minLength={DOCUMENT_MIN_LENGTH}
                maxLength={DOCUMENT_MAX_LENGTH}

                required

              />

            </div>


            <div className="space-y-2">

              <Label htmlFor="edit-program">

                {'Programa Acad\u00e9mico'}

                <span className="text-red-500"> *</span>

              </Label>

              <select

                id="edit-program"

                value={selectedIntegrationProgram || editForm.program}

                onChange={(e) => setEditForm({ ...editForm, program: e.target.value })}

                className="w-full border-2 rounded-lg px-3 py-2 text-sm"

                style={{ borderColor: '#D1D5DB' }}

                required

              >

                <option value="" hidden>Seleccionar programa académico</option>

                {editProgramOptions.map((prog) => (

                  <option key={prog} value={prog}>{prog}</option>

                ))}

              </select>

              {externalEditProgram && externalEditProgram !== 'No especificado' && (
                <p className="text-xs text-gray-500">
                  Este programa no está dentro de los programas integrados; se conserva el valor actual del graduado.
                </p>
              )}

            </div>


            <div className="space-y-2 col-span-2">

              <Label htmlFor="edit-email">

                {'Correo Electr\u00f3nico'}

                <span className="text-red-500"> *</span>

              </Label>

              <Input

                id="edit-email"

                type="email"

                value={editForm.email}

                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value.slice(0, EMAIL_MAX_LENGTH) })
                }
                onBlur={() =>
                  setEditForm((current) => ({
                    ...current,
                    email: current.email.trim(),
                  }))
                }

                placeholder="correo@ejemplo.com"

                minLength={EMAIL_MIN_LENGTH}

                maxLength={EMAIL_MAX_LENGTH}

                required

              />

            </div>


            <div className="space-y-2">

              <Label htmlFor="edit-territorial">

                Territorial

                <span className="text-red-500"> *</span>

              </Label>

              <select

                id="edit-territorial"

                value={editForm.territorial}

                onChange={(e) => handleTerritorialChange(e.target.value)}

                className="w-full border-2 rounded-lg px-3 py-2 text-sm"

                style={{ borderColor: '#D1D5DB' }}

                required

              >

                <option value="">Sin territorial - seleccione una opción</option>

                {editTerritorialOptions.map((territorial, index) => (

                  <option key={`${territorial}-${index}`} value={territorial}>{territorial}</option>

                ))}

              </select>

              {!editForm.territorial && (
                <p className="text-xs text-gray-500">
                  Debe seleccionar una territorial válida para guardar cambios.
                </p>
              )}

            </div>


            <div className="space-y-2">

              <Label htmlFor="edit-location">

                Sede (CETAP)

                <span className="text-red-500"> *</span>

              </Label>

              <select

                id="edit-location"

                value={editForm.location}

                onChange={(e) => handleLocationChange(e.target.value)}

                className="w-full border-2 rounded-lg px-3 py-2 text-sm"

                style={{ borderColor: '#D1D5DB' }}

                required

              >

                <option value="">Seleccionar sede</option>

                {editSedesOptions.map((sede, index) => (

                  <option key={`${sede}-${index}`} value={sede}>{sede}</option>

                ))}

              </select>

            </div>


            <div className="col-span-2">

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div className="space-y-2">

                  <Label htmlFor="edit-numRegistro">
                    Número de registro
                    <span className="text-red-500"> *</span>
                  </Label>

                  <Input

                    id="edit-numRegistro"

                    value={formatRegistryInput(
                      editForm.numRegistro,
                      REGISTRY_NUMBER_MAX_LENGTH,
                    )}

                    onChange={(e) =>

                      setEditForm({
                        ...editForm,
                        numRegistro: sanitizeRegistryInput(
                          e.target.value,
                          REGISTRY_NUMBER_MAX_LENGTH,
                        ),
                      })

                    }

                    inputMode="numeric"

                    pattern="[0-9-]*"

                    minLength={1}

                    maxLength={
                      REGISTRY_NUMBER_MAX_LENGTH +
                      Math.floor((REGISTRY_NUMBER_MAX_LENGTH - 1) / 4)
                    }

                    required

                  />

                </div>


                <div className="space-y-2">

                  <Label htmlFor="edit-numFolio">
                    Número de folio
                    <span className="text-red-500"> *</span>
                  </Label>

                  <Input

                    id="edit-numFolio"

                    value={formatRegistryInput(editForm.numFolio, FOLIO_BOOK_MAX_LENGTH)}

                    onChange={(e) =>

                      setEditForm({
                        ...editForm,
                        numFolio: sanitizeRegistryInput(
                          e.target.value,
                          FOLIO_BOOK_MAX_LENGTH,
                        ),
                      })

                    }

                    inputMode="numeric"

                    pattern="[0-9-]*"

                    minLength={1}

                    maxLength={
                      FOLIO_BOOK_MAX_LENGTH +
                      Math.floor((FOLIO_BOOK_MAX_LENGTH - 1) / 4)
                    }

                    required

                  />

                </div>


                <div className="space-y-2">

                  <Label htmlFor="edit-numLibro">
                    Número de libro
                    <span className="text-red-500"> *</span>
                  </Label>

                  <Input

                    id="edit-numLibro"

                    value={formatRegistryInput(editForm.numLibro, FOLIO_BOOK_MAX_LENGTH)}

                    onChange={(e) =>

                      setEditForm({
                        ...editForm,
                        numLibro: sanitizeRegistryInput(
                          e.target.value,
                          FOLIO_BOOK_MAX_LENGTH,
                        ),
                      })

                    }

                    inputMode="numeric"

                    pattern="[0-9-]*"

                    minLength={1}

                    maxLength={
                      FOLIO_BOOK_MAX_LENGTH +
                      Math.floor((FOLIO_BOOK_MAX_LENGTH - 1) / 4)
                    }

                    required

                  />

                </div>

              </div>

            </div>

          </div>

          <DialogFooter>
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmEdit}
              className="px-4 py-2 text-sm font-medium rounded-lg"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Verificar Certificado */}
      <Dialog open={isVerifyTitleModalOpen} onOpenChange={setIsVerifyTitleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5" style={{ color: '#10B981' }} />
              Verificar Certificado de Título
            </DialogTitle>
            <DialogDescription>
              Confirme la verificación del certificado de {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <GraduationCap className="w-5 h-5 mt-0.5" style={{ color: '#003DA5' }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    Información del Certificado
                  </p>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Graduado:</strong> {selectedUser?.firstName} {selectedUser?.lastName}</p>
                    <p><strong>Documento:</strong> {selectedUser?.document}</p>
                    <p><strong>Programa:</strong> {selectedUser?.program}</p>
                    <p><strong>Fecha de Grado:</strong> {formatDateOnly(selectedUser?.graduationDate)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 mt-0.5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    Estado de Verificación
                  </p>
                  <p className="text-sm text-gray-600">
                    Al confirmar, se generará un certificado de verificación oficial que podrá ser descargado por el graduado.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsVerifyTitleModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmVerifyTitle}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2"
              style={{ background: '#10B981', color: '#FFFFFF' }}
            >
              <BadgeCheck className="w-4 h-4" />
              Verificar Certificado
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Generar Certificado */}
      <Dialog open={isGenerateCertModalOpen} onOpenChange={setIsGenerateCertModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" style={{ color: '#003DA5' }} />
              Generar Certificado de Graduación
            </DialogTitle>
            <DialogDescription>
              Configure las opciones del certificado para {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Graduado</p>
                  <p className="font-semibold text-gray-900">
                    {selectedUser?.firstName} {selectedUser?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Programa</p>
                  <p className="font-semibold text-gray-900">{selectedUser?.program}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Documento</p>
                  <p className="font-semibold text-gray-900">{selectedUser?.document}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Fecha de Grado</p>
                  <p className="font-semibold text-gray-900">
                    {formatDateShort(selectedUser?.graduationDate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900">Formato del Certificado</Label>
              <div className="flex gap-3">
                <button
                  onClick={() => setCertForm({ ...certForm, format: 'pdf' })}
                  className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    certForm.format === 'pdf' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <FileText className="w-5 h-5 mx-auto mb-1" />
                  PDF
                </button>
                <button
                  onClick={() => setCertForm({ ...certForm, format: 'docx' })}
                  className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    certForm.format === 'docx' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <FileText className="w-5 h-5 mx-auto mb-1" />
                  DOCX
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900">Opciones Adicionales</Label>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="includeQR"
                  checked={certForm.includeQR}
                  onChange={(e) => setCertForm({ ...certForm, includeQR: e.target.checked })}
                  className="w-4 h-4"
                  style={{ accentColor: '#003DA5' }}
                />
                <label htmlFor="includeQR" className="flex-1 text-sm cursor-pointer">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-900">Incluir Código QR de Verificación</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Permite verificar la autenticidad del certificado escaneando el código QR
                  </p>
                </label>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="includeSignature"
                  checked={certForm.includeDigitalSignature}
                  onChange={(e) => setCertForm({ ...certForm, includeDigitalSignature: e.target.checked })}
                  className="w-4 h-4"
                  style={{ accentColor: '#003DA5' }}
                />
                <label htmlFor="includeSignature" className="flex-1 text-sm cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-900">Incluir firma institucional</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Agregue la firma visual del firmante autorizado de la ESAP al certificado
                  </p>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsGenerateCertModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmGenerateCertificate}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Download className="w-4 h-4" />
              Generar Certificado
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Enviar Email */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" style={{ color: '#003DA5' }} />
              Enviar Email a Graduado
            </DialogTitle>
            <DialogDescription>
              Envíe un correo electrónico a {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4" style={{ color: '#003DA5' }} />
                <span className="font-medium text-gray-900">Para:</span>
                <span className="text-gray-700">{selectedUser?.firstName} {selectedUser?.lastName}</span>
                <span className="text-gray-500">({selectedUser?.email})</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-subject">Asunto</Label>
              <Input
                id="email-subject"
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                placeholder="Asunto del correo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-message">Mensaje</Label>
              <Textarea
                id="email-message"
                value={emailForm.message}
                onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                placeholder="Escriba su mensaje aquí..."
                rows={8}
                className="resize-none"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600" />
                <p className="text-xs text-amber-800">
                  El correo será enviado desde la cuenta oficial de ESAP y quedará registrado en el historial de comunicaciones del graduado.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsEmailModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmSendEmail}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Send className="w-4 h-4" />
              Enviar Email
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Bloquear Graduado */}
      <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Bloquear Graduado
            </DialogTitle>
            <DialogDescription>
              ¿Confirma que desea bloquear a este graduado?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 mt-0.5 text-red-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    {selectedUser?.firstName} {selectedUser?.lastName}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Email:</strong> {selectedUser?.email}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Documento:</strong> {selectedUser?.document}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-red-700">
                    Origen: {selectedUser?.enrollmentMethod === 'massive' ? 'Carga masiva' : 'Solicitud'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600" />
                <div className="text-xs text-amber-800">
                  <p className="font-semibold mb-1">Consecuencias del bloqueo:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>El graduado no podrá acceder al portal</li>
                    <li>No podrá descargar certificados</li>
                    <li>Se suspenderán todas sus sesiones activas</li>
                    <li>Podrá revertir esta acción en cualquier momento</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsBlockModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmBlock}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
            >
              <Lock className="w-4 h-4" />
              Confirmar Bloqueo
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Eliminar Graduado */}
      <Dialog
        open={isDeleteModalOpen}
        onOpenChange={(open) => {
          if (!isDeletingGraduate) setIsDeleteModalOpen(open);
        }}
      >
        <DialogContent
          size="md"
          className="top-1/2 -translate-y-1/2 p-0 sm:p-0 gap-0 overflow-hidden rounded-2xl border border-gray-100 shadow-2xl duration-300 data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2"
        >
          {/* Encabezado */}
          <DialogHeader className="px-5 pt-5 pb-4 text-left space-y-0 sm:text-left">
            <div className="flex items-start gap-3 pr-6">
              <span className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-red-100 ring-8 ring-red-50/70">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </span>
              <div className="flex-1 min-w-0 pt-0.5">
                <DialogTitle className="text-base font-semibold text-gray-900">
                  Eliminar Graduado
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-gray-500">
                  ¿Confirma que desea eliminar este usuario?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Cuerpo */}
          <div className="px-5 space-y-3">
            {/* Tarjeta del graduado */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-gray-200/80">
                <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-600">
                  <Trash2 className="w-4 h-4" />
                </span>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {selectedUser?.firstName} {selectedUser?.lastName}
                </p>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex gap-3">
                  <dt className="w-20 flex-shrink-0 text-gray-400">Email</dt>
                  <dd className="flex-1 min-w-0 text-gray-700 break-words">{selectedUser?.email}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-20 flex-shrink-0 text-gray-400">Programa</dt>
                  <dd className="flex-1 min-w-0 text-gray-700 break-words">{selectedUser?.program}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-20 flex-shrink-0 text-gray-400">Documento</dt>
                  <dd className="flex-1 min-w-0 text-gray-700 break-words">{selectedUser?.document}</dd>
                </div>
              </dl>
            </div>

            {/* Advertencia */}
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
                <div className="text-xs leading-relaxed text-red-900">
                  <p className="font-semibold mb-1.5">Esta acción es permanente</p>
                  <ul className="space-y-1">
                    <li className="flex gap-1.5">
                      <span className="text-red-400 leading-none">•</span>
                      <span>Se eliminarán los datos del graduado.</span>
                    </li>
                    <li className="flex gap-1.5">
                      <span className="text-red-400 leading-none">•</span>
                      <span>Se borrarán sus certificados, validaciones y archivos asociados.</span>
                    </li>
                    <li className="flex gap-1.5">
                      <span className="text-red-400 leading-none">•</span>
                      <span>Esta acción no puede revertirse.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-5 py-4 mt-1 gap-2">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeletingGraduate}
              className="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 bg-white transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              No, cancelar
            </button>
            <button
              onClick={confirmDelete}
              disabled={isDeletingGraduate}
              className="px-4 py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 bg-red-600 text-white shadow-sm transition-all hover:bg-red-700 hover:shadow-md active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-red-600 disabled:active:scale-100"
            >
              {isDeletingGraduate ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Sí, eliminar
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </Container4K>
    </>
  );
}

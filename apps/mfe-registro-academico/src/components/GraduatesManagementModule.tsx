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
  Database
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PaginationPremium } from '../shared/PaginationPremium';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import React from 'react';
import graduadosService, { GraduadoArchivo, GraduadoData } from '../../services/api/graduados.service';
import estructuraService from '../../services/estructuraService';
import type { Seccional, Sede } from '../../services/api/types';
import { ValidarCertificadoGrado } from './registro-academico/ValidarCertificadoGrado';
import { authService } from '../../services/api/authService';
import { Permissions } from '../../enums/permissions';
import { buildServiceAssetUrl } from '../../config/environment';

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
  document: string;
  enrollmentMethod: 'qr' | 'manual' | 'massive' | 'integration';
  enrollmentDate: string;
  graduationDate: string;
  documentsCount: number;
  createdBy?: string;
  asignacionesSedes?: Array<{ nombreSede: string }>;
  territorial?: string;
  certificatesCount: number;
  numRegistro?: string;
  numFolio?: string;
  numLibro?: string;
  createdAt?: string;
  updatedAt?: string;
};

// ✅ DÍA 4: Container4K para padding adaptativo
// ✅ DÍA 5: ResponsiveHeader para headers adaptativos
import { Container4K, ResponsiveHeader } from '@esap-mfe/shared-ui';

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
  const [mostrarValidador, setMostrarValidador] = useState(false); // ✅ NUEVO: Estado para vista de validación

  // Estados para modales
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVerifyTitleModalOpen, setIsVerifyTitleModalOpen] = useState(false);
  const [isGenerateCertModalOpen, setIsGenerateCertModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<GraduateRow | null>(null);
  const MAX_FILES_PER_GRADUATE = 5;
  const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
  const MAX_UPLOAD_SIZE_LABEL = '10 MB';
  const PROGRAMAS_GRADUADOS = [
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
  const isUnavailableProgram = (value?: string) =>
    normalizeKey(value) === 'no disponible' || normalizeKey(value) === 'no especificado';

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
  const sanitizeRegistroInput = (value: string) => {
    const digits = value.replace(/\D+/g, '').slice(0, 12);
    return /^0+$/.test(digits) ? '' : digits;
  };
  const formatRegistroInput = (value?: string) => {
    const digits = sanitizeRegistroInput(value || '');
    if (!digits || /^0+$/.test(digits)) return '';
    return digits.match(/.{1,4}/g)?.join('-') ?? digits;
  };
  const formatRegistroDisplay = (value?: string) => {
    const digits = sanitizeRegistroInput(value || '');
    if (!digits || /^0+$/.test(digits)) return 'N/A';
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

  const normalizeKey = (value?: string) => (value || '').trim().toLowerCase();
  const normalizeDisplayName = (value?: string) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return trimmed;
    const normalized = normalizeKey(trimmed);
    if (normalized === 'super user' || normalized === 'superuser') {
      return 'Super Usuario';
    }
    return trimmed;
  };
  const isIntegrationSource = (normalized: string) =>
    !normalized ||
    normalized === 'system' ||
    normalized === 'sistema' ||
    normalized === 'registro academico' ||
    normalized === 'registro académico' ||
    normalized.includes('integracion') ||
    normalized.includes('integración') ||
    normalized.includes('integration');
  const resolveEnrollmentMethod = (createdBy?: string): GraduateRow['enrollmentMethod'] => {
    const normalized = normalizeKey(createdBy);
    if (
      normalized.includes('manual_review') ||
      normalized.includes('manual') ||
      normalized.includes('revision') ||
      normalized.includes('revisión')
    ) {
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
      const reviewer = createdBy?.split(':').slice(1).join(':').trim();
      return normalizeDisplayName(reviewer) || 'Revisión manual';
    }
    if (normalized === 'manual_review') {
      return 'Revisión manual';
    }
    if (isIntegrationSource(normalized)) {
      return 'Integración';
    }
    return normalizeDisplayName(createdBy) || 'Integración';
  };

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
      toast.error(`Solo puedes tener máximo ${MAX_FILES_PER_GRADUATE} archivos en total`);
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

  const handleConfirmDeleteFile = async () => {
    if (!fileToDelete) return;
    await handleDeleteFile(fileToDelete.id);
    setIsDeleteFileModalOpen(false);
    setFileToDelete(null);
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
        console.warn('Fallo la descarga por endpoint dedicado, se intentara ruta publica', error);
      }
    }

    const fileUrl = buildServiceAssetUrl(
      'registro-academico',
      file.url || `/uploads/graduate-files/${file.storedName}`,
    );

    try {
      const response = await fetch(fileUrl, {
        method: 'GET',
        headers: (
          localStorage.getItem('esap_auth_token') ||
          localStorage.getItem('esap_access_token')
        )
          ? {
              Authorization: `Bearer ${
                localStorage.getItem('esap_auth_token') ||
                localStorage.getItem('esap_access_token')
              }`,
            }
          : undefined,
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
    let isMounted = true;

    const loadGraduates = async () => {
      setIsLoading(true);
      try {
        const [estructuraResponse, graduatesResponse] = await Promise.all([
          estructuraService.obtenerEstructura().catch(() => null),
          graduadosService.graduados.listarRegistroAcademico(),
        ]);

        const estructuraSedes = estructuraResponse?.data?.sedes ?? [];
        const estructuraSeccionales = estructuraResponse?.data?.seccionales ?? [];

        if (isMounted) {
          setSedesCatalog(estructuraSedes);
          setSeccionalesCatalog(estructuraSeccionales);
        }

        const seccionalById = new Map<number, Seccional>();
        estructuraSeccionales.forEach((seccional) => {
          seccionalById.set(seccional.idSeccional, seccional);
        });

        const sedeByName = new Map<string, Sede>();
        estructuraSedes.forEach((sede) => {
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
          const territorialName =
            graduate.seccionalName ||
            sedeMatch?.seccional?.nomSeccional ||
            (sedeMatch?.idSeccional ? seccionalById.get(sedeMatch.idSeccional)?.nomSeccional : undefined);
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
            program: graduate.programName || 'No especificado',
            document: graduate.idNumber,
            enrollmentMethod: resolveEnrollmentMethod(createdBy),
            enrollmentDate: graduate.enrollmentDate || graduate.graduationDate,
            graduationDate: graduate.graduationDate,
            documentsCount: graduate.filesCount ?? 0,
            createdBy: createdBy?.trim() || undefined,
            asignacionesSedes: sedeName ? [{ nombreSede: sedeName }] : undefined,
            // Valor inicial para render rápido; luego se actualiza en segundo plano.
            certificatesCount: graduate.graduationDate ? 1 : 0,
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

            const certificatePrograms = new Map<string, Set<string>>();
            (certificatesResponse || []).forEach((certificate) => {
              if (!certificate.idNumber) return;
              const programKey = `${certificate.programName || ''}::${certificate.degreeTitle || ''}`.trim();
              if (!certificatePrograms.has(certificate.idNumber)) {
                certificatePrograms.set(certificate.idNumber, new Set());
              }
              if (programKey) {
                certificatePrograms.get(certificate.idNumber)!.add(programKey);
              } else {
                certificatePrograms.get(certificate.idNumber)!.add(certificate.certificateNumber);
              }
            });

            const certificateCounts = new Map<string, number>();
            certificatePrograms.forEach((programs, idNumber) => {
              certificateCounts.set(idNumber, programs.size);
            });

            if (!certificateCounts.size) return;

            setGraduates((prev) =>
              prev.map((graduate) => ({
                ...graduate,
                certificatesCount:
                  certificateCounts.get(graduate.document) ?? graduate.certificatesCount,
              })),
            );
          })
          .catch((error) => {
            console.warn('No se pudieron actualizar los conteos de certificados:', error);
          });
      } catch (error) {
        console.error('Error cargando graduados:', error);
        toast.error('No se pudieron cargar los graduados', {
          description: 'Intenta recargar la pagina o verifica tu conexion.',
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
  }, []);

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

  const uniquePrograms = useMemo(
    () => Array.from(new Set(graduatesOnly.filter(u => u.program).map(u => u.program!))),
    [graduatesOnly]
  );
  const editProgramOptions = useMemo(() => {
    const current = (editForm.program || '').trim();
    if (current && !isUnavailableProgram(current) && !PROGRAMAS_GRADUADOS.includes(current)) {
      return [current, ...PROGRAMAS_GRADUADOS];
    }
    return PROGRAMAS_GRADUADOS;
  }, [editForm.program]);

  const territorialOptions = useMemo(() => {
    if (seccionalesCatalog.length > 0) {
      return Array.from(
        new Set(
          seccionalesCatalog
            .map((seccional) => seccional?.nomSeccional)
            .filter(Boolean)
        )
      );
    }

    return Array.from(
      new Set(graduatesOnly.map((user) => user.territorial).filter(Boolean))
    );
  }, [seccionalesCatalog, graduatesOnly]);

  const uniqueSedes = useMemo(() => {
    const sedes = new Set<string>();
    graduatesOnly.forEach((user) => {
      user.asignacionesSedes?.forEach((asig) => {
        if (asig?.nombreSede) {
          sedes.add(asig.nombreSede);
        }
      });
    });
    return Array.from(sedes);
  }, [graduatesOnly]);

  const sedesOptions = useMemo(() => {
    if (sedesCatalog.length > 0) {
      return Array.from(
        new Set(sedesCatalog.map((sede) => sede?.nomSede).filter(Boolean))
      );
    }

    return Array.from(new Set(uniqueSedes));
  }, [sedesCatalog, uniqueSedes]);

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
    return map;
  }, [sedesCatalog, seccionalById, normalizeKey]);

  const filteredUsers = useMemo(() => {
    return graduatesOnly.filter(user => {
      const matchesSearch = searchQuery === '' ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.document.includes(searchQuery);
      
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const matchesProgram = programFilter === 'all' || user.program === programFilter;
      const effectiveTerritorial = user.territorial;
      const matchesLocation = locationFilter === 'all' || effectiveTerritorial === locationFilter;
      const matchesSede = sedeFilter === 'all' || 
        (user.asignacionesSedes && user.asignacionesSedes.some(asig => asig.nombreSede === sedeFilter));
      
      return matchesSearch && matchesStatus && matchesProgram && matchesLocation && matchesSede;
    });
  }, [graduatesOnly, searchQuery, statusFilter, programFilter, locationFilter, sedeFilter]);

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
        className: 'bg-[#EDE9FE] text-[#5B21B6] border-[#8B5CF6]',
        icon: QrCode
      },
      manual: { 
        label: 'Manual', 
        className: 'bg-[#EFF6FF] text-[#1E40AF] border-[#3B82F6]',
        icon: UserPlus
      },
      integration: {
        label: 'Integración',
        className: 'bg-[#FDE68A] text-[#92400E] border-[#F59E0B]',
        icon: Database
      },
      massive: { 
        label: 'Carga Masiva', 
        className: 'bg-[#D1FAE5] text-[#065F46] border-[#10B981]',
        icon: Upload
      }
    };
    
    const config = methodConfig[method];
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


  const handleEdit = (user: GraduateRow) => {
    const sanitizedPhone = (user.phone || '').replace(/\D+/g, '').slice(0, 10);
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: sanitizedPhone,
      document: user.document,
      program: isUnavailableProgram(user.program) ? '' : user.program || '',
      location: user.location,
      territorial:
        user.territorial ||
        territorialBySede.get(normalizeKey(user.location)) ||
        '',
      numRegistro: sanitizeRegistroInput(user.numRegistro || ''),
      numFolio: sanitizeRegistroInput(user.numFolio || ''),
      numLibro: sanitizeRegistroInput(user.numLibro || ''),
    });
    setIsEditModalOpen(true);
  };

  const handleLocationChange = (value: string) => {
    const mappedTerritorial = territorialBySede.get(normalizeKey(value));
    setEditForm((prev) => ({
      ...prev,
      location: value,
      territorial: mappedTerritorial || prev.territorial || '',
    }));
  };

  const handleDelete = (user: GraduateRow) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleViewDetails = (user: GraduateRow) => {
    setExpandedUserId(expandedUserId === user.id ? null : user.id);
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

  // Handlers para confirmar acciones en modales
  const confirmEdit = async () => {
    if (!selectedUser) return;
    const trimmedFirstName = editForm.firstName.trim();
    const trimmedLastName = editForm.lastName.trim();
    const trimmedDocument = editForm.document.trim();
    const trimmedEmail = editForm.email.trim();
    const trimmedProgram = editForm.program.trim();
    const trimmedLocation = editForm.location.trim();
    const effectiveTerritorial =
      (
        editForm.territorial ||
        (editForm.location
          ? territorialBySede.get(normalizeKey(editForm.location))
          : '')
      ).trim();
    if (!trimmedFirstName) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (trimmedFirstName.length > 30) {
      toast.error('El nombre no puede superar 30 caracteres');
      return;
    }
    if (!trimmedLastName) {
      toast.error('El apellido es obligatorio');
      return;
    }
    if (trimmedLastName.length > 30) {
      toast.error('El apellido no puede superar 30 caracteres');
      return;
    }
    if (!trimmedDocument) {
      toast.error('El documento es obligatorio');
      return;
    }
    if (!trimmedEmail) {
      toast.error('El correo electronico es obligatorio');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('El correo electronico no tiene un formato valido');
      return;
    }
    if (!trimmedProgram) {
      toast.error('El programa academico es obligatorio');
      return;
    }
    if (!trimmedLocation) {
      toast.error('La sede es obligatoria');
      return;
    }
    if (!effectiveTerritorial) {
      toast.error('La seccional es obligatoria');
      return;
    }

    setIsSaving(true);
    try {
      const fullName = `${trimmedFirstName} ${trimmedLastName}`.trim();
      const payload: Partial<GraduadoData> = {
        fullName,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        idNumber: trimmedDocument,
        programName: trimmedProgram || selectedUser.program || '',
        campus: trimmedLocation || undefined,
        seccionalName: effectiveTerritorial || undefined,
        numRegistro: editForm.numRegistro ? sanitizeRegistroInput(editForm.numRegistro) : undefined,
        numFolio: editForm.numFolio ? sanitizeRegistroInput(editForm.numFolio) : undefined,
        numLibro: editForm.numLibro ? sanitizeRegistroInput(editForm.numLibro) : undefined,
      };

      await graduadosService.graduados.actualizar(selectedUser.id, payload);

      const updatedTerritorial =
        editForm.territorial ||
        (editForm.location
          ? territorialBySede.get(normalizeKey(editForm.location))
          : selectedUser.territorial);

      setGraduates((prev) =>
        prev.map((graduate) =>
          graduate.id === selectedUser.id
            ? {
                ...graduate,
                firstName: trimmedFirstName,
                lastName: trimmedLastName,
                email: trimmedEmail,
                document: trimmedDocument,
                numRegistro: editForm.numRegistro,
                numFolio: editForm.numFolio,
                numLibro: editForm.numLibro,
                program: trimmedProgram || graduate.program,
                location: trimmedLocation || graduate.location,
                territorial: updatedTerritorial || graduate.territorial,
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

  const confirmDelete = () => {
    toast.success('Graduado Eliminado', {
      description: `Se eliminó: ${selectedUser?.firstName} ${selectedUser?.lastName}`
    });
    setIsDeleteModalOpen(false);
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

  const handleExportGraduates = () => {
    if (isExporting) return;

    const startDate = parseDateOnly(exportStartDate);
    const endDate = parseDateOnly(exportEndDate);

    if (startDate && endDate && startDate > endDate) {
      toast.error('Rango de fechas invalido', {
        description: 'La fecha inicial no puede ser mayor que la fecha final.',
      });
      return;
    }

    setIsExporting(true);

    const rows = filteredUsers.filter((user) => {
      if (!startDate && !endDate) return true;
      const gradDate = parseDateOnly(user.graduationDate);
      if (!gradDate) return false;
      if (startDate && gradDate < startDate) return false;
      if (endDate && gradDate > endDate) return false;
      return true;
    });

    if (rows.length === 0) {
      toast.info('No hay graduados en el rango seleccionado');
      setIsExporting(false);
      return;
    }

    const headers = [
      'Documento',
      'Nombre completo',
      'Correo',
      'Programa académico',
      'Sede',
      'Territorial',
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
          user.location || '',
          user.territorial || '',
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

    toast.success('Exportacion completada', {
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
  const selectedTerritorial = editForm.location
    ? territorialBySede.get(normalizeKey(editForm.location))
    : undefined;

  return (
    <Container4K className="space-y-6">
      {/* ✅ Modal de Validador de Certificados */}
      <ValidarCertificadoGrado 
        isOpen={mostrarValidador} 
        onClose={() => setMostrarValidador(false)} 
      />

      {/* Header - DÍA 5: ResponsiveHeader */}
      <ResponsiveHeader
        title="Gestión de Graduados"
        description="Administra graduados y genera certificados de verificación de títulos"
        icon={GraduationCap}
        primaryAction={{
          label: "Verificar Certificado",
          icon: BadgeCheck,
          onClick: () => handleVerifyTitle(),
          variant: "primary"
        }}
        secondaryActions={[
          {
            label: "Exportar",
            icon: Download,
            onClick: () => setIsExportModalOpen(true),
            variant: "secondary"
          }
        ]}
      />

      {/* Búsqueda y Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="bg-white rounded-xl border border-[#E5E7EB] p-4"
        style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Input búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search 
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                style={{ color: '#9CA3AF' }}
              />
              <input
                type="text"
                placeholder="Buscar por nombre, correo o documento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-2 rounded-lg transition-all"
                style={{
                  paddingLeft: '48px',
                  paddingRight: searchQuery ? '48px' : '16px',
                  paddingTop: '12px',
                  paddingBottom: '12px',
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
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Filtro Estado */}
            {/* <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-2 rounded-lg px-4 py-2.5 text-sm transition-all"
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
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="border-2 rounded-lg px-4 py-2.5 text-sm transition-all"
              style={{
                borderColor: '#D1D5DB',
                color: '#1F2937',
                minWidth: '180px',
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
              <option value="all">Todos los programas</option>
              {uniquePrograms.map(prog => (
                <option key={prog} value={prog}>{prog}</option>
              ))}
            </select>

            {/* ✅ NUEVO: Filtro por Sede */}
            <select
              value={sedeFilter}
              onChange={(e) => setSedeFilter(e.target.value)}
              className="border-2 rounded-lg px-4 py-2.5 text-sm transition-all"
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
              <option value="all">Todas las sedes</option>
              {sedesOptions.map((sede) => (
                <option key={sede} value={sede}>{sede}</option>
              ))}
            </select>

            {/* Filtro Territorial */}
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="border-2 rounded-lg px-4 py-2.5 text-sm transition-all"
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
              <option value="all">Todas las seccionales</option>
              {territorialOptions.map((territorial) => (
                <option key={territorial} value={territorial}>{territorial}</option>
              ))}
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
              Estamos consultando la base de datos academica.
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
                ? 'Intenta ajustar los filtros de búsqueda'
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
                className="bg-white border-x border-b border-[#E5E7EB] last:rounded-b-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Fila Principal con Columnas */}
                <div className="p-4">
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
                    <div className="col-span-3 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewDetails(user)}
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
                          {authService.hasPermission(Permissions.GRADUATES_EDIT) && (
                          <DropdownMenuItem onClick={() => handleEdit(user)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          )}
                          {authService.hasPermission(Permissions.GRADUATES_VERIFY_CERTIFICATE) && (
                          <DropdownMenuItem onClick={() => handleVerifyTitle(user)}>
                            <BadgeCheck className="w-4 h-4 mr-2" />
                            Verificar Certificado
                          </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                      className="border-t border-[#E5E7EB] bg-[#F9FAFB] overflow-hidden"
                    >
                      {/* Grid de 3 columnas con informaci\u00f3n completa del graduado */}
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                            Sede
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

                        <div className="md:col-span-2 lg:col-span-3">
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Archivos
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenFilesModal(user)}
                              className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition hover:bg-slate-100"
                              style={{ borderColor: '#D1D5DB', color: '#1F2937', background: '#F9FAFB' }}
                            >
                              <FileText className="w-3.5 h-3.5" style={{ color: '#2563EB' }} />
                              Archivos
                            </button>
                            <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>
                              {formatFileCount(user.documentsCount ?? 0)}
                            </span>
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
              Filtra por fecha de grado y descarga el listado en CSV.
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
                Se exportaran los graduados que cumplan con los filtros activos y el rango de fechas.
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
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
              Archivos del titulo
            </DialogTitle>
            <DialogDescription>
              {filesModalUser
                ? `Graduado: ${filesModalUser.firstName} ${filesModalUser.lastName} · Documento: ${filesModalUser.document}`
                : 'Selecciona un graduado para ver sus archivos.'}
            </DialogDescription>
          </DialogHeader>

          <div className="graduate-files-body min-h-0 flex-1 overflow-y-auto py-4 pr-1 space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr]">
              <div className="flex items-center justify-between rounded-xl border px-4 py-3 shadow-sm" style={{ borderColor: '#FDE68A', background: '#FFFBEB' }}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#92400E' }}>
                    Límite
                  </p>
                  <p className="text-sm font-semibold" style={{ color: '#78350F' }}>
                    Máximo {MAX_FILES_PER_GRADUATE} archivos
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#92400E' }}>
                    Peso máximo por archivo: {MAX_UPLOAD_SIZE_LABEL}
                  </p>
                </div>
                <span className="text-xs font-semibold rounded-full px-3 py-1" style={{ background: '#FEF3C7', color: '#92400E' }}>
                  {totalQueuedFiles}/{MAX_FILES_PER_GRADUATE}
                </span>
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
                    {isFilesInputDisabled ? 'Carga no disponible' : 'Haz clic para seleccionar archivos'}
                  </span>
                </label>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  Puedes seleccionar varios archivos en una sola carga.
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
                      className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700"
                    >
                      <span className="max-w-[200px] truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQueuedFile(index)}
                        disabled={isUploadingFiles}
                        className="text-gray-400 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
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
              <div className="rounded-lg border border-dashed p-4 text-center" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
                <p className="text-sm font-medium" style={{ color: '#374151' }}>
                  Cargando archivos...
                </p>
              </div>
            ) : filesModalItems.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
                <p className="text-sm font-medium" style={{ color: '#374151' }}>
                  No hay archivos cargados.
                </p>
                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                  Aqui se mostraran los archivos del titulo cuando se suban.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filesModalItems.map((file) => {
                  const fileUrl = buildServiceAssetUrl(
                    'registro-academico',
                    file.url || `/uploads/graduate-files/${file.storedName}`,
                  );
                  return (
                    <div
                      key={file.id}
                      className="graduate-files-item flex items-center justify-between rounded-lg border px-3 py-2"
                      style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: '#1F2937' }}>
                          {file.originalName}
                        </p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>
                          {formatFileSize(file.sizeBytes)} ·{' '}
                          <span
                            className="graduate-files-type-badge inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                            style={getFileTypeBadgeStyle(file)}
                          >
                            {getFileTypeLabel(file)}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(file)}
                          className="graduate-files-action-btn text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          Descargar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestDeleteFile(file)}
                          className="graduate-files-action-btn is-danger text-xs font-semibold text-red-500 hover:text-red-600"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
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
      <Dialog open={isDeleteFileModalOpen} onOpenChange={setIsDeleteFileModalOpen}>
        <DialogContent
          className="graduate-files-confirm-dialog w-[92vw] max-w-md"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Confirmar eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Seguro que deseas eliminar el archivo{' '}
              <span className="graduate-files-filename font-semibold text-gray-900">
                {fileToDelete?.originalName}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => {
                setIsDeleteFileModalOpen(false);
                setFileToDelete(null);
              }}
              className="graduate-files-secondary-btn px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmDeleteFile}
              className="graduate-files-danger-btn px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2"
              style={{ background: '#DC2626', color: '#FFFFFF' }}
            >
              Eliminar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Graduado */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="w-[92vw] max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" style={{ color: '#003DA5' }} />
              Editar Graduado
            </DialogTitle>
            <DialogDescription>
              Actualiza la información del graduado {selectedUser?.firstName} {selectedUser?.lastName}
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

                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}

                placeholder="Nombre del graduado"

                maxLength={30}

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

                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}

                placeholder="Apellido del graduado"

                maxLength={30}

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

                onChange={(e) => setEditForm({ ...editForm, document: e.target.value })}

                placeholder="Número de documento"

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

                value={editForm.program}

                onChange={(e) => setEditForm({ ...editForm, program: e.target.value })}

                className="w-full border-2 rounded-lg px-3 py-2 text-sm"

                style={{ borderColor: '#D1D5DB' }}

                required

              >

                <option value="">Seleccionar programa</option>

                {editProgramOptions.map((prog) => (

                  <option key={prog} value={prog}>{prog}</option>

                ))}

              </select>

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

                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}

                placeholder="correo@ejemplo.com"

                required

              />

            </div>


            <div className="space-y-2">

              <Label htmlFor="edit-location">

                Sede

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

                {sedesOptions.map((sede) => (

                  <option key={sede} value={sede}>{sede}</option>

                ))}

              </select>

            </div>


            <div className="space-y-2">

              <Label htmlFor="edit-territorial">

                Territorial

                <span className="text-red-500"> *</span>

              </Label>

              <select

                id="edit-territorial"

                value={editForm.territorial || selectedTerritorial || ''}

                onChange={(e) => setEditForm({ ...editForm, territorial: e.target.value })}

                className="w-full border-2 rounded-lg px-3 py-2 text-sm"

                style={{ borderColor: '#D1D5DB' }}

                required

              >

                <option value="">Seleccionar seccional</option>

                {territorialOptions.map((territorial) => (

                  <option key={territorial} value={territorial}>{territorial}</option>

                ))}

              </select>

            </div>


            <div className="col-span-2">

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div className="space-y-2">

                  <Label htmlFor="edit-numRegistro">Número de registro</Label>

                  <Input

                    id="edit-numRegistro"

                    value={formatRegistroInput(editForm.numRegistro)}

                    onChange={(e) =>

                      setEditForm({ ...editForm, numRegistro: sanitizeRegistroInput(e.target.value) })

                    }

                    inputMode="numeric"

                  />

                </div>


                <div className="space-y-2">

                  <Label htmlFor="edit-numFolio">Número de folio</Label>

                  <Input

                    id="edit-numFolio"

                    value={formatRegistroInput(editForm.numFolio)}

                    onChange={(e) =>

                      setEditForm({ ...editForm, numFolio: sanitizeRegistroInput(e.target.value) })

                    }

                    inputMode="numeric"

                  />

                </div>


                <div className="space-y-2">

                  <Label htmlFor="edit-numLibro">Número de libro</Label>

                  <Input

                    id="edit-numLibro"

                    value={formatRegistroInput(editForm.numLibro)}

                    onChange={(e) =>

                      setEditForm({ ...editForm, numLibro: sanitizeRegistroInput(e.target.value) })

                    }

                    inputMode="numeric"

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
              Confirma la verificación del certificado de {selectedUser?.firstName} {selectedUser?.lastName}
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
              Configura las opciones del certificado para {selectedUser?.firstName} {selectedUser?.lastName}
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
                    <span className="font-medium text-gray-900">Incluir Firma Digital</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Agrega firma digital oficial de ESAP para mayor seguridad
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
              Envía un correo electrónico a {selectedUser?.email}
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
                placeholder="Escribe tu mensaje aquí..."
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
              ¿Estás seguro de que deseas bloquear a este graduado?
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
                    <li>Podrás revertir esta acción en cualquier momento</li>
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
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Eliminar Graduado
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. ¿Estás completamente seguro?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Trash2 className="w-5 h-5 mt-0.5 text-red-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    {selectedUser?.firstName} {selectedUser?.lastName}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Email:</strong> {selectedUser?.email}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Programa:</strong> {selectedUser?.program}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Documento:</strong> {selectedUser?.document}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-100 border border-red-300 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-red-700" />
                <div className="text-xs text-red-900">
                  <p className="font-semibold mb-1">⚠️ ADVERTENCIA: Esta acción es PERMANENTE</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Se eliminarán todos los datos del graduado</li>
                    <li>Se borrarán todos sus certificados</li>
                    <li>Se perderá el historial completo</li>
                    <li>Esta acción NO puede revertirse</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar Definitivamente
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Container4K>
  );
}




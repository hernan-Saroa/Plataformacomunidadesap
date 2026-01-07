/**
 * MÓDULO: CERTIFICADOS CON QR ÚNICO PARA VALIDACIÓN
 * - Cada combinación única (graduado + datos + entidad) genera UN certificado con QR único
 * - Si la MISMA combinación vuelve a solicitar → se REUTILIZA el QR existente (no se genera nuevo)
 * - Solo se crea QR nuevo si cambia: graduado, datos o entidad solicitante
 * - Estado "Activo" = QR habilitado para validación pública
 * - Al escanear QR: muestra si está activo + datos completos del certificado
 * - Trazabilidad completa:
 *   • Historial de solicitudes: cuando se pide el certificado
 *   • Historial de escaneos: cuando alguien escanea el QR para VALIDAR autenticidad
 *   • Cada validación registra: IP, ubicación, dispositivo, fecha/hora
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  X, 
  Download, 
  FileText, 
  Award, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  QrCode,
  Mail,
  Building2,
  User,
  Calendar,
  MapPin,
  Clock,
  Shield,
  Hash,
  Monitor,
  TrendingUp,
  Globe,
  MoreVertical,
  Edit,
  ExternalLink,
  Copy,
  RefreshCw,
  AlertTriangle,
  History
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { PaginationPremium } from '../shared/PaginationPremium';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import React from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { PROGRAMAS_ESAP } from '../../data/oferta-academica-esap';
import graduadosService, {
  CertificadoGraduado,
  DescargaCertificado,
  SolicitudCertificadoGraduado,
  ValidacionCertificado,
} from '../../services/api/graduados.service';
import estructuraService from '../../services/estructuraService';

// Tipo de certificado con QR único (reutilizable por misma combinación)
interface CertificateRequest {
  id: string;
  graduateId?: string;
  certificateNumber: string;
  certificateHash: string;
  qrCode: string; // QR único para la combinación graduado+datos+entidad
  graduate: {
    fullName: string;
    document: string;
    program: string;
    graduationDate: string;
    campus?: string;
  };
  programType?: string;
  degreeTitle?: string;
  diplomaNumber?: string;
  actaNumber?: string;
  campus?: string;
  requester: {
    name: string;
    email: string;
    type: 'entidad' | 'graduado'; // Quién solicitó el certificado
    logo?: string;
  };
  status: 'active' | 'revoked' | 'expired'; // Estado del certificado/QR
  firstRequestedAt: string; // Primera vez que se solicitó
  lastRequestedAt: string; // Última solicitud
  generatedAt: string; // Fecha de generación del certificado
  generatedBy: string;
  requestCount: number; // Número de veces que se ha solicitado este mismo certificado
  qrScanCount: number; // Número de veces que se ha escaneado el QR
  viewCount: number;
  downloadCount: number;
  lastActivity: string;
  requestHistory: Array<{
    id: string;
    requestedAt: string;
    requestedBy: string;
    ipAddress: string;
  }>;
  scanHistory: Array<{
    id: string;
    scannedAt: string;
    ipAddress: string;
    location: string;
    userAgent: string;
    verified: boolean;
  }>;
}

// Mantenemos compatibilidad con el nombre antiguo
type CertificateRecord = CertificateRequest;

interface VerificationCertificatesModuleProps {
  onPendingCountChange?: (count: number) => void;
}

export function VerificationCertificatesModule({ onPendingCountChange }: VerificationCertificatesModuleProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [requesterTypeFilter, setRequesterTypeFilter] = useState<string>('all');
  const [expandedCertId, setExpandedCertId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estados para modales
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateRecord | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrPreviewCertificate, setQrPreviewCertificate] = useState<CertificateRecord | null>(null);
  const qrCanvasRef = useRef<HTMLDivElement>(null);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sedesOptions, setSedesOptions] = useState<string[]>([]);
  const [seccionalesOptions, setSeccionalesOptions] = useState<string[]>([]);
  const [isEditGraduateModalOpen, setIsEditGraduateModalOpen] = useState(false);
  const [isSavingGraduate, setIsSavingGraduate] = useState(false);
  const [isLoadingGraduate, setIsLoadingGraduate] = useState(false);
  const [isExistingGraduate, setIsExistingGraduate] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [editCertificateForm, setEditCertificateForm] = useState({
    fullName: '',
    idNumber: '',
    email: '',
    phone: '',
    programName: '',
    programType: '',
    degreeTitle: '',
    graduationDate: '',
    diplomaNumber: '',
    actaNumber: '',
    campus: '',
    seccionalName: '',
  });

  const mapStatus = (status: CertificadoGraduado['status']): CertificateRecord['status'] => {
    if (status === 'REVOKED') return 'revoked';
    if (status === 'EXPIRED') return 'expired';
    return 'active';
  };

  const mapRequesterType = (value?: string): CertificateRecord['requester']['type'] => {
    if (value === 'COMPANY') return 'entidad';
    return 'graduado';
  };

  const normalizeDate = (value?: string) => {
    if (!value) return '';
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    return isDateOnly ? `${value}T00:00:00` : value;
  };

  const generateDiplomaNumber = () => {
    const stamp = new Date();
    const year = stamp.getFullYear();
    const month = String(stamp.getMonth() + 1).padStart(2, '0');
    const day = String(stamp.getDate()).padStart(2, '0');
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `DIPL-${year}${month}${day}-${suffix}`;
  };

  const generateActaNumber = () => {
    const stamp = new Date();
    const year = stamp.getFullYear();
    const month = String(stamp.getMonth() + 1).padStart(2, '0');
    const day = String(stamp.getDate()).padStart(2, '0');
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `ACTA-${year}${month}${day}-${suffix}`;
  };

  const buildRequestKey = (request: SolicitudCertificadoGraduado) => {
    const dateKey = request.graduationDate?.slice(0, 10) || '';
    return `${request.idNumber}|${request.programName}|${dateKey}`;
  };

  const ensureArray = <T,>(value: T[] | { data?: T[] } | undefined | null): T[] => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object' && Array.isArray((value as { data?: T[] }).data)) {
      return (value as { data?: T[] }).data as T[];
    }
    return [];
  };

  useEffect(() => {
    let active = true;

    const loadSedes = async () => {
      try {
        const estructura = await estructuraService.obtenerEstructura();
        const sedes = estructura?.data?.sedes || [];
        const seccionales = estructura?.data?.seccionales || [];
        const options = Array.from(
          new Set(sedes.map((sede) => sede?.nomSede).filter(Boolean))
        );
        const seccionalesOptions = Array.from(
          new Set(
            seccionales.map((seccional) => seccional?.nomSeccional).filter(Boolean)
          )
        );
        if (active) {
          setSedesOptions(options);
          setSeccionalesOptions(seccionalesOptions);
        }
      } catch (error) {
        console.error('Error cargando sedes:', error);
      }
    };

    loadSedes();

    return () => {
      active = false;
    };
  }, []);

  const loadCertificates = useCallback(async () => {
    setIsLoading(true);
    try {
      const [certificatesResponse, requestsResponse, validationsResponse, downloadsResponse] = await Promise.all([
        graduadosService.certificados.listar(),
        graduadosService.solicitudes.listar(),
        graduadosService.validaciones.listar(),
        graduadosService.descargas.listar(),
      ]);

      const certificatesData = ensureArray<CertificadoGraduado>(certificatesResponse);
      const requestsData = ensureArray<SolicitudCertificadoGraduado>(requestsResponse);
      const validationsData = ensureArray<ValidacionCertificado>(validationsResponse);
      const downloadsData = ensureArray<DescargaCertificado>(downloadsResponse);

      const requestsByKey = new Map<string, SolicitudCertificadoGraduado[]>();
      const requestsById = new Map<string, SolicitudCertificadoGraduado>();
      requestsData.forEach((request) => {
        const key = buildRequestKey(request);
        if (!requestsByKey.has(key)) {
          requestsByKey.set(key, []);
        }
        requestsByKey.get(key)!.push(request);
        requestsById.set(request.id, request);
      });

      const validationsByCertificate = new Map<string, ValidacionCertificado[]>();
      validationsData.forEach((validation) => {
        if (!validationsByCertificate.has(validation.certificateId)) {
          validationsByCertificate.set(validation.certificateId, []);
        }
        validationsByCertificate.get(validation.certificateId)!.push(validation);
      });

      const downloadsByCertificate = new Map<string, DescargaCertificado[]>();
      downloadsData.forEach((download) => {
        if (!downloadsByCertificate.has(download.certificateId)) {
          downloadsByCertificate.set(download.certificateId, []);
        }
        downloadsByCertificate.get(download.certificateId)!.push(download);
      });

      const mappedCertificates = certificatesData.map((certificate) => {
          const requestKey = `${certificate.idNumber}|${certificate.programName}|${certificate.graduationDate?.slice(0, 10) || ''}`;
          const relatedRequests = requestsByKey.get(requestKey) || [];
          const landingRequests = relatedRequests.filter((request) =>
            request.observations?.toLowerCase().includes('landing')
          );
          const effectiveRequests =
            landingRequests.length > 0 ? landingRequests : relatedRequests;
          const mainRequest = requestsById.get(certificate.requestId) || relatedRequests[0];

          const requestDates = effectiveRequests
            .map((req) => req.requestDate)
            .filter(Boolean)
            .map((date) => new Date(normalizeDate(date)).getTime())
            .filter((time) => !Number.isNaN(time));

          const firstRequestedAt = requestDates.length
            ? new Date(Math.min(...requestDates)).toISOString()
            : normalizeDate(certificate.issueDate);
          const lastRequestedAt = requestDates.length
            ? new Date(Math.max(...requestDates)).toISOString()
            : normalizeDate(certificate.issueDate);

          const scanHistory = (validationsByCertificate.get(certificate.id) || []).map((validation) => ({
            id: validation.id,
            scannedAt: normalizeDate(validation.validationDate),
            ipAddress: validation.ipAddress || 'N/A',
            location: validation.location || 'No disponible',
            userAgent: validation.userAgent || 'No disponible',
            verified: validation.result === 'VALID',
          }));
          const downloadCount = (downloadsByCertificate.get(certificate.id) || []).length;

          const lastScan = scanHistory.length
            ? scanHistory[0].scannedAt
            : '';

          const lastActivityCandidates = [lastRequestedAt, lastScan, normalizeDate(certificate.issueDate)]
            .filter(Boolean)
            .map((value) => new Date(value).getTime())
            .filter((time) => !Number.isNaN(time));

          const lastActivity = lastActivityCandidates.length
            ? new Date(Math.max(...lastActivityCandidates)).toISOString()
            : normalizeDate(certificate.issueDate);

          return {
            id: certificate.id,
            graduateId: certificate.graduateId,
            certificateNumber: certificate.certificateNumber,
            certificateHash: certificate.verificationCode,
            qrCode: certificate.verificationCode,
            graduate: {
              fullName: certificate.fullName,
              document: certificate.idNumber,
              program: certificate.programName,
              graduationDate: certificate.graduationDate,
              campus: certificate.campus || '',
            },
            programType: certificate.programType,
            degreeTitle: certificate.degreeTitle,
            diplomaNumber: certificate.diplomaNumber,
            actaNumber: certificate.actaNumber,
            campus: certificate.campus || '',
            requester: {
              name: mainRequest?.requesterName || certificate.fullName,
              email: mainRequest?.requesterEmail || '',
              type: mapRequesterType(mainRequest?.requesterType),
            },
            status: mapStatus(certificate.status),
            firstRequestedAt,
            lastRequestedAt,
            generatedAt: normalizeDate(certificate.issueDate),
            generatedBy: certificate.signerName || 'Registro Academico',
            requestCount: effectiveRequests.length || 1,
            qrScanCount: scanHistory.length,
            viewCount: effectiveRequests.length || 1,
            downloadCount,
            lastActivity,
            requestHistory: effectiveRequests.map((request) => ({
              id: request.id,
              requestedAt: normalizeDate(request.requestDate),
              requestedBy: request.requesterName || request.fullName,
              ipAddress: 'N/A',
            })),
            scanHistory,
          } as CertificateRecord;
        });

        const normalizeTime = (value?: string) => {
          if (!value) return 0;
          const date = new Date(value);
          return Number.isNaN(date.getTime()) ? 0 : date.getTime();
        };

        const statusPriority = (status: CertificateRecord['status']) => {
          if (status === 'active') return 3;
          if (status === 'revoked') return 2;
          return 1;
        };

        const groupedCertificates = new Map<string, CertificateRecord>();
        mappedCertificates.forEach((cert) => {
          const groupKey = `${cert.graduate.document}|${cert.graduate.program}|${cert.graduate.graduationDate}`;
          const existing = groupedCertificates.get(groupKey);
          if (!existing) {
            groupedCertificates.set(groupKey, cert);
            return;
          }

          const mergedRequestHistory = [...existing.requestHistory, ...cert.requestHistory].reduce(
            (acc, item) => {
              acc.set(item.id, item);
              return acc;
            },
            new Map<string, CertificateRecord['requestHistory'][number]>()
          );
          const mergedScanHistory = [...existing.scanHistory, ...cert.scanHistory].reduce(
            (acc, item) => {
              acc.set(item.id, item);
              return acc;
            },
            new Map<string, CertificateRecord['scanHistory'][number]>()
          );
          const mergedRequests = Array.from(mergedRequestHistory.values());
          const mergedScans = Array.from(mergedScanHistory.values());

          const latestCandidate =
            normalizeTime(cert.generatedAt) > normalizeTime(existing.generatedAt) ? cert : existing;

          groupedCertificates.set(groupKey, {
            ...latestCandidate,
            requestCount: mergedRequests.length || 1,
            qrScanCount: mergedScans.length,
            viewCount: mergedRequests.length || 1,
            downloadCount: existing.downloadCount + cert.downloadCount,
            requestHistory: mergedRequests,
            scanHistory: mergedScans,
            firstRequestedAt:
              normalizeTime(existing.firstRequestedAt) === 0
                ? cert.firstRequestedAt
                : normalizeTime(cert.firstRequestedAt) === 0
                ? existing.firstRequestedAt
                : normalizeTime(cert.firstRequestedAt) < normalizeTime(existing.firstRequestedAt)
                ? cert.firstRequestedAt
                : existing.firstRequestedAt,
            lastRequestedAt:
              normalizeTime(cert.lastRequestedAt) > normalizeTime(existing.lastRequestedAt)
                ? cert.lastRequestedAt
                : existing.lastRequestedAt,
            lastActivity:
              normalizeTime(cert.lastActivity) > normalizeTime(existing.lastActivity)
                ? cert.lastActivity
                : existing.lastActivity,
            status:
              statusPriority(cert.status) > statusPriority(existing.status)
                ? cert.status
                : existing.status,
          });
        });

      const uniqueCertificates = Array.from(groupedCertificates.values());

      setCertificates(uniqueCertificates);
    } catch (error) {
      console.error('Error cargando certificados:', error);
      toast.error('No se pudieron cargar los certificados', {
        description: 'Verifica la conexion con el servicio academico.',
      });
      setCertificates([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCertificates();
  }, [loadCertificates]);

  useEffect(() => {
    const handleFocus = () => {
      void loadCertificates();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadCertificates]);

  const handleOpenEditCertificate = async (cert: CertificateRecord) => {
    setSelectedCertificate(cert);
    setIsExistingGraduate(false);
    setEditCertificateForm({
      fullName: cert.graduate.fullName || '',
      idNumber: cert.graduate.document || '',
      email: '',
      phone: '',
      programName: cert.graduate.program || '',
      programType: cert.programType || '',
      degreeTitle: cert.degreeTitle || '',
      graduationDate: cert.graduate.graduationDate?.slice(0, 10) || '',
      diplomaNumber: cert.diplomaNumber || '',
      actaNumber: cert.actaNumber || '',
      campus: cert.campus || cert.graduate.campus || '',
      seccionalName: '',
    });
    setIsEditGraduateModalOpen(true);
    setIsLoadingGraduate(true);

    try {
      const isValidGraduateId =
        typeof cert.graduateId === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cert.graduateId) &&
        !/^([0-9a-f])\1{7}-\1{4}-\1{4}-\1{4}-\1{12}$/i.test(cert.graduateId);

      if (!isValidGraduateId || cert.requester.type !== 'graduado') {
        setIsLoadingGraduate(false);
        return;
      }

      const graduate = await graduadosService.graduados.obtenerPorId(cert.graduateId);
      setIsExistingGraduate(true);
      setEditCertificateForm((prev) => ({
        ...prev,
        fullName: graduate.fullName || prev.fullName,
        idNumber: graduate.idNumber || prev.idNumber,
        email: graduate.email || '',
        phone: graduate.phone || '',
        campus: graduate.campus || prev.campus,
        seccionalName: graduate.seccionalName || '',
        programName: graduate.programName || prev.programName,
        programType: graduate.programType || prev.programType,
        degreeTitle: graduate.degreeTitle || prev.degreeTitle,
        graduationDate: graduate.graduationDate?.toString().slice(0, 10) || prev.graduationDate,
      }));
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404) {
        setIsExistingGraduate(false);
      } else {
        console.error('Error cargando graduado:', error);
        toast.error('No se pudo cargar el graduado', {
          description: error?.response?.data?.message || error?.message,
        });
      }
    } finally {
      setIsLoadingGraduate(false);
    }
  };

  const handleSaveCertificate = async () => {
    if (!selectedCertificate) return;
    if (!editCertificateForm.fullName || !editCertificateForm.idNumber) {
      toast.error('Nombre y documento son obligatorios');
      return;
    }
    if (!editCertificateForm.programName || (!isExistingGraduate && !editCertificateForm.graduationDate)) {
      toast.error('Programa y fecha de graduación son obligatorios');
      return;
    }

    setIsSavingGraduate(true);
    try {
      const diplomaNumber =
        editCertificateForm.diplomaNumber || generateDiplomaNumber();
      const actaNumber = editCertificateForm.actaNumber || generateActaNumber();
      const nextForm = {
        ...editCertificateForm,
        diplomaNumber,
        actaNumber,
      };
      setEditCertificateForm(nextForm);

      const certificatePayload: Partial<CertificadoGraduado> = isExistingGraduate
        ? {
            fullName: nextForm.fullName,
            programName: nextForm.programName,
            programType: nextForm.programType,
            degreeTitle: nextForm.degreeTitle,
            campus: nextForm.campus,
            diplomaNumber,
            actaNumber,
          }
        : {
            fullName: nextForm.fullName,
            idNumber: nextForm.idNumber,
            programName: nextForm.programName,
            programType: nextForm.programType,
            degreeTitle: nextForm.degreeTitle,
            graduationDate: nextForm.graduationDate,
            diplomaNumber,
            actaNumber,
            campus: nextForm.campus,
          };

      await graduadosService.certificados.actualizar(
        selectedCertificate.id,
        certificatePayload
      );

      const canUpdateGraduate =
        isExistingGraduate &&
        selectedCertificate.graduateId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          selectedCertificate.graduateId,
        ) &&
        !/^([0-9a-f])\1{7}-\1{4}-\1{4}-\1{4}-\1{12}$/i.test(
          selectedCertificate.graduateId,
        );

      if (canUpdateGraduate) {
        const graduatePayload: Partial<GraduadoData> = isExistingGraduate
          ? {
              fullName: nextForm.fullName,
              email: nextForm.email,
              phone: nextForm.phone,
              programName: nextForm.programName,
              programType: nextForm.programType,
              degreeTitle: nextForm.degreeTitle,
              campus: nextForm.campus,
              seccionalName: nextForm.seccionalName,
            }
          : {
              fullName: nextForm.fullName,
              idNumber: nextForm.idNumber,
              email: nextForm.email,
              phone: nextForm.phone,
              programName: nextForm.programName,
              programType: nextForm.programType,
              degreeTitle: nextForm.degreeTitle,
              graduationDate: nextForm.graduationDate,
              diplomaNumber,
              actaNumber,
              campus: nextForm.campus,
              seccionalName: nextForm.seccionalName,
            };

        await graduadosService.graduados.actualizar(
          selectedCertificate.graduateId,
          graduatePayload,
        );
      }

      setCertificates((prev) =>
        prev.map((cert) =>
          cert.id === selectedCertificate.id
            ? {
                ...cert,
                graduate: {
                  ...cert.graduate,
                  fullName: nextForm.fullName,
                  document: nextForm.idNumber,
                  program: nextForm.programName,
                  graduationDate: nextForm.graduationDate,
                  campus: nextForm.campus,
                },
                programType: nextForm.programType,
                degreeTitle: nextForm.degreeTitle,
                diplomaNumber,
                actaNumber,
                campus: nextForm.campus,
              }
            : cert
        )
      );

      toast.success('Certificado actualizado', {
        description: 'Los datos del certificado fueron actualizados.',
      });
      setIsEditGraduateModalOpen(false);
    } catch (error: any) {
      console.error('Error actualizando certificado:', error);
      toast.error('No se pudo actualizar el certificado', {
        description: error?.response?.data?.message || error?.message,
      });
    } finally {
      setIsSavingGraduate(false);
    }
  };

  const stats = useMemo(() => {
    return {
      total: certificates.length,
      active: certificates.filter(c => c.status === 'active').length,
      totalRequests: certificates.reduce((sum, c) => sum + c.requestCount, 0),
      totalScans: certificates.reduce((sum, c) => sum + c.qrScanCount, 0),
      totalViews: certificates.reduce((sum, c) => sum + c.viewCount, 0),
      reusedQRs: certificates.filter(c => c.requestCount > 1).length,
    };
  }, [certificates]);

  const programNameOptions = useMemo(() => {
    const names = new Set<string>();
    PROGRAMAS_ESAP.forEach((programa) => {
      if (programa?.nombre) {
        names.add(programa.nombre);
      }
    });
    certificates.forEach((cert) => {
      if (cert.graduate.program) {
        names.add(cert.graduate.program);
      }
    });
    return Array.from(names);
  }, [certificates]);

  const programTypeOptions = useMemo(() => {
    const types = new Set<string>();
    PROGRAMAS_ESAP.forEach((programa) => {
      if (programa?.nivel) {
        types.add(programa.nivel);
      }
    });
    certificates.forEach((cert) => {
      if (cert.programType) {
        types.add(cert.programType);
      }
    });
    return Array.from(types);
  }, [certificates]);

  const degreeTitleOptions = useMemo(() => {
    const titles = new Set<string>();
    certificates.forEach((cert) => {
      if (cert.degreeTitle) {
        titles.add(cert.degreeTitle);
      }
    });
    return Array.from(titles);
  }, [certificates]);

  const filteredCertificates = useMemo(() => {
    return certificates.filter(cert => {
      const matchesSearch = searchQuery === '' ||
        cert.graduate.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.requester.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.requester.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;
      const matchesType = requesterTypeFilter === 'all' || cert.requester.type === requesterTypeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [certificates, searchQuery, statusFilter, requesterTypeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, requesterTypeFilter]);

  // Paginación
  const totalPages = Math.ceil(filteredCertificates.length / itemsPerPage);
  const paginatedCertificates = filteredCertificates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Helpers
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any; description: string }> = {
      active: { 
        label: 'Activo', 
        className: 'bg-[#ECFDF5] text-[#065F46] border-[#10B981]',
        icon: CheckCircle,
        description: 'QR válido para escaneo'
      },
      revoked: { 
        label: 'Revocado', 
        className: 'bg-[#FEF2F2] text-[#991B1B] border-[#EF4444]',
        icon: XCircle,
        description: 'Certificado inválido'
      },
      expired: { 
        label: 'Expirado', 
        className: 'bg-[#F3F4F6] text-[#374151] border-[#D1D5DB]',
        icon: AlertCircle,
        description: 'Fuera de vigencia'
      }
    };
    
    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;
    
    return (
      <div className="space-y-1">
        <Badge className={`${config.className} border hover:${config.className}`}>
          <div className="flex items-center gap-1.5">
            {status === 'active' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>}
            <Icon className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{config.label}</span>
          </div>
        </Badge>
        <p className="text-xs" style={{ color: '#6B7280' }}>{config.description}</p>
      </div>
    );
  };

  const getRequesterTypeBadge = (type: string) => {
    const typeConfig: Record<string, { label: string; className: string; icon: any }> = {
      entidad: {
        label: 'Entidad',
        className: 'bg-[#EFF6FF] text-[#1E40AF] border-[#3B82F6]',
        icon: Building2
      },
      graduado: {
        label: 'Graduado',
        className: 'bg-[#EDE9FE] text-[#5B21B6] border-[#8B5CF6]',
        icon: User
      }
    };
    
    const config = typeConfig[type] || typeConfig.entidad;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.className} border text-xs font-medium`}>
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3" />
          {config.label}
        </div>
      </Badge>
    );
  };

  const formatLastActivity = (dateString?: string) => {
    if (!dateString) return 'Sin actividad';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  const formatDateTime = (
    value: string | undefined,
    options: Intl.DateTimeFormatOptions
  ) => {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';
    return date.toLocaleString('es-CO', options);
  };

  const handleViewDetails = (cert: CertificateRecord) => {
    setExpandedCertId(expandedCertId === cert.id ? null : cert.id);
  };

  const handleRevokeCertificate = (cert: CertificateRecord) => {
    setSelectedCertificate(cert);
    setIsRevokeModalOpen(true);
  };

  const confirmRevoke = () => {
    toast.success('Certificado Revocado', {
      description: `El certificado ${selectedCertificate?.certificateNumber} ha sido marcado como INVÁLIDO. El QR mostrará advertencia al escanearlo.`
    });
    setIsRevokeModalOpen(false);
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

  const handleViewQR = (cert: CertificateRecord) => {
    setQrPreviewCertificate(cert);
    setIsQrModalOpen(true);
  };

  const getPublicValidationUrl = (qrCode: string) => {
    return `${window.location.origin}/verificar-certificado/${qrCode}`;
  };

  const buildExportRows = (items: CertificateRecord[]) => {
    return items.map((cert) => ({
      certificado: cert.certificateNumber,
      estado: cert.status,
      codigo_qr: cert.qrCode,
      url_verificacion: getPublicValidationUrl(cert.qrCode),
      graduado: cert.graduate.fullName,
      documento: cert.graduate.document,
      programa: cert.graduate.program,
      fecha_grado: cert.graduate.graduationDate || '',
      solicitante: cert.requester.name,
      email_solicitante: cert.requester.email,
      tipo_solicitante: cert.requester.type,
      solicitudes: cert.requestCount,
      escaneos: cert.qrScanCount,
      fecha_generacion: cert.generatedAt,
      ultima_solicitud: cert.lastRequestedAt,
    }));
  };
  
  const descargarCSV = (rows: Array<Record<string, string | number>>) => {
    if (!rows.length) return;
    const delimiter = ';';
    const headers = Object.keys(rows[0]);
    const csvHeaders = headers.join(delimiter);
    const csvRows = rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          const text = value === undefined || value === null ? '' : String(value);
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(delimiter),
    );
    const csv = `\uFEFF${[csvHeaders, ...csvRows].join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `verificacion-titulos-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };
  
  const handleExportCertificates = () => {
    if (!filteredCertificates.length) {
      toast.info('No hay registros para exportar');
      return;
    }
  
    const start = exportStartDate ? new Date(`${exportStartDate}T00:00:00`) : null;
    const end = exportEndDate ? new Date(`${exportEndDate}T23:59:59.999`) : null;
  
    if (start && Number.isNaN(start.getTime())) {
      toast.error('Fecha inicial invalida');
      return;
    }
  
    if (end && Number.isNaN(end.getTime())) {
      toast.error('Fecha final invalida');
      return;
    }
  
    if (start && end && start > end) {
      toast.error('La fecha inicial debe ser menor o igual a la fecha final');
      return;
    }
  
    const filteredByDate = filteredCertificates.filter((cert) => {
      if (!start && !end) return true;
      const candidate = cert.generatedAt ? new Date(cert.generatedAt) : null;
      if (!candidate || Number.isNaN(candidate.getTime())) return false;
      const afterStart = !start || candidate >= start;
      const beforeEnd = !end || candidate <= end;
      return afterStart && beforeEnd;
    });
  
    if (!filteredByDate.length) {
      toast.info('No hay registros en el rango seleccionado');
      return;
    }
  
    setIsExporting(true);
    try {
      const rows = buildExportRows(filteredByDate);
      descargarCSV(rows);
      toast.success('Exportacion completada', {
        description: `${rows.length} registros exportados`,
      });
      setIsExportModalOpen(false);
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleDownloadQR = async () => {
    if (!qrPreviewCertificate) return;
  
    try {
      const url = getPublicValidationUrl(qrPreviewCertificate.qrCode);
      const qrCanvas = qrCanvasRef.current?.querySelector('canvas');
      const qrDataUrl = qrCanvas?.toDataURL('image/png');
  
      if (!qrDataUrl) {
        toast.error('No se pudo generar el QR');
        return;
      }
  
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
  
      const width = 800;
      const height = 1000;
      canvas.width = width;
      canvas.height = height;
  
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
  
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#003DA5');
      gradient.addColorStop(1, '#0052D9');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, 180);
  
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('ESAP', width / 2, 70);
  
      ctx.font = '20px Arial';
      ctx.fillText('Escuela Superior de Administracion Publica', width / 2, 110);
  
      ctx.font = 'bold 24px Arial';
      ctx.fillText('Codigo QR de Validacion', width / 2, 150);
  
      const qrSize = 400;
      const qrX = (width - qrSize) / 2;
      const qrY = 220;
  
      ctx.fillStyle = '#F9FAFB';
      ctx.fillRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
  
      ctx.strokeStyle = qrPreviewCertificate.status === 'active' ? '#10B981' : '#9CA3AF';
      ctx.lineWidth = 4;
      ctx.strokeRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
  
      const qrImage = new Image();
      const qrLoaded = new Promise((resolve, reject) => {
        qrImage.onload = () => resolve(undefined);
        qrImage.onerror = () => reject(new Error('No se pudo cargar el QR'));
      });
      qrImage.src = qrDataUrl;
      await qrLoaded;
      ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
  
      ctx.fillStyle = '#1F2937';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(qrPreviewCertificate.qrCode, width / 2, qrY + qrSize + 60);
  
      const infoY = qrY + qrSize + 110;
      ctx.font = '16px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#4B5563';
  
      const leftMargin = 80;
      ctx.fillText(`Graduado: ${qrPreviewCertificate.graduate.fullName}`, leftMargin, infoY);
      ctx.fillText(`Documento: ${qrPreviewCertificate.graduate.document}`, leftMargin, infoY + 30);
      ctx.fillText(`Programa: ${qrPreviewCertificate.graduate.program}`, leftMargin, infoY + 60);
      ctx.fillText(`N? Certificado: ${qrPreviewCertificate.certificateNumber}`, leftMargin, infoY + 90);
  
      const statusY = infoY + 140;
      ctx.font = 'bold 18px Arial';
      if (qrPreviewCertificate.status === 'active') {
        ctx.fillStyle = '#10B981';
        ctx.fillText('CERTIFICADO ACTIVO Y VALIDO', leftMargin, statusY);
      } else {
        ctx.fillStyle = '#EF4444';
        ctx.fillText('CERTIFICADO REVOCADO', leftMargin, statusY);
      }
  
      ctx.font = '14px Arial';
      ctx.fillStyle = '#6B7280';
      ctx.textAlign = 'center';
      ctx.fillText('Valida este certificado en:', width / 2, height - 80);
      ctx.fillStyle = '#003DA5';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(url, width / 2, height - 50);
  
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '12px Arial';
      ctx.fillText(`Generado el ${new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, width / 2, height - 20);
  
      canvas.toBlob((blob) => {
        if (!blob) return;
  
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `QR-${qrPreviewCertificate.certificateNumber}-${qrPreviewCertificate.graduate.document}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
  
        toast.success('QR descargado exitosamente', {
          description: `El codigo QR del certificado ${qrPreviewCertificate.certificateNumber} se ha descargado.`
        });
      }, 'image/png');
  
    } catch (error) {
      console.error('Error al generar el QR:', error);
      toast.error('Error al descargar el QR', {
        description: 'No se pudo generar la imagen. Intenta nuevamente.'
      });
    }
  };
  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setRequesterTypeFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || requesterTypeFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Descripción específica de verificación */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-blue-50 border border-blue-200 rounded-lg p-4"
      >
        <div className="flex items-start gap-3">
          <QrCode className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p 
            className="font-normal"
            style={{
              fontSize: '13px',
              lineHeight: '18px',
              color: '#1F2937'
            }}
          >
            Cada combinación única genera <strong>UN certificado con QR único</strong>. Si la misma persona y entidad vuelve a solicitarlo, se <strong>reutiliza el QR existente</strong> (no se genera nuevo).
          </p>
        </div>
      </motion.div>

          <div className="flex justify-end">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 transition-all"
              style={{
                background: '#FFFFFF',
                color: '#003DA5',
                border: '2px solid #003DA5',
                borderRadius: '8px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F0F6FF';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFFFFF';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Download className="w-5 h-5" strokeWidth={2} />
              <span>Exportar</span>
            </button>
          </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <QrCode className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-gray-900 mb-1">
              🔄 Lógica de QR Único (Reutilizable)
            </h3>
            <p className="text-sm text-gray-700">
              <strong>1)</strong> Se solicita certificado (graduado + entidad) → 
              <strong> 2)</strong> Sistema verifica si YA existe esa combinación → 
              <strong> 3a)</strong> Si NO existe: genera certificado + QR nuevo · 
              <strong> 3b)</strong> Si SÍ existe: reutiliza QR existente (no genera nuevo)
            </p>
          </div>
        </div>
      </motion.div>

      {/* Búsqueda y Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
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
                placeholder="Buscar por graduado, solicitante, certificado o código QR..."
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
            <select
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
              <option value="revoked">Revocados</option>
              <option value="expired">Expirados</option>
            </select>

            {/* Filtro Tipo Solicitante */}
            <select
              value={requesterTypeFilter}
              onChange={(e) => setRequesterTypeFilter(e.target.value)}
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
              <option value="all">Todos los solicitantes</option>
              <option value="entidad">Entidades</option>
              <option value="graduado">Graduados</option>
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

      {/* Lista de Certificados */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="space-y-3"
      >
        {isLoading ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
            <Award className="w-16 h-16 mx-auto mb-4" style={{ color: '#D1D5DB' }} />
            <h3 className="text-lg font-semibold text-[#1F2937] mb-2">
              Cargando certificados...
            </h3>
            <p className="text-sm text-[#6B7280]">
              Consultando la base de datos academica.
            </p>
          </div>
        ) : paginatedCertificates.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-12 text-center">
            <Award className="w-16 h-16 mx-auto mb-4" style={{ color: '#D1D5DB' }} />
            <h3 className="text-lg font-semibold text-[#1F2937] mb-2">
              No se encontraron solicitudes de certificados
            </h3>
            <p className="text-sm text-[#6B7280] mb-6">
              {hasActiveFilters 
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Aún no hay solicitudes de certificados procesadas en el sistema'}
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
                <div className="col-span-2">SOLICITADO POR</div>
                <div className="col-span-2">QR ÚNICO / ESCANEOS</div>
                <div className="col-span-2">N° CERTIFICADO</div>
                <div className="col-span-2">ESTADO / VALIDACIÓN</div>
                <div className="col-span-1 text-right">ACCIONES</div>
              </div>
            </div>

            {/* Filas de Certificados */}
            {paginatedCertificates.map((cert, index) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                className="bg-white border-x border-b border-[#E5E7EB] last:rounded-b-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Fila Principal */}
                <div className="p-4">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Columna 1: Graduado */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback 
                            className="text-white font-semibold text-sm"
                            style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}
                          >
                            {(cert.graduate.fullName || 'GR').split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <h3 
                            className="font-semibold truncate mb-0.5"
                            style={{ fontSize: '14px', color: '#1F2937' }}
                          >
                            {cert.graduate.fullName}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#6B7280' }}>
                            <Award className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{cert.graduate.program}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Columna 2: Solicitante */}
                    <div className="col-span-2">
                      <div className="space-y-1">
                        {getRequesterTypeBadge(cert.requester.type)}
                        <p className="text-sm font-medium line-clamp-1" style={{ color: '#1F2937' }}>
                          {cert.requester.name}
                        </p>
                      </div>
                    </div>

                    {/* Columna 3: QR Único + Escaneos */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewQR(cert)}
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 relative"
                          style={{ background: cert.status === 'active' ? '#FEF3C7' : '#F3F4F6', cursor: 'pointer' }}
                          title="Ver código QR único"
                        >
                          <QrCode className="w-5 h-5" style={{ color: cert.status === 'active' ? '#F59E0B' : '#9CA3AF' }} />
                          {cert.requestCount > 1 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {cert.requestCount}
                            </div>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>
                              {cert.qrScanCount} escaneos
                            </p>
                            {cert.status === 'active' && (
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="QR Activo para Validación"></div>
                            )}
                          </div>
                          <p className="text-xs truncate font-mono" style={{ color: '#6B7280' }}>
                            {cert.qrCode}
                          </p>
                          {cert.requestCount > 1 && (
                            <p className="text-xs font-semibold" style={{ color: '#3B82F6' }}>
                              Solicitado {cert.requestCount} veces
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Columna 4: Certificado */}
                    <div className="col-span-2">
                      <div className="space-y-0.5">
                        <p className="text-xs font-mono font-semibold" style={{ color: '#1F2937' }}>
                          {cert.certificateNumber}
                        </p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>
                          {new Date(cert.generatedAt).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Columna 5: Estado */}
                    <div className="col-span-2">
                      {getStatusBadge(cert.status)}
                    </div>

                    {/* Columna 6: Acciones */}
                    <div className="col-span-1 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewDetails(cert)}
                        className="p-2 rounded-lg transition-all"
                        style={{
                          background: expandedCertId === cert.id ? '#F0F6FF' : '#F9FAFB',
                          color: '#003DA5'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#F0F6FF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = expandedCertId === cert.id ? '#F0F6FF' : '#F9FAFB';
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
                          <DropdownMenuItem onClick={() => handleOpenEditCertificate(cert)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar certificado
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* Panel Expandido - TRAZABILIDAD COMPLETA */}
                <AnimatePresence>
                  {expandedCertId === cert.id && (
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
                            Trazabilidad Completa del Certificado
                          </h3>
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 border text-xs">
                            ID: {cert.id}
                          </Badge>
                        </div>

                        {/* Grid 2 columnas - Info Graduado y Solicitante */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Info Graduado */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Award className="w-4 h-4 text-blue-600" />
                              Información del Graduado
                            </h4>
                            <div className="space-y-2.5 text-sm">
                              <div className="flex items-start gap-2">
                                <User className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Nombre Completo</p>
                                  <p className="font-semibold text-gray-900">{cert.graduate.fullName}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <FileText className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Documento</p>
                                  <p className="font-semibold text-gray-900 font-mono">{cert.graduate.document}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Award className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Programa</p>
                                  <p className="font-semibold text-gray-900">{cert.graduate.program}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Sede</p>
                                  <p className="font-semibold text-gray-900">
                                    {cert.graduate.campus || 'Sin asignar'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Calendar className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Fecha de Graduación</p>
                                  <p className="font-semibold text-gray-900">
                                    {new Date(cert.graduate.graduationDate).toLocaleDateString('es-CO', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Info Solicitante */}
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-purple-600" />
                              Información del Solicitante
                            </h4>
                            <div className="space-y-2.5 text-sm">
                              <div className="flex items-start gap-2">
                                {cert.requester.type === 'entidad' && <Building2 className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />}
                                {cert.requester.type === 'graduado' && <User className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />}
                                <div>
                                  <p className="text-xs text-gray-600">Nombre/Razón Social</p>
                                  <p className="font-semibold text-gray-900">{cert.requester.name}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Mail className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Email</p>
                                  <p className="font-semibold text-gray-900">{cert.requester.email}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Shield className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600 mb-1">Tipo</p>
                                  {getRequesterTypeBadge(cert.requester.type)}
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Calendar className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-600">Fecha de Solicitud</p>
                                  <p className="font-semibold text-gray-900">
                                    {new Date(cert.generatedAt).toLocaleString('es-CO')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Hash y Seguridad */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Hash className="w-4 h-4 text-gray-700" />
                            Seguridad y Verificación Digital
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs text-gray-600 mb-1.5">Hash SHA-256 del Certificado</p>
                              <div className="flex items-center gap-2 bg-white p-3 rounded border border-gray-200">
                                <p className="text-xs font-mono flex-1 break-all text-gray-900">
                                  {cert.certificateHash}
                                </p>
                                <button
                                  onClick={() => handleCopyToClipboard(cert.certificateHash, 'Hash')}
                                  className="p-2 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                                  title="Copiar hash"
                                >
                                  <Copy className="w-4 h-4 text-gray-600" />
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-gray-600 mb-1.5">Código QR</p>
                                <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                                  <QrCode className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                  <p className="text-xs font-mono text-gray-900">{cert.qrCode}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 mb-1.5">Generado por</p>
                                <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                                  <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <p className="text-xs font-semibold text-gray-900">{cert.generatedBy}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Estadísticas */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            Estadísticas de Uso
                          </h4>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white border border-amber-200 rounded-lg p-3 text-center">
                              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mx-auto mb-2">
                                <QrCode className="w-5 h-5 text-amber-600" />
                              </div>
                              <p className="text-2xl font-bold text-gray-900">{cert.qrScanCount}</p>
                              <p className="text-xs text-gray-600">Escaneos QR</p>
                            </div>
                            <div className="bg-white border border-blue-200 rounded-lg p-3 text-center">
                              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-2">
                                <Eye className="w-5 h-5 text-blue-600" />
                              </div>
                              <p className="text-2xl font-bold text-gray-900">{cert.viewCount}</p>
                              <p className="text-xs text-gray-600">Visualizaciones</p>
                            </div>
                            <div className="bg-white border border-green-200 rounded-lg p-3 text-center">
                              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-2">
                                <Download className="w-5 h-5 text-green-600" />
                              </div>
                              <p className="text-2xl font-bold text-gray-900">{cert.downloadCount}</p>
                              <p className="text-xs text-gray-600">Descargas</p>
                            </div>
                          </div>
                        </div>

                        {/* Historial de Escaneos */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                              <Monitor className="w-4 h-4 text-gray-700" />
                              Historial Completo de Escaneos
                            </h4>
                            <Badge className="bg-gray-100 text-gray-700 border-gray-200 border text-xs">
                              {cert.scanHistory.length} registros
                            </Badge>
                          </div>
                          
                          {cert.scanHistory.length === 0 ? (
                            <div className="text-center py-6">
                              <Monitor className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                              <p className="text-sm text-gray-500">No hay escaneos registrados</p>
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                              {cert.scanHistory.map((scan, idx) => (
                                <div 
                                  key={scan.id} 
                                  className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-bold text-blue-700">#{idx + 1}</span>
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-gray-900">Escaneo {idx + 1}</p>
                                        <p className="text-xs text-gray-500">{formatLastActivity(scan.scannedAt)}</p>
                                      </div>
                                    </div>
                                    {scan.verified ? (
                                      <Badge className="bg-green-100 text-green-700 border-green-200 border text-xs">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Verificado
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Fallido
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="flex items-start gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 mt-0.5 text-gray-500 flex-shrink-0" />
                                      <div>
                                        <p className="text-gray-600">Fecha y Hora</p>
                                        <p className="font-semibold text-gray-900">
                                          {formatDateTime(scan.scannedAt, {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-start gap-1.5">
                                      <Globe className="w-3.5 h-3.5 mt-0.5 text-gray-500 flex-shrink-0" />
                                      <div>
                                        <p className="text-gray-600">IP</p>
                                        <div className="flex items-center gap-1">
                                          <p className="font-semibold text-gray-900 font-mono">{scan.ipAddress}</p>
                                          <button
                                            onClick={() => handleCopyToClipboard(scan.ipAddress, 'IP')}
                                            className="p-0.5 hover:bg-gray-200 rounded"
                                          >
                                            <Copy className="w-3 h-3 text-gray-500" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-start gap-1.5">
                                      <MapPin className="w-3.5 h-3.5 mt-0.5 text-gray-500 flex-shrink-0" />
                                      <div>
                                        <p className="text-gray-600">Ubicación</p>
                                        <p className="font-semibold text-gray-900">{scan.location}</p>
                                      </div>
                                    </div>

                                    <div className="flex items-start gap-1.5">
                                      <Monitor className="w-3.5 h-3.5 mt-0.5 text-gray-500 flex-shrink-0" />
                                      <div>
                                        <p className="text-gray-600">Dispositivo</p>
                                        <p className="text-gray-700">
                                          {scan.userAgent.includes('Mobile') ? '📱 Móvil' : 
                                           scan.userAgent.includes('iPhone') ? '📱 iPhone' :
                                           scan.userAgent.includes('Android') ? '📱 Android' :
                                           scan.userAgent.includes('Windows') ? '💻 Windows' :
                                           scan.userAgent.includes('Mac') ? '🍎 Mac' : '💻 PC'}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="col-span-2 flex items-start gap-1.5 mt-1 pt-2 border-t border-gray-200">
                                      <Monitor className="w-3.5 h-3.5 mt-0.5 text-gray-500 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-gray-600 mb-1">User Agent</p>
                                        <p className="text-xs text-gray-700 font-mono break-all bg-white p-1.5 rounded border border-gray-200">
                                          {scan.userAgent}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Última Actividad */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="text-gray-600">Última actividad:</span>
                            <span className="font-semibold text-gray-900">{formatLastActivity(cert.lastActivity)}</span>
                            <span className="text-gray-500">({new Date(cert.lastActivity).toLocaleString('es-CO')})</span>
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
      {paginatedCertificates.length > 0 && (
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
            totalItems={filteredCertificates.length}
            pageSize={itemsPerPage}
          />
        </motion.div>
      )}

            {/* Modal: Editar Certificado */}
      <Dialog open={isEditGraduateModalOpen} onOpenChange={setIsEditGraduateModalOpen}>
        <DialogContent className="w-[92vw] max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" style={{ color: '#003DA5' }} />
              Editar Certificado
            </DialogTitle>
            <DialogDescription>
              Actualiza los datos de verificacion del certificado y del graduado asociado.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {isExistingGraduate && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Este graduado ya existe. Solo puedes editar todos los campos excepto documento, fecha de graduacion y numeros de acta/diploma.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-full-name">Nombre completo</Label>
                <Input
                  id="edit-full-name"
                  value={editCertificateForm.fullName}
                  onChange={(e) =>
                    setEditCertificateForm({ ...editCertificateForm, fullName: e.target.value })
                  }
                  placeholder="Nombre completo"
                  disabled={isLoadingGraduate}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-id-number">Documento</Label>
                <Input
                  id="edit-id-number"
                  value={editCertificateForm.idNumber}
                  onChange={(e) =>
                    setEditCertificateForm({ ...editCertificateForm, idNumber: e.target.value })
                  }
                  placeholder="Numero de documento"
                  disabled={isLoadingGraduate || isExistingGraduate}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editCertificateForm.email}
                  onChange={(e) =>
                    setEditCertificateForm({ ...editCertificateForm, email: e.target.value })
                  }
                  placeholder="correo@ejemplo.com"
                  disabled={isLoadingGraduate}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefono</Label>
                <Input
                  id="edit-phone"
                  value={editCertificateForm.phone}
                  onChange={(e) =>
                    setEditCertificateForm({ ...editCertificateForm, phone: e.target.value })
                  }
                  placeholder="+57 300 1234567"
                  disabled={isLoadingGraduate}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-program">Programa</Label>
                <select
                  id="edit-program"
                  value={editCertificateForm.programName}
                  onChange={(e) =>
                    setEditCertificateForm({ ...editCertificateForm, programName: e.target.value })
                  }
                  className="w-full border-2 rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: '#D1D5DB' }}
                  disabled={isLoadingGraduate}
                >
                  <option value="">Seleccionar programa</option>
                  {programNameOptions.map((program) => (
                    <option key={program} value={program}>{program}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-program-type">Tipo de programa</Label>
                <select
                  id="edit-program-type"
                  value={editCertificateForm.programType}
                  onChange={(e) =>
                    setEditCertificateForm({ ...editCertificateForm, programType: e.target.value })
                  }
                  className="w-full border-2 rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: '#D1D5DB' }}
                  disabled={isLoadingGraduate}
                >
                  <option value="">Seleccionar tipo</option>
                  {programTypeOptions.map((programType) => (
                    <option key={programType} value={programType}>{programType}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-degree-title">Titulo</Label>
                <select
                  id="edit-degree-title"
                  value={editCertificateForm.degreeTitle}
                  onChange={(e) =>
                    setEditCertificateForm({ ...editCertificateForm, degreeTitle: e.target.value })
                  }
                  className="w-full border-2 rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: '#D1D5DB' }}
                  disabled={isLoadingGraduate}
                >
                  <option value="">Seleccionar titulo</option>
                  {degreeTitleOptions.map((title) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-graduation-date">Fecha de graduacion</Label>
                <Input
                  id="edit-graduation-date"
                  type="date"
                  value={editCertificateForm.graduationDate}
                  onChange={(e) =>
                    setEditCertificateForm({ ...editCertificateForm, graduationDate: e.target.value })
                  }
                  disabled={isLoadingGraduate || isExistingGraduate}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-diploma">Numero de diploma</Label>
                <Input
                  id="edit-diploma"
                  value={editCertificateForm.diplomaNumber}
                  onChange={(e) =>
                    setEditCertificateForm({ ...editCertificateForm, diplomaNumber: e.target.value })
                  }
                  placeholder="Numero de diploma"
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-acta">Numero de acta</Label>
                <Input
                  id="edit-acta"
                  value={editCertificateForm.actaNumber}
                  onChange={(e) =>
                    setEditCertificateForm({ ...editCertificateForm, actaNumber: e.target.value })
                  }
                  placeholder="Numero de acta"
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-campus">Sede</Label>
                <select
                  id="edit-campus"
                  value={editCertificateForm.campus}
                  onChange={(e) =>
                    setEditCertificateForm({ ...editCertificateForm, campus: e.target.value })
                  }
                  className="w-full border-2 rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: '#D1D5DB' }}
                  disabled={isLoadingGraduate}
                >
                  <option value="">Seleccionar sede</option>
                  {sedesOptions.map((sede) => (
                    <option key={sede} value={sede}>{sede}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-seccional">Seccional</Label>
                <select
                  id="edit-seccional"
                  value={editCertificateForm.seccionalName}
                  onChange={(e) =>
                    setEditCertificateForm({ ...editCertificateForm, seccionalName: e.target.value })
                  }
                  className="w-full border-2 rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: '#D1D5DB' }}
                  disabled={isLoadingGraduate}
                >
                  <option value="">Seleccionar seccional</option>
                  {seccionalesOptions.map((seccional) => (
                    <option key={seccional} value={seccional}>{seccional}</option>
                  ))}
                </select>
              </div>
            </div>

            {isLoadingGraduate && (
              <p className="text-xs text-gray-500 mt-3">Cargando datos del graduado...</p>
            )}
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsEditGraduateModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
              disabled={isSavingGraduate}
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveCertificate}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
              disabled={isSavingGraduate || isLoadingGraduate}
            >
              {isSavingGraduate ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

{/* Modal: Revocar Certificado */}
      <Dialog open={isRevokeModalOpen} onOpenChange={setIsRevokeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Revocar Certificado
            </DialogTitle>
            <DialogDescription>
              Esta acción marcará el certificado como inválido
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 mt-0.5 text-red-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    {selectedCertificate?.certificateNumber}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Graduado:</strong> {selectedCertificate?.graduate.fullName}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Solicitante:</strong> {selectedCertificate?.requester.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600" />
                <div className="text-xs text-amber-800">
                  <p className="font-semibold mb-1">Consecuencias de la revocación:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>El certificado aparecerá como "REVOCADO" en todas las validaciones</li>
                    <li>Al escanear el QR, mostrará advertencia "❌ CERTIFICADO INVÁLIDO"</li>
                    <li>No se podrán ver los datos del certificado al escanear</li>
                    <li>Se notificará al solicitante automáticamente</li>
                    <li>Esta acción quedará registrada en auditoría con fecha, hora y usuario</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsRevokeModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmRevoke}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
            >
              <XCircle className="w-4 h-4" />
              Confirmar Revocación
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Exportar Certificados */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="w-[92vw] max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" style={{ color: '#003DA5' }} />
              Exportar Verificaciones de Titulos
            </DialogTitle>
            <DialogDescription>
              Filtra por fecha de generacion del certificado y descarga el CSV.
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
                Se exportan los registros que cumplan con los filtros actuales y el rango de fechas.
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
              onClick={handleExportCertificates}
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

      {/* Modal: Ver Código QR Único */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="w-[92vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-amber-600" />
              Código QR Único - Validación Pública
            </DialogTitle>
            <DialogDescription>
              Este QR permite que cualquier persona valide la autenticidad del certificado. Cada escaneo queda registrado en el historial.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* QR Placeholder + Estado */}
            <div className={`${qrPreviewCertificate?.status === 'active' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} border-2 rounded-xl p-6`}>
              <div className="flex flex-col items-center text-center">
                {/* QR real */}
                <div 
                  className="w-48 h-48 rounded-xl flex items-center justify-center mb-4"
                  style={{ 
                    background: qrPreviewCertificate?.status === 'active' ? '#FFFFFF' : '#F3F4F6',
                    border: `2px solid ${qrPreviewCertificate?.status === 'active' ? '#10B981' : '#D1D5DB'}`
                  }}
                >
                  <div className="text-center p-2">
                    {qrPreviewCertificate?.qrCode ? (
                      <QRCodeSVG
                        value={getPublicValidationUrl(qrPreviewCertificate.qrCode)}
                        size={160}
                        level="M"
                        includeMargin
                      />
                    ) : (
                      <QrCode className="w-32 h-32 mx-auto" style={{ color: '#9CA3AF' }} />
                    )}
                    <p className="text-xs font-mono font-semibold mt-2" style={{ color: '#6B7280' }}>
                      {qrPreviewCertificate?.qrCode || 'Sin codigo'}
                    </p>
                  </div>
                </div>

                {qrPreviewCertificate?.qrCode && (
                  <div ref={qrCanvasRef} className="sr-only">
                    <QRCodeCanvas
                      value={getPublicValidationUrl(qrPreviewCertificate.qrCode)}
                      size={400}
                      level="M"
                      includeMargin
                    />
                  </div>
                )}

                {/* Badge de Estado */}
                {qrPreviewCertificate?.status === 'active' ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-100 border-2 border-green-300 rounded-lg">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="font-semibold text-sm text-green-800">
                      ✅ QR ACTIVO PARA VALIDACIÓN
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-100 border-2 border-red-300 rounded-lg">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="font-semibold text-sm text-red-800">
                      ❌ QR INACTIVO
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Info del Certificado Solicitado */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" />
                Datos del Certificado Solicitado
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Graduado:</span>
                  <span className="ml-2 font-semibold text-gray-900">{qrPreviewCertificate?.graduate.fullName}</span>
                </div>
                <div>
                  <span className="text-gray-600">Documento:</span>
                  <span className="ml-2 font-semibold text-gray-900">{qrPreviewCertificate?.graduate.document}</span>
                </div>
                <div>
                  <span className="text-gray-600">Programa:</span>
                  <span className="ml-2 font-semibold text-gray-900">{qrPreviewCertificate?.graduate.program}</span>
                </div>
                <div>
                  <span className="text-gray-600">Fecha de graduación:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {qrPreviewCertificate && new Date(qrPreviewCertificate.graduate.graduationDate).toLocaleDateString('es-CO')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Número de certificado:</span>
                  <span className="ml-2 font-semibold text-gray-900 font-mono">{qrPreviewCertificate?.certificateNumber}</span>
                </div>
                <div className="pt-2 border-t border-blue-200">
                  <span className="text-gray-600">Solicitado por:</span>
                  <span className="ml-2 font-semibold text-gray-900">{qrPreviewCertificate?.requester.name}</span>
                  <span className="ml-2 text-xs text-gray-500">({qrPreviewCertificate?.requester.type === 'graduado' ? 'Graduado' : 'Entidad'})</span>
                </div>
                <div>
                  <span className="text-gray-600">Veces solicitado:</span>
                  <span className="ml-2 font-semibold text-gray-900">{qrPreviewCertificate?.requestCount}</span>
                  {qrPreviewCertificate && qrPreviewCertificate.requestCount > 1 && (
                    <span className="ml-2 text-xs font-semibold text-blue-600">
                      (QR reutilizado {qrPreviewCertificate.requestCount - 1} {qrPreviewCertificate.requestCount - 1 === 1 ? 'vez' : 'veces'})
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-gray-600">Veces escaneado:</span>
                  <span className="ml-2 font-semibold text-gray-900">{qrPreviewCertificate?.qrScanCount}</span>
                </div>
              </div>
            </div>

            {/* Historial de Solicitudes (si hay múltiples) */}
            {qrPreviewCertificate && qrPreviewCertificate.requestCount > 1 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-purple-600" />
                  Historial de Solicitudes (QR Reutilizado)
                </h4>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {qrPreviewCertificate.requestHistory.map((req, index) => (
                    <div key={req.id} className="flex items-start gap-3 text-sm bg-white rounded-lg p-3 border border-purple-100">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 mb-1">{req.requestedBy}</p>
                        <p className="text-gray-600 mb-1">
                          📅 {formatDateTime(req.requestedAt, {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <p className="text-gray-500 font-mono text-xs">🌐 IP: {req.ipAddress}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-purple-700 mt-3 font-medium">
                  💡 Este QR NO se generó nuevamente. Se reutilizó el existente para la misma combinación.
                </p>
              </div>
            )}

            {/* Historial de Validaciones (Escaneos del QR) */}
            {qrPreviewCertificate && qrPreviewCertificate.scanHistory.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <History className="w-4 h-4 text-green-600" />
                  Historial de Validaciones ({qrPreviewCertificate.qrScanCount} escaneos)
                </h4>
                <p className="text-xs text-green-800 mb-3">
                  Cada vez que alguien escanea el QR para <strong>validar la autenticidad</strong> del certificado, se registra aquí:
                </p>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {qrPreviewCertificate.scanHistory.map((scan, index) => (
                    <div key={scan.id} className="flex items-start gap-3 text-sm bg-white rounded-lg p-4 border border-green-100 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className={`font-semibold ${scan.verified ? 'text-green-700' : 'text-red-700'}`}>
                            {scan.verified ? '✓ Validación Exitosa' : '✗ Validación Fallida'}
                          </span>
                        </div>
                        <p className="text-gray-700 font-medium mb-2">
                          📅 {formatDateTime(scan.scannedAt, {
                            year: 'numeric',
                            month: 'long',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </p>
                        <div className="space-y-1.5 text-gray-600">
                          <p className="flex items-start gap-1">
                            <span className="flex-shrink-0">📍</span>
                            <span className="flex-shrink-0 font-semibold">Ubicación:</span>
                            <span className="break-words">{scan.location}</span>
                          </p>
                          <p className="flex items-start gap-1">
                            <span className="flex-shrink-0">🌐</span>
                            <span className="flex-shrink-0 font-semibold">IP:</span>
                            <span className="font-mono text-xs">{scan.ipAddress}</span>
                          </p>
                          <p className="flex items-start gap-1">
                            <span className="flex-shrink-0">💻</span>
                            <span className="flex-shrink-0 font-semibold">Dispositivo:</span>
                            <span className="break-all text-xs leading-relaxed">{scan.userAgent}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs text-green-700 font-medium flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Trazabilidad completa: cada validación queda registrada permanentemente
                  </p>
                </div>
              </div>
            )}

            {/* URL Pública de Validación */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-700" />
                URL Pública de Validación
              </h4>
              <div className="flex items-center gap-2 p-3 bg-white rounded border border-gray-200">
                <ExternalLink className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <code className="flex-1 text-xs font-mono text-blue-600 break-all">
                  {qrPreviewCertificate && getPublicValidationUrl(qrPreviewCertificate.qrCode)}
                </code>
                <button
                  onClick={() => qrPreviewCertificate && handleCopyToClipboard(
                    getPublicValidationUrl(qrPreviewCertificate.qrCode),
                    'URL de validación'
                  )}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                  title="Copiar URL"
                >
                  <Copy className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                🔒 Este QR es <strong>único e irrepetible</strong> para esta combinación de graduado + entidad
              </p>
            </div>

            {/* Explicación de Funcionamiento */}
            {qrPreviewCertificate?.status === 'active' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
                  <div className="text-xs text-amber-800">
                    <p className="font-semibold mb-2">¿Qué sucede cuando alguien escanea este QR para validar?</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Validación Inmediata:</strong> Sistema verifica si el certificado está ACTIVO y es válido</li>
                      <li><strong>Badge Visual:</strong> Muestra "✅ CERTIFICADO ACTIVO Y VÁLIDO" o "❌ CERTIFICADO INVÁLIDO"</li>
                      <li><strong>Datos del Graduado:</strong> Nombre completo, documento, programa y fecha de graduación</li>
                      <li><strong>Datos del Certificado:</strong> Número único, fecha de emisión y solicitante</li>
                      <li><strong>Registro de Validación:</strong> El escaneo queda registrado con IP, ubicación, dispositivo y fecha/hora</li>
                      <li><strong>Comparación:</strong> Permite verificar que los datos coinciden con el documento físico</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {qrPreviewCertificate?.status === 'revoked' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
                  <div className="text-xs text-red-800">
                    <p className="font-semibold mb-2">⚠️ Certificado Revocado</p>
                    <p>Este certificado ha sido marcado como INVÁLIDO. Al escanear el QR, aparecerá un mensaje de advertencia indicando que el certificado NO es válido.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border-2"
              style={{ borderColor: '#D1D5DB', color: '#6B7280' }}
            >
              Cerrar
            </button>
            <button
              onClick={handleDownloadQR}
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 hover:opacity-90 transition-all"
              style={{ background: '#003DA5', color: '#FFFFFF' }}
            >
              <Download className="w-4 h-4" />
              Descargar QR
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



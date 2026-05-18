import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Search,
  User,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';
import { PaginationPremium } from '../shared/PaginationPremium';
import { certificadosService } from '../../services/api/certificados.service';
import { formatCargoDisplay, selectPreferredCargoCode } from '../../utils/cargoFormatter';

type ReportMode = 'todos' | 'persona';

interface GenerarReporteCertificadosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PersonaSeleccionada {
  nombre: string;
  documento: string;
}

interface PersonaResultado extends PersonaSeleccionada {
  email: string;
  cargo: string;
  dependencia: string;
  registros: number;
  ultimoRegistro: string;
}

interface CertificadoReporte {
  id: string;
  consecutivo: string;
  codigoVerificacion: string;
  estado: 'activo' | 'inactivo' | 'revocado' | 'expirado';
  fechaSolicitud: string;
  fechaGeneracion: string;
  pdfUrl?: string;
  validationCount: number;
  incluyeSalario: boolean;
  incluyePrimaTecnica: boolean;
  technicalBonus: number;
  empleado: {
    nombre: string;
    documento: string;
    email: string;
    cargo: string;
    tipoVinculacion: string;
    dependencia: string;
    ubicacion: string;
    codCargo: string;
    codGrade: string;
    salario: number;
  };
  firmante: {
    nombre: string;
    cargo: string;
    dependencia: string;
  };
}

const ITEMS_PER_PAGE = 6;
const EXPORT_PAGE_LIMIT = 500;
const MAX_EXPORT_PAGES = 1000;

const normalizarTexto = (value?: string | null): string => {
  const cleaned = (value || '').replace(/\u00a0/g, ' ').trim();
  if (!cleaned) return '';
  const lower = cleaned.toLowerCase();
  if (lower === 'registro padre' || lower === 'registro hijo') return '';
  return cleaned;
};

const normalizarBusqueda = (value?: string | null): string => {
  const base = String(value || '').toLowerCase();
  const normalizado = typeof base.normalize === 'function' ? base.normalize('NFD') : base;
  return normalizado
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const resolverTemplateType = (value?: string | null): 'docente' | 'administrador' =>
  /\bdocen\w*\b|\bdoc\b/.test(normalizarBusqueda(value)) ? 'docente' : 'administrador';

const normalizarMonto = (value?: string | number | null): number => {
  if (value === null || value === undefined) return 0;
  const raw = typeof value === 'string' ? value.replace(/[^\d.-]/g, '') : value;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed);
};

const normalizarBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'si', 'sí', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  }
  return fallback;
};

const parseDateOnly = (value?: string | number | Date | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const dmyMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmyMatch) {
    return new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]));
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const resolverEstadoLaboral = (
  hiringDate?: string | number | Date | null,
  endDate?: string | number | Date | null,
  statusRaw?: string | null,
): 'activo' | 'inactivo' => {
  const statusUpper = String(statusRaw || '').trim().toUpperCase();
  if (statusUpper === 'I' || statusUpper === 'INACTIVO' || statusUpper === 'INACTIVE') return 'inactivo';
  if (statusUpper === 'A' || statusUpper === 'ACTIVO' || statusUpper === 'ACTIVE') return 'activo';

  const start = parseDateOnly(hiringDate);
  const end = parseDateOnly(endDate);
  const today = parseDateOnly(new Date());

  if (start || end) {
    if (!start || !today) return 'inactivo';
    if (today < start) return 'inactivo';
    if (!end) return 'activo';
    return today <= end ? 'activo' : 'inactivo';
  }

  return 'activo';
};

const parseDateTime = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value?: string | null): string => {
  const date = parseDateTime(value);
  if (!date) return '';
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTime = (value?: string | null): string => {
  const date = parseDateTime(value);
  if (!date) return '';
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatLongDate = (value?: string | null): string => {
  const date = parseDateTime(value);
  if (!date) return 'Fecha no disponible';
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getSortTime = (cert: CertificadoReporte): number => {
  const preferred = cert.fechaGeneracion || cert.fechaSolicitud;
  const parsed = parseDateTime(preferred);
  return parsed?.getTime() || 0;
};

const getResponseItems = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  return [];
};

const getResponseTotal = (response: any, fallback: number): number => {
  if (Array.isArray(response)) return fallback;
  const total = Number(response?.total ?? response?.count ?? response?.meta?.total ?? fallback);
  return Number.isFinite(total) ? total : fallback;
};

const sanitizeFilePart = (value: string): string =>
  normalizarBusqueda(value)
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60) || 'reporte';

export function GenerarReporteCertificadosModal({ isOpen, onClose }: GenerarReporteCertificadosModalProps) {
  const [mode, setMode] = useState<ReportMode>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<PersonaSeleccionada | null>(null);
  const [previewItems, setPreviewItems] = useState<CertificadoReporte[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgressMessage, setExportProgressMessage] = useState('');
  const requestSequenceRef = useRef(0);
  const lastFiltersKeyRef = useRef('');

  const hasInvalidDateRange = Boolean(fechaDesde && fechaHasta && fechaDesde > fechaHasta);

  const personOptions = useMemo<PersonaResultado[]>(() => {
    if (mode !== 'persona' || selectedPerson) return [];

    const persons = new Map<string, PersonaResultado>();

    previewItems.forEach((cert) => {
      const documentKey = cert.empleado.documento.replace(/\D+/g, '') || cert.empleado.documento;
      if (!documentKey) return;

      const current = persons.get(documentKey);
      const certTime = getSortTime(cert);
      const currentTime = current?.ultimoRegistro ? getSortTime({
        ...cert,
        fechaGeneracion: current.ultimoRegistro,
        fechaSolicitud: current.ultimoRegistro,
      }) : -1;

      if (!current) {
        persons.set(documentKey, {
          nombre: cert.empleado.nombre,
          documento: cert.empleado.documento,
          email: cert.empleado.email,
          cargo: cert.empleado.cargo,
          dependencia: cert.empleado.dependencia || cert.empleado.ubicacion,
          registros: 1,
          ultimoRegistro: cert.fechaGeneracion || cert.fechaSolicitud,
        });
        return;
      }

      current.registros += 1;
      if (certTime > currentTime) {
        current.nombre = cert.empleado.nombre || current.nombre;
        current.email = cert.empleado.email || current.email;
        current.cargo = cert.empleado.cargo || current.cargo;
        current.dependencia = cert.empleado.dependencia || cert.empleado.ubicacion || current.dependencia;
        current.ultimoRegistro = cert.fechaGeneracion || cert.fechaSolicitud || current.ultimoRegistro;
      }
    });

    return Array.from(persons.values()).sort((a, b) => {
      const byName = a.nombre.localeCompare(b.nombre, 'es');
      if (byName !== 0) return byName;
      return a.documento.localeCompare(b.documento, 'es');
    });
  }, [mode, previewItems, selectedPerson]);

  const effectivePreviewTotal =
    mode === 'persona' && !selectedPerson ? personOptions.length : previewTotal;
  const effectivePreviewTotalPages = Math.max(1, Math.ceil(effectivePreviewTotal / ITEMS_PER_PAGE));
  const visiblePersonOptions = useMemo(
    () => personOptions.slice((previewPage - 1) * ITEMS_PER_PAGE, previewPage * ITEMS_PER_PAGE),
    [personOptions, previewPage],
  );

  const transformCertificado = (cert: any): CertificadoReporte => {
    const ubicacionRaw =
      cert.department ||
      cert.request?.department ||
      cert.request?.departmentName ||
      cert.request?.position_location ||
      cert.request?.positionLocation ||
      cert.position_location ||
      cert.positionLocation ||
      '';
    const grupoRaw =
      cert.request?.position_location ||
      cert.request?.positionLocation ||
      cert.position_location ||
      cert.positionLocation ||
      '';
    const templateTypeRaw =
      cert.template_type ||
      cert.templateType ||
      cert.template_snapshot?.templateType ||
      cert.template_snapshot?.template_type;
    const templateTypeNormalizado: 'docente' | 'administrador' =
      templateTypeRaw === 'docente' || templateTypeRaw === 'administrador'
        ? templateTypeRaw
        : resolverTemplateType(`${cert.position_category || ''} ${cert.career_category || ''}`);
    const codCargo = selectPreferredCargoCode(
      cert.request?.cod_cargo,
      cert.request?.codCargo,
      cert.cod_cargo,
      cert.codCargo,
    );
    const codGrade =
      cert.request?.cod_grade ||
      cert.request?.codGrade ||
      cert.cod_grade ||
      cert.codGrade ||
      '';
    const cargoFormateado = formatCargoDisplay({
      cargoSource:
        cert.request?.career_category ||
        cert.career_category ||
        cert.position_category ||
        '',
      codCargo,
      codGrade,
      observations: cert.request?.observations || cert.observations,
      templateType: templateTypeNormalizado,
      includeCodeLabel: true,
      codeLabel: 'Código',
    });
    const employmentStatusRaw = String(
      cert.employment_status ||
        cert.request?.status ||
        cert.request_status ||
        '',
    ).trim().toUpperCase();
    const hiringDate =
      cert.request?.hiring_date ||
      cert.request?.hiringDate ||
      cert.hiring_date ||
      cert.hiringDate ||
      null;
    const endDate =
      cert.request?.request_date ||
      cert.request?.requestDate ||
      cert.request_date ||
      cert.requestDate ||
      null;
    const employmentEstado = resolverEstadoLaboral(hiringDate, endDate, employmentStatusRaw);
    const estado =
      cert.status === 'REVOKED'
        ? 'revocado'
        : cert.status === 'EXPIRED'
          ? 'expirado'
          : employmentEstado;
    const incluyeSalario = normalizarBoolean(
      cert.include_salary ??
        cert.includeSalary ??
        cert.incluyeSalario ??
        cert.request?.include_salary ??
        cert.request?.includeSalary,
      true,
    );
    const incluyePrimaTecnica = incluyeSalario
      ? normalizarBoolean(
          cert.include_technical_bonus ??
            cert.includeTechnicalBonus ??
            cert.incluyePrimaTecnica ??
            cert.request?.include_technical_bonus ??
            cert.request?.includeTechnicalBonus,
          false,
        )
      : false;

    return {
      id: String(cert.id || ''),
      consecutivo: cert.certificate_number || cert.consecutivo || '',
      codigoVerificacion: cert.verification_code || cert.qrCode || cert.codigoVerificacion || '',
      estado,
      fechaSolicitud: cert.created_at || cert.request?.created_at || '',
      fechaGeneracion: cert.issuance_timestamp || cert.issued_at || cert.generated_at || '',
      pdfUrl: cert.pdf_url || cert.pdfUrl || '',
      validationCount: Number(cert.validation_count ?? cert.cantidadEscaneos ?? 0) || 0,
      incluyeSalario,
      incluyePrimaTecnica,
      technicalBonus: normalizarMonto(cert.technical_bonus ?? cert.request?.technical_bonus),
      empleado: {
        nombre: cert.full_name || cert.request?.full_name || cert.nombre || '',
        documento: String(cert.id_number || cert.request?.id_number || cert.documento || '').trim(),
        email: cert.email || cert.request?.email || cert.certificate_email || cert.employee_email || '',
        cargo: cargoFormateado || cert.career_category || cert.position_category || '',
        tipoVinculacion: cert.position_category || cert.request?.position_category || '',
        dependencia: normalizarTexto(
          cert.department ||
            cert.request?.department ||
            cert.request?.departmentName ||
            ubicacionRaw ||
            '',
        ),
        ubicacion: normalizarTexto(ubicacionRaw || grupoRaw),
        codCargo,
        codGrade: String(codGrade || ''),
        salario: normalizarMonto(cert.monthly_salary ?? cert.request?.monthly_salary),
      },
      firmante: {
        nombre: cert.signer_name || '',
        cargo: cert.signer_position || '',
        dependencia: cert.signer_department || '',
      },
    };
  };

  const buildParams = (
    page: number,
    limit: number,
    options: { forExport?: boolean } = {},
  ): Record<string, any> => {
    const params: Record<string, any> = { page, limit };
    if (options.forExport) params.forExport = 'true';
    if (fechaDesde) params.fechaDesde = fechaDesde;
    if (fechaHasta) params.fechaHasta = fechaHasta;
    if (mode === 'persona' && selectedPerson?.documento) {
      params.search = selectedPerson.documento;
    } else if (mode === 'persona' && searchTerm.trim().length >= 2) {
      params.search = searchTerm.trim();
    }
    return params;
  };

  const filtrarPorPersonaSeleccionada = (items: CertificadoReporte[]): CertificadoReporte[] => {
    if (mode !== 'persona' || !selectedPerson?.documento) return items;
    const documento = selectedPerson.documento.replace(/\D+/g, '');
    return items.filter((item) => item.empleado.documento.replace(/\D+/g, '') === documento);
  };

  const fetchCertificadosPage = async (
    page: number,
    limit: number,
    options: { forExport?: boolean } = {},
  ): Promise<{
    items: CertificadoReporte[];
    total: number;
    rawCount: number;
  }> => {
    const response = await certificadosService.laborales.listar(buildParams(page, limit, options));
    const rawItems = getResponseItems(response);
    const total = getResponseTotal(response, rawItems.length);
    const transformed = rawItems.map(transformCertificado);
    return {
      items: filtrarPorPersonaSeleccionada(transformed),
      total,
      rawCount: rawItems.length,
    };
  };

  const fetchPreview = async () => {
    if (!isOpen) return;

    const requestId = ++requestSequenceRef.current;
    setPreviewError(null);

    if (hasInvalidDateRange) {
      setPreviewItems([]);
      setPreviewTotal(0);
      setPreviewError('La fecha inicial no puede ser mayor que la fecha final.');
      return;
    }

    if (mode === 'persona' && !selectedPerson && searchTerm.trim().length < 2) {
      setPreviewItems([]);
      setPreviewTotal(0);
      setPreviewLoading(false);
      return;
    }

    setPreviewLoading(true);
    try {
      const pageToFetch = mode === 'persona' && !selectedPerson ? 1 : previewPage;
      const limitToFetch = mode === 'persona' && !selectedPerson ? EXPORT_PAGE_LIMIT : ITEMS_PER_PAGE;
      const { items, total } = await fetchCertificadosPage(
        pageToFetch,
        limitToFetch,
        mode === 'persona' && !selectedPerson ? { forExport: true } : {},
      );
      if (requestId !== requestSequenceRef.current) return;
      const sorted = [...items].sort((a, b) => getSortTime(b) - getSortTime(a));
      setPreviewItems(sorted);
      setPreviewTotal(mode === 'persona' && !selectedPerson ? sorted.length : total);
    } catch (error: any) {
      if (requestId !== requestSequenceRef.current) return;
      console.error('Error al cargar certificados para reporte:', error);
      setPreviewItems([]);
      setPreviewTotal(0);
      setPreviewError(error?.message || 'No se pudieron cargar los certificados para el reporte.');
    } finally {
      if (requestId === requestSequenceRef.current) {
        setPreviewLoading(false);
      }
    }
  };

  const activeFiltersKey = [
    mode,
    selectedPerson?.documento || '',
    searchTerm.trim().toLowerCase(),
    fechaDesde,
    fechaHasta,
  ].join('|');

  useEffect(() => {
    if (!isOpen) return;

    const filtersChanged = lastFiltersKeyRef.current !== activeFiltersKey;
    if (filtersChanged) {
      lastFiltersKeyRef.current = activeFiltersKey;
      if (previewPage !== 1) {
        setPreviewPage(1);
        return;
      }
    }

    fetchPreview();
  }, [isOpen, previewPage, activeFiltersKey]);

  useEffect(() => {
    if (!isOpen) {
      setMode('todos');
      setSearchTerm('');
      setFechaDesde('');
      setFechaHasta('');
      setSelectedPerson(null);
      setPreviewItems([]);
      setPreviewTotal(0);
      setPreviewPage(1);
      setPreviewError(null);
      setIsExporting(false);
      setExportProgressMessage('');
      lastFiltersKeyRef.current = '';
      requestSequenceRef.current += 1;
    }
  }, [isOpen]);

  const reportScopeLabel = useMemo(() => {
    if (mode === 'persona' && selectedPerson) {
      return `${selectedPerson.nombre} - CC ${selectedPerson.documento}`;
    }
    return 'Todos los registros';
  }, [mode, selectedPerson]);

  const dateRangeLabel = useMemo(() => {
    if (fechaDesde && fechaHasta) return `${fechaDesde} a ${fechaHasta}`;
    if (fechaDesde) return `Desde ${fechaDesde}`;
    if (fechaHasta) return `Hasta ${fechaHasta}`;
    return 'Todo el histórico';
  }, [fechaDesde, fechaHasta]);

  const handleSelectPerson = (person: PersonaSeleccionada) => {
    setSelectedPerson({
      nombre: person.nombre,
      documento: person.documento,
    });
    setSearchTerm(`${person.nombre} ${person.documento}`.trim());
  };

  const fetchAllForExport = async (): Promise<CertificadoReporte[]> => {
    const all: CertificadoReporte[] = [];
    let page = 1;
    let total = 0;
    setExportProgressMessage('Consultando registros para el reporte...');

    while (page <= MAX_EXPORT_PAGES) {
      const { items, total: responseTotal, rawCount } = await fetchCertificadosPage(
        page,
        EXPORT_PAGE_LIMIT,
        { forExport: true },
      );
      total = responseTotal || total;
      all.push(...items);
      setExportProgressMessage(
        total > 0
          ? `Consultando registros ${Math.min(all.length, total)} de ${total}...`
          : `Consultando registros ${all.length}...`,
      );

      const reachedTotal = total > 0 && page * EXPORT_PAGE_LIMIT >= total;
      if (rawCount < EXPORT_PAGE_LIMIT || reachedTotal) break;
      page += 1;
    }

    if (page > MAX_EXPORT_PAGES) {
      throw new Error('El reporte es demasiado grande. Ajusta los filtros e intenta nuevamente.');
    }

    const unique = new Map<string, CertificadoReporte>();
    all.forEach((item) => {
      const key = item.id || `${item.consecutivo}-${item.empleado.documento}-${item.fechaGeneracion}`;
      unique.set(key, item);
    });

    return Array.from(unique.values()).sort((a, b) => getSortTime(b) - getSortTime(a));
  };

  const buildExcelRows = (items: CertificadoReporte[]) => {
    const headers = [
      'N°',
      'Número de certificado',
      'Fecha de solicitud',
      'Hora de solicitud',
      'Fecha de generación',
      'Hora de generación',
      'Estado',
      'Nombre completo',
      'Documento',
      'Correo electrónico',
      'Cargo',
      'Tipo de vinculación',
      'Dependencia',
      'Ubicación',
      'Código cargo',
      'Grado',
      'Salario mensual',
      'Incluye salario',
      'Prima técnica y/o coordinación',
      'Valor prima técnica y/o coordinación',
      'Escaneos QR',
      'Código de verificación',
    ];

    const rows = items.map((item, index) => [
      index + 1,
      item.consecutivo,
      formatDate(item.fechaSolicitud),
      formatTime(item.fechaSolicitud),
      formatDate(item.fechaGeneracion),
      formatTime(item.fechaGeneracion),
      item.estado,
      item.empleado.nombre,
      item.empleado.documento,
      item.empleado.email,
      item.empleado.cargo,
      item.empleado.tipoVinculacion,
      item.empleado.dependencia,
      item.empleado.ubicacion,
      item.empleado.codCargo,
      item.empleado.codGrade,
      item.incluyeSalario ? item.empleado.salario : '',
      item.incluyeSalario ? 'Sí' : 'No',
      item.incluyePrimaTecnica ? 'Sí' : 'No',
      item.incluyePrimaTecnica ? item.technicalBonus : '',
      item.validationCount,
      item.codigoVerificacion,
    ]);

    return { headers, rows };
  };

  const handleExport = async () => {
    if (hasInvalidDateRange) {
      toast.error('La fecha inicial no puede ser mayor que la fecha final.');
      return;
    }

    if (mode === 'persona' && !selectedPerson) {
      toast.error('Selecciona una persona para generar el reporte individual.');
      return;
    }

    setIsExporting(true);
    setExportProgressMessage('Preparando la exportacion...');
    toast.loading('Generando reporte...', {
      description: 'Estamos consultando el histórico de certificados laborales.',
      id: 'exportar-certificados-laborales',
    });

    try {
      const items = await fetchAllForExport();

      if (!items.length) {
        toast.error('No hay registros para exportar con los filtros seleccionados.', {
          id: 'exportar-certificados-laborales',
        });
        return;
      }

      setExportProgressMessage('Construyendo archivo Excel...');
      const XLSX = await import('xlsx');
      const { headers, rows } = buildExcelRows(items);
      const generatedAt = new Date().toLocaleString('es-CO');
      const sheetData = [
        ['Reporte histórico de certificados laborales'],
        [`Generado: ${generatedAt}`],
        [`Alcance: ${reportScopeLabel}`],
        [`Rango de fechas: ${dateRangeLabel}`],
        [`Total de registros: ${items.length}`],
        [],
        headers,
        ...rows,
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      const headerRowIndex = 6;

      worksheet['!merges'] = [
        {
          s: { r: 0, c: 0 },
          e: { r: 0, c: headers.length - 1 },
        },
      ];
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 24 },
        { wch: 16 },
        { wch: 14 },
        { wch: 18 },
        { wch: 16 },
        { wch: 12 },
        { wch: 34 },
        { wch: 16 },
        { wch: 32 },
        { wch: 42 },
        { wch: 22 },
        { wch: 30 },
        { wch: 30 },
        { wch: 14 },
        { wch: 10 },
        { wch: 18 },
        { wch: 16 },
        { wch: 30 },
        { wch: 30 },
        { wch: 12 },
        { wch: 26 },
      ];
      worksheet['!autofilter'] = {
        ref: XLSX.utils.encode_range({
          s: { r: headerRowIndex, c: 0 },
          e: { r: headerRowIndex + rows.length, c: headers.length - 1 },
        }),
      };

      const workbook = XLSX.utils.book_new();
      workbook.Props = {
        Title: 'Reporte histórico de certificados laborales',
        Subject: reportScopeLabel,
        Author: 'ESAP',
        CreatedDate: new Date(),
      };
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Histórico');

      setExportProgressMessage('Descargando archivo Excel...');
      const scopePart =
        mode === 'persona' && selectedPerson
          ? sanitizeFilePart(`${selectedPerson.nombre}_${selectedPerson.documento}`)
          : 'todos';
      const datePart = `${fechaDesde || 'inicio'}_${fechaHasta || 'hoy'}`;
      XLSX.writeFile(workbook, `Reporte_Certificados_Laborales_${scopePart}_${datePart}.xlsx`);

      toast.success('Reporte generado correctamente', {
        description: `${items.length} registro(s) exportado(s) a Excel.`,
        id: 'exportar-certificados-laborales',
      });
    } catch (error: any) {
      console.error('Error al generar reporte de certificados laborales:', error);
      toast.error('No se pudo generar el reporte', {
        description: error?.message || 'Intenta nuevamente en unos segundos.',
        id: 'exportar-certificados-laborales',
      });
    } finally {
      setIsExporting(false);
      setExportProgressMessage('');
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!isExporting) onClose();
        }}
      />

      <div className="fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative flex max-h-[95vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl"
          aria-busy={isExporting}
        >
          <div className="flex-shrink-0 bg-[#003DA5] px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <FileSpreadsheet className="h-5 w-5 flex-shrink-0 text-white sm:h-6 sm:w-6" />
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-white sm:text-xl">
                    Generar Reporte
                  </h2>
                  <p className="hidden text-sm text-blue-100 sm:block">
                    Exporta el histórico de certificados laborales en Excel.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isExporting}
                className="-mr-2 flex-shrink-0 p-2 text-white/80 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Cerrar modal"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={isExporting}
                onClick={() => {
                  setMode('todos');
                  setSelectedPerson(null);
                  setSearchTerm('');
                }}
                className={`rounded-xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
                  mode === 'todos'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                    : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <Users className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">Todos los registros</p>
                    <p className="text-sm text-gray-600">Exporta el histórico general del rango seleccionado.</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                disabled={isExporting}
                onClick={() => setMode('persona')}
                className={`rounded-xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
                  mode === 'persona'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                    : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <User className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">Persona específica</p>
                    <p className="text-sm text-gray-600">Exporta el histórico individual por nombre o documento.</p>
                  </div>
                </div>
              </button>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#003DA5]" />
                <h3 className="font-semibold text-gray-900">Filtros del reporte</h3>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="reporte-fecha-desde" className="text-xs text-gray-600">Desde</Label>
                  <Input
                    id="reporte-fecha-desde"
                    type="date"
                    value={fechaDesde}
                    onChange={(event) => setFechaDesde(event.target.value)}
                    max={fechaHasta || undefined}
                    disabled={isExporting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reporte-fecha-hasta" className="text-xs text-gray-600">Hasta</Label>
                  <Input
                    id="reporte-fecha-hasta"
                    type="date"
                    value={fechaHasta}
                    onChange={(event) => setFechaHasta(event.target.value)}
                    min={fechaDesde || undefined}
                    disabled={isExporting}
                  />
                </div>
              </div>

              {hasInvalidDateRange && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span>La fecha inicial no puede ser mayor que la fecha final.</span>
                </div>
              )}

              {(fechaDesde || fechaHasta) && (
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => {
                    setFechaDesde('');
                    setFechaHasta('');
                  }}
                  className="mt-3 text-sm font-medium text-[#003DA5] hover:text-[#002873] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Limpiar rango de fechas
                </button>
              )}
            </section>

            {mode === 'persona' && (
              <section className="rounded-xl border border-gray-200 bg-white p-4">
                <Label htmlFor="reporte-persona" className="text-sm font-semibold text-gray-800">
                  Buscar persona
                </Label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="reporte-persona"
                    type="text"
                    placeholder="Buscar por nombre o documento..."
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setSelectedPerson(null);
                    }}
                    className="pl-10"
                    disabled={isExporting}
                  />
                </div>

                {selectedPerson && (
                  <div className="mt-3 flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-emerald-900">
                      <strong>{selectedPerson.nombre}</strong>
                      <span className="ml-2 text-emerald-700">CC {selectedPerson.documento}</span>
                    </div>
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={() => {
                        setSelectedPerson(null);
                        setSearchTerm('');
                      }}
                      className="text-left text-sm font-semibold text-emerald-800 hover:text-emerald-950 disabled:cursor-not-allowed disabled:opacity-60 sm:text-right"
                    >
                      Cambiar persona
                    </button>
                  </div>
                )}

                {!selectedPerson && searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
                  <p className="mt-2 text-xs text-gray-500">Ingresa al menos 2 caracteres para buscar.</p>
                )}
              </section>
            )}

            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Vista previa</h3>
                  <p className="text-sm text-gray-600">
                    {mode === 'persona' && !selectedPerson
                      ? `${effectivePreviewTotal} persona(s) encontradas. Selecciona una para exportar todo su histórico.`
                      : `${effectivePreviewTotal} registro(s) encontrados.`}
                  </p>
                </div>
                <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {dateRangeLabel}
                </div>
              </div>

              {previewLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-gray-600">
                  <Loader2 className="h-5 w-5 animate-spin text-[#003DA5]" />
                  <span>Cargando histórico...</span>
                </div>
              ) : previewError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                  {previewError}
                </div>
              ) : mode === 'persona' && !selectedPerson && visiblePersonOptions.length > 0 ? (
                <div className="space-y-3">
                  {visiblePersonOptions.map((person, index) => (
                    <motion.button
                      key={person.documento}
                      type="button"
                      disabled={isExporting}
                      onClick={() => handleSelectPerson(person)}
                      className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-[#003DA5] hover:bg-blue-50/30 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: index * 0.025 }}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.995 }}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                            <User className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-900">{person.nombre}</p>
                            <p className="text-sm text-gray-600">
                              CC {person.documento}
                            </p>
                            <p className="mt-1 truncate text-sm text-gray-500">{person.cargo || person.dependencia || person.email}</p>
                            <p className="mt-1 text-xs text-gray-500 break-all">
                              {person.email || 'Correo no disponible'}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {person.registros} registro{person.registros !== 1 ? 's' : ''}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Seleccionar persona
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  ))}

                  {effectivePreviewTotal > ITEMS_PER_PAGE && (
                    <div className="border-t border-gray-200 pt-3">
                      <PaginationPremium
                        currentPage={previewPage}
                        totalPages={effectivePreviewTotalPages}
                        onPageChange={setPreviewPage}
                        itemsPerPage={ITEMS_PER_PAGE}
                        totalItems={effectivePreviewTotal}
                      />
                    </div>
                  )}
                </div>
              ) : previewItems.length > 0 ? (
                <div className="space-y-3">
                  {previewItems.map((cert, index) => (
                    <motion.div
                      key={cert.id}
                      className="rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-blue-200 hover:shadow-sm"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: index * 0.025 }}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#003DA5]">
                            <FileSpreadsheet className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-900">{cert.empleado.nombre}</p>
                            <p className="text-sm text-gray-600">
                              CC {cert.empleado.documento} · {cert.consecutivo || 'Sin consecutivo'}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">{cert.empleado.cargo || cert.empleado.dependencia}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              Generado: {formatLongDate(cert.fechaGeneracion || cert.fechaSolicitud)}
                              {formatTime(cert.fechaGeneracion || cert.fechaSolicitud)
                                ? ` · ${formatTime(cert.fechaGeneracion || cert.fechaSolicitud)}`
                                : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {cert.validationCount} escaneo{cert.validationCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {effectivePreviewTotal > ITEMS_PER_PAGE && (
                    <div className="border-t border-gray-200 pt-3">
                      <PaginationPremium
                        currentPage={previewPage}
                        totalPages={effectivePreviewTotalPages}
                        onPageChange={setPreviewPage}
                        itemsPerPage={ITEMS_PER_PAGE}
                        totalItems={effectivePreviewTotal}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                    <Search className="h-7 w-7 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-700">
                    {mode === 'persona' && !selectedPerson
                      ? 'Busca una persona para generar su reporte.'
                      : 'No hay registros con los filtros seleccionados.'}
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex items-start gap-2 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>
                  El Excel incluirá el título del reporte, los filtros aplicados y columnas separadas para fechas,
                  empleado, cargo, dependencia, salario, prima técnica y/o coordinación, escaneos QR y código de verificación.
                </p>
              </div>
            </section>
          </div>

          <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={onClose} disabled={isExporting}>
                Cancelar
              </Button>
              <Button
                className="bg-[#003DA5] hover:bg-[#002873]"
                onClick={handleExport}
                disabled={isExporting || hasInvalidDateRange || (mode === 'persona' && !selectedPerson)}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Generar reporte Excel
                  </>
                )}
              </Button>
            </div>
          </div>

          {isExporting && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/80 px-6 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-xl border border-blue-100 bg-white p-5 text-center shadow-xl">
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#003DA5]" />
                <p className="text-sm font-semibold text-gray-900">Generando reporte Excel</p>
                <p className="mt-1 text-sm text-gray-600">
                  {exportProgressMessage || 'Consultando el historico completo...'}
                </p>
                <p className="mt-3 text-xs text-gray-500">
                  Espera a que termine la descarga antes de realizar otra accion.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}

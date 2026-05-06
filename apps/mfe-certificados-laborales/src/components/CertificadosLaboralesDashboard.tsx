/**
 * MÓDULO: CERTIFICADOS LABORALES - SOLO AUTOSERVICIO
 * - Certificados laborales solicitados únicamente por el interesado
 * - El documento se envía automáticamente al correo registrado en la plataforma
 * - Campos: Nombre, Identificación, Tipo vinculación, Fecha vinculación, Cargo, Dependencia, Salario, Fecha solicitud
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  X,
  Download,
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  QrCode,
  MoreVertical,
  RefreshCw,
  Briefcase,
  Settings,
  Mail,
  History,
  Percent,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Avatar, AvatarFallback } from '@esap-mfe/shared-ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@esap-mfe/shared-ui/dropdown-menu';

import { PaginationPremium } from '../shared/PaginationPremium';
import { CertificadoDetalleModal } from './CertificadoDetalleModal';
import { GenerarCertificadoModal } from './GenerarCertificadoModal';
import { CertificadoDetallePanel } from './CertificadoDetallePanel';
import { ModalHistorialCertificados } from './ModalHistorialCertificados';
import { PrimaTecnicaModal } from './PrimaTecnicaModal';
import { VisorPDFCertificado } from './VisorPDFCertificado';
import React from 'react';
import { certificadosService } from '../../services/api/certificados.service';
import { formatCargoDisplay, selectPreferredCargoCode } from '../../utils/cargoFormatter';

// Tipo de certificado laboral - Solo autoservicio
interface CertificadoLaboral {
  id: string;
  consecutivo: string;
  certificateHash: string;
  qrCode: string;
  position_location?: string;
  observations?: string;
  department?: string;
  cod_cargo?: string;
  cod_grade?: string;
  campus?: string;
  technical_bonus?: number;
  incluyeSalario?: boolean;
  incluyePrimaTecnica?: boolean;
  templateSnapshot?: any;
  templateType?: 'docente' | 'administrador';
  estadoLaboral?: 'activo' | 'inactivo';
  empleado: {
    nombre: string;
    documento: string;
    cargo: string;
    cargo_calculado?: string;
    dependencia: string;
    dependenciaPadre: string;
    tipoVinculacion: string;
    fechaVinculacion: string;
    grado: string;
    salario: number;
    email: string; // Email donde se envía el certificado
  };
  estado: 'activo' | 'inactivo' | 'revocado' | 'expirado';
  fechaSolicitud: string;
  fechaGeneracion: string;
  cantidadEscaneos: number;
  pdfUrl?: string;
  firmante?: {
    nombre: string;
    cargo: string;
    dependencia: string;
  };
}

interface Stats {
  certificadosEmitidos: number;
  certificadosActivos: number;
  escaneosQR: number;
  solicitudesHoy: number;
}

interface CertificadosLaboralesDashboardProps {
  onNavigate?: (vista: string) => void;
  canManageTemplates?: boolean;
}

export function CertificadosLaboralesDashboard({ onNavigate, canManageTemplates = false }: CertificadosLaboralesDashboardProps) {
  const resolverTemplateType = (value?: string) => {
    const base = String(value || '').toLowerCase();
    const normalizado = typeof base.normalize === 'function' ? base.normalize('NFD') : base;
    const texto = normalizado
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!texto) return 'administrador';
    return /\bdocen\w*\b|\bdoc\b/.test(texto) ? 'docente' : 'administrador';
  };

  const normalizarFechaContrato = (value?: string | number | Date | null) => {
    if (!value) return null;
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    const raw = String(value).trim();
    if (!raw) return null;
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]) - 1;
      const day = Number(isoMatch[3]);
      return new Date(year, month, day);
    }
    const dmyMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmyMatch) {
      const day = Number(dmyMatch[1]);
      const month = Number(dmyMatch[2]) - 1;
      const year = Number(dmyMatch[3]);
      return new Date(year, month, day);
    }
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) return null;
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

    const start = normalizarFechaContrato(hiringDate);
    const end = normalizarFechaContrato(endDate);
    const today = normalizarFechaContrato(new Date());

    if (start || end) {
      if (!start || !today) return 'inactivo';
      if (today < start) return 'inactivo';
      if (!end) return 'activo';
      return today <= end ? 'activo' : 'inactivo';
    }
    return 'activo';
  };

  const normalizarDependencia = (value?: string | null) => {
    const cleaned = (value || '').replace(/\u00a0/g, ' ').trim();
    if (!cleaned) return '';
    const lower = cleaned.toLowerCase();
    if (lower === 'registro padre' || lower === 'registro hijo') return '';
    return cleaned;
  };

  const normalizarBoolean = (value: unknown, fallback = false): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'si', 'yes', 'y'].includes(normalized)) return true;
      if (['false', '0', 'no', 'n'].includes(normalized)) return false;
    }
    return fallback;
  };

  const transformarCertificado = (cert: any): CertificadoLaboral => {
    const templateTypeRaw =
      cert.template_type ||
      cert.templateType ||
      cert.template_snapshot?.templateType ||
      cert.template_snapshot?.template_type ||
      undefined;
    const dependenciaPadreRaw =
      cert.request?.cod_cargo ||
      cert.request?.codCargo ||
      cert.cod_cargo ||
      cert.codCargo ||
      '';
    const templateTypeNormalizado =
      templateTypeRaw ||
      resolverTemplateType(`${cert.position_category || ''} ${cert.career_category || ''}`);
    const cargoVariable = formatCargoDisplay({
      cargoSource: cert.request?.career_category || cert.career_category || cert.position_category || '',
      codCargo: selectPreferredCargoCode(
        cert.request?.cod_cargo,
        cert.request?.codCargo,
        cert.cod_cargo,
        cert.codCargo,
      ),
      codGrade: cert.request?.cod_grade || cert.cod_grade || cert.codGrade,
      observations: cert.request?.observations || cert.observations,
      templateType: templateTypeNormalizado,
      includeCodeLabel: true,
      codeLabel: 'Código',
    });

    const employmentStatusRaw = String(
      cert.employment_status ||
      cert.request?.status ||
      cert.request_status ||
      ''
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
    const certificadoEstado =
      cert.status === 'REVOKED'
        ? 'revocado'
        : cert.status === 'EXPIRED'
          ? 'expirado'
          : employmentEstado;
    const ubicacionRaw = normalizarDependencia(
      cert.department ||
      cert.request?.department ||
      cert.request?.departmentName ||
      cert.request?.position_location ||
      cert.request?.positionLocation ||
      cert.position_location ||
      cert.positionLocation ||
      '',
    );
    const grupoRaw = normalizarDependencia(
      cert.request?.position_location ||
      cert.request?.positionLocation ||
      cert.position_location ||
      cert.positionLocation ||
      '',
    );
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
      id: cert.id,
      consecutivo: cert.certificate_number,
      certificateHash: cert.verification_code,
      qrCode: cert.verification_code,
      position_location: grupoRaw,
      observations: cert.observations || cert.request?.observations,
      department: ubicacionRaw,
      cod_cargo: dependenciaPadreRaw || cert.cod_cargo || cert.codCargo,
      cod_grade: cert.request?.cod_grade || cert.cod_grade || cert.codGrade,
      campus: cert.campus,
      technical_bonus: cert.technical_bonus ?? cert.request?.technical_bonus,
      incluyeSalario,
      incluyePrimaTecnica,
      templateSnapshot: cert.template_snapshot || cert.templateSnapshot || null,
      templateType: templateTypeNormalizado,
      estadoLaboral: employmentEstado,
      empleado: {
        nombre: cert.full_name,
        documento: cert.id_number,
        cargo: cert.career_category,
        cargo_calculado: cargoVariable || cert.career_category,
        dependencia: ubicacionRaw,
        dependenciaPadre: normalizarDependencia(dependenciaPadreRaw),
        tipoVinculacion: cert.position_category,
        fechaVinculacion: cert.hiring_date,
        grado: ubicacionRaw,
        salario: Number(cert.monthly_salary),
        email: cert.email || cert.request?.email || cert.certificate_email || cert.employee_email || 'N/A'
      },
      estado: certificadoEstado,
      fechaSolicitud: cert.created_at,
      fechaGeneracion: cert.issuance_timestamp,
      cantidadEscaneos: cert.validation_count || 0,
      pdfUrl: cert.pdf_url,
      firmante: {
        nombre: cert.signer_name,
        cargo: cert.signer_position,
        dependencia: cert.signer_department
      }
    };
  };
  const normalizarFiltro = (value?: string | null) => {
    const base = String(value || '').toLowerCase();
    const normalizado = typeof base.normalize === 'function' ? base.normalize('NFD') : base;
    return normalizado
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cargoFilter, setCargoFilter] = useState<string>('');
  const [tipoVinculacionFilter, setTipoVinculacionFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState<Stats>({
    certificadosEmitidos: 0,
    certificadosActivos: 0,
    escaneosQR: 0,
    solicitudesHoy: 0,
  });

  // Estados para modales
  const [selectedCertificado, setSelectedCertificado] = useState<CertificadoLaboral | null>(null);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [isGenerarOpen, setIsGenerarOpen] = useState(false);
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const [isPrimaTecnicaOpen, setIsPrimaTecnicaOpen] = useState(false);
  const [expandedCertId, setExpandedCertId] = useState<string | null>(null);
  const [downloadCert, setDownloadCert] = useState<CertificadoLaboral | null>(null);

  // Estado para certificados y loading
  const [certificados, setCertificados] = useState<CertificadoLaboral[]>([]);
  const [certificadosRaw, setCertificadosRaw] = useState<CertificadoLaboral[]>([]);
  const [certificadosMetricas, setCertificadosMetricas] = useState<CertificadoLaboral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMetricasLoading, setIsMetricasLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Función para cargar certificados (extraída para poder llamarla desde múltiples lugares)
  const fetchCertificados = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      console.log('🔄 Cargando certificados desde el backend...');
      const filtrosGlobalesActivos = Boolean(statusFilter !== 'all' || cargoFilter.trim() || tipoVinculacionFilter.trim());
      const baseParams: Record<string, any> = {
        page: currentPage,
        limit: itemsPerPage,
      };
      if (searchQuery.trim()) {
        baseParams.search = searchQuery.trim();
      }

      let items: any[] = [];
      let total = 0;
      let serverStats: any = null;

      if (filtrosGlobalesActivos) {
        const limit = 200;
        const maxPages = 50;
        let page = 1;
        let totalEsperado = 0;

        while (page <= maxPages) {
          const response = await certificadosService.laborales.listar({
            ...baseParams,
            page,
            limit,
          });
          const chunk = Array.isArray(response) ? response : (response.items || []);

          if (page === 1) {
            totalEsperado = Array.isArray(response) ? chunk.length : (response.total || 0);
            serverStats = Array.isArray(response) ? null : response.stats;
          }

          items.push(...chunk);

          if (Array.isArray(response)) {
            break;
          }
          if (!chunk.length) {
            break;
          }
          if (totalEsperado && items.length >= totalEsperado) {
            break;
          }
          page += 1;
        }

        total = items.length;
      } else {
        const response = await certificadosService.laborales.listar(baseParams);
        items = Array.isArray(response) ? response : (response.items || []);
        total = Array.isArray(response) ? items.length : (response.total || 0);
        serverStats = Array.isArray(response) ? null : response.stats;
      }
      console.log(`✅ Se cargaron ${items.length} certificados`);

      // Transformar datos del backend al formato del componente
      const certificadosTransformados: CertificadoLaboral[] = items.map((cert: any) => transformarCertificado(cert));

      const certificadosOrdenados = [...certificadosTransformados].sort((a, b) => (
        new Date(b.fechaSolicitud).getTime() - new Date(a.fechaSolicitud).getTime()
      ));

      console.log('📊 Contador de validaciones por certificado:',
        certificadosOrdenados.map(c => ({
          consecutivo: c.consecutivo,
          validaciones: c.cantidadEscaneos
        }))
      );

      setCertificadosRaw(certificadosOrdenados);
      if (!filtrosGlobalesActivos) {
        setTotalItems(total);
      }
      setStats({
        certificadosEmitidos: serverStats?.totalEmitidos ?? total,
        certificadosActivos: serverStats?.certificadosActivos ?? certificadosTransformados.filter(cert => !['revocado', 'expirado'].includes(cert.estado)).length,
        escaneosQR: serverStats?.escaneosQR ?? certificadosTransformados.reduce((sum, cert) => sum + cert.cantidadEscaneos, 0),
        solicitudesHoy: serverStats?.solicitudesHoy ?? 1,
      });

      if (showRefreshToast) {
        toast.success('Datos actualizados', {
          description: `Se actualizaron ${certificadosTransformados.length} certificados`
        });
      }
    } catch (err: any) {
      console.error('❌ Error al cargar certificados:', err);
      setError(err.message || 'Error al cargar los certificados');
      toast.error('Error al cargar los certificados');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchCertificadosMetricas = async () => {
    setIsMetricasLoading(true);
    try {
      const limit = 10;
      let page = 1;
      let totalEsperado = 0;
      const baseParams: Record<string, any> = {
        page,
        limit,
      };
      if (searchQuery.trim()) {
        baseParams.search = searchQuery.trim();
      }
      if (cargoFilter.trim()) {
        baseParams.cargo = cargoFilter.trim();
      }
      if (tipoVinculacionFilter.trim()) {
        baseParams.tipoVinculacion = tipoVinculacionFilter.trim();
      }

      const items: any[] = [];
      while (true) {
        const response = await certificadosService.laborales.listar({
          ...baseParams,
          page,
          limit,
        });
        const chunk = Array.isArray(response) ? response : (response.items || []);

        if (page === 1) {
          totalEsperado = Array.isArray(response) ? chunk.length : (response.total || 0);
        }

        items.push(...chunk);

        if (Array.isArray(response)) {
          break;
        }
        if (!chunk.length) {
          break;
        }
        if (totalEsperado && items.length >= totalEsperado) {
          break;
        }
        const totalPages = totalEsperado ? Math.ceil(totalEsperado / limit) : null;
        if (totalPages && page >= totalPages) {
          break;
        }
        page += 1;
      }

      const certificadosTransformados: CertificadoLaboral[] = items.map((cert: any) => transformarCertificado(cert));
      setCertificadosMetricas(certificadosTransformados);
    } catch (err) {
      console.error('❌ Error al cargar métricas de certificados:', err);
    } finally {
      setIsMetricasLoading(false);
    }
  };

  // Cargar certificados al cambiar filtros/paginacion
  useEffect(() => {
    const filtrosGlobalesActivos = Boolean(statusFilter !== 'all' || cargoFilter.trim() || tipoVinculacionFilter.trim());
    if (filtrosGlobalesActivos && currentPage !== 1) {
      return;
    }
    fetchCertificados();
  }, [currentPage, searchQuery, statusFilter, cargoFilter, tipoVinculacionFilter]);

  useEffect(() => {
    fetchCertificadosMetricas();
  }, [searchQuery, cargoFilter, tipoVinculacionFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, cargoFilter, tipoVinculacionFilter]);

  useEffect(() => {
    const cargoNeedle = normalizarFiltro(cargoFilter);
    const tipoNeedle = normalizarFiltro(tipoVinculacionFilter);
    const certificadosFiltrados = (statusFilter !== 'all' || cargoNeedle || tipoNeedle)
      ? certificadosRaw.filter((cert) => {
        const statusOk = statusFilter === 'all' || cert.estado === statusFilter;
        const cargoTexto = normalizarFiltro(cert.empleado.cargo_calculado || cert.empleado.cargo);
        const tipoTexto = normalizarFiltro(cert.empleado.tipoVinculacion);
        const cargoOk = !cargoNeedle || cargoTexto.includes(cargoNeedle);
        const tipoOk = !tipoNeedle || tipoTexto.includes(tipoNeedle);
        return statusOk && cargoOk && tipoOk;
      })
      : certificadosRaw;

    if (statusFilter !== 'all' || cargoNeedle || tipoNeedle) {
      setTotalItems(certificadosFiltrados.length);
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      setCertificados(certificadosFiltrados.slice(start, end));
    } else {
      setCertificados(certificadosRaw);
    }
  }, [certificadosRaw, statusFilter, cargoFilter, tipoVinculacionFilter, currentPage]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedCertificados = certificados;

  const empleadosUnicos = useMemo(() => {
    const map = new Map<string, CertificadoLaboral>();
    certificadosMetricas.forEach((cert) => {
      const documentoRaw = String(cert.empleado.documento || '').trim();
      const documentoKey = documentoRaw.replace(/\D+/g, '') || documentoRaw;
      const fallbackKey = `${cert.empleado.nombre || ''}-${cert.empleado.email || ''}`.trim().toLowerCase();
      const key = documentoKey || fallbackKey;
      if (!key) return;
      const existente = map.get(key);
      if (!existente) {
        map.set(key, cert);
        return;
      }
      const fechaActual = new Date(existente.fechaSolicitud || 0).getTime();
      const fechaNueva = new Date(cert.fechaSolicitud || 0).getTime();
      if (fechaNueva > fechaActual) {
        map.set(key, cert);
      }
    });
    return Array.from(map.values());
  }, [certificadosMetricas]);

  const empleadosElegibles = empleadosUnicos.length;
  const docentesActivos = empleadosUnicos.filter((cert) => cert.templateType === 'docente' && cert.estadoLaboral === 'activo').length;
  const administrativosActivos = empleadosUnicos.filter((cert) => cert.templateType === 'administrador' && cert.estadoLaboral === 'activo').length;

  const cargosDisponibles = useMemo(() => {
    const set = new Set<string>();
    certificadosMetricas.forEach((cert) => {
      const cargo = cert.empleado.cargo_calculado || cert.empleado.cargo;
      if (cargo) set.add(cargo);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [certificadosMetricas]);

  const tiposVinculacionDisponibles = useMemo(() => {
    const set = new Set<string>();
    certificadosMetricas.forEach((cert) => {
      if (cert.empleado.tipoVinculacion) set.add(cert.empleado.tipoVinculacion);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [certificadosMetricas]);

  const hasActiveFilters = Boolean(searchQuery.trim() || statusFilter !== 'all' || cargoFilter.trim() || tipoVinculacionFilter.trim());
  const puedeConfigurarPlantilla = Boolean(canManageTemplates);

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCargoFilter('');
    setTipoVinculacionFilter('');
  };

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleVerDetalle = (cert: CertificadoLaboral) => {
    // Toggle panel desplegable
    if (expandedCertId === cert.id) {
      setExpandedCertId(null);
    } else {
      setExpandedCertId(cert.id);
    }
  };

  const handleReenviarEmail = async (cert: CertificadoLaboral) => {
    if (processingIds.has(cert.id)) return;
    setProcessingIds(prev => new Set(prev).add(cert.id));
    toast.loading('Reenviando certificado...', { id: `reenviar-${cert.id}` });
    try {
      const response = await certificadosService.laborales.reenviar(cert.id, {
        publicBaseUrl: window.location.origin,
      });
      toast.success('Certificado reenviado', {
        id: `reenviar-${cert.id}`,
        description: `Enviado a ${response?.email || 'correo registrado'}`,
      });
    } catch (error: any) {
      toast.error('No se pudo reenviar el certificado', {
        id: `reenviar-${cert.id}`,
        description: error?.message || 'Intenta nuevamente',
      });
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(cert.id); return n; });
    }
  };

  const handleDescargarPDF = (cert: CertificadoLaboral) => {
    if (downloadCert) return;
    toast.loading('Generando PDF...', { id: `descargar-${cert.id}` });
    setDownloadCert(cert);
  };

  const getEstadoBadge = (estado: string) => {
    const estilos = {
      activo: { bg: 'bg-green-100', text: 'text-green-800', label: 'Activo' },
      inactivo: { bg: 'bg-red-100', text: 'text-red-800', label: 'Inactivo' },
      revocado: { bg: 'bg-red-100', text: 'text-red-800', label: 'Revocado' },
      expirado: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expirado' }
    };
    const estilo = estilos[estado as keyof typeof estilos] || estilos.activo;
    return (
      <Badge variant="outline" className={`${estilo.bg} ${estilo.text} border-0 text-xs px-2 py-0.5`}>
        {estilo.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-4"
      >
        <div>
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                boxShadow: '0 4px 12px rgba(0, 61, 165, 0.15)'
              }}
            >
              <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 
              className="font-bold tracking-tight text-2xl sm:text-3xl lg:text-[32px]"
              style={{
                lineHeight: '1.2',
                letterSpacing: '-0.25px',
                color: '#1F2937'
              }}
            >
              Certificados Laborales
            </h1>
          </div>
          <p 
            className="font-normal text-sm sm:text-base"
            style={{
              lineHeight: '1.5',
              color: '#6B7280'
            }}
          >
            Gestión de certificados laborales solicitados por los empleados. El documento se envía automáticamente al correo registrado en la plataforma.
          </p>
        </div>

        {/* Botones de acción - Mobile First */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              onClick={() => onNavigate?.('validar-qr')}
              className="inline-flex items-center justify-center gap-2 transition-all font-semibold shadow-sm hover:shadow-md"
              style={{
                background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '48px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(41, 98, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
              }}
            >
              <QrCode className="w-5 h-5" strokeWidth={2.5} />
              <span>Validar Certificado</span>
            </button>

            <button
              onClick={() => onNavigate?.('configuracion-plantilla')}
              className="inline-flex items-center justify-center gap-2 transition-all font-semibold"
              style={{
                background: 'linear-gradient(135deg, #F0F7FF 0%, #E0ECFF 100%)',
                color: puedeConfigurarPlantilla ? '#1E40AF' : '#1E3A8A',
                border: '2px solid #93C5FD',
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: 1,
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.16)',
                minHeight: '48px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #DBEAFE 0%, #C7DDFF 100%)';
                e.currentTarget.style.borderColor = '#2563EB';
                e.currentTarget.style.color = '#1E3A8A';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 14px rgba(37, 99, 235, 0.22)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #F0F7FF 0%, #E0ECFF 100%)';
                e.currentTarget.style.borderColor = '#93C5FD';
                e.currentTarget.style.color = puedeConfigurarPlantilla ? '#1E40AF' : '#1E3A8A';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.16)';
              }}
            >
              <span className="w-6 h-6 rounded-md bg-white/80 border border-blue-200 flex items-center justify-center">
                <Settings className="w-4 h-4" strokeWidth={2.2} />
              </span>
              <span className="hidden sm:inline">{puedeConfigurarPlantilla ? 'Configurar Plantilla' : 'Ver Plantilla'}</span>
              <span className="sm:hidden">Plantilla</span>
            </button>
          </div>

          <div className="flex min-w-0 flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center sm:justify-end gap-2 sm:gap-3 sm:ml-auto">
            <button
              onClick={() => fetchCertificados(true)}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap flex-shrink-0 sm:w-32"
              style={{
                background: '#FFFFFF',
                color: '#10B981',
                border: '2px solid #10B981',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                opacity: isRefreshing ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!isRefreshing) {
                  e.currentTarget.style.background = '#F0FDF4';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFFFFF';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <motion.div
                animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
              >
                <RefreshCw className="w-5 h-5" strokeWidth={2} />
              </motion.div>
              <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
            </button>

            <button
              onClick={() => setIsPrimaTecnicaOpen(true)}
              className="inline-flex max-w-full items-center justify-center gap-2 transition-all whitespace-normal text-center sm:w-auto sm:whitespace-nowrap sm:flex-shrink-0"
              style={{
                background: '#FFFFFF',
                color: '#4338CA',
                border: '2px solid #C4B5FD',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(67, 56, 202, 0.08)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#EEF2FF';
                e.currentTarget.style.borderColor = '#A5B4FC';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFFFFF';
                e.currentTarget.style.borderColor = '#C4B5FD';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span className="w-5 h-5 rounded-full bg-indigo-100/80 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                <Percent className="w-3.5 h-3.5" strokeWidth={2.4} />
              </span>
              <span className="leading-tight">Prima técnica y/o coordinación</span>
            </button>

            <button
              onClick={() => setIsGenerarOpen(true)}
              className="inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap flex-shrink-0 sm:w-32"
              style={{
                background: '#FFFFFF',
                color: '#003DA5',
                border: '2px solid #003DA5',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '13px',
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

            <button
              onClick={() => setIsHistorialOpen(true)}
              className="inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap flex-shrink-0 sm:w-32"
              style={{
                background: '#FFFFFF',
                color: '#F97316',
                border: '2px solid #F97316',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FFF7ED';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFFFFF';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <History className="w-5 h-5 scale-110 flex-shrink-0" strokeWidth={2.3} />
              <span>Ver historial</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Banner Autoservicio */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-[#EFF6FF] border-2 border-[#93C5FD] rounded-xl p-4 sm:p-5"
      >
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#DBEAFE' }}
          >
            <Mail className="w-5 h-5" style={{ color: '#3B82F6' }} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 
              className="font-bold mb-1 text-sm sm:text-base"
              style={{
                lineHeight: '1.4',
                color: '#1E3A8A'
              }}
            >
              Certificados por Autoservicio
            </h3>
            <p 
              className="font-normal text-xs sm:text-sm mb-3"
              style={{ color: '#1E3A8A', lineHeight: '1.5' }}
            >
              Los certificados laborales solo pueden ser solicitados por el interesado a través del portal de autoservicio. Una vez generado, el documento PDF se envía automáticamente al correo electrónico registrado en la plataforma.
            </p>
            {/* Métricas - Responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-blue-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-600 truncate">Empleados Elegibles</p>
                  <p className="text-lg font-bold text-gray-900">
                    {isLoading || isMetricasLoading ? '...' : empleadosElegibles}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-600 truncate">Docentes Activos</p>
                  <p className="text-lg font-bold text-gray-900">
                    {isLoading || isMetricasLoading ? '...' : docentesActivos}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-600 truncate">Administrativos Activos</p>
                  <p className="text-lg font-bold text-gray-900">
                    {isLoading || isMetricasLoading ? '...' : administrativosActivos}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Búsqueda y Filtros - Mobile First */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-white rounded-xl border border-[#E5E7EB] p-3 sm:p-4"
        style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Búsqueda - Siempre full width en mobile */}
          <div className="flex-1 relative">
            <Search 
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: '#9CA3AF' }}
            />
            <input
              type="text"
              placeholder="Buscar certificado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-2 rounded-lg transition-all text-sm"
              style={{
                paddingLeft: '44px',
                paddingRight: searchQuery ? '44px' : '16px',
                paddingTop: '12px',
                paddingBottom: '12px',
                fontSize: '14px',
                lineHeight: '20px',
                color: '#1F2937',
                borderColor: '#D1D5DB',
                height: '48px',
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
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Filtro Cargo */}
          <div className="relative" style={{ minWidth: '220px' }}>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: '#9CA3AF' }}
            />
            <input
              type="text"
              placeholder="Buscar cargo..."
              value={cargoFilter}
              onChange={(e) => setCargoFilter(e.target.value)}
              aria-label="Buscar cargo"
              className="w-full border-2 rounded-lg transition-all"
              style={{
                paddingLeft: '40px',
                paddingRight: cargoFilter ? '40px' : '16px',
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
            {cargoFilter && (
              <button
                onClick={() => setCargoFilter('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Limpiar filtro de cargo"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtro Tipo Vinculación */}
          <div className="relative" style={{ minWidth: '240px' }}>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: '#9CA3AF' }}
            />
            <input
              type="text"
              placeholder="Buscar tipo de vinculación..."
              value={tipoVinculacionFilter}
              onChange={(e) => setTipoVinculacionFilter(e.target.value)}
              aria-label="Buscar tipo de vinculación"
              className="w-full border-2 rounded-lg transition-all"
              style={{
                paddingLeft: '40px',
                paddingRight: tipoVinculacionFilter ? '40px' : '16px',
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
            {tipoVinculacionFilter && (
              <button
                onClick={() => setTipoVinculacionFilter('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Limpiar filtro de tipo de vinculación"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm text-gray-600">Filtros activos:</span>
            {searchQuery.trim() && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                Búsqueda: {searchQuery.substring(0, 15)}{searchQuery.length > 15 ? '...' : ''}
              </Badge>
            )}
            {statusFilter !== 'all' && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                Estado: {statusFilter}
              </Badge>
            )}
            {cargoFilter.trim() && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                Cargo: {cargoFilter.trim()}
              </Badge>
            )}
            {tipoVinculacionFilter.trim() && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                Tipo Vinculación: {tipoVinculacionFilter.trim()}
              </Badge>
            )}
            <button
              onClick={clearAllFilters}
              className="text-sm text-[#003DA5] hover:underline ml-2"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </motion.div>

      {/* Tabla de Certificados */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden"
        style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}
      >
        {isLoading ? (
          <div className="text-center py-16 px-6">
            <RefreshCw className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-spin" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Cargando certificados...
            </h3>
            <p className="text-sm text-gray-600">
              Por favor espera un momento
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-16 px-6">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Error al cargar certificados
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#003DA5] text-white rounded-lg hover:bg-[#002873] transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : paginatedCertificados.length > 0 ? (
          <>
            {/* Tabla con estructura HTML tradicional para mejor alineación */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        ESTADO
                      </span>
                    </th>
                    <th className="px-4 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        N° CERTIFICADO
                      </span>
                    </th>
                    <th className="px-4 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        EMPLEADO
                      </span>
                    </th>
                    <th className="px-4 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        CARGO
                      </span>
                    </th>
                    <th className="px-4 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        IDENTIFICACIÓN
                      </span>
                    </th>
                    <th className="px-4 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        TIPO VINCULACIÓN
                      </span>
                    </th>
                    <th className="px-4 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        DEPENDENCIA
                      </span>
                    </th>
                    <th className="px-4 py-4 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        FECHA SOLICITUD
                      </span>
                    </th>
                    <th className="px-4 py-4 text-right">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        ACCIONES
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedCertificados.map((cert) => (
                    <React.Fragment key={cert.id}>
                      <tr
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleVerDetalle(cert)}
                      >
                        {/* Estado */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getEstadoBadge(cert.estado)}
                        </td>

                        {/* N° Certificado */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <p className="text-sm font-medium text-gray-900 font-mono">
                            {cert.consecutivo}
                          </p>
                        </td>

                        {/* Empleado */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 bg-[#003DA5] text-white flex-shrink-0">
                              <AvatarFallback className="bg-[#003DA5] text-white">
                                {cert.empleado.nombre.split(' ').slice(0, 2).map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{cert.empleado.nombre}</p>
                              <p
                                className="text-xs text-blue-600 flex items-center gap-1 break-all"
                                title={cert.empleado.email || 'N/A'}
                              >
                                <Mail className="w-3 h-3 flex-shrink-0" />
                                {cert.empleado.email || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Cargo */}
                        <td className="px-4 py-4">
                          <p className="text-sm text-gray-900 font-medium">
                          {cert.empleado.cargo_calculado || cert.empleado.cargo}
                          </p>
                        </td>

                        {/* Identificación */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <p className="text-sm font-medium text-gray-900">{cert.empleado.documento}</p>
                        </td>

                        {/* Tipo Vinculación */}
                        <td className="px-4 py-4">
                          <p className="text-sm text-gray-900">
                            {cert.empleado.tipoVinculacion}
                          </p>
                        </td>

                        {/* Dependencia */}
                        <td className="px-4 py-4">
                          <p className="text-sm text-gray-900">{cert.empleado.dependencia || cert.department || cert.position_location || ''}</p>
                        </td>

                        {/* Fecha Solicitud */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-900">
                            {new Date(cert.fechaSolicitud).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(cert.fechaSolicitud).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVerDetalle(cert);
                              }}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Ver detalle"
                            >
                              <Eye className="w-5 h-5 text-gray-600" />
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                  disabled={processingIds.has(cert.id)}
                                >
                                  <MoreVertical className="w-5 h-5 text-gray-600" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); handleDescargarPDF(cert); }}
                                  disabled={downloadCert !== null}
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Descargar certificado
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); handleReenviarEmail(cert); }}
                                  disabled={processingIds.has(cert.id)}
                                >
                                  <Mail className="w-4 h-4 mr-2" />
                                  Reenviar certificado
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>

                      {/* Panel Desplegable - debajo de la fila */}
                      {expandedCertId === cert.id && (
                        <tr>
                          <td colSpan={9} className="p-0 bg-gray-50">
                            <CertificadoDetallePanel
                              certificado={cert}
                              isOpen={true}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <PaginationPremium
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={totalItems}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 px-6">
            <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No se encontraron certificados
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {hasActiveFilters 
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Aún no hay certificados laborales en el sistema'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 bg-[#003DA5] text-white rounded-lg hover:bg-[#002873] transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Modales */}
      {selectedCertificado && (
        <CertificadoDetalleModal
          certificado={selectedCertificado}
          isOpen={isDetalleOpen}
          onClose={() => {
            setIsDetalleOpen(false);
            setSelectedCertificado(null);
          }}
        />
      )}

      <GenerarCertificadoModal
        isOpen={isGenerarOpen}
        onClose={() => setIsGenerarOpen(false)}
        onSuccess={(nuevoCert) => {
          toast.success('Certificado generado exitosamente');
          setIsGenerarOpen(false);
        }}
        certificados={certificados}
      />

      <ModalHistorialCertificados
        isOpen={isHistorialOpen}
        onClose={() => setIsHistorialOpen(false)}
      />

      <PrimaTecnicaModal
        isOpen={isPrimaTecnicaOpen}
        onClose={() => setIsPrimaTecnicaOpen(false)}
      />

      {downloadCert && (
        <VisorPDFCertificado
          isOpen={true}
          hiddenMode={true}
          autoAction="download"
          onClose={() => setDownloadCert(null)}
          onAutoActionComplete={(action, success) => {
            const id = `descargar-${downloadCert.id}`;
            setDownloadCert(null);
            if (success) {
              toast.success('PDF descargado', { id });
            } else {
              toast.error('No se pudo generar el PDF', { id, description: 'Intenta nuevamente' });
            }
          }}
          certificado={downloadCert}
        />
      )}

    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Search,
  User,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  DollarSign,
  Calendar,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Card } from '@esap-mfe/shared-ui/card';
import { Label } from '@esap-mfe/shared-ui/label';
import { Checkbox } from '@esap-mfe/shared-ui/checkbox';
import { VisorPDFCertificado } from './VisorPDFCertificado';
import { PaginationPremium } from '../shared/PaginationPremium';
import { certificadosService } from '../../services/api/certificados.service';
import { formatCargoDisplay, selectPreferredCargoCode } from '../../utils/cargoFormatter';

interface GenerarCertificadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (certificado: any) => void;
  certificados: CertificadoLaboralListado[];
}

interface CertificadoLaboralListado {
  id: string;
  consecutivo: string;
  certificateHash?: string;
  qrCode?: string;
  observations?: string;
  position_location?: string;
  department?: string;
  cod_cargo?: string;
  cod_grade?: string;
  campus?: string;
  technical_bonus?: number;
  technical_bonus_category?: string | null;
  technicalBonusCategory?: string | null;
  technical_bonuses?: any[] | null;
  technicalBonuses?: any[] | null;
  incluyeSalario?: boolean;
  incluyePrimaTecnica?: boolean;
  templateSnapshot?: any;
  templateType?: 'docente' | 'administrador';
  empleado: {
    nombre: string;
    documento: string;
    email: string;
    cargo: string;
    dependencia: string;
    dependenciaPadre?: string;
    tipoVinculacion: string;
    fechaVinculacion: string;
    grado: string;
    ubicacion?: string;
    salario: number;
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

export function GenerarCertificadoModal({ isOpen, onClose, onSuccess, certificados: _certificados }: GenerarCertificadoModalProps) {
  const normalizarTexto = (value?: string | null) => {
    const cleaned = (value || '').replace(/\u00a0/g, ' ').trim();
    if (!cleaned) return '';
    const lower = cleaned.toLowerCase();
    if (lower === 'registro padre' || lower === 'registro hijo') return '';
    return cleaned;
  };

  const normalizarTextoBusqueda = (value?: string | null) => {
    const base = String(value || '').toLowerCase();
    const normalizado = typeof base.normalize === 'function' ? base.normalize('NFD') : base;
    return normalizado
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const resolverTemplateType = (value?: string | null): 'docente' | 'administrador' =>
    /\bdocen\w*\b|\bdoc\b/.test(normalizarTextoBusqueda(value)) ? 'docente' : 'administrador';

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

  const normalizarMonto = (value?: string | number | null) => {
    if (value === null || value === undefined) return 0;
    const raw = typeof value === 'string' ? value.replace(/[^\d.-]/g, '') : value;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return 0;
    return Math.round(parsed);
  };

  const formatearMonto = (value?: string | number | null) =>
    normalizarMonto(value).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

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

  const [step, setStep] = useState<'buscar' | 'validar'>('buscar');
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [certificadoSeleccionado, setCertificadoSeleccionado] = useState<CertificadoLaboralListado | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [configuracion, setConfiguracion] = useState({
    incluyeSalario: true,
    incluyePrimaTecnica: false,
  });
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [autoPDFAction, setAutoPDFAction] = useState<'download' | 'print' | null>(null);
  const [modalPage, setModalPage] = useState(1);
  const [modalItems, setModalItems] = useState<CertificadoLaboralListado[]>([]);
  const [modalTotal, setModalTotal] = useState(0);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const lastFiltersKeyRef = useRef('');
  const requestSequenceRef = useRef(0);
  const primaTecnicaRequestRef = useRef(0);
  const [primaTecnicaDisponible, setPrimaTecnicaDisponible] = useState(false);
  const [validandoPrimaTecnica, setValidandoPrimaTecnica] = useState(false);
  const itemsPerPage = 5;
  const modalTotalPages = Math.max(1, Math.ceil(modalTotal / itemsPerPage));
  const parseDateOnly = (fechaStr: string) => {
    if (!fechaStr) return null;
    const isoMatch = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]) - 1;
      const day = Number(isoMatch[3]);
      return new Date(year, month, day, 12, 0, 0);
    }
    const parsed = new Date(fechaStr);
    if (isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const formatearFecha = (fechaStr: string) => {
    const fecha = parseDateOnly(fechaStr);
    if (!fecha) return 'Fecha no disponible';
    return fecha.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearFechaHora = (fechaStr?: string) => {
    if (!fechaStr) {
      return { fecha: 'Fecha no disponible', hora: '' };
    }
    const fecha = parseDateOnly(fechaStr);
    if (!fecha) {
      return { fecha: 'Fecha no disponible', hora: '' };
    }
    const fechaTexto = fecha.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const incluyeHora = fechaStr.includes('T');
    const horaTexto = incluyeHora
      ? fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      : '';
    return { fecha: fechaTexto, hora: horaTexto };
  };

  const getCertSortTime = (cert: CertificadoLaboralListado): number => {
    const preferred = cert.fechaGeneracion || cert.fechaSolicitud;
    const preferredTime = preferred ? new Date(preferred).getTime() : NaN;
    if (Number.isFinite(preferredTime)) return preferredTime;

    const solicitudTime = cert.fechaSolicitud ? new Date(cert.fechaSolicitud).getTime() : NaN;
    return Number.isFinite(solicitudTime) ? solicitudTime : 0;
  };

  useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen]);

  const fetchCertificadosModal = async () => {
    if (!isOpen) return;
    const requestId = ++requestSequenceRef.current;
    setModalLoading(true);
    setModalError(null);

    try {
      if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
        setModalError('La fecha inicial no puede ser mayor que la fecha final.');
        setModalItems([]);
        setModalTotal(0);
        return;
      }

      const params: Record<string, any> = {
        page: modalPage,
        limit: itemsPerPage
      };
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      if (fechaDesde) {
        params.fechaDesde = fechaDesde;
      }
      if (fechaHasta) {
        params.fechaHasta = fechaHasta;
      }

      const response = await certificadosService.laborales.listar(params);
      if (requestId !== requestSequenceRef.current) return;
      const items = Array.isArray(response) ? response : (response.items || []);
      const total = Array.isArray(response) ? items.length : (response.total || 0);

      const transformados: CertificadoLaboralListado[] = items.map((cert: any) => {
        const dependenciaPadreRaw =
          cert.request?.cod_cargo ||
          cert.request?.codCargo ||
          cert.cod_cargo ||
          cert.codCargo ||
          '';
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
        const cargoFormateado = formatCargoDisplay({
          cargoSource:
            cert.request?.career_category ||
            cert.career_category ||
            cert.position_category ||
            '',
          codCargo: selectPreferredCargoCode(
            cert.request?.cod_cargo,
            cert.request?.codCargo,
            cert.cod_cargo,
            cert.codCargo,
          ),
          codGrade:
            cert.request?.cod_grade ||
            cert.request?.codGrade ||
            cert.cod_grade ||
            cert.codGrade,
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
          observations: cert.observations || cert.request?.observations,
          position_location: normalizarTexto(grupoRaw),
          department: normalizarTexto(
            cert.department ||
            cert.request?.department ||
            cert.request?.departmentName ||
            ubicacionRaw ||
            ''
          ),
          cod_cargo: dependenciaPadreRaw,
          cod_grade: cert.request?.cod_grade || cert.cod_grade || cert.codGrade,
          campus: cert.campus,
          technical_bonus: cert.technical_bonus ?? cert.request?.technical_bonus,
          technical_bonus_category:
            cert.technical_bonus_category ??
            cert.technicalBonusCategory ??
            cert.request?.technical_bonus_category ??
            cert.request?.technicalBonusCategory ??
            null,
          technical_bonuses:
            cert.technical_bonuses ??
            cert.technicalBonuses ??
            cert.request?.technical_bonuses ??
            cert.request?.technicalBonuses ??
            cert.template_snapshot?.technicalBonuses ??
            cert.templateSnapshot?.technicalBonuses ??
            null,
          incluyeSalario,
          incluyePrimaTecnica,
          templateSnapshot: cert.template_snapshot || cert.templateSnapshot || null,
          templateType: templateTypeNormalizado,
          empleado: {
            nombre: cert.full_name,
            documento: cert.id_number,
            cargo: cargoFormateado || cert.career_category || cert.position_category || '',
            dependencia: normalizarTexto(ubicacionRaw),
            dependenciaPadre: normalizarTexto(dependenciaPadreRaw),
            tipoVinculacion: cert.position_category,
            fechaVinculacion: cert.hiring_date,
            grado: cert.department || '',
            ubicacion: normalizarTexto(ubicacionRaw),
            salario: normalizarMonto(cert.monthly_salary),
            email: cert.email || cert.request?.email || 'No disponible'
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
      });

      if (requestId !== requestSequenceRef.current) return;
      const transformadosOrdenados = [...transformados].sort(
        (a, b) => getCertSortTime(b) - getCertSortTime(a)
      );
      setModalItems(transformadosOrdenados);
      setModalTotal(total);
    } catch (error: any) {
      if (requestId !== requestSequenceRef.current) return;
      console.error('Error al cargar certificados para exportar:', error);
      setModalError(error.message || 'No se pudieron cargar los certificados');
      setModalItems([]);
      setModalTotal(0);
    } finally {
      if (requestId === requestSequenceRef.current) {
        setModalLoading(false);
      }
    }
  };

  const activeFiltersKey = `${searchTerm.trim().toLowerCase()}|${fechaDesde}|${fechaHasta}`;

  useEffect(() => {
    if (!isOpen) return;

    const filtersChanged = lastFiltersKeyRef.current !== activeFiltersKey;
    if (filtersChanged && modalPage !== 1) {
      lastFiltersKeyRef.current = activeFiltersKey;
      setModalPage(1);
      return;
    }

    lastFiltersKeyRef.current = activeFiltersKey;
    fetchCertificadosModal();
  }, [isOpen, modalPage, activeFiltersKey]);

  useEffect(() => {
    if (modalPage > modalTotalPages) {
      setModalPage(modalTotalPages);
    }
  }, [modalPage, modalTotalPages]);

  const validarDisponibilidadPrimaTecnica = async (documento: string) => {
    const doc = String(documento || '').trim();
    if (!doc) return false;

    const response = await certificadosService.autoservicio.verificarDocumento(doc);
    const solicitud = response?.solicitud || {};
    const porcentaje = Number(
      response?.technical_bonus_percentage ??
        solicitud?.technical_bonus_percentage ??
        0,
    );
    const valor = Number(
      response?.technical_bonus_value ??
        solicitud?.technical_bonus_value ??
        0,
    );
    const disponible =
      Boolean(
        response?.technical_bonus_available ??
          solicitud?.technical_bonus_available,
      ) ||
      porcentaje > 0 ||
      valor > 0;

    return disponible;
  };

  const handleSelectCertificado = async (cert: CertificadoLaboralListado) => {
    setCertificadoSeleccionado(cert);
    const incluyeSalario = cert.incluyeSalario !== false;
    setConfiguracion({
      incluyeSalario,
      incluyePrimaTecnica: false,
    });
    setPrimaTecnicaDisponible(false);
    setValidandoPrimaTecnica(true);
    setStep('validar');

    const requestId = ++primaTecnicaRequestRef.current;
    try {
      const disponible = await validarDisponibilidadPrimaTecnica(cert.empleado.documento);
      if (requestId !== primaTecnicaRequestRef.current) return;

      setPrimaTecnicaDisponible(disponible);
      setConfiguracion((prev) => ({
        ...prev,
        incluyePrimaTecnica: prev.incluyeSalario && disponible && !!cert.incluyePrimaTecnica,
      }));

      if (!disponible) {
        toast.info('Este empleado no tiene prima técnica y/o coordinación registrada.');
      }
    } catch (error) {
      if (requestId !== primaTecnicaRequestRef.current) return;
      setPrimaTecnicaDisponible(false);
      setConfiguracion((prev) => ({
        ...prev,
        incluyePrimaTecnica: false,
      }));
      toast.warning('No pudimos validar la prima técnica y/o coordinación en este momento.');
    } finally {
      if (requestId === primaTecnicaRequestRef.current) {
        setValidandoPrimaTecnica(false);
      }
    }
  };

  const handleDescargarCertificado = () => {
    if (!certificadoSeleccionado) return;

    setIsGenerating(true);
    toast.loading('Generando certificado...', {
      description: 'Por favor espera mientras procesamos la información',
      id: 'generar-cert'
    });

    setAutoPDFAction('download');
    setShowPDFViewer(true);
  };

  const handleAutoActionComplete = (success: boolean) => {
    setShowPDFViewer(false);
    setAutoPDFAction(null);
    setIsGenerating(false);

    if (success) {
      toast.success('Certificado generado exitosamente!', {
        description: certificadoSeleccionado
          ? `${certificadoSeleccionado.consecutivo} listo para descargar`
          : 'Certificado listo para descargar',
        id: 'generar-cert',
        duration: 4000
      });
      if (certificadoSeleccionado) {
        onSuccess(certificadoSeleccionado);
      }
      handleReset();
    } else {
      toast.error('No se pudo generar el certificado', {
        description: 'Intenta nuevamente en unos segundos',
        id: 'generar-cert',
        duration: 4000
      });
    }
  };



  const handleReset = () => {
    setStep('buscar');
    setSearchTerm('');
    setFechaDesde('');
    setFechaHasta('');
    setCertificadoSeleccionado(null);
    setConfiguracion({
      incluyeSalario: true,
      incluyePrimaTecnica: false,
    });
    setPrimaTecnicaDisponible(false);
    setValidandoPrimaTecnica(false);
    setModalPage(1);
    setModalItems([]);
    setModalTotal(0);
    setModalError(null);
    lastFiltersKeyRef.current = '';
    requestSequenceRef.current += 1;
    primaTecnicaRequestRef.current += 1;
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal - Mobile Optimized */}
      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div 
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header - Sticky */}
          <div className="bg-[#003DA5] px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white flex-shrink-0" />
                <h2 className="text-white text-base sm:text-xl font-semibold truncate">
                  Generar Certificado Laboral
                </h2>
              </div>
              {step !== 'generar' && (
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors p-2 -mr-2 flex-shrink-0"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {/* Step 1: Buscar Empleado */}
            {!isGenerating && step === 'buscar' && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <Label htmlFor="search" className="text-sm sm:text-base mb-2">Buscar Empleado</Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="search"
                      type="text"
                      placeholder="Buscar por nombre o documento..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-700">Filtrar por fecha de generación</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="fecha-desde" className="text-xs text-gray-500">Desde</Label>
                      <Input
                        id="fecha-desde"
                        type="date"
                        value={fechaDesde}
                        onChange={(e) => setFechaDesde(e.target.value)}
                        max={fechaHasta || undefined}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="fecha-hasta" className="text-xs text-gray-500">Hasta</Label>
                      <Input
                        id="fecha-hasta"
                        type="date"
                        value={fechaHasta}
                        onChange={(e) => setFechaHasta(e.target.value)}
                        min={fechaDesde || undefined}
                      />
                    </div>
                  </div>
                  {(fechaDesde || fechaHasta) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFechaDesde('');
                        setFechaHasta('');
                      }}
                      className="text-xs text-[#003DA5] hover:text-[#002873] font-medium"
                    >
                      Limpiar filtro de fecha
                    </button>
                  )}
                </div>



                <div className="space-y-3">
                  {modalLoading ? (
                    <div className="text-center py-8 text-gray-500">Cargando certificados...</div>
                  ) : modalError ? (
                    <div className="text-center py-8 text-red-600">{modalError}</div>
                  ) : modalItems.length > 0 ? (
                    modalItems.map((cert) => (
                      <Card
                        key={cert.id}
                        className="p-4 hover:shadow-md transition-all cursor-pointer hover:border-[#003DA5]"
                        onClick={() => handleSelectCertificado(cert)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${
                              cert.estado === 'activo'
                                ? 'bg-green-100'
                                : cert.estado === 'inactivo'
                                  ? 'bg-red-100'
                                  : 'bg-gray-100'
                            }`}>
                              <User className={`w-6 h-6 ${
                                cert.estado === 'activo'
                                  ? 'text-green-600'
                                  : cert.estado === 'inactivo'
                                    ? 'text-red-600'
                                    : 'text-gray-600'
                              }`} />
                            </div>
                            <div>
                              <h4 className="text-gray-900">{cert.empleado.nombre}</h4>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-sm text-gray-600">CC {cert.empleado.documento}</span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                {cert.empleado.ubicacion || ''}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{formatearFechaHora(cert.fechaGeneracion || cert.fechaSolicitud).fecha}</span>
                                </div>
                                {formatearFechaHora(cert.fechaGeneracion || cert.fechaSolicitud).hora && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{formatearFechaHora(cert.fechaGeneracion || cert.fechaSolicitud).hora}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {cert.estado === 'activo' ? (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Activo</span>
                            ) : cert.estado === 'inactivo' ? (
                              <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">Inactivo</span>
                            ) : (
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">Inactivo</span>
                            )}
                            {cert.empleado.salario <= 0 && (
                              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Datos incompletos
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600">No se encontraron empleados</p>
                      <p className="text-gray-500 text-sm mt-1">Intenta con otro término de búsqueda</p>
                    </div>
                  )}
                </div>
                {modalTotal > itemsPerPage && (
                  <div className="pt-4 border-t border-gray-200">
                    <PaginationPremium
                      currentPage={modalPage}
                      totalPages={modalTotalPages}
                      onPageChange={setModalPage}
                      itemsPerPage={itemsPerPage}
                      totalItems={modalTotal}
                    />
                  </div>
                )}
                </div>
            )}

            {/* Step 2: Validar y Configurar */}
            {!isGenerating && step === 'validar' && certificadoSeleccionado && (
              <div className="space-y-6">
                {/* Resumen del Empleado */}
                <Card className="p-6 bg-blue-50 border-blue-200">
                  <h3 className="text-gray-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-[#003DA5]" />
                    Datos del Empleado
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Nombre Completo</label>
                      <p className="text-gray-900 font-medium">{certificadoSeleccionado.empleado.nombre}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Número de identificación</label>
                      <p className="text-gray-900 font-medium">{certificadoSeleccionado.empleado.documento}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Cargo</label>
                      <p className="text-gray-900">{certificadoSeleccionado.empleado.cargo}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Tipo de vinculación</label>
                      <p className="text-gray-900">{certificadoSeleccionado.empleado.tipoVinculacion}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Fecha de vinculación</label>
                      <p className="text-gray-900">
                        {formatearFecha(certificadoSeleccionado.empleado.fechaVinculacion)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Dependencia</label>
                      <p className="text-gray-900">{certificadoSeleccionado.empleado.ubicacion || ''}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Correo electrónico</label>
                      <p className="text-gray-900">{certificadoSeleccionado.empleado.email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Salario</label>
                      <p className="text-gray-900 font-semibold flex items-center gap-1">
                        {certificadoSeleccionado.empleado.salario > 0 ? (
                          <>
                            <DollarSign className="w-4 h-4 text-green-600" />
                            ${formatearMonto(certificadoSeleccionado.empleado.salario)} COP
                          </>
                        ) : (
                          <span className="text-yellow-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            No disponible
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Validaciones */}
                {certificadoSeleccionado.empleado.salario <= 0 && (
                  <Card className="p-6 border-yellow-300 bg-yellow-50">
                    <div className="flex gap-3">
                      <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                      <div>
                        <h4 className="text-gray-900">Datos Incompletos</h4>
                        <p className="text-gray-700 text-sm mt-1">
                          Este empleado tiene datos incompletos en el sistema. El certificado se generará con la información disponible.
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Configuración del Certificado */}
                <Card className="p-6">
                  <h3 className="text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#003DA5]" />
                    Configuración del Certificado
                  </h3>

                    <div className="space-y-4">
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="salario"
                            checked={configuracion.incluyeSalario}
                            onCheckedChange={(checked) => {
                              const incluyeSalario = checked === true;
                              setConfiguracion({
                                ...configuracion,
                                incluyeSalario,
                                incluyePrimaTecnica: incluyeSalario ? configuracion.incluyePrimaTecnica : false,
                              });
                            }}
                          />
                          <label
                            htmlFor="salario"
                            className="text-sm text-gray-700 cursor-pointer"
                          >
                            Incluir información salarial
                          </label>
                        </div>
                        <div className="flex items-start space-x-2">
                          <Checkbox
                            id="prima-tecnica"
                            checked={configuracion.incluyeSalario && configuracion.incluyePrimaTecnica}
                            disabled={
                              !configuracion.incluyeSalario ||
                              !primaTecnicaDisponible ||
                              validandoPrimaTecnica
                            }
                            onCheckedChange={(checked) =>
                              setConfiguracion({
                                ...configuracion,
                                incluyePrimaTecnica:
                                  checked === true &&
                                  configuracion.incluyeSalario &&
                                  primaTecnicaDisponible &&
                                  !validandoPrimaTecnica,
                              })
                            }
                          />
                          <div>
                            <label
                              htmlFor="prima-tecnica"
                              className={`text-sm cursor-pointer ${
                                configuracion.incluyeSalario ? 'text-gray-700' : 'text-gray-500'
                              }`}
                            >
                              Incluir prima técnica y/o coordinación
                            </label>
                            {!configuracion.incluyeSalario && (
                              <p className="text-xs text-amber-700 mt-1">
                                Activa primero la información salarial.
                              </p>
                            )}
                            {configuracion.incluyeSalario && validandoPrimaTecnica && (
                              <p className="text-xs text-blue-700 mt-1">
                                Validando disponibilidad de prima técnica y/o coordinación...
                              </p>
                            )}
                            {configuracion.incluyeSalario && !validandoPrimaTecnica && !primaTecnicaDisponible && (
                              <p className="text-xs text-amber-700 mt-1">
                                Este empleado no tiene prima técnica y/o coordinación registrada en las primas configuradas.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                </Card>
              </div>
            )}

            {/* Step 3: Generando */}
            {isGenerating && (
              <div className="py-12 text-center">
                <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-10 h-10 text-[#003DA5] animate-spin" />
                </div>
                <h3 className="text-gray-900 text-xl mb-2">Generando Certificado</h3>
                <p className="text-gray-600">
                  Estamos procesando la información y generando el PDF...
                </p>
                <div className="mt-6 space-y-2 max-w-md mx-auto">
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Validando datos del empleado
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Loader2 className="w-4 h-4 text-blue-500 mr-2 animate-spin" />
                    Generando documento PDF
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 mr-2" />
                    Aplicando firma electrónica
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50">
            <div className="flex justify-between">
              {step === 'validar' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      primaTecnicaRequestRef.current += 1;
                      setStep('buscar');
                      setCertificadoSeleccionado(null);
                      setPrimaTecnicaDisponible(false);
                      setValidandoPrimaTecnica(false);
                    }}
                  >
                    Atras
                  </Button>
                  <Button
                    className="bg-[#003DA5] hover:bg-[#002873]"
                    onClick={handleDescargarCertificado}
                    disabled={isGenerating || validandoPrimaTecnica}
                  >
                    {isGenerating
                      ? 'Generando...'
                      : validandoPrimaTecnica
                        ? 'Validando...'
                        : 'Generar Certificado'}
                  </Button>
                </>
              )}
              {step === 'buscar' && (
                <Button variant="outline" onClick={onClose} className="ml-auto">
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {certificadoSeleccionado && (
        <VisorPDFCertificado
          isOpen={showPDFViewer}
          onClose={() => setShowPDFViewer(false)}
          autoAction={autoPDFAction || undefined}
          hiddenMode={!!autoPDFAction}
          onAutoActionComplete={(_action, success) => handleAutoActionComplete(success)}
          certificado={{
            ...certificadoSeleccionado,
            incluyeSalario: configuracion.incluyeSalario,
            incluyePrimaTecnica: configuracion.incluyeSalario && configuracion.incluyePrimaTecnica
          }}
        />
      )}
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}

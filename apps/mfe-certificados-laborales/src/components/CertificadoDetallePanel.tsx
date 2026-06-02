import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Briefcase,
  DollarSign,
  FileText,
  Clock,
  Download,
  CheckCircle,
  Calendar,
  Hash,
  Mail,
  QrCode,
  Eye,
  Copy,
  Activity,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { VisorPDFCertificado } from './VisorPDFCertificado';
import { ModalCodigoQR } from './ModalCodigoQR';
import { HistorialVerificacionesQR } from './HistorialVerificacionesQR';
import { getPublicBaseUrl } from '../../config/environment';
import { certificadosService } from '../../services/api/certificados.service';
import { formatCargoDisplay, selectPreferredCargoCode } from '../../utils/cargoFormatter';

interface CertificadoDetallePanelProps {
  certificado: {
    id: string;
    consecutivo: string;
    qrCode: string;
    certificateHash?: string;
    verification_code?: string;
    cantidadEscaneos: number;
    empleado: {
      nombre: string;
      documento: string;
      email: string;
      cargo: string;
      cargo_calculado?: string;
      dependencia: string;
      dependenciaPadre: string;
      tipoVinculacion: string;
      fechaVinculacion: string;
      grado: string;
      salario: number;
    };
    estado: 'activo' | 'inactivo' | 'revocado' | 'expirado';
    tipoSolicitud?: 'AUTOSERVICIO' | 'MANUAL';
    fechaSolicitud: string;
    fechaGeneracion: string;
    position_location?: string;
    department?: string;
    campus?: string;
    cod_cargo?: string;
    cod_grade?: string;
    observations?: string;
    request?: {
      observations?: string;
      technical_bonus_category?: string | null;
      technicalBonusCategory?: string | null;
      technical_bonuses?: any[] | null;
      technicalBonuses?: any[] | null;
    };
    technical_bonus?: number;
    technical_bonus_category?: string | null;
    technicalBonusCategory?: string | null;
    technical_bonuses?: any[] | null;
    technicalBonuses?: any[] | null;
    incluyeSalario?: boolean;
    incluyePrimaTecnica?: boolean;
    templateSnapshot?: any;
    templateType?: 'docente' | 'administrador';
    solicitante?: {
      nombre: string;
      tipo: 'autoservicio' | 'manual';
    };
    pdfUrl?: string;
  };
  isOpen: boolean;
  onValidationHistoryChange?: (certificateId: string, totalVerificaciones: number) => void;
}

const HISTORIAL_VERIFICACIONES_POLL_INTERVAL_MS = 5000;

export function CertificadoDetallePanel({
  certificado,
  isOpen,
  onValidationHistoryChange,
}: CertificadoDetallePanelProps) {
  const [showPDFViewer, setShowPDFViewer] = React.useState(false);
  const [autoPDFAction, setAutoPDFAction] = React.useState<'download' | 'print' | 'email' | null>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const [emailFeedback, setEmailFeedback] = React.useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const emailFeedbackTimerRef = React.useRef<number | null>(null);
  const downloadFallbackTimerRef = React.useRef<number | null>(null);
  const [showQRModal, setShowQRModal] = React.useState(false);
  const [showHistorialVerificaciones, setShowHistorialVerificaciones] = React.useState(false);
  const verificationBase = getPublicBaseUrl();
  const verificationPath = '/verificar-certificado';
  const codigoVerificacion = String(
    certificado.qrCode ||
    certificado.certificateHash ||
    certificado.verification_code ||
    certificado.consecutivo ||
    '',
  ).trim();
  const verificationUrl = `${verificationBase}${verificationPath}/${encodeURIComponent(codigoVerificacion)}`;
  const incluyeSalarioCertificado = certificado.incluyeSalario !== false;
  const incluyePrimaTecnicaCertificado = incluyeSalarioCertificado && (
    certificado.incluyePrimaTecnica ?? false
  );
  const primaTecnicaCertificado = Number(
    certificado.technical_bonus ??
      (certificado.empleado.salario || 0) * 0.2,
  );
  const normalizarDependencia = (value?: string | null) => {
    const cleaned = (value || '').replace(/\u00a0/g, ' ').trim();
    if (!cleaned) return '';
    const lower = cleaned.toLowerCase();
    if (lower === 'registro padre' || lower === 'registro hijo') return '';
    return cleaned;
  };
  const ubicacionCargo =
    normalizarDependencia(
      certificado.department ||
      certificado.position_location ||
      certificado.empleado.dependencia ||
      '',
    ) || '';
  const cargoCalculado = (
    certificado.empleado.cargo_calculado ||
    formatCargoDisplay({
      cargoSource: certificado.empleado.cargo,
      codCargo: selectPreferredCargoCode(
        certificado.request?.cod_cargo,
        certificado.request?.codCargo,
        certificado.cod_cargo,
        (certificado as any)?.codCargo,
        (certificado.empleado as any)?.cod_cargo,
        (certificado.empleado as any)?.codCargo,
      ),
      codGrade: certificado.cod_grade,
      observations: certificado.request?.observations || certificado.observations,
      templateType: certificado.templateType,
      includeCodeLabel: true,
      codeLabel: 'Código',
    }) ||
    certificado.empleado.cargo
  );

  // Helper para formatear fechas de forma segura
  const parseDateOnly = (fechaStr: string) => {
    if (!fechaStr || fechaStr === 'N/A') {
      return null;
    }
    const isoMatch = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]) - 1;
      const day = Number(isoMatch[3]);
      return new Date(year, month, day, 12, 0, 0);
    }
    const parsed = new Date(fechaStr);
    if (isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  };

  const formatearFecha = (fechaStr: string, opciones?: Intl.DateTimeFormatOptions) => {
    try {
      const fecha = parseDateOnly(fechaStr);
      if (!fecha) {
        console.error('Fecha invǭomlida:', fechaStr);
        return 'Fecha no disponible';
      }
      return fecha.toLocaleDateString('es-CO', opciones || {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return 'Fecha no disponible';
    }
  };

  // Mock data: Historial de verificaciones del QR
  const mockVerificaciones = [
    {
      id: 'VER-001',
      timestamp: '2025-01-15T14:30:25',
      resultado: 'exitosa' as const,
      dispositivo: {
        tipo: 'mobile' as const,
        sistemaOperativo: 'Android',
        navegador: 'Chrome Mobile',
        version: '13.0'
      },
      ubicacion: {
        ip: '181.49.123.45',
        pais: 'Colombia',
        ciudad: 'Bogotá',
        latitud: 4.6097,
        longitud: -74.0817,
        proveedor: 'Claro Colombia'
      }
    },
    {
      id: 'VER-002',
      timestamp: '2025-01-16T09:15:42',
      resultado: 'exitosa' as const,
      dispositivo: {
        tipo: 'desktop' as const,
        sistemaOperativo: 'Windows 11',
        navegador: 'Edge',
        version: '120.0'
      },
      ubicacion: {
        ip: '190.25.234.122',
        pais: 'Colombia',
        ciudad: 'Medellín',
        latitud: 6.2442,
        longitud: -75.5812,
        proveedor: 'Movistar Colombia'
      }
    },
    {
      id: 'VER-003',
      timestamp: '2025-01-17T16:45:10',
      resultado: 'exitosa' as const,
      dispositivo: {
        tipo: 'mobile' as const,
        sistemaOperativo: 'iOS',
        navegador: 'Safari Mobile',
        version: '17.2'
      },
      ubicacion: {
        ip: '200.93.155.78',
        pais: 'Colombia',
        ciudad: 'Cali',
        latitud: 3.4516,
        longitud: -76.5320,
        proveedor: 'Tigo Colombia'
      }
    },
    {
      id: 'VER-004',
      timestamp: '2025-01-18T11:20:33',
      resultado: 'fallida' as const,
      dispositivo: {
        tipo: 'desktop' as const,
        sistemaOperativo: 'macOS Sonoma',
        navegador: 'Safari',
        version: '17.0'
      },
      ubicacion: {
        ip: '186.84.32.190',
        pais: 'Colombia',
        ciudad: 'Barranquilla',
        latitud: 10.9685,
        longitud: -74.7813,
        proveedor: 'ETB'
      },
      detalles: 'Intento de acceso desde IP no autorizada'
    },
    {
      id: 'VER-005',
      timestamp: '2025-01-19T08:55:18',
      resultado: 'exitosa' as const,
      dispositivo: {
        tipo: 'tablet' as const,
        sistemaOperativo: 'Android',
        navegador: 'Chrome',
        version: '120.0'
      },
      ubicacion: {
        ip: '181.62.240.99',
        pais: 'Colombia',
        ciudad: 'Cartagena',
        latitud: 10.3910,
        longitud: -75.4794,
        proveedor: 'Claro Colombia'
      }
    },
    {
      id: 'VER-006',
      timestamp: '2025-01-20T13:40:55',
      resultado: 'sospechosa' as const,
      dispositivo: {
        tipo: 'mobile' as const,
        sistemaOperativo: 'Android',
        navegador: 'Chrome Mobile',
        version: '13.0'
      },
      ubicacion: {
        ip: '45.188.167.234',
        pais: 'Venezuela',
        ciudad: 'Caracas',
        latitud: 10.4806,
        longitud: -66.9036,
        proveedor: 'CANTV'
      },
      detalles: 'Acceso desde ubicación inusual'
    },
    {
      id: 'VER-007',
      timestamp: '2025-01-21T15:10:27',
      resultado: 'exitosa' as const,
      dispositivo: {
        tipo: 'desktop' as const,
        sistemaOperativo: 'Windows 11',
        navegador: 'Chrome',
        version: '121.0'
      },
      ubicacion: {
        ip: '190.144.52.188',
        pais: 'Colombia',
        ciudad: 'Bucaramanga',
        latitud: 7.1193,
        longitud: -73.1227,
        proveedor: 'Movistar Colombia'
      }
    },
    {
      id: 'VER-008',
      timestamp: '2025-01-22T10:25:44',
      resultado: 'exitosa' as const,
      dispositivo: {
        tipo: 'mobile' as const,
        sistemaOperativo: 'iOS',
        navegador: 'Safari Mobile',
        version: '17.2'
      },
      ubicacion: {
        ip: '181.49.98.156',
        pais: 'Colombia',
        ciudad: 'Bogotá',
        latitud: 4.6097,
        longitud: -74.0817,
        proveedor: 'Claro Colombia'
      }
    }
  ];

  const [verificaciones, setVerificaciones] = React.useState<typeof mockVerificaciones>([]);
  const [historialCargado, setHistorialCargado] = React.useState(false);
  const [cargandoHistorial, setCargandoHistorial] = React.useState(false);
  const [historialError, setHistorialError] = React.useState<string | null>(null);
  const historialSyncInFlightRef = React.useRef(false);

  const normalizarResultado = (valor: any) => {
    const val = typeof valor === 'string' ? valor.toLowerCase() : '';
    if (['fallida', 'failed', 'invalid', 'error'].includes(val)) return 'fallida' as const;
    if (['sospechosa', 'suspicious', 'warning'].includes(val)) return 'sospechosa' as const;
    return 'exitosa' as const;
  };

  const normalizarDispositivo = (valor: any) => {
    let val = '';
    if (typeof valor === 'string') {
      val = valor.toLowerCase();
    } else if (valor && typeof valor === 'object') {
      const typeVal = valor.tipo || valor.type || valor.device || '';
      if (typeof typeVal === 'string') {
        val = typeVal.toLowerCase();
      }
    }
    if (val.includes('tablet')) return 'tablet' as const;
    if (val.includes('mobile') || val.includes('phone')) return 'mobile' as const;
    return 'desktop' as const;
  };

  const mapearHistorial = (historial: any[]): typeof mockVerificaciones => {
    if (!Array.isArray(historial)) return [];

    return historial.map((item, index) => ({
      id: item.id || item.codigo || `VER-${String(index + 1).padStart(3, '0')}`,
      timestamp: item.timestamp || item.fecha || item.fechaHora || item.created_at || new Date().toISOString(),
      resultado: normalizarResultado(item.resultado || item.result || item.status || item.estado),
      dispositivo: {
        tipo: normalizarDispositivo(item.dispositivo || item.device || item.device_type),
        sistemaOperativo: item.sistemaOperativo || item.device?.os || item.so || item.dispositivo?.sistemaOperativo || 'No informado',
        navegador: item.navegador || item.device?.browser || item.browser || item.dispositivo?.navegador || 'No informado',
        version: item.device?.version || item.dispositivo?.version || item.version || '',
      },
      ubicacion: {
        ip: item.ip || item.ipAddress || item.ubicacion?.ip || item.ubicacion?.ipAddress || '0.0.0.0',
        pais: item.pais || item.country || item.ubicacion?.pais || item.ubicacion?.country || 'Desconocido',
        ciudad: item.ciudad || item.city || item.ubicacion?.ciudad || item.ubicacion?.city || 'Desconocido',
        latitud: item.latitud || item.lat || item.latitude || item.ubicacion?.latitud || item.ubicacion?.latitude,
        longitud: item.longitud || item.lng || item.longitude || item.ubicacion?.longitud || item.ubicacion?.longitude,
        proveedor: item.proveedor || item.isp || item.ubicacion?.proveedor || item.ubicacion?.isp,
      },
      detalles: item.detalles || item.mensaje || item.message,
    }));
  };

  const cargarHistorialVerificaciones = async (
    options: { force?: boolean; silent?: boolean } = {},
  ) => {
    const { force = false, silent = false } = options;
    if ((!force && historialCargado) || historialSyncInFlightRef.current) return;
    historialSyncInFlightRef.current = true;
    if (!silent) {
      setCargandoHistorial(true);
      setHistorialError(null);
    }

    if (!codigoVerificacion) {
      setHistorialError('No hay un codigo de verificacion disponible para este certificado.');
      setVerificaciones([]);
      setHistorialCargado(true);
      if (!silent) {
        setCargandoHistorial(false);
      }
      historialSyncInFlightRef.current = false;
      return;
    }

    try {
      const response = await certificadosService.validacion.historialValidaciones(codigoVerificacion);
      const historialRemoto =
        response?.validation_history ||
        response?.validationHistory ||
        response?.validations ||
        response?.validaciones ||
        response?.historial ||
        [];

      const verificacionesActualizadas = Array.isArray(historialRemoto)
        ? mapearHistorial(historialRemoto)
        : [];

      setVerificaciones(verificacionesActualizadas);
      onValidationHistoryChange?.(certificado.id, verificacionesActualizadas.length);

      setHistorialCargado(true);
      setHistorialError(null);
    } catch (error) {
      if (!silent) {
        console.error('Error cargando historial de verificaciones:', error);
      }
      if (!silent) {
        setHistorialError('No se pudo cargar el historial de verificaciones en vivo.');
        setVerificaciones([]);
      }
      setHistorialCargado(true);
    } finally {
      historialSyncInFlightRef.current = false;
      if (!silent) {
        setCargandoHistorial(false);
      }
    }
  };

  const cargarHistorialVerificacionesRef = React.useRef(cargarHistorialVerificaciones);
  React.useEffect(() => {
    cargarHistorialVerificacionesRef.current = cargarHistorialVerificaciones;
  });

  const handleToggleHistorial = async () => {
    const nextValue = !showHistorialVerificaciones;
    setShowHistorialVerificaciones(nextValue);

    if (nextValue) {
      await cargarHistorialVerificaciones();
    }
  };

  React.useEffect(() => {
    if (!isOpen || !showHistorialVerificaciones || !codigoVerificacion) return;

    const syncHistorial = () => {
      void cargarHistorialVerificacionesRef.current({ force: true, silent: true });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncHistorial();
      }
    };

    const intervalId = window.setInterval(syncHistorial, HISTORIAL_VERIFICACIONES_POLL_INTERVAL_MS);
    window.addEventListener('focus', syncHistorial);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', syncHistorial);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen, showHistorialVerificaciones, codigoVerificacion]);

  const totalVerificaciones = verificaciones.length || certificado.cantidadEscaneos || 0;
  const spinnerTransition = {
    repeat: Infinity,
    duration: 0.8,
    ease: 'linear' as const,
  };
  const sendingTextTransition = {
    repeat: Infinity,
    duration: 1.2,
    ease: 'easeInOut' as const,
  };

  React.useEffect(() => {
    return () => {
      if (emailFeedbackTimerRef.current) {
        window.clearTimeout(emailFeedbackTimerRef.current);
      }
      if (downloadFallbackTimerRef.current) {
        window.clearTimeout(downloadFallbackTimerRef.current);
      }
    };
  }, []);

  const programarLimpiezaFeedback = (delay = 6000) => {
    if (emailFeedbackTimerRef.current) {
      window.clearTimeout(emailFeedbackTimerRef.current);
    }
    emailFeedbackTimerRef.current = window.setTimeout(() => {
      setEmailFeedback({ type: null, message: '' });
    }, delay);
  };

  const handleDescargar = () => {
    if (isDownloading) return;

    // Generar mediante visor en modo oculto para asegurar variables actualizadas
    setIsDownloading(true);
    setAutoPDFAction('download');
    setShowPDFViewer(true);

    // Fallback defensivo para no dejar el boton bloqueado si algo externo falla.
    if (downloadFallbackTimerRef.current) {
      window.clearTimeout(downloadFallbackTimerRef.current);
    }
    downloadFallbackTimerRef.current = window.setTimeout(() => {
      setIsDownloading(false);
      setShowPDFViewer(false);
      setAutoPDFAction(null);
    }, 15000);
  };

  const handleAutoActionComplete = (action: 'download' | 'print', success: boolean) => {
    if (action !== 'download') return;

    if (downloadFallbackTimerRef.current) {
      window.clearTimeout(downloadFallbackTimerRef.current);
      downloadFallbackTimerRef.current = null;
    }

    setIsDownloading(false);
    setShowPDFViewer(false);
    setAutoPDFAction(null);

    if (success) {
      toast.success('Descarga completada', {
        description: 'El certificado se descargó correctamente.',
        duration: 3000,
      });
    } else {
      toast.error('No se pudo descargar el certificado', {
        description: 'Intenta nuevamente en unos segundos.',
        duration: 4000,
      });
    }
  };

  const handleEnviarEmail = async () => {
    if (isSendingEmail) return;
    if (!certificado.empleado.email || certificado.empleado.email === 'N/A') {
      toast.error('No hay un correo registrado para este empleado');
      setEmailFeedback({
        type: 'error',
        message: 'No se encontró un correo registrado para reenviar este certificado.',
      });
      programarLimpiezaFeedback(7000);
      return;
    }
    setIsSendingEmail(true);
    setEmailFeedback({ type: null, message: '' });
    toast.loading('Preparando certificado para enviar...', { id: 'send-certificate-email' });

    try {
      const response = await certificadosService.laborales.reenviar(certificado.id, {
        includeSalary: incluyeSalarioCertificado,
        includeTechnicalBonus: incluyePrimaTecnicaCertificado,
        publicBaseUrl: getPublicBaseUrl(),
      });
      toast.success('Correo reenviado', {
        id: 'send-certificate-email',
        description: `Certificado enviado a ${response?.email || certificado.empleado.email}`,
        duration: 3000,
      });
      setEmailFeedback({
        type: 'success',
        message: `Certificado reenviado correctamente a ${response?.email || certificado.empleado.email}.`,
      });
      programarLimpiezaFeedback();
    } catch (error: any) {
      toast.error('No se pudo reenviar el certificado', {
        id: 'send-certificate-email',
        description: error?.message || 'Intenta nuevamente',
        duration: 5000,
      });
      setEmailFeedback({
        type: 'error',
        message: error?.message || 'No se pudo reenviar el certificado. Intenta nuevamente.',
      });
      programarLimpiezaFeedback(7000);
    } finally {
      setIsSendingEmail(false);
      setAutoPDFAction(null);
    }
  };

  const handleVerQR = () => {
    setShowQRModal(true);
  };

  const copiarAlPortapapeles = async (texto: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
        return true;
      }
    } catch (_) {
      // fallback abajo
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = texto;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleCopiarEnlace = async () => {
    const enlace = `https://esap.edu.co/verificar/${certificado.consecutivo}`;
    const copiado = await copiarAlPortapapeles(enlace);

    if (copiado) {
      toast.success('Enlace copiado', {
        description: 'El enlace de verificación fue copiado al portapapeles'
      });
    } else {
      toast.error('No se pudo copiar el enlace');
    }
  };

  const handleCopiarConsecutivo = async () => {
    const copiado = await copiarAlPortapapeles(certificado.consecutivo);
    if (copiado) {
      toast.success('Consecutivo copiado', {
        description: 'El número de consecutivo fue copiado al portapapeles'
      });
    } else {
      toast.error('No se pudo copiar el consecutivo');
    }
  };

  const handleCopiarCodigoQR = async () => {
    if (!codigoVerificacion) {
      toast.error('No hay codigo QR disponible para copiar');
      return;
    }
    const copiado = await copiarAlPortapapeles(codigoVerificacion);
    if (copiado) {
      toast.success('Codigo QR copiado', {
        description: 'El codigo de verificacion completo fue copiado al portapapeles'
      });
    } else {
      toast.error('No se pudo copiar el codigo QR');
    }
  };

  const handleVerPDF = () => {
    setShowPDFViewer(true);
  };

  const getEstadoBadge = (estado: string) => {
    const estilos = {
      activo: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Activo' },
      inactivo: { bg: 'bg-red-100', text: 'text-red-800', icon: Clock, label: 'Inactivo' },
      revocado: { bg: 'bg-red-100', text: 'text-red-800', icon: Clock, label: 'Revocado' },
      expirado: { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock, label: 'Expirado' }
    };
    const estilo = estilos[estado as keyof typeof estilos] || estilos.activo;
    const Icon = estilo.icon;
    
    return (
      <Badge className={`${estilo.bg} ${estilo.text} border-0 px-3 py-1 flex items-center gap-1.5 w-fit`}>
        <Icon className="w-4 h-4" />
        {estilo.label}
      </Badge>
    );
  };

  const infoTileClass = 'rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2';
  const sectionCardClass = 'rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm ring-1 ring-slate-100 sm:p-5';
  const sectionHeaderClass = 'mb-4 flex items-center gap-2 border-b border-slate-200 pb-3';
  const iconBoxClass = 'flex h-8 w-8 items-center justify-center rounded-lg bg-[#003DA5]/10';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="panel-content"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          style={{ gridColumn: '1 / -1' }}
        >
          <div className="bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/30 px-4 py-5 sm:px-6">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
              
              {/* Columna Izquierda - Información del Empleado */}
              <div className="space-y-5">
                {/* Información del Empleado */}
                <div className={sectionCardClass}>
                  <div className={sectionHeaderClass}>
                    <div className={iconBoxClass}>
                      <User className="w-4 h-4 text-[#003DA5]" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Información del Empleado
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Nombre y Documento */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className={infoTileClass}>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Nombre Completo
                        </label>
                        <p className="text-sm text-gray-900 font-semibold">
                          {certificado.empleado.nombre}
                        </p>
                      </div>
                      <div className={infoTileClass}>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Documento
                        </label>
                        <p className="text-sm text-gray-900 font-semibold">
                          {certificado.empleado.documento}
                        </p>
                      </div>
                    </div>

                    {/* Cargo y Tipo Vinculación */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className={infoTileClass}>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Cargo
                        </label>
                        <p className="text-sm text-gray-900 flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                          {cargoCalculado}
                        </p>
                      </div>
                      <div className={infoTileClass}>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Tipo de Vinculación
                        </label>
                        <p className="text-sm text-gray-900">
                          {certificado.empleado.tipoVinculacion}
                        </p>
                      </div>
                    </div>

                    {/* Fecha Vinculación y Correo */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className={infoTileClass}>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Fecha de Vinculación
                        </label>
                        <p className="text-sm text-gray-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {formatearFecha(certificado.empleado.fechaVinculacion)}
                        </p>
                      </div>
                      <div className={infoTileClass}>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Correo Electrónico
                        </label>
                        <p className="text-sm text-gray-900 flex items-center gap-1.5 break-all">
                          <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          {certificado.empleado.email}
                        </p>
                      </div>
                    </div>

                    {/* Dependencia y Salario */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className={infoTileClass}>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Dependencia
                        </label>
                        <p className="text-sm text-gray-900 flex items-center gap-1.5">
                          {certificado.empleado.dependencia || ubicacionCargo || 'No disponible'}
                        </p>
                      </div>
                      <div className={infoTileClass}>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Salario
                        </label>
                        {incluyeSalarioCertificado ? (
                          <>
                            <p className="text-sm text-gray-900 font-bold flex items-center gap-1.5">
                              <DollarSign className="w-3.5 h-3.5 text-green-600" />
                              ${Number(certificado.empleado.salario || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP
                            </p>
                            {incluyePrimaTecnicaCertificado && primaTecnicaCertificado > 0 && (
                              <p className="text-xs text-emerald-700 mt-1 pl-5">
                                Prima técnica y/o coordinación: ${Number(primaTecnicaCertificado).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-amber-700 font-medium">No incluido en este certificado</p>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Columna Derecha - Detalles del Certificado */}
              <div className="space-y-4">
                {/* Detalles del Certificado */}
                <div className={sectionCardClass}>
                  <div className={sectionHeaderClass}>
                    <div className={iconBoxClass}>
                      <FileText className="w-4 h-4 text-[#003DA5]" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Detalles del Certificado
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {/* Consecutivo y Estado */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className={infoTileClass}>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Consecutivo
                        </label>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-900 font-mono font-semibold">
                            {certificado.consecutivo}
                          </p>
                          <button
                            onClick={handleCopiarConsecutivo}
                            className="text-gray-400 hover:text-[#003DA5] transition-colors"
                            title="Copiar consecutivo"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className={infoTileClass}>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Estado
                        </label>
                        {getEstadoBadge(certificado.estado)}
                      </div>
                    </div>

                    {/* Fechas */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className={infoTileClass}>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Fecha de Solicitud
                        </label>
                        <p className="text-sm text-gray-900 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {formatearFecha(certificado.fechaSolicitud, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className={infoTileClass}>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Fecha de Generación
                        </label>
                        <p className="text-sm text-gray-900 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          {formatearFecha(certificado.fechaGeneracion, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* QR y Escaneos */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className={infoTileClass}>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Código QR
                        </label>
                        <div className="flex items-start gap-2">
                          <p className="text-xs text-blue-600 font-mono flex items-start gap-1.5 break-all leading-5">
                            <QrCode className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            {codigoVerificacion || 'No disponible'}
                          </p>
                          {!!codigoVerificacion && (
                            <button
                              onClick={handleCopiarCodigoQR}
                              className="text-gray-400 hover:text-[#003DA5] transition-colors"
                              title="Copiar codigo QR completo"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className={infoTileClass}>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Escaneos
                        </label>
                        <p className="text-sm text-gray-900 font-semibold">
                          {certificado.cantidadEscaneos} validaciones
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Acciones Rápidas */}
                <div className={sectionCardClass}>
                  <div className={sectionHeaderClass}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                      <Activity className="w-4 h-4 text-slate-700" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Acciones Rápidas
                    </h3>
                  </div>

                  <div className="flex flex-col gap-3">
                    {/* Fila de acciones iguales */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <button
                        onClick={handleVerPDF}
                        className="flex min-h-[64px] transform items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-700 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:flex-col sm:gap-1.5 sm:text-xs"
                      >
                        <Eye className="w-4 h-4 shrink-0" />
                        Ver PDF
                      </button>
                      <button
                        onClick={handleDescargar}
                        disabled={isDownloading}
                        aria-busy={isDownloading}
                        className={`flex min-h-[64px] transform items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:flex-col sm:gap-1.5 sm:text-xs ${
                          isDownloading ? 'opacity-80 cursor-not-allowed' : 'hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-md active:translate-y-0 active:shadow-sm'
                        }`}
                      >
                        {isDownloading ? (
                          <motion.span
                            className="inline-flex"
                            animate={{ rotate: 360 }}
                            transition={spinnerTransition}
                          >
                            <Loader2 className="w-4 h-4" />
                          </motion.span>
                        ) : (
                          <Download className="w-4 h-4 shrink-0" />
                        )}
                        {isDownloading ? (
                          <motion.span
                            animate={{ opacity: [1, 0.55, 1] }}
                            transition={sendingTextTransition}
                          >
                            Descargando...
                          </motion.span>
                        ) : (
                          'Descargar'
                        )}
                      </button>
                      <button
                        onClick={handleEnviarEmail}
                        disabled={isSendingEmail}
                        aria-busy={isSendingEmail}
                        className={`flex min-h-[64px] transform items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-3 text-sm font-semibold text-violet-700 shadow-sm transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 sm:flex-col sm:gap-1.5 sm:text-xs ${
                          isSendingEmail ? 'opacity-80 cursor-not-allowed' : 'hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-100 hover:shadow-md active:translate-y-0 active:shadow-sm'
                        }`}
                      >
                        {isSendingEmail ? (
                          <motion.span
                            className="inline-flex"
                            animate={{ rotate: 360 }}
                            transition={spinnerTransition}
                          >
                            <Loader2 className="w-4 h-4" />
                          </motion.span>
                        ) : (
                          <Mail className="w-4 h-4 shrink-0" />
                        )}
                        {isSendingEmail ? (
                          <motion.span
                            animate={{ opacity: [1, 0.55, 1] }}
                            transition={sendingTextTransition}
                          >
                            Enviando...
                          </motion.span>
                        ) : (
                          'Reenviar'
                        )}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={handleVerQR}
                        className="flex w-full transform items-center justify-center gap-2 rounded-lg border border-blue-700 bg-[#003DA5] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-blue-800 hover:bg-[#002873] hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      >
                        <QrCode className="w-4 h-4" />
                        Ver Código QR
                      </button>
                      <button
                        onClick={handleToggleHistorial}
                        className="flex w-full transform items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-100 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                      >
                        <Activity className="w-4 h-4" />
                        {showHistorialVerificaciones ? 'Ocultar' : 'Ver'} Historial de Verificaciones
                      </button>
                    </div>
                    {(isDownloading || isSendingEmail || emailFeedback.type) && (
                      <div
                        className={`w-full rounded-lg border px-3 py-2 text-xs flex items-center gap-2 ${
                          isDownloading || isSendingEmail
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : emailFeedback.type === 'success'
                              ? 'bg-green-50 border-green-200 text-green-700'
                              : 'bg-red-50 border-red-200 text-red-700'
                        }`}
                      >
                        {isDownloading || isSendingEmail ? (
                          <motion.span
                            className="inline-flex flex-shrink-0"
                            animate={{ rotate: 360 }}
                            transition={spinnerTransition}
                          >
                            <Loader2 className="w-3.5 h-3.5" />
                          </motion.span>
                        ) : emailFeedback.type === 'success' ? (
                          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        )}
                        {isDownloading ? (
                          <motion.span
                            animate={{ opacity: [1, 0.55, 1] }}
                            transition={sendingTextTransition}
                          >
                            Generando y descargando certificado...
                          </motion.span>
                        ) : isSendingEmail ? (
                          <motion.span
                            animate={{ opacity: [1, 0.55, 1] }}
                            transition={sendingTextTransition}
                          >
                            Enviando certificado al correo registrado...
                          </motion.span>
                        ) : (
                          <span>{emailFeedback.message}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Banner Autoservicio */}
            <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50/80 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-200 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-blue-700" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">
                    📧 Certificado enviado automáticamente
                  </h4>
                  <p className="text-xs text-blue-800">
                    Este certificado fue solicitado por el interesado y enviado automáticamente a <strong>{certificado.empleado.email}</strong> el {formatearFecha(certificado.fechaSolicitud, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}.
                  </p>
                </div>
              </div>
            </div>

            {/* Historial de Verificaciones QR - Sección adicional debajo del panel */}
            {showHistorialVerificaciones && (
              <div className="mt-5 rounded-xl border border-blue-200 bg-white/95 p-4 shadow-sm ring-1 ring-blue-100">
                {cargandoHistorial && (
                  <p className="text-sm text-gray-500 mb-3">Cargando historial de verificaciones...</p>
                )}
                {historialError && (
                  <p className="mb-3 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                    {historialError}
                  </p>
                )}
                <HistorialVerificacionesQR
                  consecutivo={certificado.consecutivo}
                  verificaciones={verificaciones}
                  totalVerificaciones={totalVerificaciones}
                />
              </div>
            )}
          </div>

          {/* Visor de PDF Modal */}
          <VisorPDFCertificado
            isOpen={showPDFViewer}
            onClose={() => {
              setShowPDFViewer(false);
              if (isDownloading) {
                if (downloadFallbackTimerRef.current) {
                  window.clearTimeout(downloadFallbackTimerRef.current);
                  downloadFallbackTimerRef.current = null;
                }
                setIsDownloading(false);
                setAutoPDFAction(null);
              }
            }}
            autoAction={autoPDFAction || undefined}
            hiddenMode={!!autoPDFAction}
            onAutoActionComplete={handleAutoActionComplete}
            certificado={{
              ...certificado,
              incluyeSalario: incluyeSalarioCertificado,
              incluyePrimaTecnica: incluyePrimaTecnicaCertificado,
              technical_bonus: primaTecnicaCertificado,
              technical_bonus_category:
                certificado.technical_bonus_category ??
                certificado.technicalBonusCategory ??
                certificado.request?.technical_bonus_category ??
                certificado.request?.technicalBonusCategory ??
                null,
              technical_bonuses:
                certificado.technical_bonuses ??
                certificado.technicalBonuses ??
                certificado.request?.technical_bonuses ??
                certificado.request?.technicalBonuses ??
                certificado.templateSnapshot?.technicalBonuses ??
                (certificado as any).template_snapshot?.technicalBonuses ??
                null,
            }}
          />

          {/* Modal Código QR */}
          <ModalCodigoQR
            isOpen={showQRModal}
            onClose={() => setShowQRModal(false)}
            certificado={certificado}
            verificationUrl={verificationUrl}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

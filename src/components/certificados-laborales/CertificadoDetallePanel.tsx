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
  Printer,
  QrCode,
  Eye,
  Copy,
  Activity
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner@2.0.3';
import { Badge } from '../ui/badge';
import { VisorPDFCertificado } from './VisorPDFCertificado';
import { ModalCodigoQR } from './ModalCodigoQR';
import { HistorialVerificacionesQR } from './HistorialVerificacionesQR';
import { getPublicBaseUrl } from '../../config/environment';
import { certificadosService } from '../../services/api/certificados.service';

interface CertificadoDetallePanelProps {
  certificado: {
    id: string;
    consecutivo: string;
    qrCode: string;
    cantidadEscaneos: number;
    empleado: {
      nombre: string;
      documento: string;
      email: string;
      cargo: string;
      dependencia: string;
      dependenciaPadre: string;
      tipoVinculacion: string;
      fechaVinculacion: string;
      grado: string;
      salario: number;
    };
    estado: 'activo' | 'revocado' | 'expirado';
    tipoSolicitud?: 'AUTOSERVICIO' | 'MANUAL';
    fechaSolicitud: string;
    fechaGeneracion: string;
    position_location?: string;
    campus?: string;
    solicitante?: {
      nombre: string;
      tipo: 'autoservicio' | 'manual';
    };
    pdfUrl?: string;
  };
  isOpen: boolean;
}

export function CertificadoDetallePanel({ certificado, isOpen }: CertificadoDetallePanelProps) {
  const [showPDFViewer, setShowPDFViewer] = React.useState(false);
  const [autoPDFAction, setAutoPDFAction] = React.useState<'download' | 'print' | 'email' | null>(null);
  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const [showQRModal, setShowQRModal] = React.useState(false);
  const [showHistorialVerificaciones, setShowHistorialVerificaciones] = React.useState(false);
  const verificationBase = getPublicBaseUrl();
  const verificationPath = '/verificar-certificado';
  const verificationUrl = `${verificationBase}${verificationPath}/${certificado.qrCode}`;
  const normalizarDependencia = (value?: string | null) => {
    const cleaned = (value || '').replace(/\u00a0/g, ' ').trim();
    if (!cleaned) return '';
    const lower = cleaned.toLowerCase();
    if (lower === 'registro padre' || lower === 'registro hijo') return '';
    return cleaned;
  };
  const ubicacionCargo = normalizarDependencia(certificado.position_location) || '';

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
        version: item.device?.version || item.version || '',
      },
      ubicacion: {
        ip: item.ip || item.ipAddress || item.ubicacion?.ip || '0.0.0.0',
        pais: item.pais || item.country || item.ubicacion?.pais || 'Desconocido',
        ciudad: item.ciudad || item.city || item.ubicacion?.ciudad || 'Desconocido',
        latitud: item.latitud || item.lat || item.ubicacion?.latitud,
        longitud: item.longitud || item.lng || item.ubicacion?.longitud,
        proveedor: item.proveedor || item.isp || item.ubicacion?.proveedor,
      },
      detalles: item.detalles || item.mensaje || item.message,
    }));
  };

  const cargarHistorialVerificaciones = async () => {
    if (historialCargado || cargandoHistorial) return;
    setCargandoHistorial(true);
    setHistorialError(null);

    try {
      const response = await certificadosService.validacion.historialValidaciones(certificado.qrCode);
      const historialRemoto =
        response?.validation_history ||
        response?.validationHistory ||
        response?.validations ||
        response?.validaciones ||
        response?.historial ||
        [];

      if (Array.isArray(historialRemoto) && historialRemoto.length > 0) {
        setVerificaciones(mapearHistorial(historialRemoto));
      } else {
        setVerificaciones([]);
      }

      setHistorialCargado(true);
    } catch (error) {
      console.error('Error cargando historial de verificaciones:', error);
      setHistorialError('No se pudo cargar el historial de verificaciones en vivo.');
      setVerificaciones([]);
      setHistorialCargado(true);
    } finally {
      setCargandoHistorial(false);
    }
  };

  const handleToggleHistorial = async () => {
    const nextValue = !showHistorialVerificaciones;
    setShowHistorialVerificaciones(nextValue);

    if (nextValue) {
      await cargarHistorialVerificaciones();
    }
  };

  const totalVerificaciones = verificaciones.length || certificado.cantidadEscaneos || 0;

  const handleDescargar = () => {
    if (certificado.pdfUrl) {
      const link = document.createElement('a');
      link.href = certificado.pdfUrl;
      link.download = `${certificado.consecutivo}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Descarga iniciada', {
        description: `${certificado.consecutivo}.pdf`
      });
      return;
    }

    // Generar mediante visor en modo oculto
    setAutoPDFAction('download');
    setShowPDFViewer(true);
    setTimeout(() => {
      setShowPDFViewer(false);
      setAutoPDFAction(null);
    }, 800);
  };

  const handleEnviarEmail = async () => {
    if (isSendingEmail) return;
    if (!certificado.empleado.email || certificado.empleado.email === 'N/A') {
      toast.error('No hay un correo registrado para este empleado');
      return;
    }
    setIsSendingEmail(true);
    toast.loading('Preparando certificado para enviar...', { id: 'send-certificate-email' });

    try {
      const response = await certificadosService.laborales.reenviar(certificado.id);
      toast.success('Correo reenviado', {
        id: 'send-certificate-email',
        description: `Certificado enviado a ${response?.email || certificado.empleado.email}`,
        duration: 3000,
      });
    } catch (error: any) {
      toast.error('No se pudo reenviar el certificado', {
        id: 'send-certificate-email',
        description: error?.message || 'Intenta nuevamente',
        duration: 5000,
      });
    } finally {
      setIsSendingEmail(false);
      setAutoPDFAction(null);
    }
  };

  const handleImprimir = () => {
    if (certificado.pdfUrl) {
      const printWindow = window.open(certificado.pdfUrl, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.focus();
          printWindow.print();
        });
      }
      toast.info('Enviando a impresion...');
      return;
    }

    setAutoPDFAction('print');
    setShowPDFViewer(true);
    setTimeout(() => {
      setShowPDFViewer(false);
      setAutoPDFAction(null);
    }, 1000);
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
        description: 'El numero de consecutivo fue copiado al portapapeles'
      });
    } else {
      toast.error('No se pudo copiar el consecutivo');
    }
  };

  const handleVerPDF = () => {
    setShowPDFViewer(true);
  };

  const getEstadoBadge = (estado: string) => {
    const estilos = {
      activo: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Activo' },
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          style={{ gridColumn: '1 / -1' }}
        >
          <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border-l-4 border-[#003DA5] px-6 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Columna Izquierda - Información del Empleado */}
              <div className="space-y-5">
                {/* Información del Empleado */}
                <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                    <div className="w-8 h-8 rounded-lg bg-[#003DA5]/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-[#003DA5]" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Información del Empleado
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Nombre y Documento */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Nombre Completo
                        </label>
                        <p className="text-sm text-gray-900 font-semibold">
                          {certificado.empleado.nombre}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Documento
                        </label>
                        <p className="text-sm text-gray-900 font-semibold">
                          {certificado.empleado.documento}
                        </p>
                      </div>
                    </div>

                    {/* Cargo y Tipo Vinculación */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Cargo
                        </label>
                        <p className="text-sm text-gray-900 flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                          {certificado.empleado.cargo}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Tipo de Vinculación
                        </label>
                        <p className="text-sm text-gray-900">
                          {certificado.empleado.tipoVinculacion}
                        </p>
                      </div>
                    </div>

                    {/* Fecha Vinculación y Ubicación */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Fecha de Vinculación
                        </label>
                        <p className="text-sm text-gray-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {formatearFecha(certificado.empleado.fechaVinculacion)}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Ubicación
                        </label>
                        <p className="text-sm text-gray-900">
                          {ubicacionCargo}
                        </p>
                      </div>
                    </div>

                    {/* Correo y Salario */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Correo Electrónico
                        </label>
                        <p className="text-sm text-gray-900 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          {certificado.empleado.email}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Salario
                        </label>
                        <p className="text-sm text-gray-900 font-bold flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-green-600" />
                          ${certificado.empleado.salario.toLocaleString('es-CO')} COP
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha - Detalles del Certificado y Acciones */}
              <div className="space-y-5">
                {/* Detalles del Certificado */}
                <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                    <div className="w-8 h-8 rounded-lg bg-[#003DA5]/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-[#003DA5]" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Detalles del Certificado
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {/* Consecutivo y Estado */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
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
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Estado
                        </label>
                        {getEstadoBadge(certificado.estado)}
                      </div>
                    </div>

                    {/* Fechas */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Fecha de Solicitud
                        </label>
                        <p className="text-sm text-gray-900 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {formatearFecha(certificado.fechaSolicitud, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div>
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Código QR
                        </label>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <QRCodeCanvas
                              value={verificationUrl}
                              size={72}
                              level="H"
                              includeMargin
                              className="block"
                            />
                          </div>
                          <div className="flex flex-col">
                            <p className="text-sm text-blue-600 font-mono flex items-center gap-1.5">
                              <QrCode className="w-3.5 h-3.5" />
                              {certificado.qrCode}
                            </p>
                            <span className="text-xs text-gray-500">Escanea para verificar este certificado</span>
                          </div>
                        </div>
                      </div>
                      <div>
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
                <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Acciones Rápidas
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleVerPDF}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      Ver PDF
                    </button>
                    <button
                      onClick={handleDescargar}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Descargar
                    </button>
                    <button
                      onClick={handleEnviarEmail}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
                    >
                      <Mail className="w-4 h-4" />
                      Reenviar
                    </button>
                    <button
                      onClick={handleImprimir}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimir
                    </button>
                    <button
                      onClick={handleVerQR}
                      className="col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#003DA5] text-white rounded-lg hover:bg-[#002873] transition-colors text-sm font-medium"
                    >
                      <QrCode className="w-4 h-4" />
                      Ver Código QR
                    </button>
                    <button
                      onClick={handleToggleHistorial}
                      className="col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium"
                    >
                      <Activity className="w-4 h-4" />
                      {showHistorialVerificaciones ? 'Ocultar' : 'Ver'} Historial de Verificaciones
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner Autoservicio */}
            <div className="mt-5 bg-blue-100 border-l-4 border-blue-600 rounded-r-lg p-4">
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
              <div className="mt-5 border-t border-gray-200 pt-5">
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
            onClose={() => setShowPDFViewer(false)}
            autoAction={autoPDFAction || undefined}
            hiddenMode={!!autoPDFAction}
            certificado={certificado}
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

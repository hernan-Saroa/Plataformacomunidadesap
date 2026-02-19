import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  Briefcase,
  DollarSign,
  FileText,
  Clock,
  Download,
  CheckCircle,
  AlertCircle,
  Eye,
  Calendar,
  Hash,
  Mail,
  Printer,
  Share2,
  Building2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { copyToClipboard } from '../../utils/clipboard';
import { formatCargoDisplay } from '../../utils/cargoFormatter';

interface CertificadoDetalleModalProps {
  certificado: any;
  isOpen: boolean;
  onClose: () => void;
}

export function CertificadoDetalleModal({ certificado, isOpen, onClose }: CertificadoDetalleModalProps) {
  if (!isOpen) return null;

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

  const cargoCalculado = formatCargoDisplay({
    cargoSource:
      certificado?.career_category ||
      certificado?.careerCategory ||
      certificado?.empleado?.cargo ||
      certificado?.position_category ||
      certificado?.positionCategory,
    codCargo:
      certificado?.cod_cargo ||
      certificado?.codCargo ||
      certificado?.empleado?.cod_cargo ||
      certificado?.empleado?.codCargo,
    codGrade:
      certificado?.cod_grade ||
      certificado?.codGrade ||
      certificado?.empleado?.cod_grade ||
      certificado?.empleado?.codGrade,
    observations:
      certificado?.request?.observations ||
      certificado?.observations,
    templateType: certificado?.templateType || certificado?.template_type,
    includeCodeLabel: true,
    codeLabel: 'Codigo',
  });
  const cargoMostrar =
    certificado?.empleado?.cargo_calculado ||
    cargoCalculado ||
    certificado?.empleado?.cargo ||
    'No disponible';

  const getEstadoBadge = (estado: string) => {
    const estilos = {
      GENERADO: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Generado' },
      PENDIENTE: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Pendiente' },
      ERROR: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle, label: 'Error' }
    };
    const estilo = estilos[estado as keyof typeof estilos] || estilos.PENDIENTE;
    const Icon = estilo.icon;
    
    return (
      <Badge className={`${estilo.bg} ${estilo.text} border-0 px-3 py-1.5 flex items-center gap-1.5 w-fit`}>
        <Icon className="w-4 h-4" />
        {estilo.label}
      </Badge>
    );
  };

  const handleDescargar = () => {
    toast.success('Descargando certificado', {
      description: `${certificado.consecutivo}.pdf`,
      duration: 3000
    });
  };

  const handleVerPDF = () => {
    toast.info('Abriendo visor de PDF', {
      description: 'El certificado se abrirá en una nueva pestaña',
      duration: 2000
    });
  };

  const handleReenviar = () => {
    toast.success('Certificado reenviado', {
      description: `Enviado a ${certificado.empleado.nombre}`,
      duration: 3000
    });
  };

  const handleImprimir = () => {
    toast.info('Preparando impresión', {
      description: 'El certificado se abrirá en vista de impresión',
      duration: 2000
    });
  };

  const handleCompartir = async () => {
    const enlace = `https://esap.edu.co/certificados/${certificado.consecutivo}`;
    const copiado = await copyToClipboard(enlace);
    
    if (copiado) {
      toast.success('Enlace copiado', {
        description: 'El enlace del certificado se copió al portapapeles',
        duration: 3000
      });
    } else {
      toast.info('Enlace del certificado', {
        description: enlace,
        duration: 5000
      });
    }
  };

  const handleCopiarID = async () => {
    const copiado = await copyToClipboard(certificado.consecutivo);
    
    if (copiado) {
      toast.success('ID copiado', {
        description: 'El consecutivo se copió al portapapeles',
        duration: 2000
      });
    } else {
      toast.info('ID del certificado', {
        description: certificado.consecutivo,
        duration: 5000
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            className="fixed inset-0 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal - Mobile optimized */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 right-0 flex w-full sm:max-w-full sm:pl-10 md:pl-16"
          >
            <div className="w-full sm:max-w-2xl">
              <div className="flex h-full flex-col bg-white shadow-2xl">
                {/* Header - Sticky and Mobile Optimized */}
                <div className="bg-[#003DA5] px-3 sm:px-6 py-3 sm:py-5 sticky top-0 z-10 shadow-lg">
                  <div className="flex items-start justify-between gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 sm:mb-2 flex-wrap">
                        <h2 className="text-white text-sm sm:text-xl font-medium truncate">
                          Certificado {certificado.consecutivo}
                        </h2>
                        {getEstadoBadge(certificado.estado)}
                      </div>
                      <p className="text-blue-100 text-xs sm:text-sm truncate">
                        {certificado.empleado.nombre}
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="flex-shrink-0 text-white/80 hover:text-white hover:bg-white/10 transition-all p-2 rounded-lg"
                      aria-label="Cerrar"
                    >
                      <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                  {/* Botones de Acción */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={handleVerPDF}
                      className="w-full justify-start"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDescargar}
                      className="w-full justify-start"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleReenviar}
                      className="w-full justify-start"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Reenviar por Email
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleImprimir}
                      className="w-full justify-start"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Imprimir
                    </Button>
                  </div>

                  {/* Información del Empleado */}
                  <Card className="p-6 border-2">
                    <h3 
                      className="flex items-center gap-2 mb-5"
                      style={{
                        fontSize: '18px',
                        lineHeight: '24px',
                        fontWeight: 600,
                        color: '#1F2937'
                      }}
                    >
                      <User className="w-5 h-5 text-[#003DA5]" />
                      Información del Empleado
                    </h3>
                    <div className="space-y-4">
                      {/* Fila 1 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Nombre Completo
                          </label>
                          <p className="text-gray-900 mt-1.5 font-semibold">
                            {certificado.empleado.nombre}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Documento
                          </label>
                          <p className="text-gray-900 mt-1.5 font-semibold">
                            {certificado.empleado.documento}
                          </p>
                        </div>
                      </div>

                      {/* Fila 2 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Cargo
                          </label>
                          <p className="text-gray-900 mt-1.5 flex items-center gap-1.5">
                            <Briefcase className="w-4 h-4 text-gray-400" />
                            {cargoMostrar}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Tipo de Vinculación
                          </label>
                          <p className="text-gray-900 mt-1.5">
                            {certificado.empleado.tipoVinculacion}
                          </p>
                        </div>
                      </div>

                      {/* Fila 3 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Fecha de Vinculación
                          </label>
                          <p className="text-gray-900 mt-1.5 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {new Date(certificado.empleado.fechaVinculacion).toLocaleDateString('es-CO', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Grado
                          </label>
                          <p className="text-gray-900 mt-1.5">
                            {certificado.empleado.grado}
                          </p>
                        </div>
                      </div>

                      {/* Fila 4 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Dependencia
                          </label>
                          <p className="text-gray-900 mt-1.5 flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            {certificado.empleado.dependencia}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Salario
                          </label>
                          <p className="text-gray-900 mt-1.5 font-bold flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            ${formatearMonto(certificado.empleado.salario)} COP
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Información del Certificado */}
                  <Card className="p-6 border-2">
                    <h3 
                      className="flex items-center gap-2 mb-5"
                      style={{
                        fontSize: '18px',
                        lineHeight: '24px',
                        fontWeight: 600,
                        color: '#1F2937'
                      }}
                    >
                      <FileText className="w-5 h-5 text-[#003DA5]" />
                      Detalles del Certificado
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Consecutivo
                          </label>
                          <div className="flex items-center gap-2 mt-1.5">
                            <p className="text-gray-900 font-mono">
                              {certificado.consecutivo}
                            </p>
                            <button
                              onClick={handleCopiarID}
                              className="text-gray-400 hover:text-[#003DA5] transition-colors"
                              title="Copiar ID"
                            >
                              <Hash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Tipo de Solicitud
                          </label>
                          <p className="text-gray-900 mt-1.5">
                            {certificado.tipoSolicitud === 'AUTOSERVICIO' ? 'Autoservicio' :
                             certificado.tipoSolicitud === 'MANUAL' ? 'Manual (Backoffice)' : 
                             'Carga Masiva'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Fecha de Solicitud
                          </label>
                          <p className="text-gray-900 mt-1.5 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {new Date(certificado.fechaSolicitud).toLocaleDateString('es-CO', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        {certificado.fechaGeneracion && (
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Fecha de Generación
                            </label>
                            <p className="text-gray-900 mt-1.5 flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              {new Date(certificado.fechaGeneracion).toLocaleDateString('es-CO', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Solicitante
                        </label>
                        <p className="text-gray-900 mt-1.5">
                          {typeof certificado.solicitante === 'string' 
                            ? certificado.solicitante 
                            : certificado.solicitante?.nombre || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Mensaje de Error (si existe) */}
                  {certificado.estado === 'ERROR' && certificado.errorMessage && (
                    <Card className="p-4 border-red-200 bg-red-50">
                      <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-red-900 font-semibold mb-1">
                            Error en la Generación
                          </h4>
                          <p className="text-red-700 text-sm">
                            {certificado.errorMessage}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Enlace de Compartir */}
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-[#003DA5]" />
                        <span className="text-sm text-gray-700">
                          Compartir enlace del certificado
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCompartir}
                      >
                        Copiar enlace
                      </Button>
                    </div>
                  </Card>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 sticky bottom-0 z-10 shadow-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1 order-2 sm:order-1">
                      Cerrar
                    </Button>
                    {certificado.pdfUrl && certificado.estado === 'GENERADO' && (
                      <Button 
                        onClick={handleDescargar}
                        className="flex-1 bg-[#003DA5] hover:bg-[#002873] order-1 sm:order-2"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Descargar Certificado</span>
                        <span className="sm:hidden">Descargar</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

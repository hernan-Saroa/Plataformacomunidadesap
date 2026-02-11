import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Download,
  Printer,
  QrCode,
  CheckCircle,
  Shield,
  Calendar,
  FileText,
  Building2,
  User,
  Briefcase,
  Hash
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from '../ui/button';

interface VisorPDFCertificadoProps {
  isOpen: boolean;
  onClose: () => void;
  certificado: {
    consecutivo: string;
    empleado: {
      nombre: string;
      documento: string;
      email: string;
      cargo: string;
      dependencia: string;
      tipoVinculacion: string;
      fechaVinculacion: string;
      grado: string;
    };
    fechaSolicitud: string;
    estado: string;
  };
}

export function VisorPDFCertificado({ isOpen, onClose, certificado }: VisorPDFCertificadoProps) {
  const certificadoRef = useRef<HTMLDivElement>(null);

  const handleDescargar = () => {
    toast.success('Descargando certificado...', {
      description: `${certificado.consecutivo}.pdf`,
      duration: 3000
    });
    // Aquí iría la lógica real de descarga
  };

  const handleImprimir = () => {
    if (certificadoRef.current) {
      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Certificado Laboral - ${certificado.consecutivo}</title>
              <style>
                body {
                  font-family: 'Times New Roman', serif;
                  padding: 40px;
                  background: white;
                }
                @media print {
                  @page { margin: 0.5in; }
                }
              </style>
            </head>
            <body>
              ${certificadoRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
    toast.info('Abriendo vista de impresión...');
  };

  const calcularTiempoVinculacion = () => {
    const fechaInicio = new Date(certificado.empleado.fechaVinculacion);
    const fechaActual = new Date();
    const diffTime = Math.abs(fechaActual.getTime() - fechaInicio.getTime());
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
    const diffMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
    
    if (diffYears > 0) {
      return `${diffYears} año${diffYears > 1 ? 's' : ''} y ${diffMonths} mes${diffMonths !== 1 ? 'es' : ''}`;
    }
    return `${diffMonths} mes${diffMonths !== 1 ? 'es' : ''}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] overflow-hidden">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 pt-16 sm:pt-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] sm:max-h-[92vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#003DA5] to-[#0052cc] px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white text-xl font-semibold">Vista Previa - Certificado Laboral</h2>
                    <p className="text-blue-100 text-sm">N° {certificado.consecutivo}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="border-b border-gray-200 px-4 sm:px-6 py-3 bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Opciones:</span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <Button
                  onClick={handleDescargar}
                  className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
                <Button
                  onClick={handleImprimir}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
              </div>
            </div>

            {/* PDF Preview */}
            <div className="overflow-y-auto flex-1 bg-gray-100 p-4 sm:p-6 md:p-8">
              <div
                ref={certificadoRef}
                className="bg-white shadow-2xl max-w-[800px] mx-auto p-6 sm:p-8 md:p-12 relative overflow-hidden"
                style={{ minHeight: '1100px' }}
              >
                {/* Marca de Agua */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                  <div className="text-9xl font-bold text-gray-400 rotate-[-45deg] select-none">
                    ESAP
                  </div>
                </div>

                {/* Header Institucional */}
                <div className="border-b-4 border-[#003DA5] pb-6 mb-8">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold text-[#003DA5] mb-2">
                        ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA
                      </h1>
                      <p className="text-sm text-gray-600 mb-1">ESAP</p>
                      <p className="text-sm text-gray-600">NIT: 899.999.090-1</p>
                      <p className="text-sm text-gray-600">Calle 44 No. 53-37 • Bogotá D.C., Colombia</p>
                      <p className="text-sm text-gray-600">www.esap.edu.co</p>
                    </div>
                    <div className="text-right">
                      <div className="bg-[#003DA5] text-white px-4 py-2 rounded-lg inline-block">
                        <p className="text-xs mb-1">Consecutivo</p>
                        <p className="text-lg font-bold font-mono">{certificado.consecutivo}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Título del Documento */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    CERTIFICACIÓN LABORAL
                  </h2>
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-semibold">DOCUMENTO VÁLIDO Y VERIFICABLE</span>
                  </div>
                </div>

                {/* Contenido Principal */}
                <div className="space-y-6 text-gray-800" style={{ fontFamily: 'Times New Roman, serif', fontSize: '14px', lineHeight: '1.8' }}>
                  <p className="text-justify">
                    La Dirección de Talento Humano de la <strong>Escuela Superior de Administración Pública - ESAP</strong>, certifica que:
                  </p>

                  {/* Datos del Empleado */}
                  <div className="bg-blue-50 border-l-4 border-[#003DA5] p-6 my-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 uppercase mb-1">Nombre Completo</p>
                        <p className="font-bold text-lg text-gray-900">{certificado.empleado.nombre}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase mb-1">Documento de Identidad</p>
                        <p className="font-bold text-lg text-gray-900">C.C. {certificado.empleado.documento}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase mb-1">Cargo</p>
                        <p className="font-semibold text-gray-900">{certificado.empleado.cargo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase mb-1">Tipo de Vinculación</p>
                        <p className="font-semibold text-gray-900">{certificado.empleado.tipoVinculacion}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase mb-1">Dependencia</p>
                        <p className="font-semibold text-gray-900">{certificado.empleado.dependencia}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase mb-1">Grado</p>
                        <p className="font-semibold text-gray-900">{certificado.empleado.grado}</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-justify">
                    Labora con nosotros desde el <strong>
                      {new Date(certificado.empleado.fechaVinculacion).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </strong>, completando a la fecha <strong>{calcularTiempoVinculacion()}</strong> de servicio ininterrumpido.
                  </p>

                  <p className="text-justify">
                    Durante su vinculación, {certificado.empleado.nombre.split(' ')[0]} ha desempeñado sus funciones con 
                    responsabilidad, compromiso y profesionalismo, contribuyendo significativamente al cumplimiento 
                    de la misión institucional de la ESAP.
                  </p>

                  <p className="text-justify">
                    La presente certificación se expide a solicitud del interesado el día{' '}
                    <strong>
                      {new Date(certificado.fechaSolicitud).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </strong>, para los fines que el interesado estime conveniente.
                  </p>

                  {/* Validez */}
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-6">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm mb-1">Validez del Documento</p>
                        <p className="text-sm text-gray-700">
                          Este certificado tiene una validez de <strong>3 meses</strong> a partir de su fecha de expedición. 
                          Pasado este tiempo, deberá solicitarse uno nuevo.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Firma Digital */}
                <div className="mt-12 pt-8 border-t-2 border-gray-300">
                  <div className="text-center">
                    <div className="inline-block">
                      <div className="mb-4">
                        <div className="h-16 flex items-center justify-center">
                          <img 
                            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'%3E%3Ctext x='10' y='35' font-family='Brush Script MT, cursive' font-size='28' fill='%23003DA5'%3EFirma Digital%3C/text%3E%3C/svg%3E"
                            alt="Firma"
                            className="h-16"
                          />
                        </div>
                      </div>
                      <div className="border-t-2 border-gray-800 pt-2 px-8">
                        <p className="font-bold text-gray-900">DIRECTOR DE TALENTO HUMANO</p>
                        <p className="text-sm text-gray-600">Escuela Superior de Administración Pública - ESAP</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pie de Página con QR */}
                <div className="mt-12 pt-6 border-t border-gray-300">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-2 mb-3">
                        <Shield className="w-4 h-4 text-[#003DA5] flex-shrink-0 mt-1" />
                        <div>
                          <p className="text-xs font-semibold text-gray-900 mb-1">Verificación de Autenticidad</p>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            Este certificado puede ser verificado escaneando el código QR o ingresando 
                            el consecutivo en: <span className="text-[#003DA5] font-semibold">www.esap.edu.co/verificar-certificado</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p><strong>Documento electrónico:</strong> Generado automáticamente</p>
                        <p><strong>Fecha de expedición:</strong> {new Date(certificado.fechaSolicitud).toLocaleString('es-CO')}</p>
                        <p><strong>Código de verificación:</strong> <span className="font-mono">{certificado.consecutivo}</span></p>
                      </div>
                    </div>
                    <div className="ml-6 text-center">
                      <div className="bg-white border-2 border-gray-300 p-3 rounded-lg">
                        <QrCode className="w-24 h-24 text-gray-400 mx-auto" />
                        <p className="text-xs text-gray-600 mt-2 font-mono">{certificado.consecutivo}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Legal */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    Este documento es válido sin necesidad de firma autógrafa según el Decreto 2150 de 1995 y la Ley 527 de 1999
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Info */}
            <div className="border-t border-gray-200 px-4 sm:px-6 py-3 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs sm:text-sm">Documento verificable</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="text-xs sm:text-sm">Firma electrónica válida</span>
                  </div>
                </div>
                <div className="text-gray-500 text-xs sm:text-sm">
                  Generado: {new Date().toLocaleString('es-CO')}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  QrCode,
  Download,
  Copy,
  Printer,
  Share2,
  CheckCircle,
  ExternalLink,
  Shield,
  Smartphone,
  Globe,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '../../utils/clipboard';
import { getPublicBaseUrl } from '../../config/environment';
import { QRCodeCanvas } from 'qrcode.react';

interface ModalCodigoQRProps {
  isOpen: boolean;
  onClose: () => void;
  certificado: {
    consecutivo: string;
    qrCode?: string;
    verification_code?: string;
    empleado: {
      nombre: string;
      documento: string;
    };
    fechaGeneracion: string;
  };
  verificationUrl?: string;
}

export function ModalCodigoQR({ isOpen, onClose, certificado, verificationUrl }: ModalCodigoQRProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  
  const qrData = certificado.qrCode || certificado.verification_code || certificado.consecutivo;
  const verificationBase = getPublicBaseUrl();
  const verificationPath = '/verificar-certificado';
  const urlVerificacion =
    verificationUrl || `${verificationBase}${verificationPath}/${encodeURIComponent(qrData)}`;

  const getQrCanvas = (): HTMLCanvasElement | null => {
    if (!qrRef.current) return null;
    return qrRef.current.querySelector('canvas');
  };

  const getQrDataUrl = (): string | null => {
    const canvas = getQrCanvas();
    if (!canvas) return null;
    try {
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  };

  const getSafeFileName = () => {
    const base = String(certificado.consecutivo || qrData || 'QR_CERTIFICADO')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w.-]/g, '');
    return `QR-${base || 'CERTIFICADO'}.png`;
  };

  const handleDescargarQR = () => {
    const dataUrl = getQrDataUrl();
    if (!dataUrl) {
      toast.error('No se pudo descargar el QR', {
        description: 'Intenta nuevamente en unos segundos.',
        duration: 3500
      });
      return;
    }

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = getSafeFileName();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('QR descargado exitosamente', {
      description: link.download,
      duration: 3000
    });
  };

  const handleCopiarEnlace = async () => {
    const copiado = await copyToClipboard(urlVerificacion);
    
    if (copiado) {
      toast.success('Enlace copiado', {
        description: 'El enlace de verificación fue copiado al portapapeles',
        duration: 3000
      });
    } else {
      toast.info('Enlace de verificación', {
        description: urlVerificacion,
        duration: 5000
      });
    }
  };

  const handleCompartir = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Verificar Certificado Laboral ESAP',
          text: `Verificar certificado ${certificado.consecutivo}`,
          url: urlVerificacion
        });
        toast.success('Compartido exitosamente');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          handleCopiarEnlace();
        }
      }
    } else {
      handleCopiarEnlace();
      toast.info('Enlace copiado al portapapeles');
    }
  };

  const handleImprimir = () => {
    const dataUrl = getQrDataUrl();
    if (!dataUrl) {
      toast.error('No se pudo imprimir el QR', {
        description: 'El código QR aún no está listo. Intenta nuevamente.',
        duration: 3500
      });
      return;
    }

    const printWindow = window.open('', '', 'width=700,height=900');
    if (!printWindow) {
      toast.error('No se pudo abrir la ventana de impresión');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Código QR - ${certificado.consecutivo}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 40px;
              background: white;
            }
            .container {
              text-align: center;
              border: 2px solid #003DA5;
              padding: 40px;
              border-radius: 12px;
              max-width: 680px;
            }
            h1 {
              color: #003DA5;
              margin-bottom: 10px;
              font-size: 32px;
            }
            .qr-box {
              width: 300px;
              height: 300px;
              margin: 30px auto;
              border: 3px solid #003DA5;
              display: flex;
              align-items: center;
              justify-content: center;
              background: white;
              border-radius: 8px;
            }
            .qr-image {
              width: 260px;
              height: 260px;
              object-fit: contain;
              image-rendering: pixelated;
            }
            .info {
              margin-top: 20px;
              color: #333;
              font-size: 18px;
            }
            .url {
              color: #003DA5;
              font-weight: bold;
              font-size: 14px;
              margin-top: 15px;
              word-break: break-all;
            }
            @media print {
              @page { margin: 0.5in; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA</h1>
            <p style="color: #666; margin-bottom: 10px; font-size: 22px;">Código QR de Verificación</p>
            <div class="qr-box">
              <img class="qr-image" src="${dataUrl}" alt="Código QR de verificación" />
            </div>
            <div class="info">
              <p><strong>Consecutivo:</strong> ${certificado.consecutivo}</p>
              <p><strong>Empleado:</strong> ${certificado.empleado.nombre}</p>
              <p><strong>Documento:</strong> ${certificado.empleado.documento}</p>
              <p><strong>Fecha de emisión:</strong> ${new Date(certificado.fechaGeneracion).toLocaleDateString('es-CO')}</p>
              <div class="url">
                <p>Verificar en:</p>
                <p>${urlVerificacion}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();

    const finalizePrint = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };

    const qrImage = printWindow.document.querySelector('.qr-image') as HTMLImageElement | null;
    if (qrImage && !qrImage.complete) {
      qrImage.onload = () => setTimeout(finalizePrint, 120);
      qrImage.onerror = () => setTimeout(finalizePrint, 220);
    } else {
      setTimeout(finalizePrint, 180);
    }

    toast.info('Abriendo vista de impresión...');
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal - Mobile Optimized */}
        <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl my-0 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
          >
            {/* Header - Sticky */}
            <div className="bg-gradient-to-r from-[#003DA5] to-[#0052cc] px-4 sm:px-6 py-4 sm:py-5 sticky top-0 z-10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="bg-white/20 p-2 sm:p-2.5 rounded-xl flex-shrink-0">
                    <QrCode className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-white text-base sm:text-xl font-bold truncate">Código QR de Verificación</h2>
                    <p className="text-blue-100 text-xs sm:text-sm truncate">Certificado Laboral ESAP</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg flex-shrink-0"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-8">
              {/* QR Code Container - Mobile Responsive */}
              <div ref={qrRef} className="flex justify-center mb-4 sm:mb-6">
                <div className="relative">
                  {/* QR Code con borde decorativo */}
                  <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-[#003DA5] shadow-xl">
                    <div className="bg-gradient-to-br from-gray-50 to-white p-3 sm:p-4 rounded-lg sm:rounded-xl">
                      <div className="w-52 h-52 sm:w-72 sm:h-72 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden">
                        <QRCodeCanvas
                          key={`${certificado.consecutivo}-${qrData}`}
                          value={urlVerificacion}
                          size={253}
                          level="H"
                          includeMargin
                          className="w-full h-full p-2"
                        />
                        <div className="absolute inset-0 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Badge de estado */}
                  <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-green-500 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold shadow-lg flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    VÁLIDO
                  </div>
                </div>
              </div>

              {/* Información del certificado - Mobile Grid */}
              <div className="bg-blue-50 border-l-4 border-[#003DA5] rounded-r-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1 text-xs sm:text-sm">Consecutivo</p>
                    <p className="font-mono font-bold text-gray-900 text-sm">{certificado.consecutivo}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1 text-xs sm:text-sm">Empleado</p>
                    <p className="font-semibold text-gray-900 text-sm truncate">{certificado.empleado.nombre}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1 text-xs sm:text-sm">Documento</p>
                    <p className="font-semibold text-gray-900 text-sm">C.C. {certificado.empleado.documento}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1 text-xs sm:text-sm">Fecha de emisión</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {new Date(certificado.fechaGeneracion).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* URL de verificación - Mobile Optimized */}
              <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Globe className="w-5 h-5 text-[#003DA5] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">URL de Verificación Pública</p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <code className="flex-1 text-[10px] sm:text-xs bg-white px-2 sm:px-3 py-2 rounded-lg border border-gray-200 text-[#003DA5] font-mono truncate">
                        {urlVerificacion}
                      </code>
                      <div className="flex gap-2">
                        {/* <button
                          onClick={handleCopiarEnlace}
                          className="flex-1 sm:flex-initial p-2 hover:bg-gray-200 rounded-lg transition-colors min-h-[44px] flex items-center justify-center gap-2"
                          title="Copiar enlace"
                        >
                          <Copy className="w-4 h-4 text-gray-600" />
                          <span className="text-xs sm:hidden">Copiar</span>
                        </button> */}
                        <a
                          href={urlVerificacion}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-initial p-2 hover:bg-gray-200 rounded-lg transition-colors min-h-[44px] flex items-center justify-center gap-2"
                          title="Abrir en nueva pestaña"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-600" />
                          <span className="text-xs sm:hidden">Abrir</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <button
                  onClick={handleDescargarQR}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-[#003DA5] hover:bg-[#002873] text-white rounded-lg transition-colors font-semibold shadow-sm hover:shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Descargar QR</span>
                  <span className="sm:hidden">Descargar</span>
                </button>
                <button
                  onClick={handleImprimir}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-white rounded-lg transition-colors font-semibold shadow-sm hover:shadow-md border border-gray-800"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
                <button
                  onClick={handleCopiarEnlace}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold shadow-sm hover:shadow-md"
                >
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copiar Enlace</span>
                  <span className="sm:hidden">Copiar</span>
                </button>
              </div>

              {/* Instrucciones - Mobile Compact */}
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-blue-50 rounded-lg">
                  <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-blue-900 mb-1">Cómo verificar</p>
                    <p className="text-[10px] sm:text-xs text-blue-800 leading-relaxed">
                      Escanee el código QR con la cámara de su smartphone o ingrese manualmente 
                      la URL en su navegador para verificar la autenticidad del certificado.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-green-50 rounded-lg">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-green-900 mb-1">Seguridad y validez</p>
                    <p className="text-[10px] sm:text-xs text-green-800 leading-relaxed">
                      Este código QR está vinculado de forma segura a la base de datos de ESAP. 
                      Cada escaneo queda registrado en nuestro sistema de auditoría.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-yellow-50 rounded-lg">
                  <Info className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-yellow-900 mb-1">Información importante</p>
                    <p className="text-[10px] sm:text-xs text-yellow-800 leading-relaxed">
                      La verificación en línea mostrará los datos completos del certificado y 
                      confirmará su vigencia. Este QR tiene validez de 3 meses desde la emisión.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Responsive */}
            <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] sm:text-xs text-gray-600">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                  <span>Código QR verificable y seguro</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                  <span>Protegido con firma electrónica ESAP</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}

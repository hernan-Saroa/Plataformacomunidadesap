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
import { toast } from 'sonner@2.0.3';
import { copyToClipboard } from '../../utils/clipboard';
import { getPublicBaseUrl } from '../../config/environment';

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
  const urlVerificacion = verificationUrl || `${verificationBase}${verificationPath}/${qrData}`;

  const handleDescargarQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) {
      toast.error('No se pudo generar la imagen del QR');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `QR-${qrData}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR descargado exitosamente', {
      description: `QR-${qrData}.png`,
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
    const canvas = qrRef.current?.querySelector('canvas');
    const dataUrl = canvas?.toDataURL('image/png');

    if (navigator.share) {
      try {
        const files: File[] = [];
        if (dataUrl && navigator.canShare && typeof navigator.canShare === 'function') {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], `QR-${qrData}.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            files.push(file);
          }
        }

        await navigator.share({
          title: 'Verificar Certificado Laboral ESAP',
          text: `Verificar certificado ${certificado.consecutivo}`,
          url: urlVerificacion,
          files: files.length ? files : undefined
        });
        toast.success('Compartido exitosamente');
        return;
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          await handleCopiarEnlace();
          return;
        }
        return;
      }
    }

    // Fallback: copiar enlace
    await handleCopiarEnlace();
    toast.info('Enlace copiado al portapapeles');
  };

  const handleImprimir = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    const dataUrl = canvas?.toDataURL('image/png');
    const qrImg = dataUrl ? `<img src="${dataUrl}" style="width:320px;height:320px;"/>` : qrRef.current?.innerHTML || '';

    const printWindow = window.open('', '', 'width=700,height=900');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Codigo QR - ${certificado.consecutivo}</title>
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
            }
            h1 {
              color: #003DA5;
              margin-bottom: 10px;
              font-size: 24px;
            }
            .qr-box {
              width: 320px;
              height: 320px;
              margin: 30px auto;
              border: 3px solid #003DA5;
              display: flex;
              align-items: center;
              justify-content: center;
              background: white;
              border-radius: 8px;
            }
            .info {
              margin-top: 20px;
              color: #333;
              font-size: 14px;
            }
            .url {
              color: #003DA5;
              font-weight: bold;
              font-size: 12px;
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
            <h1>ESCUELA SUPERIOR DE ADMINISTRACION PUBLICA</h1>
            <p style="color: #666; margin-bottom: 10px;">Codigo QR de Verificacion</p>
            <div class="qr-box">
              ${qrImg}
            </div>
            <div class="info">
              <p><strong>Consecutivo:</strong> ${certificado.consecutivo}</p>
              <p><strong>Empleado:</strong> ${certificado.empleado.nombre}</p>
              <p><strong>Documento:</strong> ${certificado.empleado.documento}</p>
              <p><strong>Fecha de emision:</strong> ${new Date(certificado.fechaGeneracion).toLocaleDateString('es-CO')}</p>
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
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
    toast.info('Abriendo vista de impresion...');
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

        {/* Modal */}
        <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#003DA5] to-[#0052cc] px-6 py-5 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2.5 rounded-xl">
                    <QrCode className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white text-xl font-bold">Código QR de Verificación</h2>
                    <p className="text-blue-100 text-sm">Certificado Laboral ESAP</p>
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

            {/* Content */}
            <div className="p-8">
              {/* QR Code Container */}
              <div ref={qrRef} className="flex justify-center mb-6">
                <div className="relative">
                  <div className="bg-white p-6 rounded-2xl border-4 border-[#003DA5] shadow-xl">
                    <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl">
                      <div className="w-64 h-64 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden">
                        <QRCodeCanvas
                          value={urlVerificacion}
                          size={230}
                          level="H"
                          includeMargin
                          className="w-full h-full p-2"
                        />
                        <div className="absolute inset-0 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Información del certificado */}
              <div className="bg-blue-50 border-l-4 border-[#003DA5] rounded-r-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Consecutivo</p>
                    <p className="font-mono font-bold text-gray-900">{certificado.consecutivo}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Empleado</p>
                    <p className="font-semibold text-gray-900">{certificado.empleado.nombre}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Documento</p>
                    <p className="font-semibold text-gray-900">C.C. {certificado.empleado.documento}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Fecha de emisión</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(certificado.fechaGeneracion).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* URL de verificación */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-[#003DA5] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 mb-2">URL de Verificación Pública</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-white px-3 py-2 rounded-lg border border-gray-200 text-[#003DA5] font-mono truncate">
                        {urlVerificacion}
                      </code>
                      <button
                        onClick={handleCopiarEnlace}
                        className="flex-shrink-0 p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Copiar enlace"
                      >
                        <Copy className="w-4 h-4 text-gray-600" />
                      </button>
                      <a
                        href={urlVerificacion}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Abrir en nueva pestaña"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-600" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={handleDescargarQR}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                >
                  <Download className="w-4 h-4" />
                  Descargar QR
                </button>
                <button
                  onClick={handleImprimir}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg transition-colors font-medium"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
                <button
                  onClick={handleCopiarEnlace}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-[#003DA5] hover:bg-[#002873] text-white rounded-lg transition-colors font-medium"
                >
                  <Copy className="w-4 h-4" />
                  Copiar Enlace
                </button>
                <button
                  onClick={handleCompartir}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
                >
                  <Share2 className="w-4 h-4" />
                  Compartir
                </button>
              </div>

              {/* Instrucciones */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">Cómo verificar</p>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Escanee el código QR con la cámara de su smartphone o ingrese manualmente 
                      la URL en su navegador para verificar la autenticidad del certificado.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-900 mb-1">Seguridad y validez</p>
                    <p className="text-xs text-green-800 leading-relaxed">
                      Este código QR está vinculado de forma segura a la base de datos de ESAP. 
                      Cada escaneo queda registrado en nuestro sistema de auditoría.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                  <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-900 mb-1">Información importante</p>
                    <p className="text-xs text-yellow-800 leading-relaxed">
                      La verificación en línea mostrará los datos completos del certificado y 
                      confirmará su vigencia. Este QR tiene validez de 3 meses desde la emisión.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Código QR verificable y seguro</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
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

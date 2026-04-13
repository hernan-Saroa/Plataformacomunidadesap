/**
 * MODAL: GENERADOR DE QR PARA ENROLAMIENTO
 * Permite generar códigos QR para auto-registro de usuarios
 */

import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2, Copy, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { useState } from 'react';
import { copyToClipboard, downloadFile } from '@/utils/browser';

interface GenerateEnrollmentQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateEnrollmentQRModal({ open, onOpenChange }: GenerateEnrollmentQRModalProps) {
  const [copied, setCopied] = useState(false);

  // URL base para enrolamiento
  const enrollmentUrl = `${window.location.origin}/enrolamiento/qr`;
  
  // Generar QR usando API pública (sin dependencias)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(enrollmentUrl)}&color=003DA5&bgcolor=ffffff`;

  // Función para descargar QR (cross-browser compatible)
  const handleDownload = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const filename = `QR_Enrolamiento_ESAP_${Date.now()}.png`;
      downloadFile(blob, filename);
      
      toast.success('QR descargado correctamente', {
        description: 'El código QR ha sido guardado en tu dispositivo'
      });
    } catch (error) {
      toast.error('Error al descargar', {
        description: 'No se pudo descargar el código QR'
      });
    }
  };

  // Función para copiar URL (con fallback para Safari)
  const handleCopyUrl = async () => {
    try {
      const success = await copyToClipboard(enrollmentUrl);
      if (success) {
        setCopied(true);
        toast.success('Enlace copiado', {
          description: 'El enlace ha sido copiado al portapapeles'
        });
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error('Copy failed');
      }
    } catch (error) {
      toast.error('Error al copiar', {
        description: 'No se pudo copiar el enlace'
      });
    }
  };

  // Función para compartir (Web Share API)
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Enrolamiento ESAP',
          text: 'Activa tu cuenta en la plataforma ESAP',
          url: enrollmentUrl
        });
        toast.success('Compartido exitosamente');
      } catch (error) {
        // Usuario canceló el share
        if ((error as Error).name !== 'AbortError') {
          toast.error('Error al compartir');
        }
      }
    } else {
      // Fallback: copiar URL
      handleCopyUrl();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto p-0 overflow-hidden bg-white">
        <DialogTitle className="sr-only">
          Código QR de Enrolamiento - Generador
        </DialogTitle>
        <DialogDescription className="sr-only">
          Generador de código QR para auto-registro de usuarios en la plataforma ESAP. Comparte este código para permitir el enrolamiento de nuevos usuarios.
        </DialogDescription>
        
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <div className="relative bg-gradient-to-br from-[#003DA5] to-[#0052CC] p-6 text-white">
                <button
                  onClick={() => onOpenChange(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4"
                  >
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13-2h-2v3h-3v2h3v3h2v-3h3v-2h-3v-3z"/>
                    </svg>
                  </motion.div>
                  
                  <h2 className="text-2xl font-bold mb-2">
                    Código QR de Enrolamiento
                  </h2>
                  <p className="text-white/90 text-sm">
                    Comparte este código para permitir el auto-registro
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 sm:p-8">
                {/* QR Code Container */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative mb-6"
                >
                  <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-100">
                    {/* QR Code */}
                    <div className="flex justify-center mb-4">
                      <div className="relative">
                        <img 
                          src={qrCodeUrl} 
                          alt="QR Code de Enrolamiento"
                          className="w-[250px] h-[250px] rounded-xl"
                        />
                        {/* Esquinas decorativas */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#003DA5] rounded-tl-xl" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#003DA5] rounded-tr-xl" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#003DA5] rounded-bl-xl" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#003DA5] rounded-br-xl" />
                      </div>
                    </div>

                    {/* Info Text */}
                    <div className="text-center">
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Este código permite el auto-registro de usuarios en la plataforma
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* URL Display */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-6"
                >
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-2 font-medium">Enlace de activación:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-gray-700 break-all font-mono">
                        {enrollmentUrl}
                      </code>
                      <button
                        onClick={handleCopyUrl}
                        className="flex-shrink-0 p-2 hover:bg-white rounded-lg transition-colors"
                        title="Copiar enlace"
                      >
                        {copied ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="grid grid-cols-2 gap-3"
                >
                  {/* Download Button */}
                  <Button
                    onClick={handleDownload}
                    className="w-full h-12 bg-[#003DA5] hover:bg-[#002d7a] text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    <span>Descargar QR</span>
                  </Button>

                  {/* Share Button */}
                  <Button
                    onClick={handleShare}
                    className="w-full h-12 bg-[#0052CC] hover:bg-[#003DA5] text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-5 h-5" />
                    <span>Compartir</span>
                  </Button>
                </motion.div>

                {/* Help Text */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100"
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-[#003DA5]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#003DA5] mb-1">¿Cómo usar este QR?</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• Imprime el código y colócalo en lugares visibles</li>
                        <li>• Comparte el enlace por correo o redes sociales</li>
                        <li>• Los usuarios podrán activar su cuenta escaneando el QR</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
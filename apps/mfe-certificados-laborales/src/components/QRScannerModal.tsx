import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Camera,
  QrCode,
  AlertCircle,
  CheckCircle,
  Loader2,
  Upload,
  SwitchCamera
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import jsQR from 'jsqr';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQRDetected: (qrCode: string) => void;
}

export function QRScannerModal({ isOpen, onClose, onQRDetected }: QRScannerModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      setErrorMessage('');
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setHasPermission(true);
      setIsScanning(true);

      // Iniciar escaneo automático
      startScanning();

      toast.success('Cámara activada', {
        description: 'Apunta al código QR del certificado',
        duration: 3000
      });
    } catch (error) {
      console.error('Error al acceder a la cámara:', error);
      setHasPermission(false);
      setErrorMessage('No se pudo acceder a la cámara. Verifica los permisos.');
      
      toast.error('Error de cámara', {
        description: 'No se pudo acceder a la cámara del dispositivo',
        duration: 4000
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (scanIntervalRef.current) {
      window.cancelAnimationFrame(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    setIsScanning(false);
  };

  const startScanning = () => {
    const canvasElement = document.createElement('canvas');
    const canvas = canvasElement.getContext('2d');

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        canvasElement.height = videoRef.current.videoHeight;
        canvasElement.width = videoRef.current.videoWidth;
        
        if (canvas) {
          canvas.drawImage(videoRef.current, 0, 0, canvasElement.width, canvasElement.height);
          const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
          
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data) {
            // QR detectado
            console.log('QR Code detectado:', code.data);
            
            // Vibración háptica si está disponible
            if (navigator.vibrate) {
              navigator.vibrate(200);
            }

            toast.success('¡QR detectado!', {
              description: code.data,
              duration: 2000
            });

            onQRDetected(code.data);
            stopCamera();
            onClose();
            return;
          }
        }
      }
      
      if (scanIntervalRef.current !== null) {
        scanIntervalRef.current = window.requestAnimationFrame(tick);
      }
    };
    
    scanIntervalRef.current = window.requestAnimationFrame(tick);
  };

  const handleManualInput = () => {
    stopCamera();
    onClose();
    toast.info('Ingreso manual', {
      description: 'Introduce el código QR manualmente',
      duration: 2000
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    toast.loading('Procesando imagen...', { id: 'qr-upload' });

    // Simular procesamiento de imagen
    await new Promise(resolve => setTimeout(resolve, 2000));

    // En producción: decodificar QR de la imagen usando jsQR o similar
    const mockQRCode = 'ESAP-CERT-2025-' + Math.random().toString(36).substring(2, 11).toUpperCase();
    
    toast.success('QR detectado exitosamente', { id: 'qr-upload' });
    onQRDetected(mockQRCode);
    stopCamera();
    onClose();
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    toast.info('Cambiando cámara...', {
      description: facingMode === 'user' ? 'Cámara trasera' : 'Cámara frontal',
      duration: 2000
    });
  };

  const simulateQRDetection = () => {
    // Simulación de escaneo exitoso para demo
    const mockQRCode = 'ESAP-CERT-2025-' + Math.random().toString(36).substring(2, 11).toUpperCase();
    
    toast.success('¡QR detectado!', {
      description: mockQRCode,
      duration: 2000
    });

    onQRDetected(mockQRCode);
    stopCamera();
    onClose();
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
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal - Mobile Optimized */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-0 flex items-center justify-center p-0 sm:p-4"
        >
          <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header - Compact on mobile */}
            <div className="bg-[#003DA5] px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="bg-white/10 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                    <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-white text-base sm:text-xl font-semibold truncate">Escanear Código QR</h2>
                    <p className="text-blue-100 text-xs sm:text-sm mt-0.5 truncate">
                      Apunta al certificado físico
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors p-2 -mr-2 flex-shrink-0"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="p-3 sm:p-6 overflow-y-auto flex-1">
              {/* Video Container - Responsive aspect ratio */}
              <div className="relative bg-black rounded-lg sm:rounded-xl overflow-hidden mb-4 sm:mb-6" style={{ aspectRatio: '16/9' }}>
                {hasPermission === null && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center px-4">
                      <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-white animate-spin mx-auto mb-3 sm:mb-4" />
                      <p className="text-white text-sm sm:text-base">Iniciando cámara...</p>
                    </div>
                  </div>
                )}

                {hasPermission === false && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center px-4 sm:px-6">
                      <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-400 mx-auto mb-3 sm:mb-4" />
                      <h3 className="text-white text-base sm:text-lg mb-2">Error de Cámara</h3>
                      <p className="text-gray-300 text-xs sm:text-sm mb-3 sm:mb-4">{errorMessage}</p>
                      <Button
                        variant="outline"
                        className="bg-white text-gray-900 min-h-[44px]"
                        onClick={startCamera}
                      >
                        Intentar de nuevo
                      </Button>
                    </div>
                  </div>
                )}

                {hasPermission && (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                      muted
                    />

                    {/* Overlay de escaneo - Responsive */}
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Marco de escaneo */}
                      <div className="absolute inset-0 flex items-center justify-center p-4">
                        <div className="relative w-full max-w-[280px] sm:max-w-[300px]" style={{ aspectRatio: '1/1' }}>
                          {/* Esquinas - Responsive */}
                          <div className="absolute top-0 left-0 w-10 h-10 sm:w-12 sm:h-12 border-t-[3px] sm:border-t-4 border-l-[3px] sm:border-l-4 border-white rounded-tl-lg" />
                          <div className="absolute top-0 right-0 w-10 h-10 sm:w-12 sm:h-12 border-t-[3px] sm:border-t-4 border-r-[3px] sm:border-r-4 border-white rounded-tr-lg" />
                          <div className="absolute bottom-0 left-0 w-10 h-10 sm:w-12 sm:h-12 border-b-[3px] sm:border-b-4 border-l-[3px] sm:border-l-4 border-white rounded-bl-lg" />
                          <div className="absolute bottom-0 right-0 w-10 h-10 sm:w-12 sm:h-12 border-b-[3px] sm:border-b-4 border-r-[3px] sm:border-r-4 border-white rounded-br-lg" />
                          
                          {/* Línea de escaneo animada */}
                          <motion.div
                            className="absolute inset-x-0 h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"
                            animate={{
                              top: ['0%', '100%']
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'linear'
                            }}
                          />
                        </div>
                      </div>

                      {/* Instrucción - Compact on mobile */}
                      <div className="absolute bottom-3 sm:bottom-6 left-0 right-0 text-center px-3">
                        <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-black/60 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full max-w-full">
                          <QrCode className="w-3 h-3 sm:w-4 sm:h-4 text-white flex-shrink-0" />
                          <span className="text-white text-xs sm:text-sm truncate">Alinea el código QR dentro del marco</span>
                        </div>
                      </div>
                    </div>

                    {/* Botón cambiar cámara - Touch optimized */}
                    <button
                      onClick={toggleCamera}
                      className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-black/60 backdrop-blur-sm p-2.5 sm:p-3 rounded-full hover:bg-black/80 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <SwitchCamera className="w-5 h-5 text-white" />
                    </button>
                  </>
                )}
              </div>

              {/* Opciones Alternativas */}
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs sm:text-sm">
                    <span className="bg-white px-3 sm:px-4 text-gray-500">O usa otra opción</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {/* Upload de Imagen */}
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <div className="cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 hover:border-[#003DA5] hover:bg-blue-50 transition-all min-h-[88px] flex flex-col items-center justify-center">
                      <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 mx-auto mb-1.5 sm:mb-2" />
                      <p className="text-xs sm:text-sm text-gray-600 text-center">Subir imagen</p>
                    </div>
                  </label>

                  {/* Ingreso Manual */}
                  <button
                    onClick={handleManualInput}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 hover:border-[#003DA5] hover:bg-blue-50 transition-all min-h-[88px] flex flex-col items-center justify-center"
                  >
                    <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 mx-auto mb-1.5 sm:mb-2" />
                    <p className="text-xs sm:text-sm text-gray-600 text-center">Ingreso manual</p>
                  </button>
                </div>

                {/* Botón de Demo - Mobile optimized */}
                <Card className="p-3 sm:p-4 bg-yellow-50 border-2 border-yellow-200">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-700">
                        <strong>Modo Demo:</strong> El escaneo real requiere integración con librería jsQR o @zxing/library
                      </p>
                      <Button
                        size="sm"
                        className="mt-2 sm:mt-3 bg-yellow-600 hover:bg-yellow-700 w-full sm:w-auto min-h-[44px]"
                        onClick={simulateQRDetection}
                      >
                        Simular Escaneo Exitoso
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Footer - Sticky */}
            <div className="border-t border-gray-200 px-3 sm:px-6 py-3 sm:py-4 bg-gray-50 flex-shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  {isScanning ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span>Escaneando...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      <span className="hidden sm:inline">Cámara inactiva</span>
                      <span className="sm:hidden">Inactiva</span>
                    </>
                  )}
                </div>
                <Button variant="outline" onClick={onClose} className="min-h-[44px]">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
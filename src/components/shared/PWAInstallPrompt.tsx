import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Smartphone, Zap, Wifi, Bell } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Check if prompt was previously dismissed
    const promptDismissed = localStorage.getItem('pwa-prompt-dismissed');
    const dismissedDate = promptDismissed ? new Date(promptDismissed) : null;
    const daysSinceDismissed = dismissedDate 
      ? Math.floor((Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity;

    // Show prompt again after 7 days
    if (daysSinceDismissed < 7) {
      return;
    }

    // Listen for beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Show prompt after a short delay (better UX)
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show manual instructions after delay
    if (iOS && !promptDismissed) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    }

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      setIsInstalled(true);
      setShowPrompt(false);
      localStorage.removeItem('pwa-prompt-dismissed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // iOS: show instructions
      if (isIOS) {
        setShowIOSInstructions(true);
      }
      return;
    }

    // Android/Desktop: show native prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString());
  };

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* iOS Installation Instructions Modal */}
      <AnimatePresence>
        {showIOSInstructions && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300]"
              onClick={() => setShowIOSInstructions(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[301] w-[92vw] max-w-md"
            >
              <Card className="bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Instalar en iOS</h3>
                      <p className="text-sm text-gray-600">Sigue estos pasos</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowIOSInstructions(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-sm font-bold text-blue-600">1</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">
                        Toca el botón <strong>Compartir</strong> 
                        <span className="inline-block mx-1 px-2 py-1 bg-gray-100 rounded text-xs">
                          <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
                          </svg>
                        </span>
                        en la barra inferior de Safari
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-sm font-bold text-blue-600">2</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">
                        Desplázate y selecciona <strong>"Añadir a pantalla de inicio"</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-sm font-bold text-blue-600">3</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">
                        Toca <strong>"Añadir"</strong> y ¡listo! La app estará en tu pantalla de inicio
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-100">
                  <p className="text-xs text-gray-700 text-center">
                    💡 Una vez instalada, podrás acceder a La Comunidad ESAP como una app nativa
                  </p>
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Install Prompt */}
      <AnimatePresence>
        {showPrompt && !showIOSInstructions && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[200]"
          >
            <Card className="bg-gradient-to-br from-white via-white to-blue-50 border-2 border-blue-200 shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-400/20 to-teal-400/20 rounded-full blur-2xl" />
              
              <div className="relative p-5 sm:p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                      className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg"
                    >
                      <Download className="w-6 h-6 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base">¡Instala La Comunidad ESAP!</h3>
                      <p className="text-xs sm:text-sm text-gray-600">Acceso rápido y sin navegador</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDismiss}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {/* Benefits */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  <div className="flex flex-col items-center gap-1.5 p-2.5 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-700 text-center leading-tight">Más rápida</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 p-2.5 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg flex items-center justify-center">
                      <Wifi className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-700 text-center leading-tight">Funciona offline</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 p-2.5 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                      <Bell className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-700 text-center leading-tight">Notificaciones</span>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleInstallClick}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold shadow-lg shadow-blue-500/30 text-sm sm:text-base h-11"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isIOS ? 'Ver instrucciones' : 'Instalar ahora'}
                  </Button>
                  <Button
                    onClick={handleDismiss}
                    variant="outline"
                    className="px-4 text-sm"
                  >
                    Ahora no
                  </Button>
                </div>

                {isIOS && (
                  <p className="mt-3 text-[10px] sm:text-xs text-center text-gray-500">
                    📱 Requiere Safari para instalar
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

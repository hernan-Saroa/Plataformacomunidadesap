/**
 * BANNER DE COMPATIBILIDAD DE NAVEGADOR
 * Muestra warnings si el navegador no es totalmente compatible
 */

'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, Info, CheckCircle } from 'lucide-react';
import { getBrowserInfo, type BrowserInfo } from '@/utils/browser';

export function BrowserCompatibilityBanner() {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const info = getBrowserInfo();
    setBrowserInfo(info);
    
    // Mostrar banner si hay warnings o no es soportado
    if (!info.isSupported || info.warnings.length > 0) {
      // Verificar si fue dismissed en esta sesión
      const dismissed = sessionStorage.getItem('browser-warning-dismissed');
      if (!dismissed) {
        setIsVisible(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    sessionStorage.setItem('browser-warning-dismissed', 'true');
  };

  if (!isVisible || isDismissed || !browserInfo) {
    return null;
  }

  // No mostrar si no hay problemas
  if (browserInfo.isSupported && browserInfo.warnings.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-yellow-800">
              {!browserInfo.isSupported 
                ? 'Navegador no compatible detectado'
                : 'Advertencias de compatibilidad'
              }
            </h3>
            
            <div className="mt-1 text-sm text-yellow-700">
              <p>
                Estás usando <strong>{browserInfo.name} {browserInfo.fullVersion}</strong> en <strong>{browserInfo.platform}</strong>
              </p>
              
              {browserInfo.warnings.length > 0 && (
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {browserInfo.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              )}
              
              <p className="mt-2">
                Para una mejor experiencia, recomendamos usar:
                <strong className="ml-1">Chrome 120+, Edge 120+, o Safari 17+</strong>
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded hover:bg-yellow-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5 text-yellow-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * INDICADOR PEQUEÑO DE NAVEGADOR (para footer o dev tools)
 */
export function BrowserIndicator() {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);

  useEffect(() => {
    setBrowserInfo(getBrowserInfo());
  }, []);

  if (!browserInfo) return null;

  const getStatusColor = () => {
    if (!browserInfo.isSupported) return 'text-red-600';
    if (browserInfo.warnings.length > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (!browserInfo.isSupported) return <AlertTriangle className="h-4 w-4" />;
    if (browserInfo.warnings.length > 0) return <Info className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <div className={getStatusColor()}>
        {getStatusIcon()}
      </div>
      <span>
        {browserInfo.name} {browserInfo.version}
        {browserInfo.isMobile && ' (Mobile)'}
      </span>
    </div>
  );
}

/**
 * MODAL DETALLADO DE INFORMACIÓN DEL NAVEGADOR (para testing)
 */
export function BrowserInfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      const info = getBrowserInfo();
      setBrowserInfo(info);
      
      // Check features
      setFeatures({
        clipboard: !!(navigator.clipboard && window.isSecureContext),
        dragAndDrop: 'draggable' in document.createElement('div'),
        fileReader: !!window.FileReader,
        localStorage: !!window.localStorage,
        sessionStorage: !!window.sessionStorage,
        webWorkers: !!window.Worker,
        serviceWorker: 'serviceWorker' in navigator,
        notifications: 'Notification' in window,
        geolocation: 'geolocation' in navigator,
        // @ts-ignore
        flexboxGap: CSS.supports('gap', '1rem')
      });
    }
  }, [isOpen]);

  if (!isOpen || !browserInfo) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Información del Navegador
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Browser Info */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Navegador</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Nombre:</span>
                  <span className="text-sm font-medium text-gray-900">{browserInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Versión:</span>
                  <span className="text-sm font-medium text-gray-900">{browserInfo.fullVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Plataforma:</span>
                  <span className="text-sm font-medium text-gray-900">{browserInfo.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Móvil:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {browserInfo.isMobile ? 'Sí' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Soportado:</span>
                  <span className={`text-sm font-medium ${browserInfo.isSupported ? 'text-green-600' : 'text-red-600'}`}>
                    {browserInfo.isSupported ? 'Sí' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Warnings */}
            {browserInfo.warnings.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Advertencias</h3>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <ul className="space-y-2">
                    {browserInfo.warnings.map((warning, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-yellow-800">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Features Support */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Soporte de Funcionalidades</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(features).map(([feature, supported]) => (
                    <div key={feature} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 capitalize">
                        {feature.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className={`text-sm font-medium ${supported ? 'text-green-600' : 'text-red-600'}`}>
                        {supported ? '✓' : '✗'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Navegadores Recomendados</h3>
              <div className="bg-blue-50 rounded-lg p-4">
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span><strong>Google Chrome 120+</strong> - Recomendado</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span><strong>Microsoft Edge 120+</strong> - Recomendado</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span><strong>Safari 17+</strong> - Recomendado (macOS/iOS)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span><strong>Firefox 120+</strong> - Compatible</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#003DA5] text-white rounded-lg hover:bg-[#002D7A] transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

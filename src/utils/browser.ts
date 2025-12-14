/**
 * UTILIDADES DE BROWSER
 * 
 * Funciones helper para operaciones del navegador con fallbacks seguros
 */

/**
 * Copia texto al portapapeles con fallback legacy
 * @param text Texto a copiar
 * @returns Promise<boolean> true si tuvo éxito
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Método 1: Clipboard API moderna (requiere HTTPS y permisos)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Silenciar el warning si es NotAllowedError (políticas de permisos)
      // El fallback se encargará de copiar el texto
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        // No mostrar warning - es comportamiento esperado en algunos navegadores
      } else {
        console.warn('Clipboard API falló, usando fallback:', err);
      }
      // Continuar al fallback
    }
  }

  // Método 2: Fallback con textarea temporal (funciona en cualquier contexto)
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    
    // Hacer el textarea invisible pero accesible
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.setAttribute('readonly', '');
    
    document.body.appendChild(textarea);
    
    // Seleccionar y copiar
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    return successful;
  } catch (err) {
    console.error('Error al copiar al portapapeles:', err);
    return false;
  }
}

/**
 * Verifica si el navegador soporta Clipboard API
 */
export function isClipboardSupported(): boolean {
  return !!(navigator.clipboard && window.isSecureContext);
}

/**
 * Detecta si el usuario está en un dispositivo móvil
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Información detallada del navegador
 */
export interface BrowserInfo {
  name: string;
  version: string;
  fullVersion: string;
  platform: string;
  isMobile: boolean;
  isSupported: boolean;
  warnings: string[];
}

/**
 * Obtiene información completa del navegador con warnings de compatibilidad
 */
export function getBrowserInfo(): BrowserInfo {
  const ua = navigator.userAgent;
  const platform = navigator.platform || 'Unknown';
  const isMobile = isMobileDevice();
  
  let name = 'Unknown';
  let version = '0';
  let fullVersion = '0.0.0';
  let isSupported = true;
  const warnings: string[] = [];
  
  // Detectar navegador y versión
  if (ua.includes('Edge')) {
    name = 'Microsoft Edge';
    const match = ua.match(/Edg\/(\d+)\.(\d+)\.(\d+)/);
    if (match) {
      version = match[1];
      fullVersion = `${match[1]}.${match[2]}.${match[3]}`;
      
      const versionNum = parseInt(version);
      if (versionNum < 90) {
        isSupported = false;
        warnings.push('Tu versión de Edge es muy antigua. Por favor actualiza a Edge 120+');
      } else if (versionNum < 120) {
        warnings.push('Tu versión de Edge podría no soportar todas las funcionalidades. Actualiza a Edge 120+');
      }
    }
  } else if (ua.includes('Chrome') && !ua.includes('Edge')) {
    name = 'Google Chrome';
    const match = ua.match(/Chrome\/(\d+)\.(\d+)\.(\d+)/);
    if (match) {
      version = match[1];
      fullVersion = `${match[1]}.${match[2]}.${match[3]}`;
      
      const versionNum = parseInt(version);
      if (versionNum < 90) {
        isSupported = false;
        warnings.push('Tu versión de Chrome es muy antigua. Por favor actualiza a Chrome 120+');
      } else if (versionNum < 120) {
        warnings.push('Tu versión de Chrome podría no soportar todas las funcionalidades. Actualiza a Chrome 120+');
      }
    }
  } else if (ua.includes('Firefox')) {
    name = 'Mozilla Firefox';
    const match = ua.match(/Firefox\/(\d+)\.(\d+)/);
    if (match) {
      version = match[1];
      fullVersion = `${match[1]}.${match[2]}`;
      
      const versionNum = parseInt(version);
      if (versionNum < 88) {
        isSupported = false;
        warnings.push('Tu versión de Firefox es muy antigua. Por favor actualiza a Firefox 120+');
      } else if (versionNum < 120) {
        warnings.push('Tu versión de Firefox podría no soportar todas las funcionalidades. Actualiza a Firefox 120+');
      }
    }
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    name = 'Safari';
    const match = ua.match(/Version\/(\d+)\.(\d+)/);
    if (match) {
      version = match[1];
      fullVersion = `${match[1]}.${match[2]}`;
      
      const versionNum = parseInt(version);
      if (versionNum < 14) {
        isSupported = false;
        warnings.push('Tu versión de Safari es muy antigua. Por favor actualiza a Safari 17+');
      } else if (versionNum < 17) {
        warnings.push('Tu versión de Safari podría no soportar todas las funcionalidades. Actualiza a Safari 17+');
      }
    }
  } else if (ua.includes('MSIE') || ua.includes('Trident/')) {
    name = 'Internet Explorer';
    isSupported = false;
    warnings.push('Internet Explorer no es compatible. Por favor usa Chrome, Edge, Firefox o Safari.');
  } else {
    warnings.push('Navegador desconocido. Para una mejor experiencia, usa Chrome 120+, Edge 120+, o Safari 17+');
  }
  
  // Verificar contexto seguro
  if (!window.isSecureContext) {
    warnings.push('Conexión no segura (HTTP). Algunas funcionalidades pueden no estar disponibles.');
  }
  
  return {
    name,
    version,
    fullVersion,
    platform,
    isMobile,
    isSupported,
    warnings,
  };
}

/**
 * Detecta el navegador (versión simplificada)
 */
export function getBrowser(): 'chrome' | 'firefox' | 'safari' | 'edge' | 'other' {
  const ua = navigator.userAgent;
  
  if (ua.includes('Chrome') && !ua.includes('Edge')) return 'chrome';
  if (ua.includes('Firefox')) return 'firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari';
  if (ua.includes('Edge')) return 'edge';
  
  return 'other';
}

/**
 * Verifica si el navegador soporta Service Workers
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Verifica si el navegador soporta Notifications API
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Solicita permisos de notificación
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  
  try {
    return await Notification.requestPermission();
  } catch (err) {
    console.error('Error al solicitar permisos de notificación:', err);
    return 'denied';
  }
}

/**
 * Verifica si el navegador soporta almacenamiento local
 */
export function isLocalStorageSupported(): boolean {
  try {
    const test = '__test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Obtiene información del dispositivo
 */
export function getDeviceInfo() {
  return {
    isMobile: isMobileDevice(),
    browser: getBrowser(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    online: navigator.onLine,
    cookieEnabled: navigator.cookieEnabled,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
  };
}

/**
 * Comparte contenido usando la Web Share API con fallback
 */
export async function shareContent(data: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> {
  // Web Share API (móvil principalmente)
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (err) {
      // Usuario canceló o error
      if ((err as Error).name !== 'AbortError') {
        console.error('Error al compartir:', err);
      }
      return false;
    }
  }
  
  // Fallback: copiar URL al portapapeles
  if (data.url) {
    return await copyToClipboard(data.url);
  }
  
  return false;
}

/**
 * Descarga un archivo
 */
export function downloadFile(data: Blob | string, filename: string, mimeType?: string) {
  try {
    let blob: Blob;
    
    if (typeof data === 'string') {
      blob = new Blob([data], { type: mimeType || 'text/plain' });
    } else {
      blob = data;
    }
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    // Limpiar
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    return true;
  } catch (err) {
    console.error('Error al descargar archivo:', err);
    return false;
  }
}

/**
 * Abre en nueva pestaña de forma segura
 */
export function openInNewTab(url: string): void {
  const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
  if (newWindow) {
    newWindow.opener = null;
  }
}

/**
 * Verifica si el usuario tiene conexión a internet
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Escucha cambios de conexión
 */
export function onConnectionChange(callback: (online: boolean) => void) {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Vibra el dispositivo (si está soportado)
 */
export function vibrate(pattern: number | number[]): boolean {
  if ('vibrate' in navigator) {
    return navigator.vibrate(pattern);
  }
  return false;
}

/**
 * Previene el zoom en inputs (útil en móvil)
 */
export function preventInputZoom() {
  const viewport = document.querySelector('meta[name=viewport]');
  if (viewport) {
    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0'
    );
  }
}

/**
 * Restaura el zoom en inputs
 */
export function restoreInputZoom() {
  const viewport = document.querySelector('meta[name=viewport]');
  if (viewport) {
    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1.0'
    );
  }
}
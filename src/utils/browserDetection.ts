/**
 * ============================================
 * BROWSER DETECTION & COMPATIBILITY UTILITIES
 * ============================================
 * 
 * Detecta el navegador, versión y características soportadas
 * Aplica clases CSS específicas para compatibilidad cross-browser
 */

export interface BrowserInfo {
  name: 'chrome' | 'safari' | 'firefox' | 'edge' | 'opera' | 'ie' | 'unknown';
  version: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  os: 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'unknown';
  supportsBackdropFilter: boolean;
  supportsSticky: boolean;
  supportsGrid: boolean;
  supportsFlexGap: boolean;
  supportsTouchEvents: boolean;
}

/**
 * Detecta el navegador actual y su versión
 */
export function detectBrowser(): BrowserInfo {
  const ua = navigator.userAgent;
  const vendor = navigator.vendor;
  
  let name: BrowserInfo['name'] = 'unknown';
  let version = '';
  
  // Detección de navegador
  if (/Edge\/\d+/.test(ua)) {
    name = 'edge';
    version = ua.match(/Edge\/(\d+)/)?.[1] || '';
  } else if (/Edg\/\d+/.test(ua)) {
    // Chromium Edge
    name = 'edge';
    version = ua.match(/Edg\/(\d+)/)?.[1] || '';
  } else if (/Chrome/.test(ua) && /Google Inc/.test(vendor)) {
    name = 'chrome';
    version = ua.match(/Chrome\/(\d+)/)?.[1] || '';
  } else if (/Safari/.test(ua) && /Apple Computer/.test(vendor)) {
    name = 'safari';
    version = ua.match(/Version\/(\d+)/)?.[1] || '';
  } else if (/Firefox/.test(ua)) {
    name = 'firefox';
    version = ua.match(/Firefox\/(\d+)/)?.[1] || '';
  } else if (/OPR/.test(ua)) {
    name = 'opera';
    version = ua.match(/OPR\/(\d+)/)?.[1] || '';
  } else if (/MSIE|Trident/.test(ua)) {
    name = 'ie';
    version = ua.match(/(MSIE |rv:)(\d+)/)?.[2] || '';
  }
  
  // Detección de dispositivo
  const isMobile = /Mobile|Android|iPhone|iPod/.test(ua);
  const isTablet = /Tablet|iPad/.test(ua);
  const isDesktop = !isMobile && !isTablet;
  
  // Detección de OS
  let os: BrowserInfo['os'] = 'unknown';
  if (/Windows/.test(ua)) {
    os = 'windows';
  } else if (/Mac OS X/.test(ua)) {
    os = 'macos';
  } else if (/Linux/.test(ua)) {
    os = 'linux';
  } else if (/iPhone|iPad|iPod/.test(ua)) {
    os = 'ios';
  } else if (/Android/.test(ua)) {
    os = 'android';
  }
  
  // Feature detection
  const supportsBackdropFilter = CSS.supports('backdrop-filter', 'blur(10px)') || 
                                 CSS.supports('-webkit-backdrop-filter', 'blur(10px)');
  
  const supportsSticky = CSS.supports('position', 'sticky') || 
                        CSS.supports('position', '-webkit-sticky');
  
  const supportsGrid = CSS.supports('display', 'grid');
  
  const supportsFlexGap = CSS.supports('gap', '1rem');
  
  const supportsTouchEvents = 'ontouchstart' in window || 
                             navigator.maxTouchPoints > 0;
  
  return {
    name,
    version,
    isMobile,
    isTablet,
    isDesktop,
    os,
    supportsBackdropFilter,
    supportsSticky,
    supportsGrid,
    supportsFlexGap,
    supportsTouchEvents,
  };
}

/**
 * Aplica clases CSS al documento basadas en el navegador detectado
 */
export function applyBrowserClasses(): void {
  const browser = detectBrowser();
  const html = document.documentElement;
  
  // Limpiar clases previas
  const browserClasses = [
    'browser-chrome', 'browser-safari', 'browser-firefox', 
    'browser-edge', 'browser-opera', 'browser-ie', 'browser-unknown',
    'device-mobile', 'device-tablet', 'device-desktop',
    'os-windows', 'os-macos', 'os-linux', 'os-ios', 'os-android',
    'no-backdrop-filter', 'no-sticky', 'no-grid', 'no-flex-gap', 'touch-device'
  ];
  
  browserClasses.forEach(cls => html.classList.remove(cls));
  
  // Aplicar nuevas clases
  html.classList.add(`browser-${browser.name}`);
  
  if (browser.isMobile) html.classList.add('device-mobile');
  if (browser.isTablet) html.classList.add('device-tablet');
  if (browser.isDesktop) html.classList.add('device-desktop');
  
  html.classList.add(`os-${browser.os}`);
  
  // Feature classes (negativas para fallbacks)
  if (!browser.supportsBackdropFilter) html.classList.add('no-backdrop-filter');
  if (!browser.supportsSticky) html.classList.add('no-sticky');
  if (!browser.supportsGrid) html.classList.add('no-grid');
  if (!browser.supportsFlexGap) html.classList.add('no-flex-gap');
  if (browser.supportsTouchEvents) html.classList.add('touch-device');
  
  // Agregar versión como data attribute
  html.setAttribute('data-browser-version', browser.version);
  
  console.log('🌐 Browser detected:', browser);
}

/**
 * Inicializa los polyfills necesarios según el navegador
 */
export function initPolyfills(): void {
  const browser = detectBrowser();
  
  // Safari: Fix para 100vh en móviles
  if (browser.name === 'safari' && browser.isMobile) {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
  }
  
  // Edge/IE: Smooth scrolling polyfill
  if (browser.name === 'edge' || browser.name === 'ie') {
    if (!('scrollBehavior' in document.documentElement.style)) {
      // Import smooth-scroll polyfill if needed
      console.log('⚠️ Smooth scroll not supported, using fallback');
    }
  }
  
  // Todos los navegadores: IntersectionObserver polyfill
  if (!('IntersectionObserver' in window)) {
    console.warn('⚠️ IntersectionObserver not supported');
    // In production, load polyfill from CDN
  }
  
  // Todos los navegadores: ResizeObserver polyfill
  if (!('ResizeObserver' in window)) {
    console.warn('⚠️ ResizeObserver not supported');
    // In production, load polyfill from CDN
  }
}

/**
 * Detecta características de rendimiento del navegador
 */
export function detectPerformanceFeatures() {
  return {
    hasWebGL: (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(
          canvas.getContext('webgl') || 
          canvas.getContext('experimental-webgl')
        );
      } catch (e) {
        return false;
      }
    })(),
    
    hasWebP: (() => {
      const elem = document.createElement('canvas');
      if (elem.getContext && elem.getContext('2d')) {
        return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      }
      return false;
    })(),
    
    hasServiceWorker: 'serviceWorker' in navigator,
    
    hasWebAssembly: typeof WebAssembly === 'object',
    
    hasLocalStorage: (() => {
      try {
        const test = '__test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch (e) {
        return false;
      }
    })(),
    
    hasIndexedDB: 'indexedDB' in window,
    
    hasWebWorkers: typeof Worker !== 'undefined',
    
    hasPointerEvents: 'PointerEvent' in window,
    
    hasClipboardAPI: 'clipboard' in navigator,
    
    hasNotifications: 'Notification' in window,
  };
}

/**
 * Obtiene el nombre amigable del navegador
 */
export function getBrowserFriendlyName(browserName: BrowserInfo['name']): string {
  const names: Record<BrowserInfo['name'], string> = {
    chrome: 'Google Chrome',
    safari: 'Safari',
    firefox: 'Mozilla Firefox',
    edge: 'Microsoft Edge',
    opera: 'Opera',
    ie: 'Internet Explorer',
    unknown: 'Unknown Browser',
  };
  
  return names[browserName] || 'Unknown Browser';
}

/**
 * Verifica si el navegador cumple con los requisitos mínimos
 */
export function checkBrowserCompatibility(): {
  isCompatible: boolean;
  warnings: string[];
  errors: string[];
} {
  const browser = detectBrowser();
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Versiones mínimas requeridas
  const minVersions: Record<string, number> = {
    chrome: 90,
    safari: 14,
    firefox: 88,
    edge: 90,
    opera: 76,
  };
  
  const browserVersion = parseInt(browser.version, 10);
  const minVersion = minVersions[browser.name];
  
  // Check navegador no soportado
  if (browser.name === 'ie') {
    errors.push(
      'Internet Explorer no está soportado. Por favor usa un navegador moderno como Chrome, Edge, Safari o Firefox.'
    );
  }
  
  // Check versión antigua
  if (minVersion && browserVersion < minVersion) {
    warnings.push(
      `Tu versión de ${getBrowserFriendlyName(browser.name)} (${browser.version}) está desactualizada. ` +
      `Se recomienda la versión ${minVersion} o superior para una mejor experiencia.`
    );
  }
  
  // Check características críticas
  if (!browser.supportsGrid) {
    warnings.push('Tu navegador no soporta CSS Grid. Algunas funcionalidades pueden verse afectadas.');
  }
  
  if (!browser.supportsBackdropFilter) {
    warnings.push('Tu navegador no soporta backdrop-filter. Algunos efectos visuales se mostrarán simplificados.');
  }
  
  const performance = detectPerformanceFeatures();
  
  if (!performance.hasLocalStorage) {
    errors.push('LocalStorage no está disponible. La aplicación requiere esta funcionalidad.');
  }
  
  const isCompatible = errors.length === 0;
  
  return {
    isCompatible,
    warnings,
    errors,
  };
}

/**
 * Muestra un mensaje de compatibilidad al usuario si es necesario
 */
export function showCompatibilityWarning(
  compatibility: ReturnType<typeof checkBrowserCompatibility>
): void {
  if (!compatibility.isCompatible) {
    const message = [
      '⚠️ Navegador No Compatible',
      '',
      ...compatibility.errors,
      '',
      'Por favor actualiza tu navegador o usa uno de los siguientes:',
      '• Google Chrome 90+',
      '• Microsoft Edge 90+',
      '• Safari 14+',
      '• Firefox 88+',
    ].join('\n');
    
    alert(message);
  } else if (compatibility.warnings.length > 0) {
    console.warn('⚠️ Advertencias de compatibilidad:', compatibility.warnings);
  }
}

/**
 * Inicializa la detección de navegador y aplica optimizaciones
 */
export function initBrowserCompatibility(): void {
  try {
    // Aplicar clases CSS
    applyBrowserClasses();
    
    // Inicializar polyfills
    initPolyfills();
    
    // Verificar compatibilidad
    const compatibility = checkBrowserCompatibility();
    
    // Mostrar advertencias si es necesario (solo en development)
    if (import.meta.env?.DEV) {
      showCompatibilityWarning(compatibility);
    }
    
    // Registrar características detectadas
    const browser = detectBrowser();
    const performance = detectPerformanceFeatures();
    
    console.log('✅ Browser compatibility initialized');
    console.log('📊 Browser:', getBrowserFriendlyName(browser.name), browser.version);
    console.log('🎨 Features:', {
      backdropFilter: browser.supportsBackdropFilter,
      sticky: browser.supportsSticky,
      grid: browser.supportsGrid,
      flexGap: browser.supportsFlexGap,
      touch: browser.supportsTouchEvents,
    });
    console.log('⚡ Performance:', performance);
    
  } catch (error) {
    console.error('❌ Error initializing browser compatibility:', error);
  }
}

/**
 * Hook para React: Obtiene información del navegador
 */
export function useBrowserInfo(): BrowserInfo {
  const [browserInfo, setBrowserInfo] = React.useState<BrowserInfo>(() => detectBrowser());
  
  React.useEffect(() => {
    setBrowserInfo(detectBrowser());
  }, []);
  
  return browserInfo;
}

// Detectar cambio de navegación por teclado
export function initKeyboardNavigation(): void {
  let isUsingKeyboard = false;
  
  document.addEventListener('mousedown', () => {
    isUsingKeyboard = false;
    document.body.classList.remove('keyboard-navigation');
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      isUsingKeyboard = true;
      document.body.classList.add('keyboard-navigation');
    }
  });
}

// Import React para el hook
import * as React from 'react';

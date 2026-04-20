/**
 * Environment Configuration for ESAP Backoffice
 *
 * Este archivo centraliza todas las variables de entorno y configuraciones
 * necesarias para conectar el frontend con el backend Node.js/Express
 *
 * MODOS DE CONEXIÓN:
 * 1. Gateway Mode (default para Docker): Todas las requests van al API Gateway
 *    - URL: http://localhost:3000/{service}/api/v1/{path}
 *
 * 2. Direct Mode (para desarrollo local sin Docker): Cada servicio en su puerto
 *    - Auth: http://localhost:3001/{path}
 *    - Certificados: http://localhost:3004/{path}
 *    - etc.
 *
 * Para activar Direct Mode, usa: VITE_API_MODE=direct
 */

// IMPORTANTE: Vite solo reemplaza accesos ESTÁTICOS a import.meta.env
// Por eso usamos acceso directo en lugar de dinámico con [key]

// Determinar el entorno actual
export const ENV = import.meta.env.MODE || 'development';

// URL del API desde variable de entorno (Vite la inyecta en build time)
const VITE_API_URL = import.meta.env.VITE_API_URL as string | undefined;
const VITE_CERTIFICADOS_URL = import.meta.env.VITE_CERTIFICADOS_URL as string | undefined;
const VITE_PUBLIC_FRONTEND_URL = import.meta.env.VITE_PUBLIC_FRONTEND_URL as string | undefined;
const VITE_ONLYOFFICE_URL = import.meta.env.VITE_ONLYOFFICE_URL as string | undefined;

// Modo de API: 'gateway' (usa API Gateway) o 'direct' (conexión directa a microservicios)
// Auto-detectar: localhost = direct, producción = gateway
const VITE_API_MODE = import.meta.env.VITE_API_MODE as string | undefined;
const isLocalhost = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const isLoopbackHost = (host?: string | null) =>
  host === 'localhost' || host === '127.0.0.1' || host === '::1';

const rewriteLoopbackUrl = (rawUrl: string): string => {
  if (typeof window === 'undefined') return rawUrl;

  try {
    const url = new URL(rawUrl);
    const hadTrailingSlash = rawUrl.endsWith('/');
    const currentHost = window.location.hostname;

    if (isLoopbackHost(url.hostname) && currentHost && !isLoopbackHost(currentHost)) {
      url.hostname = currentHost;
      if (!hadTrailingSlash && url.pathname === '/' && !url.search && !url.hash) {
        return `${url.protocol}//${url.host}`;
      }
      return url.toString();
    }
  } catch {
    // Mantener URL original si no es parseable
  }

  return rawUrl;
};

const withLocalhost = (port: number, override?: string) =>
  rewriteLoopbackUrl(override || `http://localhost:${port}`);

const normalizeConfiguredGatewayUrl = (rawUrl: string): string => {
  const rewrittenUrl = rewriteLoopbackUrl(rawUrl);

  if (typeof window === 'undefined' || !window.location?.origin) {
    return rewrittenUrl;
  }

  try {
    return new URL(rewrittenUrl, window.location.origin).toString().replace(/\/$/, '');
  } catch {
    return rewrittenUrl;
  }
};

const getBrowserGatewayUrl = (): string | null => {
  if (typeof window === 'undefined' || !window.location?.hostname) {
    return null;
  }

  const { protocol, hostname, origin } = window.location;

  if (isLoopbackHost(hostname)) {
    return `${protocol}//${hostname}:3000`;
  }

  return `${origin.replace(/\/$/, '')}/services`;
};

const getBrowserOnlyOfficeUrl = (): string | null => {
  if (typeof window === 'undefined' || !window.location?.hostname) {
    return null;
  }

  const { protocol, hostname, origin } = window.location;

  if (isLoopbackHost(hostname)) {
    return `${protocol}//${hostname}:8080`;
  }

  return `${origin.replace(/\/$/, '')}/onlyoffice`;
};

const getMetaConfiguredUrl = (metaName: string): string | undefined => {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const configuredUrl = document
    .querySelector<HTMLMetaElement>(`meta[name="${metaName}"]`)
    ?.content?.trim();

  return configuredUrl ? normalizeConfiguredGatewayUrl(configuredUrl) : undefined;
};

export const getApiGatewayBaseUrl = (): string => {
  const configuredUrl = VITE_API_URL ? normalizeConfiguredGatewayUrl(VITE_API_URL) : undefined;
  if (configuredUrl) {
    return configuredUrl;
  }

  const browserUrl = getBrowserGatewayUrl();
  if (browserUrl) {
    return browserUrl;
  }

  return API_GATEWAY_URLS[ENV as keyof typeof API_GATEWAY_URLS] || API_GATEWAY_URLS.development;
};

export const API_MODE = VITE_API_MODE || (isLocalhost ? 'direct' : 'gateway');

export const ONLYOFFICE_URL = (() => {
  const configuredUrl = VITE_ONLYOFFICE_URL
    ? normalizeConfiguredGatewayUrl(VITE_ONLYOFFICE_URL)
    : undefined;
  if (configuredUrl) {
    return configuredUrl;
  }

  const browserUrl = getBrowserOnlyOfficeUrl();
  if (browserUrl) {
    return browserUrl;
  }

  return '/onlyoffice';
})();

// URLs base del API Gateway según el entorno
const API_GATEWAY_URLS = {
  development: 'http://localhost:3000', // API Gateway local
  dev: '/services',
  production: '/services',
};

export const PORTAL_EXTERNAL_URLS = Object.freeze({
  outlook: getMetaConfiguredUrl('esap-outlook-url') || '/externos/correo-institucional',
  humanosoft: getMetaConfiguredUrl('esap-humanosoft-url') || '/externos/humano-soft',
  arca: getMetaConfiguredUrl('esap-arca-url') || '/externos/arca',
});

// URLs directas a cada microservicio (para desarrollo local sin Docker)
export const MICROSERVICE_URLS = {
  auth: withLocalhost(3001),
  'registro-academico': withLocalhost(3002),
  pta: withLocalhost(3003),
  certificados: withLocalhost(3004, VITE_CERTIFICADOS_URL),
  'control-disciplinario': withLocalhost(3005),
  interoperabilidad: withLocalhost(3006),
  'control-institucional': withLocalhost(3007),
  legal: withLocalhost(3008),
  notificaciones: withLocalhost(3009),
  viaticos: withLocalhost(3010),
  audit: withLocalhost(3011),
};

// Helper para otras variables de entorno (solo para variables no críticas)
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  try {
    return (import.meta?.env?.[key] as string) || defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * Obtiene la URL base para un servicio específico
 * En modo 'direct': retorna la URL directa del microservicio
 * En modo 'gateway': retorna la URL del API Gateway
 */
export const getServiceUrl = (serviceName: keyof typeof MICROSERVICE_URLS): string => {
  if (API_MODE === 'direct') {
    return MICROSERVICE_URLS[serviceName] || API_GATEWAY_URLS.development;
  }
  return getApiGatewayBaseUrl();
};

/**
 * Construye la URL completa para un endpoint
 * En modo 'direct': http://localhost:3002/users (sin prefijo de servicio)
 * En modo 'gateway': http://localhost:3000/auth/api/v1/users (con prefijo)
 */
export const buildApiUrl = (serviceName: keyof typeof MICROSERVICE_URLS, path: string): string => {
  if (API_MODE === 'direct') {
    // En modo directo, el path ya no necesita el prefijo del servicio
    return `${MICROSERVICE_URLS[serviceName]}${path}`;
  }
  // En modo gateway, incluir el prefijo del servicio
  return `${getServiceUrl(serviceName)}/${serviceName}${path}`;
};

/**
 * URL pública base del frontend (para armar enlaces de verificación, QR, deep links)
 * Prioriza variable de entorno; si no existe, usa origin del navegador; si no hay window, fallback local.
 */
export const getPublicBaseUrl = (): string => {
  if (VITE_PUBLIC_FRONTEND_URL) return VITE_PUBLIC_FRONTEND_URL;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return 'http://localhost:3000';
};

/**
 * Construye una URL pública para recursos estáticos (logos/firmas) de un servicio.
 * - direct: usa la URL directa del microservicio
 * - gateway: agrega el prefijo del servicio para rutear por el gateway
 * Si llega una URL absoluta a localhost, se reescribe con el host del servicio actual para evitar CORS.
 */
export const buildServiceAssetUrl = (
  serviceName: keyof typeof MICROSERVICE_URLS,
  assetPath: string,
): string => {
  if (!assetPath) return '';

  const baseService =
    API_MODE === 'direct'
      ? MICROSERVICE_URLS[serviceName]
      : `${getServiceUrl(serviceName)}/${serviceName}`;

  if (/^https?:\/\//i.test(assetPath)) {
    try {
      const url = new URL(assetPath);
      const base = new URL(baseService);
      const isLoopback =
        url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.hostname === '::1';

      if (isLoopback) {
        url.protocol = base.protocol;
        url.host = base.host;
        return url.toString();
      }

      return assetPath;
    } catch {
      return assetPath;
    }
  }

  const normalized = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;

  return `${baseService}${normalized}`;
};

// Configuración general
export const config = {
  // URL base del API Gateway - usa VITE_API_URL si existe, sino el fallback por entorno
  API_BASE_URL: getApiGatewayBaseUrl(),

  // Versión del API por defecto
  API_VERSION: 'v1',

  // Timeout para requests (ms)
  API_TIMEOUT: 30000,

  // Número de reintentos en caso de fallo
  API_RETRY_ATTEMPTS: 3,

  // Delay entre reintentos (ms)
  API_RETRY_DELAY: 1000,

  // WebSocket URL (para notificaciones en tiempo real)
  WS_URL: (() => {
    const defaultHttp = getApiGatewayBaseUrl();

    const asWs = (() => {
      try {
        const url = new URL(defaultHttp);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        return url.toString();
      } catch {
        return defaultHttp.replace(/^http/, 'ws');
      }
    })();

    return getEnvVar('VITE_WS_URL') || asWs;
  })(),

  // Configuración de paginación por defecto
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Configuración de caché
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutos

  // Features flags
  FEATURES: {
    enableWebSockets: true,
    enableCache: true,
    enableOfflineMode: false,
    enableAnalytics: ENV === 'production',
  },

  // Keys para localStorage
  STORAGE_KEYS: {
    AUTH_TOKEN: 'esap_auth_token',
    REFRESH_TOKEN: 'esap_refresh_token',
    USER_DATA: 'esap_user_data',
    PREFERENCES: 'esap_preferences',
    CACHE_PREFIX: 'esap_cache_',
  },

  // Configuración de autenticación
  AUTH: {
    TOKEN_HEADER: 'Authorization',
    TOKEN_PREFIX: 'Bearer',
    REFRESH_THRESHOLD: 5 * 60 * 1000, // Refrescar token 5 min antes de expirar
  },
};

/**
 * Endpoints del API
 *
 * Nueva estructura: /{service}/api/v{version}/{path}
 * Ejemplo: /auth/api/v1/users
 *
 * Esto permite versionamiento independiente por microservicio.
 */
export const API_ENDPOINTS = {
  // Autenticación (auth-service)
  AUTH: {
    LOGIN: '/auth/api/v1/login',
    LOGIN_MICROSOFT: '/auth/api/v1/login/microsoft',
    LOGOUT: '/auth/api/v1/logout',
    REFRESH: '/auth/api/v1/refresh',
    VERIFY: '/auth/api/v1/verify',
    FORGOT_PASSWORD: '/auth/api/v1/forgot-password',
    VERIFY_RESET_CODE: '/auth/api/v1/verify-reset-code',
    RESET_PASSWORD: '/auth/api/v1/reset-password',
    CHANGE_PASSWORD: '/auth/api/v1/change-password',
  },

  // Usuarios (auth-service)
  USERS: {
    BASE: '/auth/api/v1/users',
    BY_ID: (id: string) => `/auth/api/v1/users/${id}`,
    BULK_CREATE: '/auth/api/v1/users/bulk',
    BULK_UPDATE: '/auth/api/v1/users/bulk-update',
    BULK_DELETE: '/auth/api/v1/users/bulk-delete',
    EXPORT: '/auth/api/v1/users/export',
    IMPORT: '/auth/api/v1/users/import',
    STATS: '/auth/api/v1/users/stats',
    ACTIVITY: (id: string) => `/auth/api/v1/users/${id}/activity`,
    ROLES: (id: string) => `/auth/api/v1/users/${id}/roles`,
  },

  // Personas (auth-service)
  PERSONS: {
    BASE: '/auth/api/v1/persons',
    BY_ID: (id: string) => `/auth/api/v1/persons/${id}`,
    DOCUMENTS: (id: string) => `/auth/api/v1/persons/${id}/documents`,
    UPLOAD_DOCUMENT: (id: string) => `/auth/api/v1/persons/${id}/documents/upload`,
    VERIFY_DOCUMENT: (id: string, docId: string) => `/auth/api/v1/persons/${id}/documents/${docId}/verify`,
    TIMELINE: (id: string) => `/auth/api/v1/persons/${id}/timeline`,
    STATS: '/auth/api/v1/persons/stats',
    EXPORT: '/auth/api/v1/persons/export',
  },

  // Roles (auth-service)
  ROLES: {
    BASE: '/auth/api/v1/roles',
    BY_ID: (id: string) => `/auth/api/v1/roles/${id}`,
    PERMISSIONS: (id: string) => `/auth/api/v1/roles/${id}/permissions`,
    USERS: (id: string) => `/auth/api/v1/roles/${id}/users`,
    DUPLICATE: (id: string) => `/auth/api/v1/roles/${id}/duplicate`,
    COMPARE: '/auth/api/v1/roles/compare',
    PRESETS: '/auth/api/v1/roles/presets',
    STATS: '/auth/api/v1/roles/stats',
  },

  // Permisos (auth-service)
  PERMISSIONS: {
    BASE: '/auth/api/v1/permissions',
    BY_ID: (id: string) => `/auth/api/v1/permissions/${id}`,
    BY_CATEGORY: '/auth/api/v1/permissions/by-category',
    BULK_ASSIGN: '/auth/api/v1/permissions/bulk-assign',
    CHECK: '/auth/api/v1/permissions/check',
  },

  // Auditoría (futuro audit-service)
  AUDIT: {
    BASE: '/audit/api/v1',
    BY_ID: (id: string) => `/audit/api/v1/${id}`,
    EVENTS: '/audit/api/v1/events',
    STATS: '/audit/api/v1/stats',
    TIMELINE: '/audit/api/v1/timeline',
    EXPORT: '/audit/api/v1/export',
    BY_USER: (userId: string) => `/audit/api/v1/user/${userId}`,
    BY_ENTITY: (entityType: string, entityId: string) => `/audit/api/v1/${entityType}/${entityId}`,
  },

  // Dashboard y Reportes (futuro dashboard-service)
  DASHBOARD: {
    EXECUTIVE: '/dashboard/api/v1/executive',
    STATS: '/dashboard/api/v1/stats',
    KPI: '/dashboard/api/v1/kpi',
    CHARTS: '/dashboard/api/v1/charts',
    EXPORT: '/dashboard/api/v1/export',
  },

  // Reportes (futuro reports-service)
  REPORTS: {
    BASE: '/reports/api/v1',
    GENERATE: '/reports/api/v1/generate',
    BY_ID: (id: string) => `/reports/api/v1/${id}`,
    DOWNLOAD: (id: string) => `/reports/api/v1/${id}/download`,
    SCHEDULED: '/reports/api/v1/scheduled',
    TEMPLATES: '/reports/api/v1/templates',
  },

  // Notificaciones (notificaciones-service)
  NOTIFICATIONS: {
    BASE: '/notificaciones/api/v1',
    BY_ID: (id: string) => `/notificaciones/api/v1/${id}`,
    MARK_READ: (id: string) => `/notificaciones/api/v1/${id}/read`,
    MARK_ALL_READ: '/notificaciones/api/v1/read-all',
    UNREAD_COUNT: '/notificaciones/api/v1/unread-count',
  },

  // Configuración (futuro settings-service)
  SETTINGS: {
    BASE: '/settings/api/v1',
    SYSTEM: '/settings/api/v1/system',
    USER_PREFERENCES: '/settings/api/v1/preferences',
    THEME: '/settings/api/v1/theme',
    NOTIFICATIONS_SETTINGS: '/settings/api/v1/notifications',
  },

  // Upload de archivos (futuro upload-service)
  UPLOAD: {
    IMAGE: '/upload/api/v1/image',
    DOCUMENT: '/upload/api/v1/document',
    BULK: '/upload/api/v1/bulk',
    AVATAR: '/upload/api/v1/avatar',
  },

  // Certificados (certificados-service)
  CERTIFICADOS: {
    BASE: '/certificados/api/v1',
    GENERATE: '/certificados/api/v1/generate',
    BY_ID: (id: string) => `/certificados/api/v1/${id}`,
    DOWNLOAD: (id: string) => `/certificados/api/v1/${id}/download`,
    VERIFY: (code: string) => `/certificados/api/v1/verify/${code}`,
  },
};

// Headers comunes para todas las requests
export const getDefaultHeaders = (includeAuth = true): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json; charset=utf-8',
    'X-Client-Version': '1.0.0',
    'X-Client-Platform': 'web',
  };

  if (includeAuth) {
    const primaryToken = localStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
    const legacyToken = localStorage.getItem('esap_access_token');
    const token = primaryToken || legacyToken;

    // Compatibilidad con módulos legados: migrar token antiguo a la clave nueva.
    if (!primaryToken && legacyToken) {
      localStorage.setItem(config.STORAGE_KEYS.AUTH_TOKEN, legacyToken);
    }

    if (token) {
      headers[config.AUTH.TOKEN_HEADER] = `${config.AUTH.TOKEN_PREFIX} ${token}`;
      // Header redundante para entornos con proxy/SSL que no reenvían Authorization.
      if (API_MODE !== 'direct') {
        headers['X-Access-Token'] = token;
      }
    }
  }

  return headers;
};

// Configuración de CORS para desarrollo
export const CORS_CONFIG = {
  credentials: 'include' as RequestCredentials,
  mode: 'cors' as RequestMode,
};

export default config;

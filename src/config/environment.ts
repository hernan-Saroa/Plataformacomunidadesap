/**
 * Environment Configuration for ESAP Backoffice
 * 
 * Este archivo centraliza todas las variables de entorno y configuraciones
 * necesarias para conectar el frontend con el backend Node.js/Express
 */

// Safely access import.meta.env
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  try {
    return (import.meta?.env?.[key] as string) || defaultValue;
  } catch {
    return defaultValue;
  }
};

// Determinar el entorno actual
export const ENV = getEnvVar('MODE', 'development');

// URLs del API según el entorno
const API_URLS = {
  development: 'http://localhost:3001/api',
  staging: 'https://staging-api.esap.edu.co/api',
  production: 'https://api.esap.edu.co/api',
};

// Configuración general
export const config = {
  // URL base del API
  API_BASE_URL: getEnvVar('VITE_API_URL') || API_URLS[ENV as keyof typeof API_URLS],
  
  // Versión del API
  API_VERSION: 'v1',
  
  // Timeout para requests (ms)
  API_TIMEOUT: 30000,
  
  // Número de reintentos en caso de fallo
  API_RETRY_ATTEMPTS: 3,
  
  // Delay entre reintentos (ms)
  API_RETRY_DELAY: 1000,
  
  // WebSocket URL (para notificaciones en tiempo real)
  WS_URL: getEnvVar('VITE_WS_URL') || 'ws://localhost:3001',
  
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

// Endpoints del API
export const API_ENDPOINTS = {
  // Autenticación
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY: '/auth/verify',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  
  // Usuarios
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    BULK_CREATE: '/users/bulk',
    BULK_UPDATE: '/users/bulk-update',
    BULK_DELETE: '/users/bulk-delete',
    EXPORT: '/users/export',
    IMPORT: '/users/import',
    STATS: '/users/stats',
    ACTIVITY: (id: string) => `/users/${id}/activity`,
    ROLES: (id: string) => `/users/${id}/roles`,
  },
  
  // Personas (Usuario Persona)
  PERSONS: {
    BASE: '/persons',
    BY_ID: (id: string) => `/persons/${id}`,
    DOCUMENTS: (id: string) => `/persons/${id}/documents`,
    UPLOAD_DOCUMENT: (id: string) => `/persons/${id}/documents/upload`,
    VERIFY_DOCUMENT: (id: string, docId: string) => `/persons/${id}/documents/${docId}/verify`,
    TIMELINE: (id: string) => `/persons/${id}/timeline`,
    STATS: '/persons/stats',
    EXPORT: '/persons/export',
  },
  
  // Roles
  ROLES: {
    BASE: '/roles',
    BY_ID: (id: string) => `/roles/${id}`,
    PERMISSIONS: (id: string) => `/roles/${id}/permissions`,
    USERS: (id: string) => `/roles/${id}/users`,
    DUPLICATE: (id: string) => `/roles/${id}/duplicate`,
    COMPARE: '/roles/compare',
    PRESETS: '/roles/presets',
    STATS: '/roles/stats',
  },
  
  // Permisos
  PERMISSIONS: {
    BASE: '/permissions',
    BY_ID: (id: string) => `/permissions/${id}`,
    BY_CATEGORY: '/permissions/by-category',
    BULK_ASSIGN: '/permissions/bulk-assign',
    CHECK: '/permissions/check',
  },
  
  // Auditoría
  AUDIT: {
    BASE: '/audit',
    BY_ID: (id: string) => `/audit/${id}`,
    EVENTS: '/audit/events',
    STATS: '/audit/stats',
    TIMELINE: '/audit/timeline',
    EXPORT: '/audit/export',
    BY_USER: (userId: string) => `/audit/user/${userId}`,
    BY_ENTITY: (entityType: string, entityId: string) => `/audit/${entityType}/${entityId}`,
  },
  
  // Dashboard y Reportes
  DASHBOARD: {
    EXECUTIVE: '/dashboard/executive',
    STATS: '/dashboard/stats',
    KPI: '/dashboard/kpi',
    CHARTS: '/dashboard/charts',
    EXPORT: '/dashboard/export',
  },
  
  // Reportes
  REPORTS: {
    BASE: '/reports',
    GENERATE: '/reports/generate',
    BY_ID: (id: string) => `/reports/${id}`,
    DOWNLOAD: (id: string) => `/reports/${id}/download`,
    SCHEDULED: '/reports/scheduled',
    TEMPLATES: '/reports/templates',
  },
  
  // Notificaciones
  NOTIFICATIONS: {
    BASE: '/notifications',
    BY_ID: (id: string) => `/notifications/${id}`,
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
    UNREAD_COUNT: '/notifications/unread-count',
  },
  
  // Configuración
  SETTINGS: {
    BASE: '/settings',
    SYSTEM: '/settings/system',
    USER_PREFERENCES: '/settings/preferences',
    THEME: '/settings/theme',
    NOTIFICATIONS_SETTINGS: '/settings/notifications',
  },
  
  // Upload de archivos
  UPLOAD: {
    IMAGE: '/upload/image',
    DOCUMENT: '/upload/document',
    BULK: '/upload/bulk',
    AVATAR: '/upload/avatar',
  },
};

// Headers comunes para todas las requests
export const getDefaultHeaders = (includeAuth = true): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Version': '1.0.0',
    'X-Client-Platform': 'web',
  };
  
  if (includeAuth) {
    const token = localStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      headers[config.AUTH.TOKEN_HEADER] = `${config.AUTH.TOKEN_PREFIX} ${token}`;
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

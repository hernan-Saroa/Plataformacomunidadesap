/**
 * API Configuration
 * Configuración centralizada para todas las llamadas API
 */

// IMPORTANTE: Vite solo reemplaza accesos ESTÁTICOS a import.meta.env
// Accesos dinámicos como import.meta.env[key] NO funcionan en build

import { getPublicBaseUrl } from '../../config/environment';

// Acceso estático a variables de entorno de Vite
const VITE_API_URL = import.meta.env.VITE_API_URL as string | undefined;
const VITE_MODE = import.meta.env.MODE || 'development';

// URLs por ambiente (fallbacks si VITE_API_URL no está definida)
const API_URLS = {
  development: 'http://localhost:3000',
  // En servidor dev usamos la IP; cambiar a https://api.esap.edu.co en prod real
  production: 'http://4.156.71.181/services',
};

export const API_CONFIG = {
  // Base URLs por ambiente (URL del API Gateway, sin sufijos)
  // La estructura de endpoints es: /{service}/api/v{version}/{path}
  // Ejemplo: /auth/api/v1/login, /certificados/api/v1/generate
  baseURL: {
    development: VITE_API_URL || API_URLS.development,
    production: VITE_API_URL || API_URLS.production,
  },

  // Timeout para requests (30 segundos)
  timeout: 30000,

  // Headers por defecto
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
} as const;

const getDevBaseURL = (): string => {
  if (VITE_API_URL) return VITE_API_URL;
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const protocol = window.location.protocol || 'http:';
    const isLoopback = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    if (isLoopback) {
      return `${protocol}//${window.location.hostname}:3000`;
    }
    return `${protocol}//${window.location.hostname}/services`;
  }
  return API_URLS.development;
};

/**
 * Obtener la base URL según el ambiente
 */
export const getBaseURL = (): string => {
  const env = (VITE_MODE === 'production' ? 'production' : 'development') as 'development' | 'production';
  if (env === 'development') {
    return getDevBaseURL();
  }
  return API_CONFIG.baseURL[env];
};

/**
 * Obtener la URL base del frontend para QR codes y enlaces públicos
 */
export const getFrontendURL = (): string => {
  return getPublicBaseUrl();
};

/**
 * Storage keys para autenticación
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'esap_access_token',
  REFRESH_TOKEN: 'esap_refresh_token',
  USER_DATA: 'esap_user_data',
  SISTEMA_ACTUAL: 'esap_sistema_actual',
} as const;

/**
 * Tipos de respuesta del servidor
 */
export interface APIResponse<T = any> {
  exito: boolean;
  datos?: T;
  mensaje?: string;
  timestamp?: string;
}

export interface APIError {
  exito: false;
  error: {
    codigo: string;
    mensaje: string;
    detalles?: Record<string, string[]>;
    timestamp: string;
  };
}

export interface PaginatedResponse<T> {
  exito: true;
  datos: T[];
  paginacion: {
    pagina: number;
    porPagina: number;
    total: number;
    totalPaginas: number;
    hayAnterior: boolean;
    haySiguiente: boolean;
  };
}

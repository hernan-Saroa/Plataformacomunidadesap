/**
 * API Configuration
 * Configuración centralizada para todas las llamadas API
 */

// IMPORTANTE: Vite solo reemplaza accesos ESTÁTICOS a import.meta.env
// Accesos dinámicos como import.meta.env[key] NO funcionan en build

import { getApiGatewayBaseUrl, getPublicBaseUrl } from '../../config/environment';

const VITE_MODE = import.meta.env.MODE || 'development';
const RUNTIME_GATEWAY_BASE_URL = getApiGatewayBaseUrl();

export const API_CONFIG = {
  // Base URLs por ambiente (URL del API Gateway, sin sufijos)
  // La estructura de endpoints es: /{service}/api/v{version}/{path}
  // Ejemplo: /auth/api/v1/login, /certificados/api/v1/generate
  baseURL: {
    development: RUNTIME_GATEWAY_BASE_URL,
    production: RUNTIME_GATEWAY_BASE_URL,
  },

  // Timeout para requests (30 segundos)
  timeout: 30000,

  // Headers por defecto
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
} as const;

/**
 * Obtener la base URL según el ambiente
 */
export const getBaseURL = (): string => {
  const env = (VITE_MODE === 'production' ? 'production' : 'development') as 'development' | 'production';
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

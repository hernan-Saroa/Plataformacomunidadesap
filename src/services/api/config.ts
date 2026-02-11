/**
 * API Configuration
 * Configuración centralizada para todas las llamadas API
 */

// Helper para obtener variables de entorno de forma segura
const getEnvVar = (key: string, defaultValue: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || defaultValue;
  }
  return defaultValue;
};

export const API_CONFIG = {
  // Base URLs por ambiente
  baseURL: {
    development: getEnvVar('VITE_API_URL', 'http://localhost:3000/api/v1'),
    production: getEnvVar('VITE_API_URL', 'https://api.esap.edu.co/v1'),
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
  const mode = getEnvVar('VITE_MODE', 'development');
  const env = (mode === 'production' ? 'production' : 'development') as 'development' | 'production';
  return API_CONFIG.baseURL[env];
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
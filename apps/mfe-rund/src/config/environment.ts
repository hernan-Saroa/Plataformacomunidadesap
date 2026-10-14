/** Configuración del transporte RUND. La sesión continúa en cookies HttpOnly. */
export const ENV = import.meta.env.MODE || 'development';
const VITE_API_URL = import.meta.env.VITE_API_URL as string | undefined;
const VITE_PUBLIC_FRONTEND_URL = import.meta.env.VITE_PUBLIC_FRONTEND_URL as string | undefined;
export const API_MODE = import.meta.env.VITE_API_MODE || 'gateway';

const isLoopbackHost = (host?: string | null) =>
  host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';

function rewriteLoopbackUrl(rawUrl: string): string {
  if (typeof window === 'undefined') return rawUrl;
  try {
    const url = new URL(rawUrl);
    const hadTrailingSlash = rawUrl.endsWith('/');
    if (isLoopbackHost(url.hostname) && window.location.hostname && !isLoopbackHost(window.location.hostname)) {
      url.host = window.location.host;
      url.protocol = window.location.protocol;
      if (!hadTrailingSlash && url.pathname === '/' && !url.search && !url.hash) {
        return `${url.protocol}//${url.host}`;
      }
      return url.toString();
    }
  } catch {
    // Una URL relativa se normaliza posteriormente respecto del frontend.
  }
  return rawUrl;
}

export function getApiGatewayBaseUrl(): string {
  if (VITE_API_URL) {
    const configured = rewriteLoopbackUrl(VITE_API_URL);
    try {
      return new URL(configured, typeof window !== 'undefined' ? window.location.origin : undefined)
        .toString().replace(/\/$/, '');
    } catch {
      return configured;
    }
  }
  if (typeof window !== 'undefined' && window.location.hostname) {
    const { protocol, hostname, origin } = window.location;
    if (ENV === 'development' || isLoopbackHost(hostname)) {
      return `${protocol}//${hostname}:4000`;
    }
    if (hostname.endsWith('.trycloudflare.com')) return origin.replace(/\/$/, '');
    return `${origin.replace(/\/$/, '')}/services`;
  }
  return 'http://localhost:4000';
}

// Prefijos que utiliza este MFE: servicio propio, sesión y catálogos académicos.
export const MICROSERVICE_URLS = {
  auth: rewriteLoopbackUrl(import.meta.env.VITE_AUTH_URL || 'http://localhost:3001'),
  pta: rewriteLoopbackUrl(import.meta.env.VITE_PTA_URL || 'http://localhost:3003'),
  rund: rewriteLoopbackUrl(import.meta.env.VITE_RUND_URL || 'http://localhost:3016'),
};

export function getPublicBaseUrl(): string {
  if (VITE_PUBLIC_FRONTEND_URL) return VITE_PUBLIC_FRONTEND_URL;
  if (typeof window !== 'undefined' && window.location.origin) return window.location.origin;
  return 'http://localhost:3000';
}

export const config = {
  API_BASE_URL: getApiGatewayBaseUrl(),
  API_TIMEOUT: 30000,
  API_RETRY_ATTEMPTS: 3,
  API_RETRY_DELAY: 1000,
};

export const API_ENDPOINTS = { AUTH: { REFRESH: '/auth/api/v1/refresh' } };

export const getDefaultHeaders = (_includeAuth = true): HeadersInit => ({
  'Content-Type': 'application/json; charset=utf-8',
  Accept: 'application/json; charset=utf-8',
  'X-Client-Version': '1.0.0',
  'X-Client-Platform': 'web',
  ...(typeof window !== 'undefined' ? { 'X-Frontend-Base-Url': getPublicBaseUrl() } : {}),
});

export const CORS_CONFIG = {
  credentials: 'include' as RequestCredentials,
  mode: 'cors' as RequestMode,
};

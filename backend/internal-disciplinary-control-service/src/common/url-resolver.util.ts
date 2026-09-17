import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';

// AsyncLocalStorage para persistir el contexto de la petición activa (como la URL del frontend enviada en headers)
export const requestContextStorage = new AsyncLocalStorage<{ frontendBaseUrl?: string }>();

/**
 * Normaliza y limpia una URL quitando slashes finales y descartando valores inválidos como 'NOT_DEFINED' o 'null'
 */
export function cleanBaseUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed.toUpperCase() === 'NOT_DEFINED' ||
    trimmed.toLowerCase() === 'null' ||
    trimmed.toLowerCase() === 'undefined'
  ) {
    return null;
  }
  return trimmed.replace(/\/+$/, '');
}

/**
 * Extrae la URL base del frontend desde los headers de una petición Express
 */
export function extractFrontendUrlFromHeaders(headers: Record<string, any>): string | null {
  if (!headers) return null;

  // 1. Header explícito X-Frontend-Base-Url o X-Frontend-Url
  const explicit = cleanBaseUrl(headers['x-frontend-base-url'] || headers['x-frontend-url']);
  if (explicit && /^https?:\/\//i.test(explicit)) return explicit;

  // 2. Origin header (enviado automáticamente por los navegadores en CORS o peticiones HTTP)
  const origin = cleanBaseUrl(headers['origin']);
  if (origin && /^https?:\/\//i.test(origin)) return origin;

  // 3. Referer header (enviado en la mayoría de peticiones del navegador)
  const referer = cleanBaseUrl(headers['referer']);
  if (referer && /^https?:\/\//i.test(referer)) {
    try {
      const parsed = new URL(referer);
      return parsed.origin.replace(/\/+$/, '');
    } catch (_) {
      // Ignorar errores de parsing
    }
  }

  // 4. X-Forwarded-Host y X-Forwarded-Proto (si pasa por reverse proxy / API Gateway / Nginx)
  const xForwardedHost = cleanBaseUrl(headers['x-forwarded-host']);
  if (xForwardedHost) {
    const proto = cleanBaseUrl(headers['x-forwarded-proto']) || 'http';
    return `${proto}://${xForwardedHost}`.replace(/\/+$/, '');
  }

  return null;
}

/**
 * Middleware para NestJS que almacena en el AsyncLocalStorage la URL del frontend detectada en los headers
 */
export function frontendContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  const detectedUrl = extractFrontendUrlFromHeaders(req.headers);
  requestContextStorage.run({ frontendBaseUrl: detectedUrl || undefined }, () => {
    next();
  });
}

/**
 * Resuelve de forma robusta la URL base pública del frontend de la plataforma.
 * 
 * Orden de resolución:
 * 1. URL pasada explícitamente como parámetro (si es válida)
 * 2. URL detectada en el contexto de la petición actual (AsyncLocalStorage) si no es localhost
 * 3. Variable de entorno PUBLIC_APP_URL
 * 4. Variable de entorno FRONTEND_URL
 * 5. Variable de entorno PUBLIC_FRONTEND_URL
 * 6. Variable de entorno FRONTEND_BASE_URL
 * 7. Variable de entorno SERVER_URL_ENV
 * 8. Variable de entorno SERVER_IP (http://${SERVER_IP})
 * 9. URL detectada en la petición actual aunque sea localhost (para desarrollo local)
 * 10. Fallback según NODE_ENV:
 *     - Si production: 'https://comunidadesap.esap.edu.co'
 *     - Si no: 'http://localhost:3000'
 */
export function resolveFrontendBaseUrl(overrideUrl?: string): string {
  // 1. Override explícito
  const cleanedOverride = cleanBaseUrl(overrideUrl);
  if (cleanedOverride && /^https?:\/\//i.test(cleanedOverride)) {
    return cleanedOverride;
  }

  // Obtener URL de headers si estamos dentro de una petición HTTP
  const contextUrl = cleanBaseUrl(requestContextStorage.getStore()?.frontendBaseUrl);

  // 2. Si hay contexto de headers y NO es localhost, tiene la máxima fidelidad porque proviene del cliente real
  const isContextLocal = contextUrl ? /localhost|127\.0\.0\.1|::1/i.test(contextUrl) : true;
  if (contextUrl && !isContextLocal) {
    return contextUrl;
  }

  // 3. Variables de entorno estándar
  const envPublicAppUrl = cleanBaseUrl(process.env.PUBLIC_APP_URL);
  if (envPublicAppUrl && /^https?:\/\//i.test(envPublicAppUrl)) return envPublicAppUrl;

  const envFrontendUrl = cleanBaseUrl(process.env.FRONTEND_URL);
  if (envFrontendUrl && /^https?:\/\//i.test(envFrontendUrl)) return envFrontendUrl;

  const envPublicFrontendUrl = cleanBaseUrl(process.env.PUBLIC_FRONTEND_URL);
  if (envPublicFrontendUrl && /^https?:\/\//i.test(envPublicFrontendUrl)) return envPublicFrontendUrl;

  const envFrontendBaseUrl = cleanBaseUrl(process.env.FRONTEND_BASE_URL);
  if (envFrontendBaseUrl && /^https?:\/\//i.test(envFrontendBaseUrl)) return envFrontendBaseUrl;

  const envServerUrl = cleanBaseUrl(process.env.SERVER_URL_ENV);
  if (envServerUrl && /^https?:\/\//i.test(envServerUrl)) return envServerUrl;

  const envServerIp = cleanBaseUrl(process.env.SERVER_IP);
  if (envServerIp) {
    return `http://${envServerIp}`.replace(/\/+$/, '');
  }

  // 4. Si el contexto de petición existía (aunque fuera localhost en desarrollo local)
  if (contextUrl) {
    return contextUrl;
  }

  // 5. Fallback final según ambiente
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    return 'https://comunidadesap.esap.edu.co';
  }

  return 'http://localhost:3000';
}

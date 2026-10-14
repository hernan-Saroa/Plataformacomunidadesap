/** Las consultas RUND se revalidan con el servidor y el rol de la sesión actual. */
import { API_MODE, MICROSERVICE_URLS } from '../../config/environment';

export function isRundRequest(url: string): boolean {
  let parsed: URL;
  try { parsed = new URL(url, 'http://ruta-local'); } catch { return false; }
  const path = parsed.pathname;
  if (/\/(?:rund|rund-service)\/api\/v\d+(?:\/|$)/i.test(path)) return true;
  if (/\/(banco-docentes|macro-docente|docentes-disponibles)(\/|$)/i.test(path)) return true;
  if (/\/pta\/api\/v\d+\/rund(?:\/|$)/i.test(path)) return true;
  if (API_MODE === 'direct') {
    try { return parsed.origin === new URL(MICROSERVICE_URLS.rund).origin; } catch { return false; }
  }
  return false;
}

export function excludesRundCache(url: string, data?: unknown): boolean {
  if (isRundRequest(url) || isCarpetaDocumentRequest(url)) return true;
  // Solo inspeccionar canales que pueden incluir perfiles o documentos RUND.
  if (!/\/(pta|auth)\/api\//i.test(url)) return false;
  const visit = (value: unknown): boolean => {
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value)) return value.some(visit);
    return Object.entries(value).some(([key, nested]) => {
      const normalized = key.replace(/[^a-z]/gi, '').toLowerCase();
      if (['protecciondatos', 'rundsoporteid', 'documentoidentidad', 'documentnumber',
        'numidentificacion', 'puntajesalarial', 'docenteidentificacion', 'identificacion'].includes(normalized) && nested != null) return true;
      return ((key === 'origen' || key === 'categoria') && String(nested).toLowerCase() === 'rund') || visit(nested);
    });
  };
  return visit(data);
}

export function isCarpetaDocumentRequest(url: string): boolean {
  let parsed: URL;
  try { parsed = new URL(url, 'http://ruta-local'); } catch { return false; }
  return /\/(?:portal\/)?carpeta-digital(?:\/|$)/i.test(parsed.pathname)
    || /\/uploads\/carpeta-digital(?:\/|$)/i.test(parsed.pathname);
}

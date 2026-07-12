import { getBaseURL } from '../../../../../shell/src/services/api';

/**
 * Construye la URL pública (vía API Gateway) de un archivo servido por el microservicio PTA.
 * El gateway expone los estáticos del servicio en /pta/uploads/... (ruta pública) y los reenvía
 * a /uploads/... del backend. Usa la MISMA base que las llamadas API (getBaseURL), por lo que
 * funciona en cualquier entorno.
 */
export function resolvePtaFileUrl(raw?: string | null): string {
  const value = String(raw || '').trim();
  if (!value) return '#';
  if (/^https?:\/\//i.test(value)) return value; // ya es absoluta
  const base = (getBaseURL() || '').replace(/\/$/, '');
  if (value.startsWith('/pta/')) return `${base}${value}`;          // ya trae el prefijo de servicio
  if (value.startsWith('/uploads')) return `${base}/pta${value}`;   // /uploads/... → /pta/uploads/...
  return `${base}/pta/${value.replace(/^\/+/, '')}`;
}

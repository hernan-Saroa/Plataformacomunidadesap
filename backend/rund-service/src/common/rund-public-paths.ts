/**
 * Rutas públicas de rund-service tal como las publica el gateway. Los archivos se guardan en el disco de
 * rund-service y la URL que se persiste y se devuelve al navegador debe apuntar a este servicio, no a PTA.
 */
export const RUND_PUBLIC_BASE = '/rund/api/v1';
export const RUND_UPLOADS_BASE = `${RUND_PUBLIC_BASE}/uploads`;
export const RUND_BANCO_DOCENTES_BASE = `${RUND_PUBLIC_BASE}/pta/banco-docentes`;
export const RUND_MACRO_DOCENTE_BASE = `${RUND_PUBLIC_BASE}/pta/macro-docente`;

/** Prefijo con el que el RUND embebido en PTA guardaba las URLs de sus archivos (registros históricos). */
export const PTA_UPLOADS_BASE_HISTORICO = '/pta/api/v1/uploads';

/** URL pública de un soporte guardado en ./uploads/carpeta-digital/<docente>/RUND/<archivo>. */
export function urlSoporteCarpetaDigital(docenteNombre: string, archivo: string): string {
  return `${RUND_UPLOADS_BASE}/carpeta-digital/${docenteNombre}/RUND/${archivo}`;
}

/** ¿Este registro ya apunta al archivo? Acepta el prefijo histórico de PTA para no duplicar vínculos. */
export function apuntaAlArchivo(documentoCarpetaId: string | null | undefined, docenteNombre: string, archivo: string): boolean {
  if (!documentoCarpetaId) return false;
  const relativa = `/carpeta-digital/${docenteNombre}/RUND/${archivo}`;
  return documentoCarpetaId === `${RUND_UPLOADS_BASE}${relativa}` || documentoCarpetaId === `${PTA_UPLOADS_BASE_HISTORICO}${relativa}`;
}

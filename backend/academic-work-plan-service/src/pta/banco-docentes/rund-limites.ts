/**
 * Límites de la carga documental del RUND. Un expediente real trae decenas de archivos por carpeta (por ejemplo,
 * más de 70 en productividad académica) y algunos PDF escaneados superan los 10 MB.
 * El frontend repite estos valores en `apps/mfe-pta/src/utils/rundEvidenceRules.ts`: si se cambian aquí, cámbielos allá.
 */
/** Máximo de archivos vigentes por punto de control (soporte). */
export const RUND_MAX_EVIDENCES_PER_TYPE = 200;
/** Tamaño máximo por archivo de soporte, en bytes (25 MB). El catálogo `RundDocumentoCategoria` lo refleja (migración 683). */
export const RUND_MAX_ARCHIVO_BYTES = 25 * 1024 * 1024;

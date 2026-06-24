/**
 * Utilidades para normalización y validación del estado del Plan Anual.
 *
 * El backend almacena estados con guiones (ej: "en-ejecucion")
 * mientras el frontend usa guiones bajos/mayúsculas (ej: "EN_EJECUCION").
 * Estas funciones eliminan la discrepancia centralizando la lógica.
 */

/** Estados que representan un plan aprobado/activo */
const ESTADOS_APROBADOS = new Set([
  'APROBADO',
  'VIGENTE',
  'EN_EJECUCION',
  'ACTIVO',
  'COMPLETADO',
]);

/**
 * Normaliza un estado del plan a formato estándar: MAYÚSCULAS con guiones bajos.
 * Convierte "en-ejecucion" → "EN_EJECUCION", "aprobado" → "APROBADO", etc.
 */
export function normalizarEstadoPlan(estado: string | undefined | null): string {
  if (!estado) return '';
  return estado.toUpperCase().replace(/-/g, '_');
}

/**
 * Verifica si un plan está en un estado considerado "aprobado" o "activo".
 * Esto incluye: APROBADO, VIGENTE, EN_EJECUCION, ACTIVO, COMPLETADO.
 *
 * @example
 * isPlanAprobado('en-ejecucion')  // true  (backend snake-case)
 * isPlanAprobado('VIGENTE')       // true  (frontend)
 * isPlanAprobado('borrador')      // false
 * isPlanAprobado('EN_REVISION')   // false
 */
export function isPlanAprobado(estado: string | undefined | null): boolean {
  return ESTADOS_APROBADOS.has(normalizarEstadoPlan(estado));
}

/**
 * Retorna etiqueta legible para un estado normalizado.
 */
export function etiquetaEstadoPlan(estado: string | undefined | null): string {
  const norm = normalizarEstadoPlan(estado);
  const map: Record<string, string> = {
    BORRADOR: 'Borrador',
    EN_REVISION: 'En Revisión',
    APROBADO: 'Aprobado',
    VIGENTE: 'Vigente',
    EN_EJECUCION: 'En Ejecución',
    ACTIVO: 'Activo',
    COMPLETADO: 'Completado',
    DEVUELTO: 'Devuelto',
  };
  return map[norm] || norm || 'Pendiente';
}

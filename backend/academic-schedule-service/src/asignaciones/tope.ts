import { categoriaVinculacion } from './situacion-docente.js';

/**
 * Tope de docencia de un docente — RN-04. UNA SOLA regla para todos los caminos.
 *
 * Quien le da franjas a un docente (el portal, cuando él las toma; el backoffice,
 * cuando se le asigna un grupo) y quien muestra su acumulado usan estas dos
 * funciones. Antes el acumulado decía «304 h para cátedra», el backoffice usaba
 * `horasAsignables` (0 para un catedrático, es decir «sin tope») y el portal no
 * validaba nada al tomar.
 */

/** Tope transversal del catedrático, RN-04 (horas). */
export const TOPE_CATEDRA = 304;

/**
 * Tope de docencia: 304 h para cátedra; para los demás, lo que el plan les deja
 * asignable (`horasAsignables`, ya sin investigación ni extensión, RN-06).
 * 0 significa tope no definido: no hay límite que exceder.
 */
export function topeDeDocencia(vinculacion: string | null | undefined, horasAsignables: number | string | null | undefined): number {
  return categoriaVinculacion(vinculacion) === 'CATEDRA' ? TOPE_CATEDRA : Number(horasAsignables ?? 0);
}

/**
 * ¿Pasarse del tope? `total` es lo que el docente tendría con la franja o el
 * grupo nuevo. Quedar JUSTO en el tope se permite; sin tope definido (≤ 0), no
 * hay nada que exceder.
 */
export function superaElTope(total: number, tope: number): boolean {
  return tope > 0 && total > tope;
}

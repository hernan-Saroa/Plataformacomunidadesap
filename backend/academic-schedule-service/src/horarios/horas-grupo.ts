import { aMinutos } from './solapamiento.js';

/**
 * Margen sobre las horas del catálogo antes de considerar que un grupo EXCEDE.
 * El histórico real desvía: la mediana programa 1.06× lo requerido y solo el
 * 58% cae dentro de ±25%; ×1.3 igual atrapa el error grueso (160 h sobre 64 h).
 */
export const FACTOR_TOPE_HORAS = 1.3;

export interface HorasDelGrupo {
  programadas: number | null;
  requeridas: number | null;
  semanas: number | null;
  excede: boolean;
}

/**
 * Horas del grupo: PROGRAMADAS (Σ duración semanal × semanas del ciclo) frente a
 * las REQUERIDAS por el catálogo (asignatura.horas_clase, Circular 003: nunca se
 * recalculan). Sin fechas de ciclo no hay semanas: no se valida ni se bloquea.
 *
 * Una sola función para `GET /horarios/grupo/:id/horas` y la vista por niveles.
 */
export function horasDelGrupo(
  fechaInicio: string | Date | null | undefined,
  fechaFin: string | Date | null | undefined,
  franjas: ReadonlyArray<{ horaInicio: string; horaFin: string }>,
  requeridas: number | null,
): HorasDelGrupo {
  let semanas: number | null = null;
  if (fechaInicio && fechaFin) {
    const dias = Math.round((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / 86400000) + 1;
    semanas = Math.max(1, Math.round(dias / 7));
  }
  const horasSemana = franjas.reduce((s, f) => {
    const ini = aMinutos(String(f.horaInicio).slice(0, 5));
    const fin = aMinutos(String(f.horaFin).slice(0, 5));
    return s + Math.max(0, fin - ini) / 60;
  }, 0);
  const programadas = semanas != null ? Math.round(horasSemana * semanas * 100) / 100 : null;
  const excede = programadas != null && requeridas != null && programadas > requeridas * FACTOR_TOPE_HORAS;
  return { programadas, requeridas, semanas, excede };
}

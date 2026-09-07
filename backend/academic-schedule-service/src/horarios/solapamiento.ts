/**
 * Reglas de tiempo del horario (bloqueo B-5, decisiones por defecto documentadas).
 *
 * Aisladas del servicio para poder probarlas sin base y para que cambiar la
 * política no obligue a tocar los endpoints.
 */

/** 'HH:MM' o 'HH:MM:SS' → minutos desde medianoche. */
export function aMinutos(hora: string): number {
  const [h, m] = String(hora).split(':').map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

/** Granularidad mínima de 5 minutos, compatible con "sin intervalos fijos". */
export const GRANULARIDAD_MINUTOS = 5;

export function esMultiploDeGranularidad(hora: string): boolean {
  const min = aMinutos(hora);
  return Number.isFinite(min) && min % GRANULARIDAD_MINUTOS === 0;
}

/**
 * ¿Se solapan dos rangos del mismo día?
 *
 * Tocarse en el extremo NO es solapar: una sesión de 08:00–10:00 y otra de
 * 10:00–12:00 son consecutivas, no simultáneas.
 */
export function seSolapan(
  aInicio: string, aFin: string,
  bInicio: string, bFin: string,
): boolean {
  return aMinutos(aInicio) < aMinutos(bFin) && aMinutos(bInicio) < aMinutos(aFin);
}

export interface FranjaComparable {
  idFranja?: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
}

/**
 * Primera franja del MISMO grupo que choca con la propuesta, o null.
 *
 * Solo intra-grupo: un grupo no puede dictarse dos veces a la vez. El cruce
 * ENTRE grupos distintos se permite aquí a propósito — es competencia del
 * bloqueo transversal (RN-07, EFDS-1374, fase 3).
 */
export function buscarSolapeIntraGrupo(
  propuesta: FranjaComparable,
  existentes: FranjaComparable[],
): FranjaComparable | null {
  for (const f of existentes) {
    if (propuesta.idFranja && f.idFranja === propuesta.idFranja) continue; // es ella misma al editar
    if (f.diaSemana !== propuesta.diaSemana) continue;
    if (seSolapan(propuesta.horaInicio, propuesta.horaFin, f.horaInicio, f.horaFin)) return f;
  }
  return null;
}

/** Jornada sugerida a partir de la hora y el día. Es sugerencia, no imposición. */
export function jornadaSugerida(dia: string, horaInicio: string): 'DIURNA' | 'NOCTURNA' | 'FIN_DE_SEMANA' {
  if (dia === 'SABADO' || dia === 'DOMINGO') return 'FIN_DE_SEMANA';
  return aMinutos(horaInicio) >= 18 * 60 ? 'NOCTURNA' : 'DIURNA';
}

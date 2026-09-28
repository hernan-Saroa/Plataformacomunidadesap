import { DIAS_AVISO_VENCIMIENTO, diasHabilesRestantes, sumarDiasHabiles } from '../publicacion/dias-habiles';
import { festivosEntre } from '../publicacion/festivos-colombia';

/** Cómo va el plazo de una actividad, contado en días hábiles. */
export interface PlazoCalculado {
  /** `YYYY-MM-DD` del último día hábil del plazo. */
  vence: string;
  /** Días hábiles que quedan; negativo cuando ya se venció. */
  restantes: number;
  estado: 'VENCIDO' | 'POR_VENCER' | 'VIGENTE';
}

/**
 * El plazo de una actividad (EFDS-1183).
 *
 * En la reunión de validación se acordó que los plazos son por actividad y en
 * días hábiles: sin fines de semana ni festivos. Se cuenta desde el día en que
 * le tocó a alguien —cuando se habilitó—, porque antes de eso nadie podía
 * hacerla y no tendría sentido que el plazo corriera.
 *
 * Usa el mismo conteo que el plazo de publicidad, que ya está probado contra
 * semana santa, fin de año y los lunes festivos: dos formas de contar días
 * hábiles en el mismo módulo acabarían dando fechas distintas para lo mismo.
 */
export function plazoDeActividad(
  desde: string,
  plazoDias: number,
  avisarAntes: number | null,
  hoy: string,
): PlazoCalculado {
  const primerAnio = Number(desde.slice(0, 4));
  const ultimoAnio = Math.max(primerAnio, Number(hoy.slice(0, 4))) + 1;
  const festivos = festivosEntre(primerAnio, ultimoAnio);

  const vence = sumarDiasHabiles(desde, plazoDias, festivos);
  const restantes = diasHabilesRestantes(hoy, vence, festivos);
  const umbral = avisarAntes ?? DIAS_AVISO_VENCIMIENTO;

  return {
    vence,
    restantes,
    estado: restantes < 0 ? 'VENCIDO' : restantes <= umbral ? 'POR_VENCER' : 'VIGENTE',
  };
}

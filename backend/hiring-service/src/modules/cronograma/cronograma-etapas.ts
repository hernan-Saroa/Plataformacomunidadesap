import { diasParaVencer, EstadoAlerta, estadoAlerta } from '../alertas/alertas.service';

/** La 5.2 de la matriz: la elaboración del cronograma. */
export const NUMERAL_CRONOGRAMA = '5.2';

/**
 * Las etapas macro que se programan en la 5.2: la quinta, en la que se está, y
 * las que faltan. De la 1 a la 4 ya pasaron cuando se elabora el cronograma.
 */
export const ETAPAS_DEL_CRONOGRAMA = [5, 6, 7, 8, 9, 10] as const;

/** Los nombres de las etapas, como los escribe la matriz. */
export const NOMBRE_ETAPA: Record<number, string> = {
  5: 'Elaboración y publicación del proceso',
  6: 'Recepción y evaluación de ofertas',
  7: 'Adjudicación',
  8: 'Perfeccionamiento y legalización',
  9: 'Ejecución y supervisión',
  10: 'Seguimiento, control y liquidación',
};

export type EstadoEtapaCronograma = EstadoAlerta | 'CUMPLIDA' | 'SIN_FECHA';

/**
 * Cómo va una etapa del cronograma.
 *
 * Cumplida manda sobre la fecha: una etapa terminada después de su fecha ya no
 * pide nada, y alertarla sería ruido. Sin fecha de fin no hay qué vigilar.
 */
export function estadoDeLaEtapa(
  fechaFin: string | null,
  cumplida: boolean,
  hoy: string,
  anticipacion: number,
): { estado: EstadoEtapaCronograma; diasRestantes: number | null } {
  if (cumplida) return { estado: 'CUMPLIDA', diasRestantes: null };
  if (!fechaFin) return { estado: 'SIN_FECHA', diasRestantes: null };
  const diasRestantes = diasParaVencer(fechaFin, hoy);
  return { estado: estadoAlerta(diasRestantes, anticipacion), diasRestantes };
}

/**
 * La condición SQL de «la etapa ya se cumplió», sobre una fila `c` de
 * `hiring.cronograma_etapas` y su proceso `p`.
 *
 * Se deriva y no se marca (ver la migración 135): el proceso aprobó alguna
 * actividad de una etapa posterior, o el proceso terminó.
 */
export const SQL_ETAPA_CUMPLIDA = `(
  p.estado IN ('DESIERTO', 'NEGADO', 'CANCELADO')
  OR EXISTS (
    SELECT 1 FROM hiring.proceso_actividades pa
     WHERE pa.proceso_id = c.proceso_id
       AND pa.estado = 'APROBADO'
       AND split_part(pa.numeral, '.', 1)::int > c.etapa
  )
  OR EXISTS (
    SELECT 1 FROM hiring.contratos k
     WHERE k.proceso_id = c.proceso_id AND k.estado IN ('LIQUIDADO', 'CERRADO')
  )
)`;

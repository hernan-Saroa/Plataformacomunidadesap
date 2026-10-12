/**
 * Reparto de las horas de un grupo entre los docentes que lo comparten — EFDS-2306.
 *
 * ⚠️ PENDIENTE DEL NEGOCIO: cómo se cuentan las horas cuando dos docentes
 * comparten un grupo. Mientras no responda, la regla vigente es POR DÍAS. Está
 * aislada en esta función, con una firma fija (`ReglaReparto`), para que la
 * respuesta del negocio se incorpore cambiando SOLO esta función o pasando otra
 * a `DocenciaService`, sin tocar el acumulado, el tope ni la concertación.
 */

/** Lo mínimo de una franja que necesita una regla de reparto. */
export interface FranjaReparto {
  diaSemana: string;
  idDocente: string | null;
  horaInicio: string;
  horaFin: string;
}

/** Fracción (0..1) de las horas del grupo que le corresponden a `idDocente`. */
export type ReglaReparto = (franjasDelGrupo: readonly FranjaReparto[], idDocente: string) => number;

/**
 * Regla vigente: por DÍAS. Le corresponde la fracción de días de clase del grupo
 * en que el docente dicta: días con alguna franja suya / días con franja del
 * grupo. Los días aún sin docente cuentan en el denominador: las horas de un
 * día que nadie ha tomado no se le cargan a nadie.
 */
export const repartoPorDias: ReglaReparto = (franjas, idDocente) => {
  const diasGrupo = new Set(franjas.map((f) => f.diaSemana));
  if (diasGrupo.size === 0) return 0;
  const diasDocente = new Set(franjas.filter((f) => f.idDocente === idDocente).map((f) => f.diaSemana));
  return diasDocente.size / diasGrupo.size;
};

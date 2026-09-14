/**
 * Estrategia de numeración de grupos — AISLADA Y REEMPLAZABLE (bloqueo B-4).
 *
 * La regla definitiva sigue pendiente de confirmación con las decanaturas. Se
 * implementa la secuencial simple (1, 2, 3…) y se concentra aquí para que
 * cambiarla no obligue a tocar el servicio ni los endpoints: basta sustituir
 * esta función.
 */
export type EstrategiaNumeracion = (numerosExistentes: number[]) => number;

/**
 * Secuencial simple: el siguiente número libre a partir del mayor asignado.
 *
 * NO reutiliza huecos. Si se borra el grupo 2 de [1,2,3], el siguiente es 4, no
 * 2: reciclar el número haría que "grupo 2" designara dos ofertas distintas en
 * actas y horarios ya emitidos.
 */
export const numeracionSecuencial: EstrategiaNumeracion = (numerosExistentes) => {
  if (!numerosExistentes || numerosExistentes.length === 0) return 1;
  return Math.max(...numerosExistentes.map((n) => Number(n) || 0)) + 1;
};

/** Estrategia activa. Único punto a cambiar cuando las decanaturas confirmen. */
export const siguienteNumeroGrupo: EstrategiaNumeracion = numeracionSecuencial;

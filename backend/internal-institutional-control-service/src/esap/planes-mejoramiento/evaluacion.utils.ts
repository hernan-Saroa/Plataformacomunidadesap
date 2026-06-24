/**
 * Fórmulas de evaluación para el seguimiento de Planes de Mejoramiento.
 *
 * Fuente normativa: EM-FO-002 v3 (instructivo del formato).
 * Escalas literales del formato: Cumple 2 / Cumple parcialmente 1 / No cumple 0.
 *
 * ⚠️ NOTA: los umbrales exactos del cumplimiento parcial NO están definidos
 * literalmente en el procedimiento EM-PT-002 ni en el EM-FO-002.
 * La implementación usa una interpretación razonable (cualquier avance > 0 = parcial)
 * que debe VALIDARSE CON LA OCI antes de considerarla definitiva (spec §10, pregunta 1).
 */

/**
 * Calcula el cumplimiento de una acción de mejora.
 *
 * Escala (EM-FO-002):
 *  - 2 = Cumple (implementadas >= programadas)
 *  - 1 = Cumple parcialmente (implementadas > 0 pero < programadas)
 *  - 0 = No cumple (implementadas = 0 o programadas <= 0)
 *
 * @param implementadas — Cantidad de acciones implementadas
 * @param programadas — Cantidad de acciones programadas
 * @returns 0 | 1 | 2
 */
export function calcularCumplimiento(
  implementadas: number,
  programadas: number,
): 0 | 1 | 2 {
  if (programadas <= 0) return 0;
  if (implementadas >= programadas) return 2;
  if (implementadas > 0) return 1;
  return 0;
}

/**
 * Calcula la efectividad de una acción de mejora.
 *
 * Escala (EM-FO-002):
 *  - 2 = Efectiva (ambos criterios SI)
 *  - 1 = Parcialmente efectiva (un criterio SI)
 *  - 0 = Inefectiva (ambos criterios NO)
 *
 * Criterios (EM-FO-002):
 *  1. "Evaluar la aplicación de controles…"
 *  2. "Validar que la situación no se volvió a presentar"
 *
 * La efectividad se verifica EN LA SIGUIENTE AUDITORÍA al proceso (EM-PT-002 act. 9).
 *
 * @param aplicacionControles — ¿Se aplicaron los controles?
 * @param situacionNoRepitio — ¿La situación no se volvió a presentar?
 * @returns 0 | 1 | 2
 */
export function calcularEfectividad(
  aplicacionControles: boolean,
  situacionNoRepitio: boolean,
): 0 | 1 | 2 {
  if (aplicacionControles && situacionNoRepitio) return 2;
  if (aplicacionControles || situacionNoRepitio) return 1;
  return 0;
}

/**
 * Calcula el puntaje ponderado (cumplimiento × ponderación).
 * La ponderación por defecto es 1 (EM-FO-002 la trae en 1).
 *
 * ⚠️ CONFIGURABLE: la OCI puede querer otra ponderación (spec §10, pregunta 3).
 */
export function calcularPuntaje(
  calificacion: number,
  ponderacion: number = 1,
): number {
  return calificacion * ponderacion;
}

/**
 * Etiqueta legible para el nivel de cumplimiento.
 */
export function etiquetaCumplimiento(cumplimiento: 0 | 1 | 2): string {
  switch (cumplimiento) {
    case 2: return 'Cumple';
    case 1: return 'Cumple parcialmente';
    case 0: return 'No cumple';
    default: return 'Sin evaluar';
  }
}

/**
 * Etiqueta legible para el nivel de efectividad.
 */
export function etiquetaEfectividad(efectividad: 0 | 1 | 2): string {
  switch (efectividad) {
    case 2: return 'Efectiva';
    case 1: return 'Parcialmente efectiva';
    case 0: return 'Inefectiva';
    default: return 'Sin evaluar';
  }
}

/**
 * Color semáforo para un porcentaje de cumplimiento global.
 */
export function colorSemaforo(porcentaje: number): 'verde' | 'amarillo' | 'rojo' {
  if (porcentaje >= 80) return 'verde';
  if (porcentaje >= 50) return 'amarillo';
  return 'rojo';
}

/** Cómo se pinta una actividad en el riel y en la lista. */
export type EstadoActividadUI = 'aprobada' | 'en_curso' | 'pendiente' | 'no_aplica';

/**
 * Traduce el estado que devuelve el backend al que muestra la interfaz.
 *
 * El backend responde con el estado de la fila en proceso_actividades, o `null`
 * cuando la actividad todavía no tiene fila: nadie la ha empezado. Esa
 * diferencia es la que separa el punto azul del punto vacío, y perderla vacía
 * de significado al color —si todo lo aplicable sale en curso, el riel deja de
 * decir por dónde va el proceso.
 *
 * `no_aplica` gana sobre cualquier otro estado: una actividad que la modalidad
 * excluye no está pendiente, sencillamente no va a ocurrir.
 */
export function estadoDeActividad(
  aplica: boolean,
  estadoBackend: string | null | undefined,
): EstadoActividadUI {
  if (!aplica) return 'no_aplica';
  if (estadoBackend === 'APROBADO') return 'aprobada';
  // BORRADOR, EN_REVISION y DEVUELTO son trabajo empezado: la actividad existe
  // porque alguien la tocó. DEVUELTO sobre todo, que además pide volver a ella.
  if (estadoBackend) return 'en_curso';
  return 'pendiente';
}

/**
 * Fechas de los paneles de actividad.
 *
 * Estaban dentro de PanelPublicacionPliego, y la etapa 5 pasó a tener tres
 * paneles que muestran las mismas fechas con las mismas trampas. Se escriben
 * una vez para que la conversión no se resuelva distinto en cada uno.
 */

/**
 * Un plazo en días dicho también en meses, como referencia: «aproximadamente 3 meses».
 *
 * Un plazo de 120 días se entendía mal (AJU-002 de QA, 14/11). Los días siguen
 * siendo el valor que cuenta; esto es solo la lectura. Meses de 30 días y
 * redondeo a medio mes: por debajo de un mes no se dice nada, porque «0,5
 * meses» no aclara más que «15 días».
 */
export function plazoEnMeses(dias: unknown): string | null {
  const n = Number(dias);
  if (!Number.isFinite(n) || n < 30) return null;
  const meses = Math.round((n / 30) * 2) / 2;
  const texto = meses.toLocaleString('es-CO', { maximumFractionDigits: 1 });
  return `aproximadamente ${texto} ${meses === 1 ? 'mes' : 'meses'}`;
}

/** Los campos del estudio previo que son un plazo en días (AJU-002). */
export const CAMPOS_PLAZO_EN_DIAS = ['plazo_ejecucion_dias'];

/**
 * Fecha `YYYY-MM-DD` en texto legible.
 *
 * Se formatea en UTC a propósito: `new Date('2026-09-21')` se interpreta como
 * medianoche UTC, y mostrarla en la zona de Bogotá la correría al día anterior.
 * En un plazo legal, un día de diferencia es el error que importa.
 */
export function fechaLarga(ymd: string): string {
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString('es-CO', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Marca de tiempo completa (ISO) en la zona en la que corren los términos.
 *
 * A diferencia de `fechaLarga`, aquí el instante sí es un instante: se formatea
 * en Bogotá porque es la hora a la que la entidad hizo lo que hizo.
 */
export function momento(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Instante con hora, en Bogotá.
 *
 * En la etapa 6 la hora no es un detalle: la recepción de ofertas cierra a una
 * hora concreta, y de ella depende si la oferta radicada esa misma mañana entró
 * en término. `momento` se queda en el día porque en la etapa 5 basta.
 */
export function momentoConHora(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Hoy en Bogotá, en `YYYY-MM-DD`: el valor por defecto de los campos de fecha. */
export function hoyEnBogota(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

/**
 * La hora de un instante, en Bogotá y en `HH:MM`.
 *
 * Es lo que necesita un `<input type="time">` para precargarse: el campo no
 * entiende ISO y, si se le pasa la hora del navegador, un gestor conectado
 * desde otra zona vería una hora distinta de la que el expediente guarda.
 */
export function horaEnBogota(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
  });
}

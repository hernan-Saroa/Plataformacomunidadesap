/** La zona del navegador nunca decide las fechas de esta certificación. */
export function fechaColombia(fecha: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(fecha));
}

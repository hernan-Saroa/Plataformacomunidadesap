/**
 * Conteo de días hábiles para el plazo de publicidad (EFDS-1150).
 *
 * Funciones puras y sin acceso a base de datos: el calendario de festivos entra
 * como parámetro. El conteo de un término legal es la clase de lógica que hay
 * que poder probar contra casos conocidos —semana santa, fin de año, un viernes
 * de por medio— sin levantar Postgres.
 *
 * Todo se trabaja en fechas `YYYY-MM-DD` y aritmética UTC. Usar `Date` local
 * haría que un servidor en otra zona corriera el vencimiento un día, y aquí un
 * día de diferencia es un plazo legal incumplido.
 */

/** Estado del plazo de publicidad, en la forma en que lo lee la interfaz. */
export type EstadoPlazo = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' | 'SIN_PLAZO';

/**
 * A cuántos días hábiles del vencimiento se considera que el plazo aprieta.
 *
 * Dos días es el mismo criterio que usa Gestión Legal para sus términos
 * procesales; no viene de la normativa, es una ayuda de gestión.
 */
export const DIAS_AVISO_VENCIMIENTO = 2;

/** `YYYY-MM-DD` → Date en UTC, sin que la zona del servidor lo corra un día. */
export function aFecha(ymd: string): Date {
  const [anio, mes, dia] = ymd.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

/** Date → `YYYY-MM-DD`. Exacto porque la fecha se construyó en UTC. */
export function aYMD(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export function esFinDeSemana(ymd: string): boolean {
  const dia = aFecha(ymd).getUTCDay();
  return dia === 0 || dia === 6;
}

/** Ni sábado, ni domingo, ni festivo del calendario recibido. */
export function esDiaHabil(ymd: string, festivos: ReadonlySet<string>): boolean {
  return !esFinDeSemana(ymd) && !festivos.has(ymd);
}

function siguienteDia(ymd: string): string {
  const fecha = aFecha(ymd);
  fecha.setUTCDate(fecha.getUTCDate() + 1);
  return aYMD(fecha);
}

/**
 * Fecha en la que vence un plazo de `dias` días hábiles contados desde `desde`.
 *
 * El día de la publicación NO cuenta: el conteo arranca al día hábil siguiente,
 * que es la regla general de términos en días hábiles. Con un plazo de 10 días
 * hábiles publicado un lunes hábil, el vencimiento cae el lunes siguiente por
 * la tarde, no el viernes.
 *
 * SUPUESTO POR CONFIRMAR (EFDS-1385): que el conteo empiece al día siguiente y
 * no el mismo día de la publicación. Es la lectura estándar, pero ningún
 * documento fuente de la historia lo dice.
 */
export function sumarDiasHabiles(
  desde: string,
  dias: number,
  festivos: ReadonlySet<string>,
): string {
  if (dias <= 0) return desde;

  let fecha = desde;
  let contados = 0;

  while (contados < dias) {
    fecha = siguienteDia(fecha);
    if (esDiaHabil(fecha, festivos)) contados++;
  }

  return fecha;
}

/**
 * Días hábiles entre dos fechas, sin contar la inicial y contando la final.
 *
 * Es la inversa de `sumarDiasHabiles`: si `sumarDiasHabiles(d, n)` da `v`,
 * entonces `contarDiasHabiles(d, v)` da `n`. Que ambas coincidan importa,
 * porque una calcula el vencimiento y la otra los días que faltan, y si se
 * desfasaran el contador nunca llegaría a cero el día correcto.
 */
export function contarDiasHabiles(
  desde: string,
  hasta: string,
  festivos: ReadonlySet<string>,
): number {
  if (hasta <= desde) return 0;

  let fecha = desde;
  let habiles = 0;

  while (fecha < hasta) {
    fecha = siguienteDia(fecha);
    if (esDiaHabil(fecha, festivos)) habiles++;
  }

  return habiles;
}

/**
 * Días hábiles que faltan para el vencimiento, con signo.
 *
 * Positivo: quedan. Cero: vence hoy. Negativo: venció hace esos días hábiles.
 * Se devuelve con signo en vez de recortarlo a cero porque "venció hace tres
 * días" y "vence hoy" no son la misma noticia para quien gestiona el proceso.
 */
export function diasHabilesRestantes(
  hoy: string,
  vencimiento: string,
  festivos: ReadonlySet<string>,
): number {
  if (vencimiento === hoy) return 0;
  if (vencimiento > hoy) return contarDiasHabiles(hoy, vencimiento, festivos);
  return -contarDiasHabiles(vencimiento, hoy, festivos);
}

/** Cómo se lee el contador: vigente, apretando o pasado. */
export function estadoDelPlazo(diasRestantes: number | null): EstadoPlazo {
  if (diasRestantes === null) return 'SIN_PLAZO';
  if (diasRestantes < 0) return 'VENCIDO';
  if (diasRestantes <= DIAS_AVISO_VENCIMIENTO) return 'POR_VENCER';
  return 'VIGENTE';
}

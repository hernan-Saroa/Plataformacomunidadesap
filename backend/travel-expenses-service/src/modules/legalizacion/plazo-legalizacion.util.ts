import { contarDiasHabiles, esDiaHabil } from '../../common/dias-habiles.util';

/**
 * EFDS-1309 — Plazo de la legalización en días hábiles, en hora de Colombia.
 *
 * El conteo de días hábiles es el del módulo (`esDiaHabil` / `contarDiasHabiles`
 * de common/dias-habiles.util.ts, con festivos de auth.festivos_colombia): aquí
 * solo se decide desde qué día se cuenta y a qué hora vence.
 *
 * Nada en este archivo depende de la zona horaria del proceso. El contenedor no
 * define TZ, así que `getHours()` o `toLocaleDateString()` darían la hora UTC:
 * todo se convierte explícitamente a Colombia, que es UTC-5 fijo (sin horario de
 * verano).
 */

export const OFFSET_COLOMBIA = '-05:00';
const OFFSET_COLOMBIA_MS = 5 * 60 * 60 * 1000;

/** Fecha calendario (YYYY-MM-DD) de un instante, en hora de Colombia. */
export function fechaColombia(instante: Date): string {
  return new Date(instante.getTime() - OFFSET_COLOMBIA_MS).toISOString().slice(0, 10);
}

/** Instante correspondiente a una fecha y hora de Colombia. */
export function instanteColombia(ymd: string, hhmm: string, segundos = '00'): Date {
  return new Date(`${ymd}T${hhmm}:${segundos}${OFFSET_COLOMBIA}`);
}

function siguienteDia(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function aniosConFestivos(festivos: ReadonlySet<string>): Set<string> {
  const anios = new Set<string>();
  festivos.forEach((f) => anios.add(f.slice(0, 4)));
  return anios;
}

/**
 * El N-ésimo día hábil estrictamente posterior a `baseYmd`.
 *
 * `calendarioIncompleto` es true si el conteo pasó por un año sin ningún
 * festivo cargado: en ese año los festivos cuentan como hábiles y la fecha
 * resultante puede quedar antes de la real. Hoy solo está cargado 2026.
 */
export function sumarDiasHabiles(
  baseYmd: string,
  dias: number,
  festivos: ReadonlySet<string>,
): { fecha: string; calendarioIncompleto: boolean } {
  if (!Number.isInteger(dias) || dias <= 0) {
    throw new Error(`El plazo en días hábiles debe ser un entero positivo (recibido: ${dias}).`);
  }
  const anios = aniosConFestivos(festivos);
  let calendarioIncompleto = false;
  let cursor = baseYmd;
  let contados = 0;
  while (contados < dias) {
    cursor = siguienteDia(cursor);
    if (!anios.has(cursor.slice(0, 4))) calendarioIncompleto = true;
    if (esDiaHabil(cursor, festivos)) contados++;
  }
  return { fecha: cursor, calendarioIncompleto };
}

export interface ParametrosPlazo {
  /** Último día de la comisión (YYYY-MM-DD), leído como fecha, sin zona. */
  fechaFinComisionYmd: string;
  /** Momento en que se abre la legalización. */
  fechaDisparo: Date;
  plazoDiasHabiles: number;
  /** HH:MM en hora de Colombia. */
  horaCorte: string;
  festivos: ReadonlySet<string>;
}

export interface PlazoCalculado {
  fechaBasePlazo: Date;
  fechaLimite: Date;
  calendarioIncompleto: boolean;
}

/**
 * El plazo corre desde el más tardío entre el fin de la comisión y la apertura
 * de la legalización: una comisión pagada antes de viajar (AVANCE) no puede
 * vencer mientras el comisionado todavía está de viaje, y una pagada después de
 * terminada (RECONOCIMIENTO_POSTERIOR) no puede nacer vencida.
 *
 * Vence el último día hábil del plazo a la hora de corte, en hora de Colombia.
 */
export function calcularPlazo(p: ParametrosPlazo): PlazoCalculado {
  const disparoYmd = fechaColombia(p.fechaDisparo);
  const baseDesdeFin = p.fechaFinComisionYmd > disparoYmd;
  const baseYmd = baseDesdeFin ? p.fechaFinComisionYmd : disparoYmd;

  const { fecha, calendarioIncompleto } = sumarDiasHabiles(
    baseYmd,
    p.plazoDiasHabiles,
    p.festivos,
  );

  return {
    fechaBasePlazo: baseDesdeFin
      ? instanteColombia(baseYmd, '23:59', '59')
      : p.fechaDisparo,
    fechaLimite: instanteColombia(fecha, p.horaCorte),
    calendarioIncompleto,
  };
}

/** Días hábiles que quedan después de hoy y hasta el día de vencimiento, inclusive. */
export function diasHabilesRestantes(
  ahora: Date,
  fechaLimite: Date,
  festivos: ReadonlySet<string>,
): number {
  return contarDiasHabiles(
    fechaColombia(ahora),
    fechaColombia(fechaLimite),
    festivos,
    'terminos_legales',
  );
}

export type Semaforo = 'VIGENTE' | 'POR_VENCER' | 'VENCIDA' | 'ENVIADA';

/**
 * Indicador derivado para la interfaz y el aviso. No es un estado: se calcula
 * cada vez a partir de fecha_limite y fecha_envio, así que no puede quedar
 * desactualizado.
 */
export function calcularSemaforo(
  leg: { fechaLimite: Date; fechaEnvio: Date | null },
  ahora: Date,
  diasAvisoPorVencer: number,
  festivos: ReadonlySet<string>,
): Semaforo {
  if (leg.fechaEnvio) return 'ENVIADA';
  if (ahora.getTime() > new Date(leg.fechaLimite).getTime()) return 'VENCIDA';
  const restantes = diasHabilesRestantes(ahora, new Date(leg.fechaLimite), festivos);
  return restantes <= diasAvisoPorVencer ? 'POR_VENCER' : 'VIGENTE';
}

import { DataSource } from 'typeorm';
import { FestivoColombiaEntity } from '../entities/festivo-colombia.entity';
import { ConfigJornadaLaboralEntity } from '../entities/config/config-jornada-laboral.entity';

/**
 * Normaliza cualquier entrada de fecha a una cadena 'YYYY-MM-DD' en UTC.
 */
export function aYMDUtc(val: Date | string | null | undefined): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const clean = val.split('T')[0].trim();
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }
  const d = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/**
 * Convierte un valor de fecha a Date UTC a medianoche.
 */
export function aFechaUtc(val: Date | string): Date {
  if (typeof val === 'string') {
    const ymd = aYMDUtc(val);
    const [anio, mes, dia] = ymd.split('-').map(Number);
    return new Date(Date.UTC(anio, mes - 1, dia));
  }
  return new Date(Date.UTC(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate()));
}

/**
 * Opciones configurables de jornada laboral y días hábiles.
 */
export interface OpcionesJornadaLaboral {
  horaInicio?: string;
  horaFin?: string;
  diasLaborales?: number[];
  diasAnticipacionMinima?: number;
  diasUmbralAvance?: number;
}

/**
 * Días laborales por defecto: Lunes (1) a Viernes (5).
 */
export const DIAS_LABORALES_DEFAULT: number[] = [1, 2, 3, 4, 5];

/**
 * Retorna true si el día NO es laboral según los días laborales configurados.
 * Si no se configuran días laborales, por defecto evalúa sábado (6) o domingo (0).
 */
export function esFinDeSemana(fecha: Date | string, diasLaborales?: number[]): boolean {
  const d = aFechaUtc(fecha);
  const day = d.getUTCDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  if (Array.isArray(diasLaborales) && diasLaborales.length > 0) {
    return !diasLaborales.includes(day);
  }
  return day === 0 || day === 6;
}

/**
 * Retorna true si la fecha es día hábil (no es día de descanso ni festivo oficial).
 */
export function esDiaHabil(
  fecha: Date | string,
  festivosSet?: ReadonlySet<string>,
  diasLaborales?: number[],
): boolean {
  if (esFinDeSemana(fecha, diasLaborales)) return false;
  if (!festivosSet) return true;
  return !festivosSet.has(aYMDUtc(fecha));
}

/**
 * Obtiene el conjunto de festivos en formato 'YYYY-MM-DD' desde la base de datos de Auth.
 */
export async function cargarFestivosAuth(dataSource: DataSource): Promise<Set<string>> {
  const festivosSet = new Set<string>();
  if (!dataSource || typeof dataSource.getRepository !== 'function') {
    return festivosSet;
  }
  try {
    const repo = dataSource.getRepository(FestivoColombiaEntity);
    const festivos = await repo.find();
    if (Array.isArray(festivos)) {
      for (const f of festivos) {
        if (f.fecha) {
          const ymd = aYMDUtc(f.fecha);
          if (ymd) festivosSet.add(ymd);
        }
      }
    }
  } catch (err: any) {
    console.warn(`[cargarFestivosAuth] No se pudieron consultar festivos en BD: ${err?.message}`);
  }
  return festivosSet;
}

/**
 * Obtiene la configuración de jornada laboral activa desde BD (con fallback seguro).
 */
export async function cargarConfigJornada(
  dataSource: DataSource,
): Promise<OpcionesJornadaLaboral | null> {
  if (!dataSource || typeof dataSource.getRepository !== 'function') {
    return null;
  }
  try {
    const repo = dataSource.getRepository(ConfigJornadaLaboralEntity);
    const config = await repo.findOne({ where: { activo: true }, order: { id: 'DESC' } });
    if (config) {
      return {
        horaInicio: config.horaInicio,
        horaFin: config.horaFin,
        diasLaborales: Array.isArray(config.diasLaborales) ? config.diasLaborales : DIAS_LABORALES_DEFAULT,
        diasAnticipacionMinima: config.diasAnticipacionMinima,
        diasUmbralAvance: config.diasUmbralAvance,
      };
    }
  } catch (err: any) {
    // Si la tabla no existe o error temporal, se usa fallback
  }
  return null;
}

/**
 * Conteo estándar de días hábiles entre dos fechas.
 * Por defecto cuenta estrictamente los días previos (modo 'previos' para anticipación y RP).
 */
export function contarDiasHabiles(
  desde: Date | string,
  hasta: Date | string,
  festivosSet?: ReadonlySet<string>,
  modo: 'previos' | 'rango_completo' | 'terminos_legales' = 'previos',
  diasLaborales?: number[],
): number {
  const dInicio = aFechaUtc(desde);
  const dFin = aFechaUtc(hasta);

  if (dFin.getTime() <= dInicio.getTime()) {
    return 0;
  }

  let habiles = 0;
  const cursor = new Date(dInicio.getTime());

  if (modo === 'rango_completo') {
    while (cursor.getTime() <= dFin.getTime()) {
      if (esDiaHabil(cursor, festivosSet, diasLaborales)) {
        habiles++;
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return habiles;
  }

  if (modo === 'terminos_legales') {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    while (cursor.getTime() <= dFin.getTime()) {
      if (esDiaHabil(cursor, festivosSet, diasLaborales)) {
        habiles++;
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return habiles;
  }

  // modo === 'previos' (estrictamente entre inicio y fin)
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  while (cursor.getTime() < dFin.getTime()) {
    if (esDiaHabil(cursor, festivosSet, diasLaborales)) {
      habiles++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return habiles;
}

/** Colombia no tiene horario de verano: UTC-5 todo el año. */
const DESFASE_COLOMBIA_MS = 5 * 60 * 60 * 1000;

/** Corte por defecto de la jornada laboral para radicar: 4:30 p. m. (16:30). */
export const MINUTOS_CORTE_JORNADA_DEFAULT = 16 * 60 + 30;

/**
 * Convierte una hora en formato 'HH:mm' a minutos transcurridos desde medianoche.
 */
export function minutosDesdeHoraStr(horaStr?: string, fallbackMinutos: number = MINUTOS_CORTE_JORNADA_DEFAULT): number {
  if (!horaStr) return fallbackMinutos;
  const parts = horaStr.trim().split(':');
  if (parts.length >= 2) {
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      return h * 60 + m;
    }
  }
  return fallbackMinutos;
}

/**
 * Fecha ('YYYY-MM-DD') y minutos del día de un instante en hora de Colombia,
 * sin depender de la zona horaria del servidor.
 */
export function fechaHoraColombia(instante: Date = new Date()): { ymd: string; minutos: number } {
  const local = new Date(instante.getTime() - DESFASE_COLOMBIA_MS);
  return {
    ymd: local.toISOString().slice(0, 10),
    minutos: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}

/**
 * Radicación fuera de jornada:
 * - Ocurre después de la hora de corte configurada (o antes del inicio si se especifica).
 * - O en día no hábil (fin de semana o festivo).
 */
export function esRadicacionFueraDeJornada(
  instante: Date,
  festivosSet?: ReadonlySet<string>,
  opcionesJornada?: OpcionesJornadaLaboral | null,
): boolean {
  const { ymd, minutos } = fechaHoraColombia(instante);
  const minutosCorte = minutosDesdeHoraStr(opcionesJornada?.horaFin, MINUTOS_CORTE_JORNADA_DEFAULT);
  const diasLaborales = opcionesJornada?.diasLaborales;

  let antesDeInicio = false;
  if (opcionesJornada?.horaInicio) {
    const minutosInicio = minutosDesdeHoraStr(opcionesJornada.horaInicio, 8 * 60);
    antesDeInicio = minutos < minutosInicio;
  }

  return (
    minutos >= minutosCorte ||
    antesDeInicio ||
    !esDiaHabil(ymd, festivosSet, diasLaborales)
  );
}

/** Primer día hábil posterior a la fecha indicada ('YYYY-MM-DD'). */
export function siguienteDiaHabil(
  ymd: string,
  festivosSet?: ReadonlySet<string>,
  diasLaborales?: number[],
): string {
  const cursor = aFechaUtc(ymd);
  do {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  } while (!esDiaHabil(cursor, festivosSet, diasLaborales));
  return cursor.toISOString().slice(0, 10);
}

/**
 * Fecha desde la que corre el trámite: el mismo día si se radica en jornada, o el
 * siguiente día hábil si se radica fuera de horario o en día no hábil.
 */
export function fechaEfectivaRadicacion(
  instante: Date,
  festivosSet?: ReadonlySet<string>,
  opcionesJornada?: OpcionesJornadaLaboral | null,
): string {
  const { ymd } = fechaHoraColombia(instante);
  return esRadicacionFueraDeJornada(instante, festivosSet, opcionesJornada)
    ? siguienteDiaHabil(ymd, festivosSet, opcionesJornada?.diasLaborales)
    : ymd;
}

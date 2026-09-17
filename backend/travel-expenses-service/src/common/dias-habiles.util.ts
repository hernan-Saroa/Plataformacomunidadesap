import { DataSource } from 'typeorm';
import { FestivoColombiaEntity } from '../entities/festivo-colombia.entity';

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
 * Retorna true si es sábado (6) o domingo (0).
 */
export function esFinDeSemana(fecha: Date | string): boolean {
  const d = aFechaUtc(fecha);
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Retorna true si la fecha es día hábil (no es fin de semana ni festivo).
 */
export function esDiaHabil(fecha: Date | string, festivosSet?: ReadonlySet<string>): boolean {
  if (esFinDeSemana(fecha)) return false;
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
 * Conteo estándar de días hábiles entre dos fechas.
 * Por defecto cuenta estrictamente los días previos (modo 'previos' para anticipación y RP).
 */
export function contarDiasHabiles(
  desde: Date | string,
  hasta: Date | string,
  festivosSet?: ReadonlySet<string>,
  modo: 'previos' | 'rango_completo' | 'terminos_legales' = 'previos',
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
      if (esDiaHabil(cursor, festivosSet)) {
        habiles++;
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return habiles;
  }

  if (modo === 'terminos_legales') {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    while (cursor.getTime() <= dFin.getTime()) {
      if (esDiaHabil(cursor, festivosSet)) {
        habiles++;
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return habiles;
  }

  // modo === 'previos' (estrictamente entre inicio y fin)
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  while (cursor.getTime() < dFin.getTime()) {
    if (esDiaHabil(cursor, festivosSet)) {
      habiles++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return habiles;
}

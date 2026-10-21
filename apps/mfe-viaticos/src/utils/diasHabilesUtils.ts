/**
 * Utilidades estándar para el cómputo de Días Hábiles, Términos y Tiempo Límite en Viáticos.
 *
 * Reglas Institucionales ESAP:
 * 1. Los días hábiles excluyen días no laborables (sábados y domingos por defecto, o configurables).
 * 2. Los días hábiles excluyen los días festivos nacionales oficiales de Colombia,
 *    almacenados y administrados centralizadamente en `auth` (`auth.festivos_colombia`).
 * 3. Aritmética de fechas normalizada en UTC / formato ISO YYYY-MM-DD para evitar desfases
 *    de zona horaria entre servidor y cliente.
 * 4. Plazos y tiempo límite:
 *    - Anticipación de radicación: configurable (por defecto 14 días hábiles previos RF-EXT-001).
 *    - Modalidad de pago RP: configurable (por defecto >= 5 días hábiles previos = AVANCE; < 5 = RECONOCIMIENTO_POSTERIOR RF-PRE-003).
 *    - Horario de corte para radicación institucional: configurable (por defecto 16:30 h).
 */

import apiClient from '../services/api/apiClient';
import type { ConfigJornadaLaboral } from '../types/parametrizacion';

/** Estado del tiempo límite o plazo legal/administrativo */
export type EstadoTiempoLimite = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' | 'SIN_PLAZO';

/** Umbral por defecto de días hábiles de aviso para plazos por vencer */
export const DIAS_AVISO_POR_VENCER_DEFAULT = 2;

/** Umbral institucional de anticipación para comisiones ordinarias vs extemporáneas */
export const DIAS_HABILES_ANTICIPACION_MINIMA = 14;

/** Umbral institucional para pago como anticipo (AVANCE) en expedición de RP */
export const DIAS_HABILES_UMBRAL_AVANCE_RP = 5;

/** Jornada laboral estándar por defecto */
export const JORNADA_LABORAL_DEFAULT: ConfigJornadaLaboral = {
  id: 0,
  codigo: 'DEFAULT',
  nombre: 'Jornada Laboral Institucional',
  horaInicio: '08:00',
  horaFin: '16:30',
  diasLaborales: [1, 2, 3, 4, 5],
  diasAnticipacionMinima: 14,
  diasUmbralAvance: 5,
  activo: true,
};

// Cache en memoria para festivos consultados desde Auth
interface FestivosCache {
  year: number | 'ALL';
  festivos: Set<string>;
  timestamp: number;
}

let festivosMemoryCache: FestivosCache | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

// Cache en memoria para jornada laboral activa
interface JornadaCache {
  config: ConfigJornadaLaboral;
  timestamp: number;
}
let jornadaMemoryCache: JornadaCache | null = null;

/**
 * Normaliza cualquier entrada de fecha a una cadena 'YYYY-MM-DD'.
 */
export function aYMD(fecha: string | Date | null | undefined): string {
  if (!fecha) return '';
  if (typeof fecha === 'string') {
    const clean = fecha.trim().split('T')[0].trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }
  }
  if (fecha instanceof Date) {
    if (Number.isNaN(fecha.getTime())) return '';
    return fecha.toISOString().slice(0, 10);
  }
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/**
 * Convierte un string YYYY-MM-DD o Date a un objeto Date en UTC (medianoche).
 */
export function aFechaUtc(ymd: string | Date): Date {
  if (typeof ymd === 'string') {
    const clean = ymd.split('T')[0].trim();
    const parts = clean.split('-');
    if (parts.length === 3) {
      return new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    }
  }
  if (ymd instanceof Date) {
    return new Date(Date.UTC(ymd.getFullYear(), ymd.getMonth(), ymd.getDate()));
  }
  const d = new Date(ymd);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Retorna true si la fecha NO corresponde a un día laboral.
 * Por defecto evalúa sábado (6) o domingo (0). Si se provee `diasLaborales`, evalúa pertenencia.
 */
export function esFinDeSemana(fecha: string | Date, diasLaborales?: number[]): boolean {
  const d = aFechaUtc(fecha);
  if (Number.isNaN(d.getTime())) return false;
  const diaSemana = d.getUTCDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  if (Array.isArray(diasLaborales) && diasLaborales.length > 0) {
    return !diasLaborales.includes(diaSemana);
  }
  return diaSemana === 0 || diaSemana === 6;
}

/**
 * Normaliza el conjunto de festivos a un Set<string> con formato 'YYYY-MM-DD'.
 */
export function normalizarFestivosSet(
  festivos?: ReadonlySet<string> | string[] | Array<{ fecha?: string }>,
): Set<string> {
  const set = new Set<string>();
  if (!festivos) return set;

  if (festivos instanceof Set) {
    festivos.forEach((f) => {
      const ymd = aYMD(f);
      if (ymd) set.add(ymd);
    });
    return set;
  }

  if (Array.isArray(festivos)) {
    festivos.forEach((f) => {
      if (typeof f === 'string') {
        const ymd = aYMD(f);
        if (ymd) set.add(ymd);
      } else if (f && typeof f === 'object' && f.fecha) {
        const ymd = aYMD(f.fecha);
        if (ymd) set.add(ymd);
      }
    });
  }

  return set;
}

/**
 * Retorna true si la fecha es un día festivo oficial.
 */
export function esDiaFestivo(
  fecha: string | Date,
  festivos?: ReadonlySet<string> | string[] | Array<{ fecha?: string }>,
): boolean {
  const ymd = aYMD(fecha);
  if (!ymd) return false;
  const set = normalizarFestivosSet(festivos || festivosMemoryCache?.festivos);
  return set.has(ymd);
}

/**
 * Retorna true si la fecha es día hábil (no es día de descanso semanal ni festivo).
 */
export function esDiaHabil(
  fecha: string | Date,
  festivos?: ReadonlySet<string> | string[] | Array<{ fecha?: string }>,
  diasLaborales?: number[],
): boolean {
  if (esFinDeSemana(fecha, diasLaborales)) return false;
  return !esDiaFestivo(fecha, festivos);
}

/**
 * Retorna la siguiente fecha calendario en formato 'YYYY-MM-DD'.
 */
export function siguienteDia(fecha: string | Date): string {
  const d = aFechaUtc(fecha);
  d.setUTCDate(d.getUTCDate() + 1);
  return aYMD(d);
}

/**
 * Retorna la fecha del siguiente día hábil en formato 'YYYY-MM-DD'.
 */
export function siguienteDiaHabil(
  fecha: string | Date,
  festivos?: ReadonlySet<string> | string[] | Array<{ fecha?: string }>,
  diasLaborales?: number[],
): string {
  let cur = siguienteDia(fecha);
  while (!esDiaHabil(cur, festivos, diasLaborales)) {
    cur = siguienteDia(cur);
  }
  return cur;
}

/**
 * Opciones para el conteo de días hábiles entre dos fechas.
 */
export interface ContarDiasHabilesOptions {
  /**
   * - 'previos': Cuenta días estrictamente intermedios (excluye fecha inicio y fecha fin).
   *   Utilizado para cálculo de anticipación y días previos a inicio de comisión (RF-PRE-003).
   * - 'terminos_legales': Excluye fecha de inicio (día del acto/radicación no cuenta) e incluye la fecha final.
   *   Regla general procesal / administrativa colombiana (Código General del Proceso / CPACA).
   * - 'rango_completo': Incluye tanto la fecha de inicio como la fecha fin (días hábiles de duración).
   */
  modo?: 'previos' | 'terminos_legales' | 'rango_completo';
  /**
   * Días hábiles de la semana permitidos (por defecto 1 a 5: Lunes a Viernes).
   */
  diasLaborales?: number[];
}

/**
 * Cuenta los días hábiles entre dos fechas.
 *
 * @param desde Fecha de inicio (Date o YYYY-MM-DD)
 * @param hasta Fecha final (Date o YYYY-MM-DD)
 * @param festivos Conjunto opcional de festivos; si no se provee, utiliza el caché en memoria
 * @param options Configuración de inclusión/exclusión de extremos y días laborales
 */
export function contarDiasHabiles(
  desde: string | Date,
  hasta: string | Date,
  festivos?: ReadonlySet<string> | string[] | Array<{ fecha?: string }>,
  options?: ContarDiasHabilesOptions,
): number {
  const ymdDesde = aYMD(desde);
  const ymdHasta = aYMD(hasta);

  if (!ymdDesde || !ymdHasta) return 0;
  const diasLaborales = options?.diasLaborales;

  if (ymdHasta <= ymdDesde) {
    if (options?.modo === 'rango_completo' && ymdHasta === ymdDesde) {
      return esDiaHabil(ymdDesde, festivos, diasLaborales) ? 1 : 0;
    }
    return 0;
  }

  const modo = options?.modo || 'previos';
  const festivosSet = normalizarFestivosSet(festivos || festivosMemoryCache?.festivos);

  let habiles = 0;
  let cursor = aFechaUtc(ymdDesde);
  const fin = aFechaUtc(ymdHasta);

  if (modo === 'rango_completo') {
    // Incluye desde
    while (cursor.getTime() <= fin.getTime()) {
      const ymdCur = aYMD(cursor);
      if (esDiaHabil(ymdCur, festivosSet, diasLaborales)) {
        habiles++;
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return habiles;
  }

  if (modo === 'terminos_legales') {
    // Excluye desde, incluye hasta
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    while (cursor.getTime() <= fin.getTime()) {
      const ymdCur = aYMD(cursor);
      if (esDiaHabil(ymdCur, festivosSet, diasLaborales)) {
        habiles++;
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return habiles;
  }

  // modo === 'previos' (por defecto: estrictamente entre dInicio y dFin)
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  while (cursor.getTime() < fin.getTime()) {
    const ymdCur = aYMD(cursor);
    if (esDiaHabil(ymdCur, festivosSet, diasLaborales)) {
      habiles++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return habiles;
}

/**
 * Calcula los días hábiles previos entre una fecha de referencia (ej. hoy o fecha RP)
 * y la fecha de inicio del viaje. Equivalente directo a RF-PRE-003.
 */
export function calcularDiasHabilesPrevios(
  fechaReferencia: string | Date,
  fechaInicioViaje: string | Date,
  festivos?: ReadonlySet<string> | string[] | Array<{ fecha?: string }>,
  diasLaborales?: number[],
): number {
  return contarDiasHabiles(fechaReferencia, fechaInicioViaje, festivos, {
    modo: 'previos',
    diasLaborales,
  });
}

/**
 * Suma un número determinado de días hábiles a una fecha dada,
 * saltando días no laborales y festivos oficiales.
 */
export function sumarDiasHabiles(
  desde: string | Date,
  dias: number,
  festivos?: ReadonlySet<string> | string[] | Array<{ fecha?: string }>,
  diasLaborales?: number[],
): string {
  if (dias <= 0) return aYMD(desde);

  const festivosSet = normalizarFestivosSet(festivos || festivosMemoryCache?.festivos);
  let fecha = aYMD(desde);
  let sumados = 0;

  while (sumados < dias) {
    fecha = siguienteDia(fecha);
    if (esDiaHabil(fecha, festivosSet, diasLaborales)) {
      sumados++;
    }
  }

  return fecha;
}

/**
 * Calcula los días hábiles restantes entre hoy (o fecha de referencia) y la fecha de vencimiento.
 */
export function calcularDiasHabilesRestantes(
  fechaVencimiento: string | Date,
  fechaReferencia: string | Date = new Date(),
  festivos?: ReadonlySet<string> | string[] | Array<{ fecha?: string }>,
  diasLaborales?: number[],
): number {
  const ymdVenc = aYMD(fechaVencimiento);
  const ymdRef = aYMD(fechaReferencia);

  if (!ymdVenc || !ymdRef) return 0;
  if (ymdVenc === ymdRef) return 0;

  if (ymdVenc > ymdRef) {
    return contarDiasHabiles(ymdRef, ymdVenc, festivos, {
      modo: 'terminos_legales',
      diasLaborales,
    });
  }

  return -contarDiasHabiles(ymdVenc, ymdRef, festivos, {
    modo: 'terminos_legales',
    diasLaborales,
  });
}

/**
 * Determina el estado del plazo en base a los días hábiles restantes.
 */
export function clasificarEstadoPlazo(
  diasRestantes: number | null | undefined,
  diasAviso: number = DIAS_AVISO_POR_VENCER_DEFAULT,
): EstadoTiempoLimite {
  if (diasRestantes === null || diasRestantes === undefined) return 'SIN_PLAZO';
  if (diasRestantes < 0) return 'VENCIDO';
  if (diasRestantes <= diasAviso) return 'POR_VENCER';
  return 'VIGENTE';
}

/**
 * Estructura de resultado para el cálculo de tiempo límite.
 */
export interface ResultadoTiempoLimite {
  fechaInicio: string;
  fechaVencimiento: string;
  diasPlazo: number;
  diasRestantes: number;
  estado: EstadoTiempoLimite;
  esDiaHabilHoy: boolean;
  diasHabilesTranscurridos: number;
}

/**
 * Calcula integralmente el tiempo límite y estado de un plazo administrativo en días hábiles.
 */
export function calcularTiempoLimite(
  fechaInicio: string | Date,
  diasPlazo: number,
  festivos?: ReadonlySet<string> | string[] | Array<{ fecha?: string }>,
  diasAviso: number = DIAS_AVISO_POR_VENCER_DEFAULT,
  fechaActual: string | Date = new Date(),
  diasLaborales?: number[],
): ResultadoTiempoLimite {
  const ymdInicio = aYMD(fechaInicio);
  const ymdActual = aYMD(fechaActual);
  const festivosSet = normalizarFestivosSet(festivos || festivosMemoryCache?.festivos);

  const fechaVencimiento = sumarDiasHabiles(ymdInicio, diasPlazo, festivosSet, diasLaborales);
  const diasRestantes = calcularDiasHabilesRestantes(fechaVencimiento, ymdActual, festivosSet, diasLaborales);
  const estado = clasificarEstadoPlazo(diasRestantes, diasAviso);

  const diasHabilesTranscurridos = contarDiasHabiles(ymdInicio, ymdActual, festivosSet, {
    modo: 'terminos_legales',
    diasLaborales,
  });

  return {
    fechaInicio: ymdInicio,
    fechaVencimiento,
    diasPlazo,
    diasRestantes,
    estado,
    esDiaHabilHoy: esDiaHabil(ymdActual, festivosSet, diasLaborales),
    diasHabilesTranscurridos,
  };
}

/**
 * Convierte un string de hora 'HH:mm' a minutos transcurridos en el día.
 */
export function convertirHoraAMinutos(horaStr?: string, defaultMinutos: number = 16 * 60 + 30): number {
  if (!horaStr) return defaultMinutos;
  const parts = horaStr.trim().split(':');
  if (parts.length >= 2) {
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      return h * 60 + m;
    }
  }
  return defaultMinutos;
}

/**
 * Resultado de validación de anticipación en la radicación de solicitudes.
 */
export interface ResultadoAnticipacionRadicacion {
  extemporanea: boolean;
  diasHabiles: number;
  radicadoFueraJornada: boolean;
  fechaEfectivaRadicacion: string;
  fechaInicioViaje: string;
  anticipacionMinimaRequerida: number;
  horaCorteAplicada: string;
  horaInicioAplicada: string;
}

/**
 * Valida la anticipación de radicación de una comisión frente a los días hábiles requeridos.
 * Totalmente paramétrica: utiliza la jornada activa configurada en BD o por defecto (16:30, [1..5], 14 días).
 * Si se radica fuera de horario laboral (después de la hora de corte o en día no hábil),
 * el cómputo de términos inicia formalmente el siguiente día hábil.
 */
export function validarAnticipacionRadicacion(
  fechaInicioViaje: string | Date,
  festivos?: ReadonlySet<string> | string[] | Array<{ fecha?: string }>,
  fechaRadicacion: Date = new Date(),
  configJornada?: Partial<ConfigJornadaLaboral> | null,
): ResultadoAnticipacionRadicacion | null {
  const ymdInicio = aYMD(fechaInicioViaje);
  if (!ymdInicio) return null;

  const festivosSet = normalizarFestivosSet(festivos || festivosMemoryCache?.festivos);
  const cfg = configJornada || jornadaMemoryCache?.config || JORNADA_LABORAL_DEFAULT;

  const horaCorteStr = cfg.horaFin || '16:30';
  const horaInicioStr = cfg.horaInicio || '08:00';
  const minutosCorte = convertirHoraAMinutos(horaCorteStr, 16 * 60 + 30);
  const minutosInicio = convertirHoraAMinutos(horaInicioStr, 8 * 60);
  const diasLaborales = cfg.diasLaborales || [1, 2, 3, 4, 5];
  const diasMinimos = typeof cfg.diasAnticipacionMinima === 'number' ? cfg.diasAnticipacionMinima : DIAS_HABILES_ANTICIPACION_MINIMA;

  const ahora = fechaRadicacion instanceof Date ? fechaRadicacion : new Date(fechaRadicacion);
  const horaActualMinutos = ahora.getHours() * 60 + ahora.getMinutes();
  const ymdHoy = aYMD(ahora);

  const esNoLaboral = esFinDeSemana(ymdHoy, diasLaborales);
  const esFestivoHoy = esDiaFestivo(ymdHoy, festivosSet);

  const fueraDeHora = horaActualMinutos >= minutosCorte || horaActualMinutos < minutosInicio;
  const radicadoFueraJornada = fueraDeHora || esNoLaboral || esFestivoHoy;

  // Fecha efectiva de inicio del trámite: si fue fuera de jornada, salta al siguiente día hábil
  const fechaEfectiva = radicadoFueraJornada
    ? siguienteDiaHabil(ymdHoy, festivosSet, diasLaborales)
    : ymdHoy;

  // Cómputo de días hábiles previos entre la fecha efectiva y el inicio del viaje
  const diasHabiles = contarDiasHabiles(fechaEfectiva, ymdInicio, festivosSet, {
    modo: 'previos',
    diasLaborales,
  });
  const extemporanea = diasHabiles < diasMinimos;

  return {
    extemporanea,
    diasHabiles,
    radicadoFueraJornada,
    fechaEfectivaRadicacion: fechaEfectiva,
    fechaInicioViaje: ymdInicio,
    anticipacionMinimaRequerida: diasMinimos,
    horaCorteAplicada: horaCorteStr,
    horaInicioAplicada: horaInicioStr,
  };
}

/**
 * Consulta los días festivos desde el microservicio Auth (`/auth/api/v1/ajustes-generales/festivos`).
 * Implementa caché en memoria con TTL de 1 hora.
 */
export async function obtenerFestivosAuth(year?: number): Promise<Set<string>> {
  const now = Date.now();
  const cacheKey = year || 'ALL';

  if (
    festivosMemoryCache &&
    festivosMemoryCache.year === cacheKey &&
    now - festivosMemoryCache.timestamp < CACHE_TTL_MS
  ) {
    return festivosMemoryCache.festivos;
  }

  try {
    const params: Record<string, string> = {};
    if (year) params.year = String(year);

    const res: any = await apiClient.get('/auth/api/v1/ajustes-generales/festivos', params);
    const list: any[] = Array.isArray(res) ? res : res?.data || [];

    const set = new Set<string>();
    for (const item of list) {
      const fechaStr = item.fecha || item;
      const ymd = aYMD(fechaStr);
      if (ymd) set.add(ymd);
    }

    festivosMemoryCache = {
      year: cacheKey,
      festivos: set,
      timestamp: now,
    };

    return set;
  } catch (error) {
    console.warn(
      '[diasHabilesUtils] No se pudieron cargar los festivos desde auth-service, usando caché o fallback local:',
      error,
    );
    if (festivosMemoryCache?.festivos) {
      return festivosMemoryCache.festivos;
    }
    return new Set<string>();
  }
}

/**
 * Obtiene la configuración de jornada laboral activa desde el microservicio de viáticos.
 * Con caché en memoria y fallback a valores por defecto institucionales.
 */
export async function obtenerJornadaLaboralActiva(): Promise<ConfigJornadaLaboral> {
  const now = Date.now();
  if (jornadaMemoryCache && now - jornadaMemoryCache.timestamp < CACHE_TTL_MS) {
    return jornadaMemoryCache.config;
  }

  try {
    const res: any = await apiClient.get('/viaticos/api/v1/parametrizacion/jornada-laboral/activa');
    const config: ConfigJornadaLaboral = res?.data || res || JORNADA_LABORAL_DEFAULT;
    jornadaMemoryCache = {
      config,
      timestamp: now,
    };
    return config;
  } catch (error) {
    console.warn(
      '[diasHabilesUtils] No se pudo cargar la jornada laboral activa desde el servicio, usando fallback institucional:',
      error,
    );
    return JORNADA_LABORAL_DEFAULT;
  }
}

/**
 * Obtiene los festivos actualmente en caché (sin realizar llamada asíncrona).
 */
export function obtenerFestivosEnMemoria(): Set<string> {
  return festivosMemoryCache?.festivos || new Set<string>();
}

/**
 * Limpia el caché en memoria de festivos y jornada laboral.
 */
export function limpiarCacheFestivos(): void {
  festivosMemoryCache = null;
  jornadaMemoryCache = null;
}

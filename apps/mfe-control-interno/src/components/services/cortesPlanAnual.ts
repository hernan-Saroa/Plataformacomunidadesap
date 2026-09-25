/**
 * Cortes de seguimiento del Plan Anual (EFDS-958).
 *
 * Un corte es un periodo: `fechaProgramada` es su inicio y `fechaSeguimiento` su fin
 * (01/01–30/06 y 01/07–31/12 en seguimiento semestral), igual que los muestra la
 * pantalla ("Inicio" / "Fin") y los genera el modal de configuración.
 *
 * Los planes armados desde la plantilla guardaban otro formato: la fecha de cierre del
 * periodo y la de entrega del informe (30/06 → 31/07). Esos cortes se reconocen porque
 * su "inicio" cae en el último día del mes, y se convierten a periodos al cargarlos.
 */

interface CorteFechas {
  fechaProgramada: string;
  fechaSeguimiento?: string | null;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})/;

function partes(fecha: string | null | undefined): [number, number, number] | null {
  const m = fecha ? String(fecha).match(ISO) : null;
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)] : null;
}

function iso(año: number, mes: number, dia: number): string {
  return `${año}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function ultimoDiaDelMes(año: number, mes: number): number {
  return new Date(año, mes, 0).getDate();
}

function diaSiguiente(fecha: string): string {
  const p = partes(fecha);
  if (!p) return fecha;
  const d = new Date(p[0], p[1] - 1, p[2] + 1);
  return iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Formato viejo: todos los cortes "empiezan" el último día de un mes (cierre del periodo). */
export function sonCortesDeCierre(puntos: CorteFechas[]): boolean {
  if (!Array.isArray(puntos) || puntos.length === 0) return false;
  return puntos.every((pc) => {
    const p = partes(pc.fechaProgramada);
    return !!p && p[2] === ultimoDiaDelMes(p[0], p[1]);
  });
}

/**
 * Convierte cortes de cierre a periodos: cada corte va del día siguiente al cierre
 * anterior (o del 1 de enero para el primero) hasta su propia fecha de cierre.
 */
export function cortesComoPeriodos<T extends CorteFechas>(puntos: T[]): T[] {
  if (!sonCortesDeCierre(puntos)) return puntos;
  const ordenados = [...puntos].sort((a, b) => a.fechaProgramada.localeCompare(b.fechaProgramada));
  return ordenados.map((pc, i) => {
    const cierre = pc.fechaProgramada.slice(0, 10);
    const inicio = i === 0 ? `${cierre.slice(0, 4)}-01-01` : diaSiguiente(ordenados[i - 1].fechaProgramada.slice(0, 10));
    return { ...pc, fechaProgramada: inicio, fechaSeguimiento: cierre };
  });
}

/**
 * Lleva las fechas de entrega de las tareas de una actividad al año de sus cortes,
 * todas con el mismo salto de años para conservar la distancia entre ellas (el informe
 * de enero del año siguiente sigue en el año siguiente). Solo se mueven si quedaron
 * fuera del plan: antes del año de los cortes o después del año siguiente.
 *
 * `añoBaseDelPlan` es el año más antiguo entre las tareas de todo el plan (el de la
 * plantilla): con él, una actividad cuya única tarea es de enero del año siguiente conserva
 * ese año siguiente.
 */
export function tareasEnElAñoDeLosCortes<T extends { fechaEntrega?: string }>(
  tareas: T[],
  añoCortes: number,
  añoBaseDelPlan?: number,
): T[] {
  const años = tareas
    .map((t) => partes(t.fechaEntrega)?.[0])
    .filter((a): a is number => typeof a === 'number');
  if (!años.length || !Number.isInteger(añoCortes)) return tareas;
  const min = Math.min(...años);
  if (min >= añoCortes && min <= añoCortes + 1) return tareas;
  const base = añoBaseDelPlan != null && añoBaseDelPlan <= min && añoBaseDelPlan < añoCortes ? añoBaseDelPlan : min;
  const salto = añoCortes - base;
  return tareas.map((t) => {
    const p = partes(t.fechaEntrega);
    if (!p) return t;
    const año = p[0] + salto;
    return { ...t, fechaEntrega: iso(año, p[1], Math.min(p[2], ultimoDiaDelMes(año, p[1]))) };
  });
}

/**
 * Corte al que pertenece una fecha de entrega: el informe se entrega después de que el
 * periodo termina, así que es el último corte que ya terminó en esa fecha (el de julio
 * a diciembre para el 31 de enero del año siguiente). Si ninguno terminó, el que la contiene.
 */
export function corteDeLaFecha<T extends CorteFechas>(fecha: string | undefined, cortes: T[]): T | undefined {
  if (!fecha || !cortes.length) return undefined;
  const f = fecha.slice(0, 10);
  const fin = (c: T) => (c.fechaSeguimiento || c.fechaProgramada).slice(0, 10);
  const ordenados = [...cortes].sort((a, b) => a.fechaProgramada.localeCompare(b.fechaProgramada));
  const terminados = ordenados.filter((c) => fin(c) < f);
  if (terminados.length) return terminados[terminados.length - 1];
  return ordenados.find((c) => c.fechaProgramada.slice(0, 10) <= f && f <= fin(c)) ?? ordenados[0];
}

export type EstadoCorte = 'completado' | 'activo' | 'enSeguimiento' | 'vencido' | 'futuro';

/**
 * Estado de un corte según su periodo. Después del fin, mientras alguna tarea del corte
 * tenga plazo vigente, está "en seguimiento" (entrega del informe); luego, vencido.
 */
export function estadoDelCorte(
  corte: CorteFechas,
  hoy: Date,
  cumplido: boolean,
  fechasTareas: Array<string | undefined | null> = [],
): EstadoCorte {
  if (cumplido) return 'completado';
  const hoyIso = iso(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate());
  const inicio = corte.fechaProgramada.slice(0, 10);
  const fin = (corte.fechaSeguimiento || corte.fechaProgramada).slice(0, 10);
  if (hoyIso < inicio) return 'futuro';
  if (hoyIso <= fin) return 'activo';
  const plazo = fechasTareas.map((f) => (f ? String(f).slice(0, 10) : '')).filter(Boolean).sort().pop();
  return plazo && hoyIso <= plazo ? 'enSeguimiento' : 'vencido';
}

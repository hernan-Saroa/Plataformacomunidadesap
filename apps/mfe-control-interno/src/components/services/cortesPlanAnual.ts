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
 * Lleva la fecha de una tarea al año de su corte, conservando mes y día. Si así queda
 * antes de que empiece el corte, pasa al año siguiente: el informe de enero del corte
 * de julio a diciembre queda en enero del año siguiente.
 */
export function fechaTareaEnElCorte(fechaTarea: string | undefined, corte: CorteFechas | undefined): string | undefined {
  const t = partes(fechaTarea);
  const c = partes(corte?.fechaProgramada);
  if (!t || !c || !corte) return fechaTarea;
  let año = c[0];
  const enAño = (a: number) => iso(a, t[1], Math.min(t[2], ultimoDiaDelMes(a, t[1])));
  if (enAño(año) < corte.fechaProgramada.slice(0, 10)) año += 1;
  return enAño(año);
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

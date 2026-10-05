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
function sonCortesDeCierre(puntos: CorteFechas[]): boolean {
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
 * Fecha de entrega de una tarea. Muchas tareas del backend solo traen fechaLimite: sin
 * fechaEntrega el campo de fecha del corte salía vacío y la fecha no se movía al
 * configurar los cortes.
 */
export function fechaEntregaDeTarea(t: { fechaEntrega?: string; fechaLimite?: string; fecha_limite?: string }): string | undefined {
  return String(t.fechaEntrega || t.fechaLimite || t.fecha_limite || '').slice(0, 10) || undefined;
}

/**
 * Fecha de seguimiento por defecto de las tareas de un corte: el último día del mes
 * siguiente al fin del corte, igual que los cortes por defecto (30/06 → 31/07,
 * 31/12 → 31/01 del año siguiente).
 */
export function fechaSeguimientoPorDefecto(corte: CorteFechas | undefined): string | undefined {
  const fin = partes(corte?.fechaSeguimiento || corte?.fechaProgramada);
  if (!fin) return undefined;
  const año = fin[1] === 12 ? fin[0] + 1 : fin[0];
  const mes = fin[1] === 12 ? 1 : fin[1] + 1;
  return iso(año, mes, ultimoDiaDelMes(año, mes));
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

/**
 * Tarea del Rol 4 que genera el Programa Anual (EFDS-2133): una por cada corte que
 * cubre la auditoría (EFDS-2237). Sus fechas salen de la programación de la auditoría:
 * no se mueven de año ni se reparten entre cortes como las tareas de la plantilla.
 */
export function esTareaDelProgramaAnual(t: { id?: unknown; origen?: unknown } | null | undefined): boolean {
  return !!t && (t.origen === 'programa_anual' || String(t.id ?? '').startsWith('tarea-aud-'));
}

/** Tarea del Rol 4 que se crea sola por cada plan de mejoramiento (una por corte, EFDS-2237). */
export function esTareaDePlanMejoramiento(t: { id?: unknown; origen?: unknown } | null | undefined): boolean {
  return !!t && (t.origen === 'plan_mejoramiento' || String(t.id ?? '').startsWith('tarea-pm-'));
}

/** Tareas del Rol 4 que se alimentan solas: auditorías del Programa Anual y planes de mejoramiento. */
export function esTareaAutomaticaDelRol4(t: { id?: unknown; origen?: unknown } | null | undefined): boolean {
  return esTareaDelProgramaAnual(t) || esTareaDePlanMejoramiento(t);
}

/**
 * Datos con los que el backend reconoce y reparte por corte las tareas automáticas del
 * Rol 4. Al guardar el plan se envían tal cual: sin ellos la tarea perdía su auditoría,
 * su periodo y la fecha de seguimiento puesta a mano. La fecha límite (fin de la
 * auditoría o del plan) va aparte de la de seguimiento (EFDS-2237).
 */
export function camposDeSincronizacion(t: Record<string, any>): Record<string, unknown> {
  if (!esTareaAutomaticaDelRol4(t)) return {};
  const campos: Record<string, unknown> = {};
  for (const k of ['origen', 'auditoriaId', 'planMejoramientoId', 'fechaInicio', 'periodoInicio', 'periodoFin', 'fechaEntregaAuto', 'responsablesAuditoria', 'areaResponsable']) {
    if (t[k] !== undefined && t[k] !== null) campos[k] = t[k];
  }
  campos.fechaEntrega = t.fechaEntrega || null;
  campos.fechaLimite = t.fechaLimite || t.fecha_limite || t.fechaEntrega || null;
  return campos;
}

const SEPARADOR_CORTE = '-c-';

/** Auditoría o plan que generó la tarea (`tarea-aud-<id>-c-<corte>` → `tarea-aud-<id>`). */
function fuenteDeLaTarea(t: Record<string, any>): string | null {
  const id = String(t.id ?? '');
  const prefijo = id.startsWith('tarea-aud-') ? 'tarea-aud-' : id.startsWith('tarea-pm-') ? 'tarea-pm-' : null;
  const propio = esTareaDelProgramaAnual(t) ? t.auditoriaId : t.planMejoramientoId;
  if (propio) return `${esTareaDelProgramaAnual(t) ? 'tarea-aud-' : 'tarea-pm-'}${propio}`;
  if (!prefijo) return null;
  const corte = id.indexOf(SEPARADOR_CORTE, prefijo.length);
  return corte >= 0 ? id.slice(0, corte) : id;
}

const conSeguimiento = (t: Record<string, any>) =>
  !!t.completada ||
  (Array.isArray(t.adjuntosTarea) && t.adjuntosTarea.length > 0) ||
  (typeof t.observaciones === 'string' ? t.observaciones.trim() !== '' : Array.isArray(t.observaciones) && t.observaciones.length > 0);

/**
 * Reparte las tareas automáticas del Rol 4 en los cortes, una por cada corte que cubre
 * su auditoría o plan, igual que lo hace el backend al consultar el plan
 * (rol4-tareas-por-corte.ts). Se usa al cambiar los cortes en el asistente para que la
 * pantalla quede igual a lo que guardará el backend. Lo registrado (cumplimiento,
 * evidencias, observaciones) pasa al corte nuevo que contiene su periodo; la fecha de
 * seguimiento se recalcula con el corte.
 */
export function repartirTareasAutomaticasEnCortes<T extends Record<string, any>>(
  tareas: T[],
  cortes: Array<CorteFechas & { id: string }>,
): T[] {
  const periodos = cortesComoPeriodos([...cortes]).sort((a, b) => a.fechaProgramada.localeCompare(b.fechaProgramada));
  if (!periodos.length) return tareas;
  const fin = (c: CorteFechas) => (c.fechaSeguimiento || c.fechaProgramada).slice(0, 10);

  const grupos = new Map<string, T[]>();
  const resultado: T[] = [];
  for (const t of tareas) {
    const fuente = esTareaAutomaticaDelRol4(t) ? fuenteDeLaTarea(t) : null;
    if (!fuente) {
      resultado.push(t);
      continue;
    }
    grupos.set(fuente, [...(grupos.get(fuente) ?? []), t]);
  }

  for (const [fuente, grupo] of grupos) {
    const ref = grupo[0];
    const inicio = String(ref.fechaInicio || ref.periodoInicio || periodos[0].fechaProgramada).slice(0, 10);
    const limite = String(ref.fechaLimite || ref.fecha_limite || inicio).slice(0, 10);
    let destinos = periodos.filter((c) => c.fechaProgramada.slice(0, 10) <= limite && inicio <= fin(c));
    if (!destinos.length) {
      const cercano = corteDelInicio(inicio, periodos);
      destinos = cercano ? [cercano] : [];
    }
    for (const corte of destinos) {
      const previas = grupo.filter((t) => {
        if (t.puntoControlId === corte.id) return true;
        if (destinos.some((d) => d.id === t.puntoControlId)) return false;
        const desde = String(t.periodoInicio || t.fechaInicio || inicio).slice(0, 10);
        // Lo registrado va al corte nuevo que contiene su periodo
        if (conSeguimiento(t)) return corteDelInicio(desde, destinos)?.id === corte.id;
        // Sin nada registrado solo cuenta si su periodo cae en este corte (para el cumplimiento)
        const hasta = String(t.periodoFin || '').slice(0, 10);
        return !!t.periodoInicio && !!hasta && corte.fechaProgramada.slice(0, 10) <= hasta && desde <= fin(corte);
      });
      const misma = previas.length === 1 && previas[0].puntoControlId === corte.id ? previas[0] : null;
      const auto = fechaSeguimientoPorDefecto(corte);
      const manual = misma?.fechaEntrega && misma.fechaEntregaAuto && misma.fechaEntrega !== misma.fechaEntregaAuto
        ? misma.fechaEntrega
        : undefined;
      const textos = previas.map((t) => (typeof t.observaciones === 'string' ? t.observaciones.trim() : '')).filter(Boolean);
      resultado.push({
        ...ref,
        ...(previas[0] ?? {}),
        id: `${fuente}${SEPARADOR_CORTE}${corte.id}`,
        puntoControlId: corte.id,
        periodoInicio: corte.fechaProgramada.slice(0, 10),
        periodoFin: fin(corte),
        fechaEntrega: manual ?? auto,
        fechaEntregaAuto: auto,
        completada: previas.length > 0 && previas.every((t) => !!t.completada),
        observaciones: textos.join('\n\n'),
        adjuntosTarea: previas.flatMap((t) => (Array.isArray(t.adjuntosTarea) ? t.adjuntosTarea : [])),
      } as T);
    }
  }
  return resultado;
}

/**
 * Corte de una tarea del Programa Anual: el que contiene la fecha de inicio de su
 * auditoría. Antes del primer corte va al primero y después del último, al último
 * (una auditoría del programa puede empezar en enero del año siguiente). Mismo
 * criterio que el backend (programa-anual-rol4-tarea-sync.service).
 */
export function corteDelInicio<T extends CorteFechas & { id: string }>(
  fechaInicio: string | undefined,
  cortes: T[],
): T | undefined {
  if (!cortes.length) return undefined;
  const periodos = cortesComoPeriodos([...cortes]).sort((a, b) => a.fechaProgramada.localeCompare(b.fechaProgramada));
  const f = (fechaInicio || '').slice(0, 10);
  if (!f) return periodos[0];
  const fin = (c: T) => (c.fechaSeguimiento || c.fechaProgramada).slice(0, 10);
  const contiene = periodos.find((c) => c.fechaProgramada.slice(0, 10) <= f && f <= fin(c));
  if (contiene) return contiene;
  if (f < periodos[0].fechaProgramada.slice(0, 10)) return periodos[0];
  if (f > fin(periodos[periodos.length - 1])) return periodos[periodos.length - 1];
  return periodos.find((c) => c.fechaProgramada.slice(0, 10) > f) ?? periodos[periodos.length - 1];
}

export type EstadoCorte ='completado' | 'activo' | 'enSeguimiento' | 'vencido' | 'futuro';

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

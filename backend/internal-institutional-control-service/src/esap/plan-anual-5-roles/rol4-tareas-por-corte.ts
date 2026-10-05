/**
 * Tareas del Rol 4 por corte de seguimiento (EFDS-2237).
 *
 * Las actividades del Rol 4 que se alimentan solas (auditorías del Programa Anual y
 * planes de mejoramiento) llevan una tarea por cada corte que cubre su periodo: una
 * auditoría de febrero a abril con cortes mensuales tiene tres tareas, una por mes.
 * Cada una tiene su propio cumplimiento, evidencias y observaciones, y una fecha de
 * seguimiento que por defecto es el último día del mes siguiente al cierre del corte
 * (la misma regla de las demás tareas del Plan Anual) y que se puede cambiar a mano.
 */

/** Corte de seguimiento de la actividad como periodo: del `inicio` al `fin` (YYYY-MM-DD). */
export interface CortePeriodo {
  id: string;
  inicio: string;
  fin: string;
}

/** Corte tal como lo guarda la actividad (`puntos_control`). */
export interface PuntoControlGuardado {
  id: string;
  orden: number;
  nombre: string;
  descripcion: string;
  fechaProgramada: string;
  fechaSeguimiento: string;
  fechaReal: string | null;
  responsable: string;
  estado: 'pendiente';
  observaciones: string;
  evidencias: unknown[];
}

export type FrecuenciaCortes = 'mensual' | 'trimestral' | 'cuatrimestral' | 'semestral' | 'anual';

const MESES_POR_CORTE: Record<FrecuenciaCortes, number> = {
  mensual: 1,
  trimestral: 3,
  cuatrimestral: 4,
  semestral: 6,
  anual: 12,
};

const dos = (n: number) => String(n).padStart(2, '0');
const ultimoDia = (año: number, mes: number) => new Date(año, mes, 0).getDate();

/**
 * Periodicidad que pide el texto "Control" de la actividad ("Se hace seguimiento
 * mensual."). Si el texto no la dice, se usa la que tenga guardada la actividad.
 */
export function frecuenciaDeLaActividad(control?: string | null, guardada?: string | null): FrecuenciaCortes {
  const leer = (texto?: string | null): FrecuenciaCortes | null => {
    const t = (texto || '').toLowerCase();
    if (t.includes('mensual')) return 'mensual';
    if (t.includes('cuatrimestral')) return 'cuatrimestral';
    if (t.includes('trimestral')) return 'trimestral';
    if (t.includes('semestral')) return 'semestral';
    if (t.includes('anual')) return 'anual';
    return null;
  };
  return leer(control) ?? leer(guardada) ?? 'anual';
}

/** Cortes de la vigencia según la periodicidad, con el mismo formato que arma el asistente del plan. */
export function cortesPorDefecto(frecuencia: FrecuenciaCortes, año: number, prefijoId: string): PuntoControlGuardado[] {
  const paso = MESES_POR_CORTE[frecuencia];
  const cortes: PuntoControlGuardado[] = [];
  for (let mes = 1, orden = 1; mes <= 12; mes += paso, orden++) {
    const mesFin = mes + paso - 1;
    cortes.push({
      id: `${prefijoId}-${orden}`,
      orden,
      nombre: `Corte ${orden}`,
      descripcion: '',
      fechaProgramada: `${año}-${dos(mes)}-01`,
      fechaSeguimiento: `${año}-${dos(mesFin)}-${dos(ultimoDia(año, mesFin))}`,
      fechaReal: null,
      responsable: '',
      estado: 'pendiente',
      observaciones: '',
      evidencias: [],
    });
  }
  return cortes;
}

const esUltimoDiaDelMes = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return d === ultimoDia(y, m);
};

const diaSiguiente = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const f = new Date(y, m - 1, d + 1);
  return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`;
};

/**
 * Cortes guardados en la actividad como periodos. Un corte guarda su inicio en
 * `fechaProgramada` y su fin en `fechaSeguimiento` (EFDS-958). Los planes armados
 * con la plantilla vieja guardaban la fecha de cierre del periodo (siempre el último
 * día de un mes) y la de entrega del informe: esos se leen como periodos que van del
 * día siguiente al cierre anterior (o del 1 de enero) hasta su cierre, igual que en
 * la pantalla.
 */
export function cortesComoPeriodos(
  puntos: Array<{ id?: unknown; fechaProgramada?: unknown; fechaSeguimiento?: unknown }>,
): CortePeriodo[] {
  const fecha = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
  const validos = puntos
    .map((p) => ({ id: p?.id != null ? String(p.id) : '', programada: fecha(p?.fechaProgramada), seguimiento: fecha(p?.fechaSeguimiento) }))
    .filter((p): p is { id: string; programada: string; seguimiento: string | null } => !!p.id && !!p.programada)
    .sort((a, b) => a.programada.localeCompare(b.programada));
  if (validos.length === 0) return [];

  if (validos.every((p) => esUltimoDiaDelMes(p.programada))) {
    return validos.map((p, i) => ({
      id: p.id,
      inicio: i === 0 ? `${p.programada.slice(0, 4)}-01-01` : diaSiguiente(validos[i - 1].programada),
      fin: p.programada,
    }));
  }
  return validos.map((p) => ({ id: p.id, inicio: p.programada, fin: p.seguimiento ?? p.programada }));
}

/**
 * Corte que contiene una fecha. Si la fecha es anterior al primer corte va al primero;
 * si es posterior al último (por ejemplo, enero del año siguiente), al último; si cae
 * en un hueco entre dos cortes, al siguiente.
 */
export function corteDeLaFecha(fecha: string, cortes: CortePeriodo[]): CortePeriodo | null {
  if (cortes.length === 0) return null;
  const f = fecha.slice(0, 10);
  const contiene = cortes.find((c) => c.inicio <= f && f <= c.fin);
  if (contiene) return contiene;
  if (f < cortes[0].inicio) return cortes[0];
  if (f > cortes[cortes.length - 1].fin) return cortes[cortes.length - 1];
  return cortes.find((c) => c.inicio > f) ?? cortes[cortes.length - 1];
}

/** Id del corte donde empieza la auditoría (EFDS-2237). Sin cortes, `null`. */
export function corteDeLaAuditoria(fechaInicio: string, cortes: CortePeriodo[]): string | null {
  return corteDeLaFecha(fechaInicio, cortes)?.id ?? null;
}

/**
 * Cortes que cubre un periodo: todos los que se cruzan con él. Si el periodo queda
 * por fuera de los cortes (antes del primero o después del último), el corte más
 * cercano, para que la tarea no se quede sin seguimiento.
 */
export function cortesDelPeriodo(inicio: string, fin: string, cortes: CortePeriodo[]): CortePeriodo[] {
  if (cortes.length === 0) return [];
  const i = inicio.slice(0, 10);
  const f = (fin || inicio).slice(0, 10) < i ? i : (fin || inicio).slice(0, 10);
  const cruzan = cortes.filter((c) => c.inicio <= f && i <= c.fin);
  if (cruzan.length > 0) return cruzan;
  const cercano = corteDeLaFecha(i, cortes);
  return cercano ? [cercano] : [];
}

/** Último día del mes siguiente al cierre del corte (EFDS-958 / EFDS-2237). */
export function fechaSeguimientoDelCorte(finCorte: string): string {
  const [y, m] = finCorte.slice(0, 10).split('-').map(Number);
  const año = m === 12 ? y + 1 : y;
  const mes = m === 12 ? 1 : m + 1;
  return `${año}-${dos(mes)}-${dos(ultimoDia(año, mes))}`;
}

export interface TareaPorCorte {
  id: string;
  descripcion?: string;
  completada?: boolean;
  puntoControlId?: string | null;
  periodoInicio?: string;
  periodoFin?: string;
  fechaInicio?: string;
  fechaLimite?: string;
  fechaEntrega?: string;
  /** Fecha de seguimiento que puso la sincronización: si `fechaEntrega` es otra, la cambiaron a mano */
  fechaEntregaAuto?: string;
  fechaCompletada?: string;
  completadaPor?: string;
  observaciones?: unknown;
  adjuntosTarea?: unknown[];
  [key: string]: unknown;
}

/** Separador entre el id de la fuente (auditoría o plan) y el del corte en el id de la tarea. */
const SEPARADOR_CORTE = '-c-';

export const idTareaDelCorte = (prefijo: string, corteId: string) => `${prefijo}${SEPARADOR_CORTE}${corteId}`;

/** Id de la fuente que generó la tarea (`tarea-aud-<id>-c-<corte>` → `<id>`), aunque el id venga sin corte. */
export function fuenteDeLaTarea(id: unknown, prefijo: 'tarea-aud-' | 'tarea-pm-'): string | null {
  const s = String(id ?? '');
  if (!s.startsWith(prefijo)) return null;
  const resto = s.slice(prefijo.length);
  const corte = resto.indexOf(SEPARADOR_CORTE);
  return corte >= 0 ? resto.slice(0, corte) : resto;
}

/** Evidencias, observaciones o cumplimiento que alguien registró en la tarea. */
export function tieneSeguimientoRegistrado(t: TareaPorCorte): boolean {
  const obs = t.observaciones;
  return (
    !!t.completada ||
    (Array.isArray(t.adjuntosTarea) && t.adjuntosTarea.length > 0) ||
    (Array.isArray(obs) ? obs.length > 0 : typeof obs === 'string' && obs.trim() !== '')
  );
}

const unirObservaciones = (a: unknown, b: unknown): unknown => {
  if (Array.isArray(a) || Array.isArray(b)) return [...(Array.isArray(a) ? a : a ? [a] : []), ...(Array.isArray(b) ? b : b ? [b] : [])];
  const textos = [a, b].map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean);
  return textos.join('\n\n');
};

const unirAdjuntos = (a: unknown[] = [], b: unknown[] = []) => {
  const vistos = new Set<string>();
  return [...a, ...b].filter((x) => {
    const clave = JSON.stringify((x as { id?: unknown; url?: unknown })?.id ?? (x as { url?: unknown })?.url ?? x);
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
};

/**
 * Junta en una sola lo que se registró en varias tareas que caen en el mismo corte
 * (pasa cuando se cambia la periodicidad, por ejemplo de mensual a semestral): las
 * evidencias y observaciones se suman, y solo queda cumplida si todas lo estaban.
 */
function unirSeguimiento(tareas: TareaPorCorte[]): Partial<TareaPorCorte> {
  if (tareas.length === 0) return {};
  if (tareas.length === 1) return { ...tareas[0] };
  const [primera, ...resto] = tareas;
  return resto.reduce<Partial<TareaPorCorte>>(
    (acc, t) => ({
      ...acc,
      completada: !!acc.completada && !!t.completada,
      fechaCompletada: !!acc.completada && !!t.completada
        ? [acc.fechaCompletada, t.fechaCompletada].filter(Boolean).sort().pop()
        : undefined,
      completadaPor: !!acc.completada && !!t.completada ? t.completadaPor ?? acc.completadaPor : undefined,
      observaciones: unirObservaciones(acc.observaciones, t.observaciones),
      adjuntosTarea: unirAdjuntos(acc.adjuntosTarea as unknown[], t.adjuntosTarea as unknown[]),
    }),
    { ...primera },
  );
}

/**
 * Tareas de una fuente (una auditoría o un plan de mejoramiento) repartidas en los
 * cortes que cubre su periodo.
 *
 * - Lo que viene de la fuente (descripción, fechas, responsable…) va en `base` y se
 *   pone en todas.
 * - Lo que se registró en el seguimiento se conserva: cada tarea anterior pasa al
 *   corte nuevo que contiene su periodo (o el inicio de la fuente, si es la tarea
 *   única de antes). Si varias caen en el mismo, se juntan.
 * - La fecha de seguimiento es la del corte, salvo que la hayan cambiado a mano en ese
 *   mismo corte.
 * - Sin cortes queda una sola tarea, con la fecha de seguimiento en el fin del periodo.
 */
export function tareasDeLaFuentePorCorte(params: {
  prefijo: string;
  inicio: string;
  fin: string;
  cortes: CortePeriodo[];
  previas: TareaPorCorte[];
  /** Lo que viene de la fuente; recibe lo registrado en la tarea anterior de ese corte */
  base: (previa: Partial<TareaPorCorte> | undefined) => Omit<TareaPorCorte, 'id'>;
}): TareaPorCorte[] {
  const { prefijo, inicio, fin, cortes, previas, base } = params;
  const destinos = cortesDelPeriodo(inicio, fin, cortes);

  if (destinos.length === 0) {
    const previa = unirSeguimiento(previas);
    const manual = previa.fechaEntrega && previa.fechaEntregaAuto && previa.fechaEntrega !== previa.fechaEntregaAuto
      ? String(previa.fechaEntrega)
      : null;
    return [{
      completada: false,
      ...previa,
      ...base(previas.length ? previa : undefined),
      id: prefijo,
      puntoControlId: null,
      periodoInicio: inicio,
      periodoFin: fin,
      fechaEntrega: manual ?? fin,
      fechaEntregaAuto: fin,
    }];
  }

  // A qué corte nuevo pasa lo registrado en cada tarea anterior
  const porDestino = new Map<string, TareaPorCorte[]>();
  for (const previa of previas) {
    let destino = destinos.find((c) => c.id === previa.puntoControlId);
    if (!destino) {
      const desde = String(previa.periodoInicio || previa.fechaInicio || inicio).slice(0, 10);
      if (tieneSeguimientoRegistrado(previa)) {
        // Lo registrado nunca se pierde: va al corte nuevo que contiene su periodo
        destino = corteDeLaFecha(desde, destinos) ?? destinos[0];
      } else {
        // Una tarea sin nada registrado solo cuenta si su periodo cae en un corte nuevo
        // (así el semestre no queda cumplido si marzo no lo estaba)
        const hasta = String(previa.periodoFin || '').slice(0, 10);
        if (!previa.periodoInicio || !hasta) continue;
        destino = destinos.find((c) => c.inicio <= hasta && desde <= c.fin);
        if (!destino) continue;
      }
    }
    porDestino.set(destino.id, [...(porDestino.get(destino.id) ?? []), previa]);
  }

  return destinos.map((corte) => {
    const anteriores = porDestino.get(corte.id) ?? [];
    const previa = unirSeguimiento(anteriores);
    const auto = fechaSeguimientoDelCorte(corte.fin);
    // Solo se respeta una fecha cambiada a mano si es de este mismo corte
    const mismaTarea = anteriores.length === 1 && anteriores[0].puntoControlId === corte.id ? anteriores[0] : null;
    const manual = mismaTarea?.fechaEntrega && mismaTarea.fechaEntregaAuto && mismaTarea.fechaEntrega !== mismaTarea.fechaEntregaAuto
      ? String(mismaTarea.fechaEntrega)
      : null;
    return {
      completada: false,
      ...previa,
      ...base(anteriores.length ? previa : undefined),
      id: idTareaDelCorte(prefijo, corte.id),
      puntoControlId: corte.id,
      periodoInicio: corte.inicio,
      periodoFin: corte.fin,
      fechaEntrega: manual ?? auto,
      fechaEntregaAuto: auto,
    };
  });
}

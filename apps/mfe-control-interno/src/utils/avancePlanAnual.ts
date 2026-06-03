/**
 * Cálculo unificado de avance para actividades del Plan Anual (Decreto 648).
 *
 * Reglas (prioridad, de mayor a menor):
 * 1. Actividad marcada COMPLETADA → 100 %
 * 2. tipo_calculo = auditorias | planes_mejoramiento → usa porcentaje_avance del backend
 *    (el servicio recalcula al mover auditorías / planes; el front no sobrescribe)
 * 3. Puntos de control / cortes → % según entradas de seguimiento o estado "completado"
 * 4. Tareas de seguimiento → completadas / total
 * 5. Manual → porcentaje_avance almacenado
 */

export type FuenteAvancePlanAnual =
  | 'completada'
  | 'auditorias'
  | 'planes_mejoramiento'
  | 'cortes'
  | 'tareas'
  | 'manual';

export interface DesgloseAvanceActividad {
  tareasCompletadas?: number;
  tareasTotal?: number;
  cortesCumplidos?: number;
  cortesTotal?: number;
  auditoriasFinalizadas?: number;
  auditoriasProgramadas?: number;
  almacenado?: number;
}

export interface ResultadoAvanceActividad {
  porcentaje: number;
  fuente: FuenteAvancePlanAnual;
  etiqueta: string;
  desglose: DesgloseAvanceActividad;
  /** Si el front puede guardar porcentaje_avance al cambiar tareas/cortes locales */
  puedePersistirDesdeFront: boolean;
}

export interface ActividadAvanceInput {
  id?: number | string;
  estado?: string;
  porcentajeAvance?: number;
  tipoCalculo?: 'manual' | 'auditorias' | 'planes_mejoramiento' | string;
  totalAuditoriasProgramadas?: number;
  totalAuditoriasFinalizadas?: number;
  puntosControl?: Array<{ id: string; estado?: string }>;
  entradasSeguimiento?: Array<{ puntoControlId: string }>;
  tareasSeguimiento?: Array<{ completada?: boolean; puntoControlId?: string }>;
}

export interface OpcionesCalculoAvance {
  /** Datos frescos del endpoint de cumplimiento (solo lectura para la actividad vinculada) */
  cumplimientoAuditorias?: {
    porcentajeCumplimiento: number;
    totalProgramadas: number;
    totalFinalizadas: number;
    actividadId?: string;
  };
}

function clampPorcentaje(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function esActividadCompletada(estado?: string): boolean {
  const e = (estado || '').toUpperCase();
  return e === 'COMPLETADA';
}

function normalizarTipoCalculo(tipo?: string): 'manual' | 'auditorias' | 'planes_mejoramiento' {
  if (tipo === 'auditorias' || tipo === 'planes_mejoramiento') return tipo;
  return 'manual';
}

/** Cortes que cuentan para el % (solo los que tienen tareas asignadas, si existen). */
export function obtenerCortesParaAvance(
  actividad: ActividadAvanceInput,
): Array<{ id: string; estado?: string }> {
  const cortes = actividad.puntosControl || [];
  const tareas = actividad.tareasSeguimiento || [];
  const conTareas = cortes.filter((c) => tareas.some((t) => t.puntoControlId === c.id));
  return conTareas.length > 0 ? conTareas : cortes;
}

/** Indica si un corte ya cuenta para el % (tareas del corte completadas o entrada legacy). */
export function corteEstaCumplido(
  actividad: ActividadAvanceInput,
  corteId: string,
): boolean {
  const corte = actividad.puntosControl?.find((p) => p.id === corteId);
  if (corte?.estado === 'completado') return true;

  const tareasDelCorte = (actividad.tareasSeguimiento || []).filter(
    (t) => t.puntoControlId === corteId,
  );
  if (tareasDelCorte.length > 0) {
    return tareasDelCorte.every((t) => t.completada);
  }

  return (actividad.entradasSeguimiento || []).some((e) => e.puntoControlId === corteId);
}

export function calcularPorcentajeCortes(actividad: ActividadAvanceInput): number | null {
  const cortes = obtenerCortesParaAvance(actividad);
  if (cortes.length === 0) return null;

  const cumplidos = cortes.filter((corte) => corteEstaCumplido(actividad, corte.id)).length;
  return clampPorcentaje((cumplidos.length / cortes.length) * 100);
}

/** Resumen de evidencias y observaciones en tareas (no a nivel actividad). */
export function resumenEvidenciasObservacionesTareas(actividad: {
  tareasSeguimiento?: Array<{
    adjuntosTarea?: Array<unknown>;
    observaciones?: string;
  }>;
  adjuntos?: Array<unknown>;
  observacionesCumplimiento?: string | Array<unknown>;
}): {
  totalEvidenciasTareas: number;
  tareasConObservacion: number;
  totalTareas: number;
  evidenciasActividad: number;
  observacionesActividad: number;
} {
  const tareas = actividad.tareasSeguimiento || [];
  const totalEvidenciasTareas = tareas.reduce(
    (n, t) => n + (t.adjuntosTarea?.length || 0),
    0,
  );
  const tareasConObservacion = tareas.filter((t) => (t.observaciones || '').trim()).length;
  const obs = actividad.observacionesCumplimiento;
  const observacionesActividad = Array.isArray(obs)
    ? obs.length
    : typeof obs === 'string' && obs.trim()
      ? 1
      : 0;
  return {
    totalEvidenciasTareas,
    tareasConObservacion,
    totalTareas: tareas.length,
    evidenciasActividad: actividad.adjuntos?.length || 0,
    observacionesActividad,
  };
}

/**
 * Vincula cada tarea al corte correcto: usa puntoControlId guardado o, si falta,
 * el corte del mismo índice (como al crear el plan en el wizard).
 */
export function normalizarTareasConCortes<T extends Record<string, unknown>>(
  tareas: T[],
  puntosControl: Array<{ id: string }>,
): (T & { puntoControlId?: string })[] {
  const pcs = puntosControl || [];
  return (tareas || []).map((t, idx) => {
    const raw =
      (t.puntoControlId as string | undefined) ||
      (t.punto_control_id as string | undefined);
    let puntoControlId =
      raw && pcs.some((p) => p.id === raw) ? raw : undefined;
    if (!puntoControlId && pcs.length > 0) {
      puntoControlId = pcs[idx % pcs.length]?.id;
    }
    return { ...t, puntoControlId };
  });
}

/** % por tareas de seguimiento marcadas completadas. */
export function calcularPorcentajeTareas(actividad: ActividadAvanceInput): number | null {
  const tareas = actividad.tareasSeguimiento;
  if (!tareas || tareas.length === 0) return null;

  const completadas = tareas.filter((t) => t.completada).length;
  return clampPorcentaje((completadas / tareas.length) * 100);
}

function etiquetaFuente(fuente: FuenteAvancePlanAnual, desglose: DesgloseAvanceActividad): string {
  switch (fuente) {
    case 'completada':
      return 'Actividad completada';
    case 'auditorias':
      if (desglose.auditoriasProgramadas != null && desglose.auditoriasProgramadas > 0) {
        return `Programa de auditorías (${desglose.auditoriasFinalizadas ?? 0}/${desglose.auditoriasProgramadas} finalizadas)`;
      }
      return 'Programa de auditorías';
    case 'planes_mejoramiento':
      return 'Planes de mejoramiento';
    case 'cortes':
      return `Cortes cumplidos (${desglose.cortesCumplidos ?? 0}/${desglose.cortesTotal ?? 0} — tareas del corte completadas)`;
    case 'tareas':
      return `Tareas (${desglose.tareasCompletadas ?? 0}/${desglose.tareasTotal ?? 0})`;
    case 'manual':
    default:
      return 'Avance registrado manualmente';
  }
}

/**
 * Porcentaje y origen del avance para mostrar en UI y, si aplica, persistir al completar tareas.
 */
export function calcularAvanceActividad(
  actividad: ActividadAvanceInput,
  opciones?: OpcionesCalculoAvance,
): ResultadoAvanceActividad {
  if (esActividadCompletada(actividad.estado)) {
    return {
      porcentaje: 100,
      fuente: 'completada',
      etiqueta: etiquetaFuente('completada', {}),
      desglose: {},
      puedePersistirDesdeFront: false,
    };
  }

  const tipo = normalizarTipoCalculo(actividad.tipoCalculo);

  if (tipo === 'auditorias') {
    const cumpl = opciones?.cumplimientoAuditorias;
    const esActividadVinculada =
      cumpl?.actividadId != null &&
      actividad.id != null &&
      String(cumpl.actividadId) === String(actividad.id);

    const programadas = esActividadVinculada
      ? cumpl!.totalProgramadas
      : actividad.totalAuditoriasProgramadas ?? 0;
    const finalizadas = esActividadVinculada
      ? cumpl!.totalFinalizadas
      : actividad.totalAuditoriasFinalizadas ?? 0;

    const porcentaje = esActividadVinculada
      ? clampPorcentaje(cumpl!.porcentajeCumplimiento)
      : clampPorcentaje(actividad.porcentajeAvance ?? 0);

    return {
      porcentaje,
      fuente: 'auditorias',
      etiqueta: etiquetaFuente('auditorias', {
        auditoriasProgramadas: programadas,
        auditoriasFinalizadas: finalizadas,
      }),
      desglose: {
        auditoriasProgramadas: programadas,
        auditoriasFinalizadas: finalizadas,
        almacenado: actividad.porcentajeAvance,
      },
      puedePersistirDesdeFront: false,
    };
  }

  if (tipo === 'planes_mejoramiento') {
    const porcentaje = clampPorcentaje(actividad.porcentajeAvance ?? 0);
    return {
      porcentaje,
      fuente: 'planes_mejoramiento',
      etiqueta: etiquetaFuente('planes_mejoramiento', { almacenado: porcentaje }),
      desglose: { almacenado: porcentaje },
      puedePersistirDesdeFront: false,
    };
  }

  const pctCortes = calcularPorcentajeCortes(actividad);
  if (pctCortes !== null) {
    const cortes = obtenerCortesParaAvance(actividad);
    const cumplidos = cortes.filter((c) => corteEstaCumplido(actividad, c.id)).length;
    return {
      porcentaje: pctCortes,
      fuente: 'cortes',
      etiqueta: etiquetaFuente('cortes', {
        cortesCumplidos: cumplidos,
        cortesTotal: cortes.length,
      }),
      desglose: { cortesCumplidos: cumplidos, cortesTotal: cortes.length },
      puedePersistirDesdeFront: true,
    };
  }

  const pctTareas = calcularPorcentajeTareas(actividad);
  if (pctTareas !== null) {
    const total = actividad.tareasSeguimiento!.length;
    const completadas = actividad.tareasSeguimiento!.filter((t) => t.completada).length;
    return {
      porcentaje: pctTareas,
      fuente: 'tareas',
      etiqueta: etiquetaFuente('tareas', {
        tareasCompletadas: completadas,
        tareasTotal: total,
      }),
      desglose: { tareasCompletadas: completadas, tareasTotal: total },
      puedePersistirDesdeFront: true,
    };
  }

  const porcentaje = clampPorcentaje(actividad.porcentajeAvance ?? 0);
  return {
    porcentaje,
    fuente: 'manual',
    etiqueta: etiquetaFuente('manual', { almacenado: porcentaje }),
    desglose: { almacenado: porcentaje },
    puedePersistirDesdeFront: true,
  };
}

/** Promedio de avance de una lista de actividades (solo activas si se filtran antes). */
export function calcularAvancePromedioActividades(
  actividades: ActividadAvanceInput[],
  opciones?: OpcionesCalculoAvance,
): number {
  if (!actividades.length) return 0;
  const suma = actividades.reduce(
    (s, a) => s + calcularAvanceActividad(a, opciones).porcentaje,
    0,
  );
  return clampPorcentaje(suma / actividades.length);
}

/** Texto de evaluación alineado al % calculado (no pisa notas libres si fuente manual y hay texto distinto). */
export function textoEvaluacionDesdeAvance(
  porcentaje: number,
  fuente: FuenteAvancePlanAnual,
): string {
  if (fuente === 'manual') return `${porcentaje}% avance`;
  const prefijos: Record<FuenteAvancePlanAnual, string> = {
    completada: '100% avance — actividad completada',
    auditorias: `${porcentaje}% avance — según programa de auditorías`,
    planes_mejoramiento: `${porcentaje}% avance — según planes de mejoramiento`,
    cortes: `${porcentaje}% avance — según cortes de seguimiento`,
    tareas: `${porcentaje}% avance — según tareas de seguimiento`,
    manual: `${porcentaje}% avance`,
  };
  return prefijos[fuente] ?? `${porcentaje}% avance`;
}

export function estadoActividadDesdePorcentaje(
  porcentaje: number,
): 'PENDIENTE' | 'EN_EJECUCION' | 'COMPLETADA' {
  if (porcentaje >= 100) return 'COMPLETADA';
  if (porcentaje > 0) return 'EN_EJECUCION';
  return 'PENDIENTE';
}

export function estadoBackendDesdePorcentaje(
  porcentaje: number,
): 'pendiente' | 'en-progreso' | 'completada' {
  if (porcentaje >= 100) return 'completada';
  if (porcentaje > 0) return 'en-progreso';
  return 'pendiente';
}

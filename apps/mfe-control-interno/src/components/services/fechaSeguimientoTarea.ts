/**
 * Fecha de seguimiento de una tarea del Plan Anual (EFDS-1542).
 *
 * El Excel y el PDF deben mostrar la misma fecha, así que el orden es único:
 * 1. la fecha de seguimiento o de entrega con la que se programó la tarea;
 * 2. la del corte (punto de control) al que está vinculada la tarea;
 * 3. la fecha de corte de la actividad.
 *
 * La fecha en que el auditor completó la tarea no entra aquí: es otro dato y no debe
 * reemplazar la fecha configurada en Roles y Actividades (EFDS-2324). Esa se lee con
 * `fechaCompletadaDeTarea`.
 *
 * Las tareas del Rol 4 que genera el Programa Anual van una por corte y su fecha de
 * entrega es la de seguimiento de ese corte (el último día del mes siguiente, o la que
 * se haya puesto a mano), no el fin de la auditoría, que es su fecha límite (EFDS-2237).
 */
export function fechaSeguimientoTarea(actividad: any, tarea?: any): string {
  const puntos = actividad?.puntosControl || actividad?.puntos_control || [];
  const puntoId = tarea?.puntoControlId || tarea?.punto_control_id;
  const punto = Array.isArray(puntos) && puntoId
    ? puntos.find((p: any) => p?.id === puntoId)
    : undefined;

  return (
    tarea?.fechaSeguimiento ||
    tarea?.fecha_seguimiento ||
    tarea?.fechaEntrega ||
    tarea?.fecha_entrega ||
    tarea?.fechaLimite ||
    tarea?.fecha_limite ||
    punto?.fechaSeguimiento ||
    punto?.fechaProgramada ||
    actividad?.fechaCorte ||
    actividad?.fecha_corte ||
    ''
  );
}

/** Día (AAAA-MM-DD) en que se marcó la tarea como completada, si ya lo está (EFDS-2324). */
export function fechaCompletadaDeTarea(tarea?: any): string {
  if (!tarea?.completada) return '';
  return String(tarea.fechaCompletado || tarea.fechaCompletada || tarea.fecha_completada || '').slice(0, 10);
}

/** La fecha de completada como el resto de fechas del plan: `2026-10-08` → `8/10/2026`. */
export function fechaCompletadaLegible(tarea?: any): string {
  const f = fechaCompletadaDeTarea(tarea);
  return /^\d{4}-\d{2}-\d{2}$/.test(f) ? new Date(`${f}T12:00:00`).toLocaleDateString('es-CO') : '';
}

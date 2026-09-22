/**
 * Fecha de seguimiento de una tarea del Plan Anual (EFDS-1542).
 *
 * El Excel y el PDF deben mostrar la misma fecha, así que el orden es único:
 * 1. la fecha real de seguimiento o evaluación de la tarea, si ya se hizo;
 * 2. la fecha de entrega o límite con la que se programó la tarea;
 * 3. la del corte (punto de control) al que está vinculada la tarea;
 * 4. la fecha de corte de la actividad.
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
    tarea?.fechaEvaluacion ||
    tarea?.fecha_evaluacion ||
    tarea?.fechaCompletado ||
    tarea?.fechaCompletada ||
    tarea?.fecha_completada ||
    tarea?.fechaEntrega ||
    tarea?.fechaLimite ||
    tarea?.fecha_limite ||
    punto?.fechaSeguimiento ||
    punto?.fechaProgramada ||
    actividad?.fechaCorte ||
    actividad?.fecha_corte ||
    ''
  );
}

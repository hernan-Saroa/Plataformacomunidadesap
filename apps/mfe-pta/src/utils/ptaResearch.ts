/** Investigación completa: DTO del servidor y formato agrupado del visor. */
export function getPtaResearchData(pta: any) {
  const proyecto = pta?.investigacion_proyecto;
  const tieneProyecto = (item: any) => item && typeof item === 'object'
    && (item.nombre || item.nombre_proyecto || item.rol || item.codigo || Number(item.horas_solicitadas) > 0);
  // Un campo plano presente (incluso null o []) manda: no recuperar registros
  // antiguos del formato agrupado después de que el docente los haya eliminado.
  const proyectos: any[] = proyecto !== undefined
    ? (tieneProyecto(proyecto) ? [proyecto] : [])
    : (Array.isArray(pta?.investigacion?.proyectos) ? pta.investigacion.proyectos : []).filter(tieneProyecto);
  const actividades: any[] = (pta?.investigacion_actividades !== undefined
    ? (Array.isArray(pta.investigacion_actividades) ? pta.investigacion_actividades : [])
    : (Array.isArray(pta?.investigacion?.actividades) ? pta.investigacion.actividades : []))
    .filter((item: any) => item && typeof item === 'object');
  const horasCalculadas = proyectos.reduce((total, item) => total + (Number(item.horas_solicitadas) || 0), 0)
    + actividades.reduce((total, item) => total + (Number(item.horas_total ?? item.horas) || 0), 0);
  const horasServidor = pta?.horas_investigacion;
  const horas = horasServidor != null && Number.isFinite(Number(horasServidor))
    ? Number(horasServidor) : horasCalculadas;
  return { proyectos, actividades, horas };
}

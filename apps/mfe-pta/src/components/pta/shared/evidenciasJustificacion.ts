/**
 * Agrupación de evidencias (documentos de soporte) por justificación.
 *
 * Una justificación = 1 documento principal (lleva las horas y la descripción
 * del docente) + hasta 2 adjuntos de soporte que se registran con 0 horas y
 * descripción "Adjunto i de N" (ver handleSubmit de V12AdjuntosDocumentos).
 *
 * No existe grupo_id en BD, así que la agrupación usa ese marcador + mismo
 * componente + cercanía temporal (los archivos de un mismo envío se
 * registran con segundos de diferencia). Un adjunto huérfano (p. ej. si se
 * eliminó su principal) se muestra como tarjeta propia — comportamiento
 * defensivo para no ocultar archivos.
 */

/**
 * El seguimiento (cargue de documentos de justificación) solo se habilita
 * cuando el PTA está totalmente aprobado: estado final de aprobación o la
 * totalidad de sus componentes aprobados (dato enriquecido del backend).
 */
const ESTADOS_PTA_SEGUIMIENTO = ['Aprobado', 'En Firme', 'Finalizado'];

export function ptaHabilitadoParaSeguimiento(pta: any): boolean {
  if (!pta) return false;
  const estado = String(pta.estado || '').trim();
  if (ESTADOS_PTA_SEGUIMIENTO.includes(estado)) return true;
  // Los conteos enriquecidos incluyen solo componentes aplicables. El borrador
  // nunca habilita el seguimiento, aunque conserve conteos de una versión previa.
  if (!estado || estado.toLocaleUpperCase('es') === 'BORRADOR') return false;
  const total = Number(pta.componentes_total || 0);
  const aprobados = Number(pta.componentes_aprobados || 0);
  return total > 0 && aprobados >= total;
}

export function esAdjuntoEvidencia(ev: any): boolean {
  return Number(ev?.horas_avance || 0) === 0 && /^Adjunto \d+ de \d+/.test(String(ev?.descripcion || ''));
}

export function agruparEvidenciasPorJustificacion(evidencias: any[]): Array<{ main: any; adjuntos: any[] }> {
  const orden = [...(evidencias || [])].sort(
    (a, b) => new Date(a?.fecha_subida || 0).getTime() - new Date(b?.fecha_subida || 0).getTime()
  );
  const grupos: Array<{ main: any; adjuntos: any[] }> = [];
  const ultimoPorComponente: Record<string, { main: any; adjuntos: any[] }> = {};
  const VENTANA_MS = 10 * 60 * 1000;
  for (const ev of orden) {
    const comp = String(ev?.componente_pta || '');
    if (esAdjuntoEvidencia(ev)) {
      const g = ultimoPorComponente[comp];
      const cercano = g && Math.abs(new Date(ev?.fecha_subida || 0).getTime() - new Date(g.main?.fecha_subida || 0).getTime()) <= VENTANA_MS;
      if (cercano) { g.adjuntos.push(ev); continue; }
    }
    const grupo = { main: ev, adjuntos: [] as any[] };
    grupos.push(grupo);
    if (!esAdjuntoEvidencia(ev)) ultimoPorComponente[comp] = grupo;
  }
  // Las listas se muestran de lo más reciente a lo más antiguo.
  return grupos.reverse();
}

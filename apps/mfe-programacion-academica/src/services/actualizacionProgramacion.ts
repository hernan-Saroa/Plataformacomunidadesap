import { useSyncExternalStore } from 'react';

// Solo versiones de consultas, nunca datos de negocio. La fuente es el servidor.
const versiones = new Map<string, number>();
const oyentes = new Set<() => void>();
const suscribir = (oyente: () => void) => {
  oyentes.add(oyente);
  return () => { oyentes.delete(oyente); };
};

/** Invocar únicamente después de una escritura confirmada por el servidor. */
export function invalidarProgramacion(...recursos: string[]): void {
  for (const recurso of new Set(recursos)) {
    versiones.set(recurso, (versiones.get(recurso) ?? 0) + 1);
  }
  if (recursos.length) oyentes.forEach((oyente) => oyente());
}

/** Dependencia de un efecto que consulte de nuevo la API. El efecto debe ignorar
 * respuestas al desmontarse o cambiar de grupo/periodo. */
export function useRevisionProgramacion(...recursos: string[]): string {
  return useSyncExternalStore(
    suscribir,
    () => recursos.map((r) => versiones.get(r) ?? 0).join(':'),
    () => recursos.map(() => 0).join(':'),
  );
}

/** Dependencias comunes de las escrituras del cliente académico. */
export function invalidarEscrituraProgramacion(ruta: string): void {
  const segmentos = ruta.split('?')[0].split('/');
  const base = segmentos.indexOf('v1');
  const entidad = segmentos[base + 1];
  const id = segmentos[base + 2];
  const recursos = ['programacion', entidad];
  if (entidad === 'grupos') recursos.push('horarios', ...(id ? [`grupo:${decodeURIComponent(id)}`] : []));
  if (entidad === 'horarios' && id === 'grupo' && segmentos[base + 4] === 'periodo') {
    recursos.push('grupos', `grupo:${decodeURIComponent(segmentos[base + 3])}`);
  }
  if (['horarios', 'asignaciones', 'publicaciones', 'portal-docente', 'jefatura'].includes(entidad)) {
    recursos.push('horarios', 'publicaciones', 'portal-docente', 'acumulado', 'jefatura');
  }
  if (entidad === 'aulas') recursos.push('horarios');
  invalidarProgramacion(...recursos.filter(Boolean));
}

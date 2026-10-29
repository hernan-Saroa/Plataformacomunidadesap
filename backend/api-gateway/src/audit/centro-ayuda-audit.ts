/**
 * Nombre de la acción que queda en Auditoría para la administración del
 * Centro de Ayuda (EFDS-2399). La regla general del interceptor no distingue
 * ocultar de editar ni enviar a la papelera de borrar, y aquí importa.
 */
const ENTIDAD: Record<string, string> = { secciones: 'sección', recursos: 'recurso' };

export function accionCentroAyuda(method: string, url: string, body?: unknown): string | undefined {
  const ruta = url.split('?')[0].toLowerCase();
  const m = ruta.match(/\/centro-ayuda\/admin\/(secciones|recursos)(?:\/(orden|\d+))?(?:\/(visibilidad|restaurar))?\/?$/);
  if (!m) return undefined;
  const [, coleccion, segmento, accion] = m;
  const entidad = ENTIDAD[coleccion];

  if (segmento === 'orden') return 'ordenar secciones';
  if (accion === 'visibilidad') {
    const activo = (body as { activo?: unknown } | null)?.activo;
    return `${activo === true || activo === 'true' ? 'mostrar' : 'ocultar'} ${entidad}`;
  }
  if (accion === 'restaurar') return `restaurar ${entidad}`;
  if (method === 'POST' && !segmento) return `crear ${entidad}`;
  if (method === 'PUT' && segmento) return `editar ${entidad}`;
  if (method === 'DELETE' && segmento) return `enviar ${entidad} a la papelera`;
  return undefined;
}

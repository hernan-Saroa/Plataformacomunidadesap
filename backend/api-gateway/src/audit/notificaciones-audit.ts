/**
 * Nombre de la acción que queda en Auditoría para la consola de configuración
 * de notificaciones (EFDS-2406, RN5). La regla general del interceptor diría
 * "actualizar" para todo; aquí importa si se apagó o se encendió algo.
 */
export function accionNotificaciones(method: string, url: string, body?: unknown): string | undefined {
  const ruta = url.split('?')[0].toLowerCase();
  // El aviso se identifica por módulo y clave: /modulos/:codigo/eventos/:clave[/prueba].
  const m = ruta.match(/\/notificaciones\/api\/v\d+\/configuracion\/modulos\/[^/]+(?:\/(eventos)\/[^/]+)?(?:\/(prueba))?\/?$/);
  if (!m) return undefined;
  const [, eventos, accion] = m;
  const entidad = eventos ? 'evento de notificación' : 'módulo de notificaciones';

  if (accion === 'prueba' && method === 'POST') return 'enviar notificación de prueba';
  if (method !== 'PATCH') return undefined;

  const activo = (body as { activo?: unknown } | null)?.activo;
  if (activo === true || activo === 'true') return `activar ${entidad}`;
  if (activo === false || activo === 'false') return `desactivar ${entidad}`;
  return `configurar ${entidad}`;
}

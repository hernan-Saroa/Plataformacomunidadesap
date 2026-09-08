/**
 * Qué puede hacer quien está mirando (EFDS-1183).
 *
 * Esconder lo que la API va a rechazar no es seguridad —el guard del servicio
 * ya niega lo que corresponda— es no pintar puertas falsas: ofrecerle «Nuevo
 * proceso» a un ente de control lo lleva a un 403 que no puede interpretar, y
 * a concluir que la plataforma está rota.
 *
 * Se lee de la sesión que dejó el shell en el almacenamiento, y no de un
 * servicio suyo, para no acoplar el microfrontend a su host.
 */

/** Los permisos del módulo que la pantalla necesita consultar. */
export const PERMISOS = {
  configurar: 'contratacion.config.manage',
  procesoCrear: 'contratacion.proceso.create',
  procesoEditar: 'contratacion.proceso.edit',
  procesoAsignar: 'contratacion.proceso.assign',
  procesoArchivar: 'contratacion.proceso.archive',
  actividadEditar: 'contratacion.actividad.edit',
  actividadEnviar: 'contratacion.actividad.send',
  actividadAprobar: 'contratacion.actividad.approve',
  documentoCargar: 'contratacion.documento.upload',
  documentoEliminar: 'contratacion.documento.delete',
  expedienteVer: 'contratacion.expediente.view',
  expedienteArchivar: 'contratacion.expediente.archivar',
  alertaVer: 'contratacion.alerta.ver',
} as const;

/** La sesión tal como la deja el shell; de ahí solo interesan dos campos. */
interface Sesion {
  roles?: unknown[];
  permissions?: unknown[];
}

/**
 * La sesión que dejó el shell.
 *
 * Primero `window.__esap_auth_cache`, que es donde el shell la publica de
 * verdad: la restaura del backend y la guarda en memoria, no en disco. Las
 * claves de almacenamiento quedan como respaldo por si otro host la deja ahí.
 * Buscar solo en `localStorage` era el fallo: la sesión nunca estaba, así que
 * `tienePermiso` respondía que sí a todo y no se escondía nada.
 */
function leerSesion(): Sesion | null {
  try {
    const enMemoria = (window as unknown as { __esap_auth_cache?: Sesion })
      .__esap_auth_cache;
    if (enMemoria) return enMemoria;

    const crudo =
      localStorage.getItem('user') ??
      localStorage.getItem('esap_user') ??
      sessionStorage.getItem('user');
    return crudo ? (JSON.parse(crudo) as Sesion) : null;
  } catch {
    return null;
  }
}

/** El código de un rol o permiso, venga como texto o como objeto. */
function codigo(valor: unknown): string | null {
  if (typeof valor === 'string') return valor;
  const code = (valor as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : null;
}

/**
 * Si el usuario tiene el permiso.
 *
 * Ante la duda se responde que sí: es más probable que la sesión venga
 * incompleta —otro shell, un formato distinto— a que el usuario no tenga
 * ningún permiso, y esconderle todo lo dejaría sin pantalla sin explicación.
 * Lo que se niega de verdad lo niega el servicio.
 */
export function tienePermiso(permiso: string): boolean {
  const sesion = leerSesion();
  if (!sesion) return true;

  const roles = Array.isArray(sesion.roles) ? sesion.roles : [];
  if (roles.some((r) => codigo(r) === 'SUPER_ADMIN')) return true;

  const permisos = (Array.isArray(sesion.permissions) ? sesion.permissions : [])
    .map(codigo)
    .filter((c): c is string => c !== null);

  if (permisos.length === 0) return true;
  return permisos.includes(permiso);
}

/** Si tiene al menos uno de los permisos indicados. */
export function tieneAlguno(...permisos: string[]): boolean {
  return permisos.some(tienePermiso);
}

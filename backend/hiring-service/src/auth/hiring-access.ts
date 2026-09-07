/**
 * El usuario autenticado, en la forma que usan los services del módulo.
 *
 * ------------------------------------------------------- por qué está vacío --
 *
 * Este archivo llevaba treinta y nueve listas `ROLES_*` que decían, por cada
 * actuación, qué roles podían ejecutarla: `ROLES_ADJUDICAR`, `ROLES_LIQUIDAR`,
 * `ROLES_CIERRE_FINANCIERO`. Los endpoints las nombraban en `@Roles(...)`, y
 * eso ataba el código a unos códigos de rol concretos: un administrador podía
 * crear un rol nuevo desde la plataforma y darle la facultad de adjudicar, pero
 * el endpoint seguía preguntando por `ORDENADOR_GASTO` y le negaba el paso.
 *
 * Ahora los endpoints exigen permisos —`contratacion.adjudicacion.decidir`— y
 * quién los tiene se resuelve contra `auth.role_permissions`, que es lo que la
 * entidad administra. Es el mismo patrón de control interno y control
 * disciplinario.
 *
 * El razonamiento que vivía en los comentarios de esas listas —quién no puede
 * aprobar lo que él mismo pidió, por qué el supervisor no liquida lo que
 * vigiló— no se perdió: está en la migración `060`, que es donde ahora se
 * decide qué rol recibe cada permiso.
 *
 * Queda aquí lo único que no era una regla de autorización: leer del request
 * quién es el usuario.
 */

export interface HiringUser {
  userId?: string;
  username?: string;
  email?: string;
  roles?: unknown;
}

/**
 * Los roles llegan del JWT como strings o como objetos {code, name},
 * según quién emita el token. Se normalizan a códigos en mayúsculas.
 */
export function normalizeRoles(roles: unknown): string[] {
  const list = Array.isArray(roles) ? roles : roles ? [roles] : [];
  return list
    .map((role: any) => (typeof role === 'string' ? role : role?.code ?? role?.name ?? ''))
    .filter(Boolean)
    .map((role: string) => role.toUpperCase().trim());
}

export interface HiringAccess {
  userId: string;
  userName: string;
  userEmail?: string;
  roles: string[];
  puedeEditar: boolean;
}

/** Extrae del request el usuario autenticado en la forma que usan los services. */
export function getHiringAccess(req: any): HiringAccess {
  const user: HiringUser = req?.user ?? {};
  const roles = normalizeRoles(user.roles);

  return {
    userId: user.userId ?? '',
    userName: user.username ?? user.email ?? user.userId ?? 'Sistema',
    userEmail: user.email,
    roles,
    // Se conserva el campo porque lo leen varios services y la pantalla lo usa
    // para no ofrecer acciones que la API va a rechazar. Se resuelve por
    // permiso, no por rol: `permisosDelUsuario` traduce los roles del token.
    puedeEditar: tienePermisoDeEdicion(roles),
  };
}

/**
 * Import diferido para no crear un ciclo: `permisos.ts` importa `normalizeRoles`
 * de este archivo, así que no puede importarse aquí en la cabecera.
 */
function tienePermisoDeEdicion(roles: string[]): boolean {
  const { permisosDelUsuario, PERMISO_ACTIVIDAD_EDITAR } = require('./permisos');
  return permisosDelUsuario({ roles }).includes(PERMISO_ACTIVIDAD_EDITAR);
}

/**
 * Roles del módulo de Contratación (catálogo A4 — Formato usuario-roles-permisos).
 * Este HU (EFDS-1146, estudio previo) solo necesita GESTOR_CONTRATACION;
 * el resto se declara para que las HUs siguientes no reinventen los códigos.
 */
export const ROL_GESTOR_CONTRATACION = 'GESTOR_CONTRATACION';
export const ROL_REVISOR_CONTRATACION = 'REVISOR_CONTRATACION';
export const ROL_DIRECTOR_CONTRATACION = 'DIRECTOR_CONTRATACION';
export const ROL_SUPER_ADMIN = 'SUPER_ADMIN';

/** Roles que pueden escribir sobre un proceso en etapa de estudios previos. */
export const ROLES_ESCRITURA_ESTUDIO_PREVIO = [
  ROL_GESTOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

/** Roles que pueden consultar el expediente sin poder editarlo. */
export const ROLES_LECTURA_CONTRATACION = [
  ...ROLES_ESCRITURA_ESTUDIO_PREVIO,
  ROL_REVISOR_CONTRATACION,
  ROL_DIRECTOR_CONTRATACION,
];

/** Roles que pueden aprobar o devolver un estudio previo (numeral 3.4). */
export const ROLES_REVISION_ESTUDIO_PREVIO = [
  ROL_REVISOR_CONTRATACION,
  ROL_DIRECTOR_CONTRATACION,
  ROL_SUPER_ADMIN,
];

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
    puedeEditar: ROLES_ESCRITURA_ESTUDIO_PREVIO.some((r) => roles.includes(r)),
  };
}

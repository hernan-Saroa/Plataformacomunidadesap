/**
 * Catálogo fijo del equipo operativo OCI (Asignar Profesional, paso 2 — Rol en OCI).
 * Solo tres roles (EFDS-2197). Debe coincidir con roles-ocig-operativos.constants.ts
 * del servicio de control interno.
 */
export const ROLES_OCIG_OPERATIVOS = ['Jefe OCI', 'Auditor', 'Aprobador Plan Anual'] as const;

export type RolOCIGOperativo = (typeof ROLES_OCIG_OPERATIVOS)[number];

export const ROLES_OCI_DEFAULT: readonly RolOCIGOperativo[] = ROLES_OCIG_OPERATIVOS;

export const ROL_OCI_JEFE: RolOCIGOperativo = 'Jefe OCI';
export const ROL_OCI_AUDITOR: RolOCIGOperativo = 'Auditor';
export const ROL_OCI_APROBADOR_PLAN_ANUAL: RolOCIGOperativo = 'Aprobador Plan Anual';

/** Nombres que se guardaron antes de EFDS-2197 y el rol al que corresponden hoy. */
const ALIAS_ROL_OCIG: Record<string, RolOCIGOperativo> = {
  'Jefe OCIG': 'Jefe OCI',
  'Auditor Líder': 'Auditor',
  'Auditor Lider': 'Auditor',
  'Auditor Sénior': 'Auditor',
  'Auditor Senior': 'Auditor',
  'Auditor Júnior': 'Auditor',
  'Auditor Junior': 'Auditor',
  'Profesional OCI': 'Auditor',
  'Apoyo Técnico': 'Auditor',
  'Aprobador PAI': 'Aprobador Plan Anual',
};

export function normalizarRolOcigOperativo(
  rol?: string | null,
): RolOCIGOperativo | string {
  const valor = (rol ?? '').trim();
  if (!valor) return ROL_OCI_AUDITOR;
  return ALIAS_ROL_OCIG[valor] ?? valor;
}

export function esRolOcigOperativo(rol?: string | null): boolean {
  const n = normalizarRolOcigOperativo(rol);
  return (ROLES_OCIG_OPERATIVOS as readonly string[]).includes(n);
}

/**
 * El profesional tiene exactamente ese rol en Asignar Profesional (o su nombre
 * anterior). Sin rol no coincide con ninguno.
 */
export function tieneRolOci(rol: string | null | undefined, esperado: RolOCIGOperativo): boolean {
  if (!(rol ?? '').trim()) return false;
  return normalizarRolOcigOperativo(rol) === esperado;
}

/**
 * Roles del profesional en Asignar Profesional: el principal y los adicionales,
 * normalizados y sin repetidos. Un profesional puede tener varios, p. ej. el Jefe
 * OCI que también audita (EFDS-2452).
 */
export function rolesOciDe(
  profesional:
    | { cargo?: string | null; rolOcig?: string | null; rolesAdicionales?: readonly string[] | null }
    | null
    | undefined,
): string[] {
  if (!profesional) return [];
  const roles: string[] = [];
  for (const rol of [profesional.rolOcig, profesional.cargo, ...(profesional.rolesAdicionales ?? [])]) {
    if (!(rol ?? '').trim()) continue;
    const normalizado = String(normalizarRolOcigOperativo(rol));
    if (!roles.includes(normalizado)) roles.push(normalizado);
  }
  return roles;
}

/**
 * El profesional cumple la regla con cualquiera de sus roles, no solo con el
 * principal (EFDS-2452).
 */
export function cumpleConAlgunRolOci(
  profesional: Parameters<typeof rolesOciDe>[0],
  regla: (rol: string) => boolean,
): boolean {
  return rolesOciDe(profesional).some((rol) => regla(rol));
}

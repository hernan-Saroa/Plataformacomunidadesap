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

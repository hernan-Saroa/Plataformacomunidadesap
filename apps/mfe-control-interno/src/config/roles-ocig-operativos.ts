/** Catálogo fijo del equipo operativo OCIG (paso 2 — Rol en OCIG). */
export const ROLES_OCIG_OPERATIVOS = [
  'Jefe OCIG',
  'Auditor Líder',
  'Auditor',
  'Auditor Júnior',
  'Profesional OCI',
  'Apoyo Técnico',
  'Aprobador PAI',
] as const;

export type RolOCIGOperativo = (typeof ROLES_OCIG_OPERATIVOS)[number];

export const ROLES_OCI_DEFAULT: readonly RolOCIGOperativo[] = ROLES_OCIG_OPERATIVOS;

const ALIAS_ROL_OCIG: Record<string, RolOCIGOperativo> = {
  'Auditor Sénior': 'Auditor Líder',
  'Auditor Senior': 'Auditor Líder',
  'Jefe OCI': 'Jefe OCIG',
};

export function normalizarRolOcigOperativo(
  rol?: string | null,
): RolOCIGOperativo | string {
  const valor = (rol ?? '').trim();
  if (!valor) return 'Auditor';
  return ALIAS_ROL_OCIG[valor] ?? valor;
}

export function esRolOcigOperativo(rol?: string | null): boolean {
  const n = normalizarRolOcigOperativo(rol);
  return (ROLES_OCIG_OPERATIVOS as readonly string[]).includes(n);
}

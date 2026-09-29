/**
 * Catálogo fijo del equipo operativo OCI (Asignar Profesional, paso 2 — Rol en OCI).
 * Solo tres roles (EFDS-2197): quien dirige la oficina, quienes auditan y quienes
 * integran el comité que aprueba el Plan Anual.
 */
export const ROLES_OCIG_OPERATIVOS = [
  {
    name: 'Jefe OCI',
    description:
      'Dirección de la Oficina de Control Interno. Aprueba y supervisa el plan y las auditorías institucionales.',
  },
  {
    name: 'Auditor',
    description:
      'Ejecuta auditorías y actividades de control interno. Puede ser auditor líder o integrar el equipo auditor de una auditoría.',
  },
  {
    name: 'Aprobador Plan Anual',
    description: 'Integra el comité que aprueba y firma el Plan Anual de Auditoría.',
  },
] as const;

export const NOMBRES_ROLES_OCIG_OPERATIVOS = ROLES_OCIG_OPERATIVOS.map(
  (r) => r.name,
);

type RolOciOperativo = (typeof NOMBRES_ROLES_OCIG_OPERATIVOS)[number];

/** Rol de quien dirige la OCI; la persona se asigna en Configuración de Profesionales OCI. */
export const ROL_OCIG_JEFE: RolOciOperativo = 'Jefe OCI';
/** Rol de quienes pueden liderar una auditoría o integrar su equipo auditor. */
export const ROL_OCI_AUDITOR: RolOciOperativo = 'Auditor';
/** Rol de quienes integran el comité de aprobación del Plan Anual. */
export const ROL_OCI_APROBADOR_PLAN_ANUAL: RolOciOperativo = 'Aprobador Plan Anual';

/**
 * Nombres que se guardaron antes de EFDS-2197 y el rol al que corresponden hoy.
 * La migración 664 los actualiza; se siguen reconociendo por si llega un valor viejo.
 */
const ALIAS_ROL_OCIG: Record<string, RolOciOperativo> = {
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

/** Nombres guardados que corresponden a un rol operativo, incluidos sus alias históricos. */
export function variantesRolOcigOperativo(rol: string): string[] {
  return [rol, ...Object.keys(ALIAS_ROL_OCIG).filter((alias) => ALIAS_ROL_OCIG[alias] === rol)];
}

export function normalizarRolOcigOperativo(rol?: string | null): string {
  const valor = (rol ?? '').trim();
  if (!valor) return ROL_OCI_AUDITOR;
  return ALIAS_ROL_OCIG[valor] ?? valor;
}

export function esRolOcigOperativo(rol?: string | null): boolean {
  const normalizado = normalizarRolOcigOperativo(rol);
  return NOMBRES_ROLES_OCIG_OPERATIVOS.includes(normalizado as RolOciOperativo);
}

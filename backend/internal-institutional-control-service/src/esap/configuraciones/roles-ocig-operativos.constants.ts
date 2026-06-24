/** Catálogo fijo del equipo operativo OCIG (configuración de profesionales). */
export const ROLES_OCIG_OPERATIVOS = [
  {
    name: 'Jefe OCIG',
    description:
      'Dirección de la Oficina de Control Interno de Gestión. Aprueba y supervisa el plan y las auditorías institucionales.',
  },
  {
    name: 'Auditor Líder',
    description:
      'Lidera auditorías, coordina equipos y puede ser responsable de actividades del plan anual.',
  },
  {
    name: 'Auditor',
    description: 'Ejecuta auditorías y actividades de control interno asignadas.',
  },
  {
    name: 'Auditor Júnior',
    description:
      'Apoya la ejecución de auditorías bajo supervisión de un Auditor Líder o Auditor.',
  },
  {
    name: 'Profesional OCI',
    description: 'Profesional de apoyo de la Oficina de Control Interno de Gestión.',
  },
  {
    name: 'Apoyo Técnico',
    description:
      'Soporte documental, logístico y técnico al equipo de auditoría.',
  },
  {
    name: 'Aprobador PAI',
    description: 'Miembro con facultad de aprobación/firma del Plan Anual de Auditoría (PAI).',
  },
] as const;

export const NOMBRES_ROLES_OCIG_OPERATIVOS = ROLES_OCIG_OPERATIVOS.map(
  (r) => r.name,
);

const ALIAS_ROL_OCIG: Record<string, string> = {
  'Auditor Sénior': 'Auditor Líder',
  'Auditor Senior': 'Auditor Líder',
  'Jefe OCI': 'Jefe OCIG',
};

export function normalizarRolOcigOperativo(rol?: string | null): string {
  const valor = (rol ?? '').trim();
  if (!valor) return 'Auditor';
  return ALIAS_ROL_OCIG[valor] ?? valor;
}

export function esRolOcigOperativo(rol?: string | null): boolean {
  const normalizado = normalizarRolOcigOperativo(rol);
  return NOMBRES_ROLES_OCIG_OPERATIVOS.includes(
    normalizado as (typeof NOMBRES_ROLES_OCIG_OPERATIVOS)[number],
  );
}

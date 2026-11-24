export const RUND_PROFILE_PERMISSIONS = {
  CARGADOR: 'banco-docentes.rund.carga',
  REVISOR: 'banco-docentes.rund.revision',
  INCORPORADOR: 'banco-docentes.rund.incorporacion',
  // Solo lectura para áreas externas autorizadas por el GGP (p. ej. Programación Académica).
  CONSULTA: 'banco-docentes.rund.consulta',
} as const;

export const RUND_PROFILE_CAPABILITIES: Record<string, readonly string[]> = {
  [RUND_PROFILE_PERMISSIONS.CARGADOR]: [
    'banco-docentes.rund.view', 'banco-docentes.rund.create',
    'banco-docentes.rund.import', 'banco-docentes.rund.edit',
    'banco-docentes.rund.documents.manage', 'banco-docentes.rund.sensitive.view',
  ],
  [RUND_PROFILE_PERMISSIONS.REVISOR]: [
    'banco-docentes.rund.view', 'banco-docentes.rund.validate',
    'banco-docentes.rund.export', 'banco-docentes.rund.sensitive.view',
  ],
  [RUND_PROFILE_PERMISSIONS.INCORPORADOR]: [
    'banco-docentes.rund.view', 'banco-docentes.rund.sensitive.view',
  ],
  // sensitive.view solo habilita abrir los PDF en el visor; no autoriza descargar ni modificar.
  [RUND_PROFILE_PERMISSIONS.CONSULTA]: [
    'banco-docentes.rund.view', 'banco-docentes.rund.sensitive.view',
  ],
};

const RUND_READ_ONLY_CODES: ReadonlySet<string> = new Set([
  RUND_PROFILE_PERMISSIONS.CONSULTA, ...RUND_PROFILE_CAPABILITIES[RUND_PROFILE_PERMISSIONS.CONSULTA],
]);

/**
 * Solo lectura = perfil de consulta y ningún otro permiso RUND que no sea de lectura.
 * Espejo de isRundReadOnly del backend; el servidor es quien lo hace cumplir (RN-04).
 * El superusuario nunca es de solo lectura.
 */
export function isRundReadOnly(permissions: readonly string[] | undefined | null, isSuperUser = false): boolean {
  if (isSuperUser || !permissions) return false;
  const rund = permissions.filter(code => code.startsWith('banco-docentes.rund.'));
  return rund.includes(RUND_PROFILE_PERMISSIONS.CONSULTA) && rund.every(code => RUND_READ_ONLY_CODES.has(code));
}

export function expandRundPermissions(permissions: Iterable<string>): Set<string> {
  const result = new Set(permissions);
  for (const permission of [...result]) {
    for (const capability of RUND_PROFILE_CAPABILITIES[permission] || []) result.add(capability);
  }
  return result;
}

export const RUND_INCORPORATION_SUPPORTS = ['contrato', 'acto_administrativo_vinculacion'] as const;

// Also works with the lightweight auth adapters used by embedded RUND panels.
export function hasRundPermission(auth: { isSuperUser?: boolean; hasAnyPermission: (codes: string[]) => boolean }, permission: string) {
  return Boolean(auth.isSuperUser || auth.hasAnyPermission([permission,
    ...Object.entries(RUND_PROFILE_CAPABILITIES).filter(([, capabilities]) => capabilities.includes(permission)).map(([profile]) => profile),
  ]));
}

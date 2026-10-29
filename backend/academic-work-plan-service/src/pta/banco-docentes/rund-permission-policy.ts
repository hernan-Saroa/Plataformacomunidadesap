// One assignable permission per operational profile; legacy capabilities remain
// accepted for existing custom roles. Never infer permissions from a role name.
export const RUND_PROFILE_PERMISSIONS = {
  CARGADOR: 'banco-docentes.rund.carga',
  REVISOR: 'banco-docentes.rund.revision',
  INCORPORADOR: 'banco-docentes.rund.incorporacion',
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
};

export function expandRundPermissions(permissions: Iterable<string>): Set<string> {
  const result = new Set(permissions);
  for (const permission of [...result]) {
    for (const capability of RUND_PROFILE_CAPABILITIES[permission] || []) result.add(capability);
  }
  return result;
}

export const RUND_INCORPORATION_SUPPORTS = ['contrato', 'acto_administrativo_vinculacion'] as const;

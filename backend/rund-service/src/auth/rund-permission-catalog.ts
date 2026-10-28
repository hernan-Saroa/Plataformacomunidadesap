import { RUND_PROFILE_PERMISSIONS } from '../modules/banco-docentes/rund-permission-policy';

/** Codigos compatibles con las superficies existentes; no implican permisos entre si. */
export const RUND_BASE_PERMISSIONS = {
  VIEW: 'rund.view', CREATE: 'rund.create', EDIT: 'rund.edit',
  VALIDATE: 'rund.validate', ADMIN: 'rund.admin', EXPORT: 'rund.export',
} as const;

export const RUND_BANK_PERMISSIONS = {
  MANAGE: 'banco-docentes.rund.manage', VIEW: 'banco-docentes.rund.view',
  EDIT: 'banco-docentes.rund.edit', VALIDATE: 'banco-docentes.rund.validate',
  IMPORT: 'banco-docentes.rund.import', EXPORT: 'banco-docentes.rund.export',
  INVITE: 'banco-docentes.rund.invite', DOCUMENTS_MANAGE: 'banco-docentes.rund.documents.manage',
  CREATE: 'banco-docentes.rund.create', SENSITIVE_VIEW: 'banco-docentes.rund.sensitive.view',
  // Tres perfiles operativos (carga, revision, incorporacion); las capacidades granulares siguen vigentes.
  ...RUND_PROFILE_PERMISSIONS,
} as const;

export const RUND_MACRO_PERMISSIONS = {
  CONSULTAR: 'pta.macro_docente.consultar',
  GESTIONAR_ACCESOS_EXTERNOS: 'pta.macro_docente.gestionar_accesos_externos',
} as const;

export const RUND_PERMISSION_CODES = [
  ...Object.values(RUND_BASE_PERMISSIONS), ...Object.values(RUND_BANK_PERMISSIONS),
  ...Object.values(RUND_MACRO_PERMISSIONS),
];

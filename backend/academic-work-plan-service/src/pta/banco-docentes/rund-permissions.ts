import { SetMetadata } from '@nestjs/common';
import { RUND_PROFILE_PERMISSIONS } from './rund-permission-policy';

export const RUND_PERMISSIONS_KEY = 'rundPermissions';

/**
 * Permisos administrables del Registro Único Nacional Docente.
 * Los códigos deben coincidir con auth.permission (migración 423).
 */
export const RUND_PERMISSIONS = {
  ...RUND_PROFILE_PERMISSIONS,
  CREATE: 'banco-docentes.rund.create',
  MANAGE: 'banco-docentes.rund.manage',
  VIEW: 'banco-docentes.rund.view',
  EDIT: 'banco-docentes.rund.edit',
  VALIDATE: 'banco-docentes.rund.validate',
  IMPORT: 'banco-docentes.rund.import',
  EXPORT: 'banco-docentes.rund.export',
  INVITE: 'banco-docentes.rund.invite',
  DOCUMENTS_MANAGE: 'banco-docentes.rund.documents.manage',
  SENSITIVE_VIEW: 'banco-docentes.rund.sensitive.view',
} as const;

export const RequireRundPermissions = (...permissions: string[]) =>
  SetMetadata(RUND_PERMISSIONS_KEY, permissions);

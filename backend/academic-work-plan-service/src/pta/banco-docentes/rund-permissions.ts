import { SetMetadata } from '@nestjs/common';

export const RUND_PERMISSIONS_KEY = 'rundPermissions';

/**
 * Permisos administrables del Registro Único Nacional Docente.
 * Los códigos deben coincidir con auth.permission (migración 423).
 */
export const RUND_PERMISSIONS = {
  MANAGE: 'banco-docentes.rund.manage',
  VIEW: 'banco-docentes.rund.view',
  EDIT: 'banco-docentes.rund.edit',
  VALIDATE: 'banco-docentes.rund.validate',
  IMPORT: 'banco-docentes.rund.import',
  EXPORT: 'banco-docentes.rund.export',
  INVITE: 'banco-docentes.rund.invite',
  DOCUMENTS_MANAGE: 'banco-docentes.rund.documents.manage',
} as const;

export const RequireRundPermissions = (...permissions: string[]) =>
  SetMetadata(RUND_PERMISSIONS_KEY, permissions);

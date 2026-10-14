import { SetMetadata } from '@nestjs/common';

export const RUND_PERMISSIONS_KEY = 'rundPermissions';

/**
 * Permisos administrables del Registro Único Nacional Docente.
 * Los códigos conservan el contrato de 423; 006 completa el catálogo del servicio nuevo.
 */
export { RUND_BANK_PERMISSIONS as RUND_PERMISSIONS } from '../../auth/rund-permission-catalog';

export const RequireRundPermissions = (...permissions: string[]) =>
  SetMetadata(RUND_PERMISSIONS_KEY, permissions);

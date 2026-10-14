import { SetMetadata } from '@nestjs/common';

export const MACRO_DOCENTE_PERMISSION_KEY = 'macroDocentePermiso';

/**
 * Autorización del Macro Docente por PERMISO granular (no por rol fijo en
 * código): cualquier rol al que el administrador le asigne este permiso en
 * auth.role_permissions puede realizar la acción — así se agregan/quitan
 * roles sin tocar código. La resolución compartida pertenece a RUND
 * (auth/rund-effective-permissions.ts); los códigos pta.* se conservan por compatibilidad.
 */
export const RequierePermisoMacroDocente = (permission: string) =>
  SetMetadata(MACRO_DOCENTE_PERMISSION_KEY, permission);

export { RUND_MACRO_PERMISSIONS as MACRO_DOCENTE_PERMISOS } from '../../auth/rund-permission-catalog';

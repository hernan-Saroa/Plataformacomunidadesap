import { SetMetadata } from '@nestjs/common';

export const MACRO_DOCENTE_PERMISSION_KEY = 'macroDocentePermiso';

/**
 * Autorización del Macro Docente por PERMISO granular (no por rol fijo en
 * código): cualquier rol al que el administrador le asigne este permiso en
 * auth.role_permissions puede realizar la acción — así se agregan/quitan
 * roles sin tocar código. Ver pta-permissions.service.ts (mismo mecanismo
 * que ya usa la aprobación del PTA por componente).
 */
export const RequierePermisoMacroDocente = (permission: string) =>
  SetMetadata(MACRO_DOCENTE_PERMISSION_KEY, permission);

export const MACRO_DOCENTE_PERMISOS = {
  CONSULTAR: 'pta.macro_docente.consultar',
  GESTIONAR_ACCESOS_EXTERNOS: 'pta.macro_docente.gestionar_accesos_externos',
} as const;

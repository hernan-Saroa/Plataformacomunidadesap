import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorador para requerir permisos granulares en endpoints.
 *
 * Ejemplo:
 *   @Permissions('control-disciplinario.expediente-electronico.view_all')
 *
 * El PermissionsGuard (cuando se active) consultará la DB usando los roles del token.
 */
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

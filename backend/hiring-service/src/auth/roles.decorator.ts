import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restringe un endpoint a los roles indicados.
 * Se evalúa con RolesGuard, que corre después del JwtAuthGuard global.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

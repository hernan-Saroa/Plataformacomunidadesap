import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorador para especificar los permisos requeridos para acceder a un endpoint.
 * 
 * @example
 * // Requiere UN permiso específico
 * @Permissions('control-interno.plan-anual.approve')
 * 
 * @example
 * // Requiere AL MENOS UNO de los permisos (OR)
 * @Permissions('control-interno.plan-anual.edit', 'control-interno.plan-anual.create')
 * 
 * @param permissions Lista de permisos (el usuario necesita al menos uno)
 */
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

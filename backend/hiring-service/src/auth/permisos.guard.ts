import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISOS_KEY } from './permisos.decorator';
import { permisosDelUsuario } from './permisos';

/**
 * Deja pasar a quien tenga alguno de los permisos que el endpoint exige.
 *
 * La diferencia con RolesGuard es de quién manda: los roles los crea y renombra
 * el administrador desde la plataforma, así que un endpoint que los nombra se
 * rompe con un cambio de configuración. Los permisos son del código y no
 * cambian; qué rol los tiene es decisión de quien administra.
 */
@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const exigidos = this.reflector.getAllAndOverride<string[]>(PERMISOS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!exigidos?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Usuario no autenticado');

    const suyos = permisosDelUsuario(user);
    if (exigidos.some((permiso) => suyos.includes(permiso))) return true;

    // Se dice qué permiso falta, no qué rol: el rol que lo otorga depende de
    // cómo esté configurada la entidad, y nombrarlo aquí sería adivinar.
    throw new ForbiddenException(
      `No tienes el permiso necesario para esta acción: ${exigidos.join(' o ')}`,
    );
  }
}

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISOS_KEY } from './permisos.decorator';
import { permisosDelUsuario } from './permisos';
import { normalizeRoles } from './hiring-access';
import { PermisosService } from './permisos.service';

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
  constructor(
    private readonly reflector: Reflector,
    private readonly permisosService: PermisosService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const exigidos = this.reflector.getAllAndOverride<string[]>(PERMISOS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!exigidos?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Usuario no autenticado');

    /*
     * Tres fuentes, de la más autorizada a la menos:
     *
     *   1. los permisos del propio token, si algún día los trae;
     *   2. los que otorgan sus roles según `auth.role_permissions`, que es lo
     *      que administra la entidad y por tanto la respuesta correcta;
     *   3. el mapa `ROLES_QUE_OTORGAN` del código, como red de seguridad si la
     *      consulta falla o el rol no tiene nada asignado todavía.
     *
     * La tercera existe para que sembrar mal un rol no deje a nadie fuera de su
     * trabajo, y desaparecerá cuando `hiring-access` se retire.
     */
    const suyos = permisosDelUsuario(user);
    if (exigidos.some((permiso) => suyos.includes(permiso))) return true;

    const roles = normalizeRoles(user.roles ?? user.role);
    if (await this.permisosService.alguno(roles, exigidos)) return true;

    // Se dice qué permiso falta, no qué rol: el rol que lo otorga depende de
    // cómo esté configurada la entidad, y nombrarlo aquí sería adivinar.
    throw new ForbiddenException(
      `No tienes el permiso necesario para esta acción: ${exigidos.join(' o ')}`,
    );
  }
}

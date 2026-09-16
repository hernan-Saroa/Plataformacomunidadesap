import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

/** Marca una ruta como pública (sin token). Solo para health checks. */
export const CLAVE_PUBLICA = 'ruta_publica';

/**
 * Guard global de token — EFDS-1791.
 *
 * ⚠️ Por qué existe: el servicio publica el puerto 3013 al host en los tres
 * entornos (dev, qa, prod). Sin este guard, cualquiera que alcanzara el host
 * podía llamar a la API SIN autenticarse y obtener acceso completo escribiendo
 * una cabecera `x-user-roles` — el RBAC de EFDS-1643 se saltaba entero.
 *
 * El PTA ya tenía su equivalente, así que esto ALINEA el servicio con la
 * convención del repo en vez de divergir.
 *
 * Alcance de lo que resuelve, para no dar falsa tranquilidad: exige un token
 * VÁLIDO, de modo que un anónimo ya no entra. NO impide que un usuario
 * autenticado envíe cabeceras de otro perfil: esa parte es EFDS-1791 y se
 * mitiga sobre todo dejando de publicar el puerto al host.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly rutasPublicas = [/^\/?health\/?$/i, /^\/?$/];

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const esPublica = this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICA, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<Request>();
    if (esPublica || this.esRutaPublica(req)) return true;
    return super.canActivate(context);
  }

  private esRutaPublica(req: Request): boolean {
    const ruta = String(req?.path || req?.url || '').split('?')[0];
    return this.rutasPublicas.some((patron) => patron.test(ruta));
  }
}

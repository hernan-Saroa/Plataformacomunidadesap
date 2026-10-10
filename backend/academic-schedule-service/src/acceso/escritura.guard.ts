import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { nivelesVisibles, puedeVerNivel } from '../auth/programacion-permissions.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';
import { AlcanceService, type TipoAncla } from './alcance.service.js';
import { CLAVE_ESCRITURA, type Fuente, type ReglaEscritura } from './escritura.decorator.js';
import { rolesDe } from './roles.js';

export const METODOS_DE_ESCRITURA = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Guard GLOBAL de escrituras — EFDS-2301 (periodo cerrado) y EFDS-2302 (RN-08).
 *
 * ⚠️ Por qué global y fail-closed: el cierre es la garantía central del periodo
 * y antes no la aplicaba NINGUNA ruta de grupos, franjas, ciclo ni asignación.
 * Repetir un `if (cerrado)` en cada servicio deja abierta la próxima ruta que
 * alguien agregue. Aquí toda escritura tiene que declarar de qué periodo cuelga
 * (`@EscrituraEn`) o por qué no cuelga de ninguno (`@EscrituraSinPeriodo`); la
 * que no declare nada se rechaza.
 *
 * Corre DESPUÉS del guard de token (orden de registro en AppModule).
 */
@Injectable()
export class EscrituraGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly alcance: AlcanceService,
    private readonly permisos: ProgramacionPermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (!METODOS_DE_ESCRITURA.has(String(req.method).toUpperCase())) return true;

    const regla = this.reflector.get<ReglaEscritura | undefined>(CLAVE_ESCRITURA, context.getHandler());
    if (!regla) {
      throw new ForbiddenException(
        'Esta escritura no declara de qué periodo depende y se rechaza por seguridad.',
      );
    }
    if (!regla.anclas) return true;

    const alcances = await Promise.all(
      (Object.entries(regla.anclas) as Array<[TipoAncla, Fuente]>).map(([tipo, fuente]) => {
        const id = 'param' in fuente ? req.params?.[fuente.param] : (req.body as any)?.[fuente.body];
        return this.alcance.resolver(tipo, id);
      }),
    );

    if (regla.exigeNivel) {
      const permisos = await this.permisos.resolveForRoles(rolesDe(req));
      if (nivelesVisibles(permisos).length === 0) {
        throw new ForbiddenException('No tiene permisos de programación sobre ningún nivel académico.');
      }
      for (const { nivel } of alcances) {
        if (nivel && !puedeVerNivel(permisos, nivel)) {
          throw new ForbiddenException(`No tiene permiso para programar el nivel ${nivel}.`);
        }
      }
    }

    const cerrado = alcances.find((a) => a.periodo?.cerrado)?.periodo;
    if (cerrado) {
      throw new ConflictException(
        `El periodo ${cerrado.codigo} está cerrado: su programación es inmutable y no admite cambios.`,
      );
    }
    return true;
  }
}

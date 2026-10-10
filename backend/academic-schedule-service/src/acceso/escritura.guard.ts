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
import { AlcanceService, type Alcance, type TipoAncla } from './alcance.service.js';
import {
  CLAVE_ESCRITURA,
  CLAVE_LECTURA,
  type Anclas,
  type Fuente,
  type ReglaEscritura,
} from './escritura.decorator.js';
import { rolesDe } from './roles.js';

export const METODOS_DE_ESCRITURA = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Guard GLOBAL de alcance — EFDS-2301 (periodo cerrado) y EFDS-2302 (RN-08).
 *
 * ⚠️ Por qué global y fail-closed: el cierre es la garantía central del periodo
 * y antes no la aplicaba NINGUNA ruta de grupos, franjas, ciclo ni asignación.
 * Repetir un `if (cerrado)` en cada servicio deja abierta la próxima ruta que
 * alguien agregue. Aquí toda escritura tiene que declarar de qué periodo cuelga
 * (`@EscrituraEn`) o por qué no cuelga de ninguno (`@EscrituraSinPeriodo`); la
 * que no declare nada se rechaza.
 *
 * En lectura solo actúa sobre las rutas de UN recurso marcadas con `@LecturaEn`:
 * exige poder programar su nivel. Las listas filtran en SQL.
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

    if (!METODOS_DE_ESCRITURA.has(String(req.method).toUpperCase())) {
      const anclas = this.reflector.get<Anclas | undefined>(CLAVE_LECTURA, context.getHandler());
      if (anclas) await this.exigirNivel(req, await this.resolver(req, anclas));
      return true;
    }

    const regla = this.reflector.get<ReglaEscritura | undefined>(CLAVE_ESCRITURA, context.getHandler());
    if (!regla) {
      throw new ForbiddenException(
        'Esta escritura no declara de qué periodo depende y se rechaza por seguridad.',
      );
    }
    if (!regla.anclas) return true;

    const alcances = await this.resolver(req, regla.anclas);
    if (regla.exigeNivel) await this.exigirNivel(req, alcances);

    const cerrado = alcances.find((a) => a.periodo?.cerrado)?.periodo;
    if (cerrado) {
      throw new ConflictException(
        `El periodo ${cerrado.codigo} está cerrado: su programación es inmutable y no admite cambios.`,
      );
    }
    return true;
  }

  private resolver(req: Request, anclas: Anclas): Promise<Alcance[]> {
    return Promise.all(
      (Object.entries(anclas) as Array<[TipoAncla, Fuente]>).map(([tipo, fuente]) => {
        const id = 'param' in fuente ? req.params?.[fuente.param]
          : 'query' in fuente ? (req.query as any)?.[fuente.query]
          : (req.body as any)?.[fuente.body];
        return this.alcance.resolver(tipo, id);
      }),
    );
  }

  /** RN-08: hace falta algún nivel, y el del recurso si se conoce. */
  private async exigirNivel(req: Request, alcances: Alcance[]): Promise<void> {
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
}

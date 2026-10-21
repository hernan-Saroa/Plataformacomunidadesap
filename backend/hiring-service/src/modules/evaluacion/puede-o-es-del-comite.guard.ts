import {
  ExecutionContext,
  Injectable,
  SetMetadata,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isUUID } from 'class-validator';

import { Accion } from '../../auth/alcance';
import { AlcanceService } from '../../auth/alcance.service';
import { getHiringAccess } from '../../auth/hiring-access';
import { PermisosService } from '../../auth/permisos.service';
import { PUEDE_KEY, PuedeGuard } from '../../auth/puede.guard';
import { ComiteService } from '../comite/comite.service';

/**
 * `@Puede` para la 6.3, con una puerta más: estar en el comité del proceso.
 *
 * Quien evalúa lo designa el memorando, no el rol. Si la puerta fuera solo el
 * rol, un abogado o un técnico del área designados en el comité verían su
 * nombre en la designación y la evaluación cerrada, y habría que pedir que les
 * pusieran un rol de evaluador que no dice nada que el memorando no diga ya.
 *
 * Quien no es del comité sigue entrando por el alcance, como en `@Puede`: así
 * el que solo consulta ve el resultado, y el service le niega el registro.
 */
export const PuedeOEsDelComite = (accion: Accion, numeral: string) =>
  applyDecorators(
    SetMetadata(PUEDE_KEY, { accion, destino: numeral }),
    UseGuards(PuedeOEsDelComiteGuard),
  );

@Injectable()
export class PuedeOEsDelComiteGuard extends PuedeGuard {
  constructor(
    reflector: Reflector,
    alcanceService: AlcanceService,
    permisosService: PermisosService,
    private readonly comite: ComiteService,
  ) {
    super(reflector, alcanceService, permisosService);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const procesoId = request.params?.id;

    // El guard corre antes que `ParseUUIDPipe`: un id malformado llegaría a la
    // consulta y saldría como 500. Se deja que lo rechace el pipe.
    if (request.user && isUUID(procesoId)) {
      const mias = await this.comite.dimensionesDe(procesoId, getHiringAccess(request));
      if (mias.length > 0) return true;
    }

    return super.canActivate(context);
  }
}

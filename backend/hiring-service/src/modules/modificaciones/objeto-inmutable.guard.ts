import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { intentoDeModificarObjeto } from './objeto-inmutable';

/**
 * Impide que una modificación contractual traiga un objeto nuevo — RF-MOD-04.
 *
 * Va en un guard y no en los DTO porque la validación corre con
 * `whitelist: true`: un campo que ningún DTO declara se **descarta en
 * silencio**, y el gestor que mandó un objeto nuevo recibiría un 201 creyendo
 * que su cambio entró. Los guards corren antes que los pipes, así que aquí el
 * cuerpo todavía llega entero.
 *
 * Se aplica al controlador completo, no ruta por ruta: el criterio de la
 * historia es «cualquier trámite de modificación contractual», y una ruta nueva
 * que alguien añada mañana queda cubierta sin acordarse de esto.
 */
@Injectable()
export class ObjetoInmutableGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { body } = context.switchToHttp().getRequest();

    const motivo = intentoDeModificarObjeto(body);
    if (motivo) throw new BadRequestException(motivo);

    return true;
  }
}

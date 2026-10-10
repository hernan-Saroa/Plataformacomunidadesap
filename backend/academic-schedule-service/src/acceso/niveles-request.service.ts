import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import type { NivelAcademico } from '../catalogo/nivel-academico.js';
import { nivelesVisibles } from '../auth/programacion-permissions.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';
import { rolesDe } from './roles.js';

/**
 * Niveles que el usuario del request puede programar — para que las LISTAS
 * filtren en SQL (EFDS-2302). Resueltos en el servidor desde sus roles.
 * Fail-closed: sin ningún nivel, 403.
 */
@Injectable()
export class NivelesRequestService {
  constructor(private readonly permisos: ProgramacionPermissionsService) {}

  async de(req: Request): Promise<NivelAcademico[]> {
    const niveles = nivelesVisibles(await this.permisos.resolveForRoles(rolesDe(req)));
    if (niveles.length === 0) {
      throw new ForbiddenException('No tiene permisos de programación sobre ningún nivel académico.');
    }
    return niveles;
  }
}

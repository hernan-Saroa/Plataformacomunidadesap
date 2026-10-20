import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import type { NivelAcademico } from '../catalogo/nivel-academico.js';
import { nivelesAsignables, nivelesProgramables, nivelesVisibles } from '../auth/programacion-permissions.js';
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

  /** Niveles que puede VER (programa o asigna docentes): para las listas de lectura. */
  async de(req: Request): Promise<NivelAcademico[]> {
    return this.exigirAlguno(nivelesVisibles(await this.permisos.resolveForRoles(rolesDe(req))));
  }

  /** Niveles que puede PROGRAMAR: para las escrituras masivas (publicar, retirar). */
  async programables(req: Request): Promise<NivelAcademico[]> {
    return this.exigirAlguno(nivelesProgramables(await this.permisos.resolveForRoles(rolesDe(req))));
  }

  /** Niveles en los que puede ASIGNAR docentes (EFDS-2342). */
  async asignables(req: Request): Promise<NivelAcademico[]> {
    const niveles = nivelesAsignables(await this.permisos.resolveForRoles(rolesDe(req)));
    if (niveles.length === 0) {
      throw new ForbiddenException('No tiene permiso para asignar docentes en ningún nivel académico.');
    }
    return niveles;
  }

  private exigirAlguno(niveles: NivelAcademico[]): NivelAcademico[] {
    if (niveles.length === 0) {
      throw new ForbiddenException('No tiene permisos de programación sobre ningún nivel académico.');
    }
    return niveles;
  }
}

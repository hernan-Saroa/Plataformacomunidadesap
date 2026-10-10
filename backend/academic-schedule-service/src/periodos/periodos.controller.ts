import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';

import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';
import { NivelesRequestService } from '../acceso/niveles-request.service.js';
import { rolesDe } from '../acceso/roles.js';
import { PeriodosService } from './periodos.service.js';

/** Periodos de la plataforma con el estado de su programación — EFDS-2328. */
@Controller('periodos')
export class PeriodosController {
  constructor(
    private readonly periodos: PeriodosService,
    private readonly permisos: ProgramacionPermissionsService,
    private readonly niveles: NivelesRequestService,
  ) {}

  /** GET /periodos — contrato en INTEGRACION-claude.md, sección 1. */
  @Get()
  async listar(@Req() req: Request) {
    await this.niveles.de(req); // exige algún nivel del módulo
    const permisos = await this.permisos.resolveForRoles(rolesDe(req));
    return { success: true, data: await this.periodos.listar(permisos) };
  }
}

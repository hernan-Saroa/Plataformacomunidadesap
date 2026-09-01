import { BadRequestException, Controller, Get, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { CatalogoService } from './catalogo.service.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';
import { esNivelAcademico, NivelAcademico } from './nivel-academico.js';

@Controller('catalogo')
export class CatalogoController {
  constructor(
    private readonly catalogoService: CatalogoService,
    private readonly permisos: ProgramacionPermissionsService,
  ) {}

  /**
   * Permisos resueltos en el servidor a partir de los roles del token. Nunca se
   * confía en un nivel o permiso enviado por el cliente.
   */
  private async permisosDe(req: Request): Promise<Set<string>> {
    const roles = Array.isArray((req as any)?.user?.roles) ? (req as any).user.roles : [];
    const codes = roles.map((r: any) => (typeof r === 'string' ? r : r?.code)).filter(Boolean);
    return this.permisos.resolveForRoles(codes);
  }

  /** GET /catalogo/programas?nivel=pregrado|posgrado */
  @Get('programas')
  async listarProgramas(@Req() req: Request, @Query('nivel') nivel?: string) {
    if (nivel !== undefined && !esNivelAcademico(nivel)) {
      throw new BadRequestException("El nivel debe ser 'pregrado' o 'posgrado'.");
    }
    const permisos = await this.permisosDe(req);
    const data = await this.catalogoService.listarProgramas(
      permisos,
      nivel ? (String(nivel).toLowerCase() as NivelAcademico) : undefined,
    );
    return { success: true, data };
  }

  /** GET /catalogo/programas/:id/asignaturas — agrupadas por semestre (AC-01). */
  @Get('programas/:id/asignaturas')
  async catalogoPorSemestre(@Req() req: Request, @Param('id') id: string) {
    const permisos = await this.permisosDe(req);
    const data = await this.catalogoService.catalogoPorSemestre(permisos, String(id));
    return { success: true, data };
  }
}

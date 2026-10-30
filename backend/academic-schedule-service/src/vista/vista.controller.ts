import { BadRequestException, Controller, ForbiddenException, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { NivelesRequestService } from '../acceso/niveles-request.service.js';
import { rolesDe } from '../acceso/roles.js';
import { tokenDe } from '../acceso/token.js';
import {
  nivelesAsignables, nivelesProgramables, nivelesVisibles, puedeAsignarDocentes, puedeVerDisponibilidadDocente,
} from '../auth/programacion-permissions.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';
import { esNivelAcademico } from '../catalogo/nivel-academico.js';
import { VistaService } from './vista.service.js';

/**
 * Vistas de la programación — EFDS-2344 (árbol) y EFDS-2343 (calendario del docente).
 * Contratos en INTEGRACION-claude.md §19. Solo lectura.
 */
@Controller('programacion')
export class VistaController {
  constructor(
    private readonly vista: VistaService,
    private readonly niveles: NivelesRequestService,
    private readonly permisos: ProgramacionPermissionsService,
  ) {}

  /**
   * GET /programacion/mis-permisos — qué niveles ve, programa y asigna el usuario
   * (EFDS-2342). Solo para que la pantalla muestre lo que corresponde: las
   * garantías siguen en el servidor, ruta por ruta.
   */
  @Get('mis-permisos')
  async misPermisos(@Req() req: Request) {
    const permisos = await this.permisos.resolveForRoles(rolesDe(req));
    return {
      success: true,
      data: {
        ver: nivelesVisibles(permisos),
        programar: nivelesProgramables(permisos),
        asignar: nivelesAsignables(permisos),
        disponibilidad: puedeVerDisponibilidadDocente(permisos) || puedeAsignarDocentes(permisos),
      },
    };
  }

  /** GET /programacion/arbol?periodo=&nivel=&programa=&tipoOferta=&soloSinDocente= */
  @Get('arbol')
  async arbol(
    @Req() req: Request,
    @Query('periodo') periodo: string,
    @Query('nivel') nivel?: string,
    @Query('programa') programa?: string,
    @Query('tipoOferta') tipoOferta?: string,
    @Query('soloSinDocente') soloSinDocente?: string,
  ) {
    let niveles = await this.niveles.de(req);
    if (nivel) {
      if (!esNivelAcademico(nivel)) throw new BadRequestException('nivel debe ser pregrado o posgrado.');
      if (!niveles.includes(nivel)) throw new ForbiddenException(`No tiene permiso para ver el nivel ${nivel}.`);
      niveles = [nivel];
    }
    const data = await this.vista.arbol(
      { periodo, programa, tipoOferta, soloSinDocente: soloSinDocente === 'true' }, niveles, tokenDe(req));
    return { success: true, data };
  }

  /** GET /programacion/docentes?periodo=&q= — buscador del filtro de disponibilidad. */
  @Get('docentes')
  async docentes(@Req() req: Request, @Query('periodo') periodo: string, @Query('q') q?: string) {
    await this.exigirDisponibilidad(req);
    return { success: true, data: await this.vista.buscarDocentes(periodo, q, tokenDe(req)) };
  }

  /** GET /programacion/docentes/calendario?periodo=&documento= (o &idDocente=) */
  @Get('docentes/calendario')
  async calendario(
    @Req() req: Request,
    @Query('periodo') periodo: string,
    @Query('documento') documento?: string,
    @Query('idDocente') idDocente?: string,
  ) {
    const permisos = await this.exigirDisponibilidad(req);
    const docente = await this.vista.docentePor({ documento, idDocente });
    // Lo de un nivel que no ve sale como «reservada»: solo se sabe que está ocupado (RN-07).
    const data = await this.vista.calendario(docente, periodo, nivelesVisibles(permisos), tokenDe(req));
    return { success: true, data };
  }

  /**
   * La disponibilidad del docente es transversal (RN-07): la ve quien la consulta o
   * quien asigna docentes, en cualquier nivel.
   */
  private async exigirDisponibilidad(req: Request): Promise<ReadonlySet<string>> {
    const permisos = await this.permisos.resolveForRoles(rolesDe(req));
    if (!puedeVerDisponibilidadDocente(permisos) && !puedeAsignarDocentes(permisos)) {
      throw new ForbiddenException('No tiene permiso para consultar la disponibilidad de los docentes.');
    }
    return permisos;
  }
}

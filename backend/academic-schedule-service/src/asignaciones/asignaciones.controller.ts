import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';

import { AsignacionesService, type AsignarDocenteDto } from './asignaciones.service.js';

/**
 * Asignación de docente a grupo con bloqueo duro — EFDS-1372, subtarea 8.
 *
 * El panel del docente es de SOLO LECTURA (RN-09): la consulta no escribe el
 * RUND, y la situación administrativa se resuelve en el servidor, nunca desde el
 * cliente. La asignación es bloqueo duro: si alguna regla falla, no se guarda y
 * se devuelven TODOS los motivos.
 */
@Controller('asignaciones')
export class AsignacionesController {
  constructor(private readonly asignaciones: AsignacionesService) {}

  /**
   * GET /asignaciones/docente/:documento?grupo=<id>
   *
   * Panel de solo lectura. Sin `grupo`, devuelve la ficha del docente y su
   * situación. Con `grupo`, además evalúa en seco el bloqueo y devuelve los
   * motivos que impedirían asignarlo, sin guardar nada.
   */
  @Get('docente/:documento')
  async consultarDocente(
    @Param('documento') documento: string,
    @Query('grupo') idGrupo?: string,
  ) {
    const data = await this.asignaciones.consultarDocente(documento, idGrupo);
    return { success: true, data };
  }

  /**
   * POST /asignaciones — asigna el docente al grupo (bloqueo duro).
   *
   * Devuelve `{ asignado: false, motivos }` con TODOS los motivos si alguna regla
   * falla; en ese caso no se guardó nada.
   */
  @Post()
  async asignar(@Body() body: AsignarDocenteDto) {
    const data = await this.asignaciones.asignar(body);
    return { success: true, data };
  }

  /** DELETE /asignaciones/grupo/:idGrupo — retira la asignación y libera sus franjas. */
  @Delete('grupo/:idGrupo')
  async retirar(@Param('idGrupo') idGrupo: string) {
    const data = await this.asignaciones.retirar(idGrupo);
    return { success: true, data };
  }
}

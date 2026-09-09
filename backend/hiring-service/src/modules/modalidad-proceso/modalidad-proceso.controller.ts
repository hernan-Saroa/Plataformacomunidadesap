import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ModalidadProcesoService } from './modalidad-proceso.service';
import { CambiarModalidadDto, DecidirModalidadDto } from './dto/modalidad-proceso.dto';
import { PermisosGuard } from '../../auth/permisos.guard';
import { Permisos } from '../../auth/permisos.decorator';
import { PERMISO_ACTIVIDAD_EDITAR, PERMISO_PROCESO_VER } from '../../auth/permisos';
import { getHiringAccess } from '../../auth/hiring-access';

/**
 * Actividad 3.5 · Definir la modalidad de contratación (EFDS-1183).
 *
 * La modalidad se elige al crear el proceso; aquí se ratifica. El abogado que
 * lo recibió mira la que el área puso, contra el objeto y la cuantía, y la
 * aprueba o la devuelve para que la corrijan.
 *
 * Decidir no lleva `@Permisos`: quién ratifica depende de quién recibió *este*
 * proceso, y eso el guard no puede saberlo. Lo comprueba el servicio.
 */
@ApiTags('Etapa 3 · Modalidad de contratación')
@Controller('procesos/:id/modalidad')
export class ModalidadProcesoController {
  constructor(private readonly service: ModalidadProcesoService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_PROCESO_VER)
  @ApiOperation({
    summary: 'La modalidad del proceso y en qué va su ratificación',
    description:
      'Qué modalidad se eligió, si está ratificada, quién la revisa y qué dijo en cada devolución.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Put()
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_ACTIVIDAD_EDITAR)
  @ApiOperation({
    summary: 'Proponer la modalidad, o corregirla tras una devolución',
    description:
      'La cambia y la manda a revisar en un solo acto: corregir es volver a proponer. Se valida contra los umbrales de cuantía, igual que al crear el proceso.',
  })
  proponer(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: CambiarModalidadDto,
    @Req() req: any,
  ) {
    return this.service.proponer(procesoId, dto, getHiringAccess(req));
  }

  @Post('decidir')
  @ApiOperation({
    summary: 'Ratificar la modalidad o devolverla para corregirla',
    description:
      'Lo hace el abogado al que se le asignó el proceso. Devolver exige decir qué modalidad corresponde.',
  })
  decidir(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: DecidirModalidadDto,
    @Req() req: any,
  ) {
    return this.service.decidir(procesoId, dto, getHiringAccess(req));
  }
}

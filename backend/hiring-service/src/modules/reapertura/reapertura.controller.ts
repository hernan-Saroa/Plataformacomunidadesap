import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { getHiringAccess } from '../../auth/hiring-access';
import { PERMISO_ACTIVIDAD_REABRIR } from '../../auth/permisos';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';
import { ReabrirActividadesDto } from './dto/reapertura.dto';
import { ReaperturaService } from './reapertura.service';

/**
 * Reabrir actividades ya cerradas (153).
 *
 * Lo autoriza un permiso transversal (`@Permisos`) y no el alcance por etapa:
 * es una llave de corrección sobre el expediente entero, no una competencia de
 * un punto de la matriz.
 */
@ApiTags('Procesos')
@Controller('procesos/:id/reaperturas')
@UseGuards(PermisosGuard)
export class ReaperturaController {
  constructor(private readonly service: ReaperturaService) {}

  @Get()
  @Permisos(PERMISO_ACTIVIDAD_REABRIR)
  @ApiOperation({ summary: 'Las actividades cerradas que se pueden reabrir, y las ya reabiertas' })
  listar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.listar(id);
  }

  @Post()
  @Permisos(PERMISO_ACTIVIDAD_REABRIR)
  @ApiOperation({
    summary: 'Reabrir una o más actividades cerradas',
    description:
      'Cada actividad aprobada vuelve a DEVUELTO con el motivo, para que quien la trabajó la corrija y pase otra vez por su aprobación. Lo que vino después no se toca.',
  })
  reabrir(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReabrirActividadesDto, @Req() req: any) {
    return this.service.reabrir(id, dto.numerales, dto.motivo, getHiringAccess(req));
  }

  @Delete(':numeral')
  @Permisos(PERMISO_ACTIVIDAD_REABRIR)
  @ApiOperation({ summary: 'Deshacer la reapertura de una actividad que sigue devuelta' })
  deshacer(@Param('id', ParseUUIDPipe) id: string, @Param('numeral') numeral: string, @Req() req: any) {
    return this.service.deshacer(id, numeral, getHiringAccess(req));
  }
}

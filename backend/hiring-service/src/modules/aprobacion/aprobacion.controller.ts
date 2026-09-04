import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { PermisosGuard } from '../../auth/permisos.guard';
import { Permisos } from '../../auth/permisos.decorator';
import { PERMISO_ACTIVIDAD_EDITAR, PERMISO_PROCESO_VER } from '../../auth/permisos';
import { getHiringAccess } from '../../auth/hiring-access';

import { AprobacionService } from './aprobacion.service';
import { DecidirAprobacionDto } from './dto/aprobacion.dto';

/**
 * El trámite de aprobación de una actividad (EFDS-1183).
 *
 * Un solo controlador para las 63 actividades en vez de un endpoint por panel:
 * el numeral viaja en la ruta y la regla configurada dice quién aprueba. Es lo
 * que permite que el área marque una actividad nueva sin que haya que escribir
 * nada.
 */
@ApiTags('Transversal · Aprobación de actividades')
@Controller('procesos/:id/actividades/:numeral')
export class AprobacionController {
  constructor(private readonly service: AprobacionService) {}

  @Get('aprobadores')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_PROCESO_VER)
  @ApiOperation({
    summary: 'Quién aprueba esta actividad',
    description:
      'Null si no requiere aprobación. La pantalla lo usa para decidir si ofrece «Registrar» o «Enviar a aprobación».',
  })
  async aprobadores(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('numeral') numeral: string,
    @Req() req: any,
  ) {
    const acceso = getHiringAccess(req);
    return this.service.estadoDeAprobacion(procesoId, numeral, acceso);
  }

  @Post('enviar-aprobacion')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_ACTIVIDAD_EDITAR)
  @ApiOperation({ summary: 'Enviar la actividad a aprobación' })
  enviar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('numeral') numeral: string,
    @Req() req: any,
  ) {
    return this.service.enviar(procesoId, numeral, getHiringAccess(req));
  }

  @Post('retirar-aprobacion')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_ACTIVIDAD_EDITAR)
  @ApiOperation({
    summary: 'Retirar la actividad de aprobación',
    description: 'Solo quien la envió, para poder corregirla mientras nadie la ha resuelto.',
  })
  retirar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('numeral') numeral: string,
    @Req() req: any,
  ) {
    return this.service.retirar(procesoId, numeral, getHiringAccess(req));
  }

  /*
   * Aprobar y devolver no llevan `@Permisos`: quién puede hacerlo lo dice la
   * regla configurada para esa actividad, no un permiso fijo del módulo. El
   * servicio lo comprueba contra los roles y personas de la configuración, y
   * ahí mismo impide que lo haga quien la trabajó.
   */
  @Post('aprobar')
  @ApiOperation({ summary: 'Aprobar la actividad' })
  aprobar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('numeral') numeral: string,
    @Body() dto: DecidirAprobacionDto,
    @Req() req: any,
  ) {
    return this.service.aprobar(procesoId, numeral, dto.observaciones, getHiringAccess(req));
  }

  @Post('devolver')
  @ApiOperation({
    summary: 'Devolver la actividad con observaciones',
    description: 'Las observaciones son obligatorias: sin ellas nadie sabe qué corregir.',
  })
  devolver(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('numeral') numeral: string,
    @Body() dto: DecidirAprobacionDto,
    @Req() req: any,
  ) {
    return this.service.devolver(
      procesoId,
      numeral,
      dto.observaciones ?? '',
      getHiringAccess(req),
    );
  }
}

import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { getHiringAccess } from '../../auth/hiring-access';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';
import { PERMISO_CONFIG_ADMINISTRAR } from '../../auth/permisos';
import { AlcanceAdminService } from './alcance-admin.service';
import { GuardarAlcancesDto } from './dto/alcance.dto';

/**
 * Permisos por etapa, punto y acción (migración 083).
 *
 * Tres rutas: lo que puede hacer quien pregunta, la matriz de todos los roles
 * y guardar la de uno. Las dos últimas son de quien configura el módulo.
 */
@ApiTags('Permisos por etapa')
@Controller('alcance')
export class AlcanceController {
  constructor(private readonly service: AlcanceAdminService) {}

  /** Sin permiso propio: cada quien puede preguntar lo suyo. */
  @Get('mio')
  @ApiOperation({
    summary: 'Qué puede hacer quien pregunta, y dónde',
    description:
      'Los alcances de sus roles —ya filtrados por el permiso de cada acción— y sus permisos transversales. ' +
      'Lo usa el microfrontend para no ofrecer lo que la API va a negar.',
  })
  mio(@Req() req: any) {
    return this.service.mio(req.user);
  }

  @Get('roles')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_CONFIG_ADMINISTRAR)
  @ApiOperation({
    summary: 'La matriz de permisos por etapa',
    description:
      'Los roles con algún permiso de contratación o algún alcance, con las acciones que les dio el backoffice ' +
      'y los lugares donde aplica cada una.',
  })
  roles() {
    return this.service.roles();
  }

  @Put('roles/:rolId')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_CONFIG_ADMINISTRAR)
  @ApiOperation({
    summary: 'Guardar el alcance de un rol',
    description:
      'Reemplaza los alcances vigentes del rol por los enviados. Lo que sobra se apaga, no se borra; ' +
      'lo nuevo entra confirmado. El permiso de cada acción se sigue dando desde el backoffice de roles.',
  })
  guardar(
    @Param('rolId', ParseUUIDPipe) rolId: string,
    @Body() dto: GuardarAlcancesDto,
    @Req() req: any,
  ) {
    return this.service.guardar(rolId, dto.alcances, getHiringAccess(req));
  }
}

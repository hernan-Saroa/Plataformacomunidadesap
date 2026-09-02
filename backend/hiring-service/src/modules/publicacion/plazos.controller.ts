import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { PublicacionService } from './publicacion.service';
import { GuardarPlazoDto } from './dto/publicacion.dto';
import { RolesGuard } from '../../auth/roles.guard';

import { getHiringAccess } from '../../auth/hiring-access';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';


/**
 * Plazos de publicidad por modalidad (EFDS-1387).
 *
 * Cuelga de su propia ruta y no de un proceso: es un parámetro de la entidad,
 * no un dato de un expediente.
 *
 * Consulta abierta a todo el módulo —el gestor necesita saber qué término va a
 * correr antes de publicar— y escritura restringida a la Dirección de
 * Contratación, que es quien fija la regla.
 */
@ApiTags('Plazos de publicidad')
@Controller('plazos-publicacion')
export class PlazosController {
  constructor(private readonly service: PublicacionService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({
    summary: 'Plazos de publicidad por modalidad',
    description:
      'Devuelve las once modalidades, tengan plazo o no: que a una le falte es lo que hay que poder ver. Incluye `puedeEditar` para que la interfaz no replique la matriz de roles.',
  })
  vigentes(@Req() req: any) {
    return this.service.plazosVigentes(getHiringAccess(req));
  }

  @Put(':modalidad')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({
    summary: 'Fijar el plazo de publicidad de una modalidad',
    description:
      'Crea el plazo si la modalidad no lo tenía. No afecta a las publicaciones ya registradas: cada una congeló el plazo que le aplicó ese día.',
  })
  guardar(
    @Param('modalidad') modalidad: string,
    @Body() dto: GuardarPlazoDto,
    @Req() req: any,
  ) {
    return this.service.guardarPlazo(modalidad, dto, getHiringAccess(req));
  }
}

import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { getHiringAccess } from '../../auth/hiring-access';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';
import { Puede } from '../../auth/puede.guard';
import { GuardarCadenaDto } from './dto/cadena.dto';
import { PlantillasCadenaService } from './plantillas-cadena.service';

/**
 * Configuración: las cadenas de aprobación (migración 101).
 *
 * Lectura de quien ve Configuración, escritura de quien la administra: el mismo
 * criterio que la pestaña de Aprobación de cada actividad, que es donde se
 * eligen.
 */
@ApiTags('Transversal · Aprobación de actividades')
@Controller('configuracion/cadenas-aprobacion')
export class CadenasController {
  constructor(private readonly service: PlantillasCadenaService) {}

  @Get()
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({ summary: 'Las cadenas de aprobación, con sus escalones y dónde se usan' })
  listar() {
    return this.service.listar();
  }

  @Get('papeles')
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({ summary: 'Los papeles del proceso que pueden responder por un escalón' })
  papeles() {
    return this.service.papeles();
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({ summary: 'Crear una cadena de aprobación' })
  crear(@Body() dto: GuardarCadenaDto, @Req() req: any) {
    return this.service.crear(dto, getHiringAccess(req));
  }

  @Put(':id')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({
    summary: 'Cambiar una cadena de aprobación',
    description: 'Solo afecta los envíos siguientes: cada ronda en curso conserva la cadena con la que se envió.',
  })
  actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GuardarCadenaDto, @Req() req: any) {
    return this.service.actualizar(id, dto, getHiringAccess(req));
  }

  @Put(':id/archivar')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({
    summary: 'Archivar una cadena que ya no se usa',
    description: 'Se rechaza si alguna actividad la exige hoy. No se borra: las rondas viejas apuntan a ella.',
  })
  archivar(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.archivar(id, getHiringAccess(req));
  }
}

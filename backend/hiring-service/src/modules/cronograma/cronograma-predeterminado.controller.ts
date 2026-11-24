import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { getHiringAccess } from '../../auth/hiring-access';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';
import { Puede } from '../../auth/puede.guard';
import { CronogramaPredeterminadoService } from './cronograma-predeterminado.service';
import { GuardarPredeterminadoDto } from './dto/cronograma-predeterminado.dto';

/** Cronograma predeterminado por modalidad — Configuración (140, EFDS-1152). */
@ApiTags('Configuración de etapas')
@Controller('configuracion/cronograma-predeterminado')
export class CronogramaPredeterminadoController {
  constructor(private readonly service: CronogramaPredeterminadoService) {}

  @Get()
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({ summary: 'Cuántas actividades tiene el cronograma predeterminado de cada modalidad' })
  resumen() {
    return this.service.resumen();
  }

  @Get(':modalidad')
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({
    summary: 'Cronograma predeterminado de una modalidad',
    description:
      'Las actividades de las etapas 5 a 10 que recorre la modalidad, con su día de inicio y de fin desde el día cero, y las propias.',
  })
  consultar(@Param('modalidad') modalidad: string) {
    return this.service.consultar(modalidad);
  }

  @Put(':modalidad')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({
    summary: 'Guardar el cronograma predeterminado de una modalidad',
    description:
      'Reemplaza el de la modalidad entero. No toca el cronograma de ningún proceso: en la 5.2 se carga como propuesta.',
  })
  guardar(@Param('modalidad') modalidad: string, @Body() dto: GuardarPredeterminadoDto, @Req() req: any) {
    return this.service.guardar(modalidad, dto, getHiringAccess(req));
  }
}

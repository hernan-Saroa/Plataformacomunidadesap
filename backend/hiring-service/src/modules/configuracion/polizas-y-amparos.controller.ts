import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { PolizasYAmparosService } from './polizas-y-amparos.service';
import { GuardarTipoAmparoDto, GuardarTipoPolizaDto } from './dto/polizas-y-amparos.dto';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';
import { Puede } from '../../auth/puede.guard';

/** Tipos de póliza y de amparo que se ofrecen en la 8.4 (145). */
@ApiTags('Configuración de etapas')
@Controller('configuracion')
export class PolizasYAmparosController {
  constructor(private readonly service: PolizasYAmparosService) {}

  @Get('tipos-poliza')
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({ summary: 'Tipos de póliza, incluidos los retirados' })
  tiposPoliza() {
    return this.service.tiposPoliza();
  }

  @Post('tipos-poliza')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({ summary: 'Crear o ajustar un tipo de póliza' })
  guardarTipoPoliza(@Body() dto: GuardarTipoPolizaDto) {
    return this.service.guardarTipoPoliza(dto);
  }

  @Put('tipos-poliza/:codigo/retirar')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({
    summary: 'Retirar un tipo de póliza',
    description: 'Las garantías que ya lo usaron lo conservan: se desactiva, no se borra.',
  })
  retirarTipoPoliza(@Param('codigo') codigo: string) {
    return this.service.retirarTipoPoliza(codigo);
  }

  @Get('tipos-amparo')
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({ summary: 'Tipos de amparo (coberturas), incluidos los retirados' })
  tiposAmparo() {
    return this.service.tiposAmparo();
  }

  @Post('tipos-amparo')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({ summary: 'Crear o ajustar un tipo de amparo' })
  guardarTipoAmparo(@Body() dto: GuardarTipoAmparoDto) {
    return this.service.guardarTipoAmparo(dto);
  }

  @Put('tipos-amparo/:codigo/retirar')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({
    summary: 'Retirar un tipo de amparo',
    description: 'Los amparos ya registrados lo conservan: se desactiva, no se borra.',
  })
  retirarTipoAmparo(@Param('codigo') codigo: string) {
    return this.service.retirarTipoAmparo(codigo);
  }
}

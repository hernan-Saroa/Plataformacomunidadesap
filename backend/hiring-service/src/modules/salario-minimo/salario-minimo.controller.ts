import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { SalarioMinimoService } from './salario-minimo.service';
import { GuardarSmmlvDto } from './salario-minimo.dto';
import { getHiringAccess } from '../../auth/hiring-access';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';
import { Puede } from '../../auth/puede.guard';

/** Salario mínimo por año: consulta abierta al módulo, registro solo con `config.manage`. */
@ApiTags('Salario mínimo')
@Controller('salario-minimo')
export class SalarioMinimoController {
  constructor(private readonly service: SalarioMinimoService) {}

  @Get()
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({
    summary: 'Salarios mínimos registrados, del más reciente al más antiguo',
    description: 'Incluye `puedeEditar`, para que la interfaz sepa si ofrecer el registro.',
  })
  listar(@Req() req: any) {
    return this.service.listar(getHiringAccess(req));
  }

  @Put()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({ summary: 'Registrar o corregir el salario mínimo de un año' })
  guardar(@Body() dto: GuardarSmmlvDto) {
    return this.service.guardar(dto.anio, dto.valor);
  }
}

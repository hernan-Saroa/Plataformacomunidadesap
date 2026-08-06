import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { UmbralesService } from './umbrales.service';
import { CrearUmbralDto, GuardarSmmlvDto } from './dto/umbral.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_ADMIN_UMBRALES,
  ROLES_LECTURA_CONTRATACION,
} from '../../auth/hiring-access';

/**
 * Umbrales de cuantía por modalidad (EFDS-1147).
 *
 * Consulta abierta a todo el módulo —el gestor necesita entender por qué el
 * sistema le sugiere una modalidad— y escritura restringida a la Dirección de
 * Contratación, que es quien fija la regla.
 */
@ApiTags('Umbrales de cuantía')
@Controller('umbrales')
export class UmbralesController {
  constructor(private readonly service: UmbralesService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({
    summary: 'Umbrales vigentes por modalidad, con sus límites convertidos a pesos',
  })
  vigentes() {
    return this.service.vigentes();
  }

  @Get('smmlv')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({ summary: 'Salarios mínimos registrados, base de los umbrales en SMMLV' })
  smmlv() {
    return this.service.smmlv();
  }

  @Put('smmlv')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADMIN_UMBRALES)
  @ApiOperation({ summary: 'Registrar o corregir el salario mínimo de un año' })
  guardarSmmlv(@Body() dto: GuardarSmmlvDto) {
    return this.service.guardarSmmlv(dto.anio, dto.valor);
  }

  // Va después de las rutas fijas: `smmlv` no debe caer aquí como si fuera un
  // código de modalidad.
  @Get(':modalidad/historial')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({ summary: 'Umbrales que ha tenido una modalidad, vigentes y cerrados' })
  historial(@Param('modalidad') modalidad: string) {
    return this.service.historial(modalidad);
  }

  @Put(':modalidad')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADMIN_UMBRALES)
  @ApiOperation({
    summary: 'Abrir un umbral nuevo para la modalidad y cerrar el anterior',
    description:
      'No edita el vigente: lo cierra y abre otro, para que los procesos ya creados sigan explicándose con las reglas que regían ese día.',
  })
  reemplazar(
    @Param('modalidad') modalidad: string,
    @Body() dto: CrearUmbralDto,
    @Req() req: any,
  ) {
    return this.service.reemplazar(modalidad, dto, getHiringAccess(req));
  }
}

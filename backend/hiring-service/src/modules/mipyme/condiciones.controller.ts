import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { MipymeService } from './mipyme.service';
import { GuardarCondicionMipymeDto } from './dto/mipyme.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_ADMIN_MIPYME,
  ROLES_LECTURA_CONTRATACION,
} from '../../auth/hiring-access';

/**
 * Condiciones de la limitación a MIPYME (EFDS-1393).
 *
 * Cuelga de su propia ruta y no de un proceso, igual que los plazos de
 * publicidad: son parámetros de la entidad, no datos de un expediente.
 *
 * Consulta abierta a todo el módulo —el gestor necesita saber contra qué se
 * está evaluando su proceso— y escritura restringida a la Dirección de
 * Contratación, que es quien fija la regla.
 */
@ApiTags('Condiciones de la limitación a MIPYME')
@Controller('condiciones-mipyme')
export class CondicionesMipymeController {
  constructor(private readonly service: MipymeService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({
    summary: 'Tope de valor y mínimo de manifestaciones, con su marca de confirmado',
    description:
      'Incluye el tope llevado a pesos: se guarda en SMMLV y quien lo valida no piensa en salarios mínimos. `puedeEditar` evita que la interfaz replique la matriz de roles.',
  })
  vigentes(@Req() req: any) {
    return this.service.condiciones(getHiringAccess(req));
  }

  @Put(':clave')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADMIN_MIPYME)
  @ApiOperation({
    summary: 'Cambiar una de las dos condiciones',
    description:
      'Tocar la cifra la deja sin confirmar salvo que se marque explícitamente. No afecta a las decisiones ya tomadas: cada una congeló los parámetros con los que se evaluó.',
  })
  guardar(
    @Param('clave') clave: string,
    @Body() dto: GuardarCondicionMipymeDto,
    @Req() req: any,
  ) {
    return this.service.guardarCondicion(clave, dto, getHiringAccess(req));
  }
}

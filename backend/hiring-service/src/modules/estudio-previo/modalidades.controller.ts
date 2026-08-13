import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { EstudioPrevioService } from './estudio-previo.service';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ROLES_ESCRITURA_ESTUDIO_PREVIO } from '../../auth/hiring-access';

/**
 * Catálogo de modalidades de selección.
 *
 * Va aparte de EstudioPrevioController porque no cuelga de un proceso: se
 * consulta antes de crearlo, para elegir con cuál nace.
 */
@ApiTags('Modalidades')
@Controller('modalidades')
export class ModalidadesController {
  constructor(private readonly service: EstudioPrevioService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ESCRITURA_ESTUDIO_PREVIO)
  @ApiOperation({ summary: 'Modalidades vigentes, en el orden de la matriz de flujo' })
  listar() {
    return this.service.modalidades();
  }
}

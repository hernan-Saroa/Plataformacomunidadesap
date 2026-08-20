import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { EstudioPrevioService } from './estudio-previo.service';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ROLES_LECTURA_CONTRATACION } from '../../auth/hiring-access';

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

  // Es un catálogo de lectura: quien consulta un proceso necesita ver el
  // nombre de su modalidad, aunque no pueda crear procesos.
  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({ summary: 'Modalidades vigentes, en el orden de la matriz de flujo' })
  listar() {
    return this.service.modalidades();
  }
}

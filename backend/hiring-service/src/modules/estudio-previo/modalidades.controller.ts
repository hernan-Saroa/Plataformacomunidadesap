import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { EstudioPrevioService } from './estudio-previo.service';
import { RolesGuard } from '../../auth/roles.guard';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';



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
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({ summary: 'Modalidades vigentes, en el orden de la matriz de flujo' })
  listar() {
    return this.service.modalidades();
  }
}

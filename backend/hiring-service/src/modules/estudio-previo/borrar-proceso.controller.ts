import { Body, Controller, Delete, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { EstudioPrevioService } from './estudio-previo.service';
import { BorrarProcesoDto } from './dto/estudio-previo.dto';
import { getHiringAccess } from '../../auth/hiring-access';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';
import { PERMISO_PROCESO_BORRAR } from '../../auth/permisos';

/**
 * Borrar un proceso (108).
 *
 * Aparte del controlador del estudio previo porque no es de ninguna etapa: lo
 * autoriza un permiso transversal (`@Permisos`), y allí todo va por `@Puede`.
 */
@ApiTags('Procesos')
@Controller('procesos')
export class BorrarProcesoController {
  constructor(private readonly service: EstudioPrevioService) {}

  @Delete(':id')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_PROCESO_BORRAR)
  @ApiOperation({
    summary: 'Borrar un proceso con todo lo suyo',
    description:
      'Solo el superadministrador. Se lleva actividades, expediente, documentos y trazabilidad, y libera la línea del PAA. No se puede deshacer: exige escribir el radicado y el motivo.',
  })
  borrar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BorrarProcesoDto, @Req() req: any) {
    return this.service.borrarProceso(id, dto, getHiringAccess(req));
  }
}

import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CausalContratacionService } from './causal-contratacion.service';
import { ElegirCausalDto } from './dto/causal-contratacion.dto';
import { PermisosGuard } from '../../auth/permisos.guard';
import { Permisos } from '../../auth/permisos.decorator';
import { PERMISO_PROCESO_VER } from '../../auth/permisos';
import { getHiringAccess } from '../../auth/hiring-access';

/**
 * Actividad 3.6 · Causal de contratación (3.5.1 de la matriz, RF-EST-04).
 *
 * Elegirla no lleva `@Permisos`: quién la elige depende de quién recibió *este*
 * proceso en la 3.3, y eso el guard no puede saberlo. Lo comprueba el servicio
 * con el mismo `quienDecide` que usan la 3.4 y la 3.5, y sin permiso nuevo:
 * quien responde por el proceso es quien lo califica.
 */
@ApiTags('Etapa 3 · Causal de contratación')
@Controller('procesos/:id/causal')
export class CausalContratacionController {
  constructor(private readonly service: CausalContratacionService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_PROCESO_VER)
  @ApiOperation({
    summary: 'La causal del proceso y las que puede tener',
    description:
      'Qué causal se eligió, quién la elige y el catálogo filtrado por la modalidad del proceso, que es el filtro que pide la matriz. Trae además lo que el área adelantó en el estudio previo.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Put()
  @ApiOperation({
    summary: 'Elegir la causal, o rectificar la elegida',
    description:
      'La elige el abogado al que se le asignó el proceso, de la lista de su modalidad y con la modalidad ya ratificada en la 3.5. Rectificarla se puede mientras el proceso siga en la etapa 3.',
  })
  elegir(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: ElegirCausalDto,
    @Req() req: any,
  ) {
    return this.service.elegir(procesoId, dto, getHiringAccess(req));
  }
}

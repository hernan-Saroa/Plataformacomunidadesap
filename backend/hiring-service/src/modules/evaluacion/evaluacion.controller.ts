import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { EvaluacionService } from './evaluacion.service';
import { EvaluarOfertaDto } from './dto/evaluacion.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_EVALUACION,
  ROLES_LECTURA_CONTRATACION,
} from '../../auth/hiring-access';

/**
 * Evaluación de ofertas — actividad 6.3 (EFDS-1157).
 *
 * El rol del token solo abre la puerta. Quién evalúa de verdad, y en qué
 * dimensión, lo decide la membresía del comité de este proceso: un evaluador
 * designado en otro llega hasta aquí y no puede calificar nada.
 */
@ApiTags('Etapa 6 · Evaluación de ofertas')
@Controller('procesos/:id/evaluacion')
export class EvaluacionController {
  constructor(private readonly service: EvaluacionService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION, ...ROLES_EVALUACION)
  @ApiOperation({
    summary: 'Estado de la evaluación del proceso',
    description:
      'Los criterios que aplican a la modalidad, las ofertas de la lista publicada, lo que va evaluado de cada una y en qué dimensiones puede calificar quien consulta.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post('ofertas/:oferenteId')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_EVALUACION)
  @ApiOperation({
    summary: 'Actividad 6.3 · Evaluar una oferta en una dimensión',
    description:
      'Con todos los criterios de la dimensión en una sola petición. Reevaluar sustituye el juicio anterior.',
  })
  evaluar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('oferenteId', ParseUUIDPipe) oferenteId: string,
    @Body() dto: EvaluarOfertaDto,
    @Req() req: any,
  ) {
    return this.service.evaluar(procesoId, oferenteId, dto, getHiringAccess(req));
  }
}

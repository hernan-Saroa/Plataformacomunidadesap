import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { getHiringAccess } from '../../auth/hiring-access';
import { Puede } from '../../auth/puede.guard';
import { CronogramaService } from './cronograma.service';
import { CronogramaPredeterminadoService } from './cronograma-predeterminado.service';
import {
  CumplidaCronogramaDto,
  GuardarActividadesCronogramaDto,
  GuardarCronogramaDto,
} from './dto/cronograma.dto';

/** Cronograma del proceso por etapas macro — actividad 5.2 (migración 135). */
@ApiTags('Etapa 5 · Cronograma')
@Controller('procesos/:id/cronograma')
export class CronogramaController {
  constructor(
    private readonly service: CronogramaService,
    private readonly predeterminado: CronogramaPredeterminadoService,
  ) {}

  @Get()
  @Puede('ver', '5.2')
  @ApiOperation({
    summary: 'Cronograma por etapas, con cómo va cada una',
    description:
      'Las etapas 5 a 10 con su fecha de fin, si ya se cumplió (se deriva del avance del proceso) y si está por vencer o vencida.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string) {
    return this.service.estado(procesoId);
  }

  @Get('predeterminado')
  @Puede('ver', '5.2')
  @ApiOperation({
    summary: 'Propuesta del cronograma predeterminado de la modalidad del proceso',
    description:
      'Con el día cero dado, las fechas que salen del cronograma predeterminado de la modalidad (140). No guarda nada: la 5.2 las carga en el formulario para revisarlas.',
  })
  propuesta(@Param('id', ParseUUIDPipe) procesoId: string, @Query('desde') desde: string) {
    return this.predeterminado.propuesta(procesoId, desde);
  }

  @Put()
  @Puede('editar', '5.2')
  @ApiOperation({
    summary: 'Actividad 5.2 · Guardar el cronograma por etapas',
    description:
      'Opcional: no cierra ni bloquea la 5.2. Las etapas sin fecha de fin se quitan y dejan de alertar.',
  })
  guardar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: GuardarCronogramaDto,
    @Req() req: any,
  ) {
    return this.service.guardar(procesoId, dto, getHiringAccess(req));
  }

  @Put('actividades')
  @Puede('editar', '5.2')
  @ApiOperation({
    summary: 'Actividad 5.2 · Guardar el cronograma por actividad',
    description:
      'Opcional (138): fechas por actividad, del flujo o propias del proceso (139), cuántos días antes se avisa, a quién y por qué canal. Las que llegan sin fecha de fin se quitan. Los cambios de fechas quedan en el historial; con `adendaId`, citando la adenda de cronograma que los originó.',
  })
  guardarActividades(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: GuardarActividadesCronogramaDto,
    @Req() req: any,
  ) {
    return this.service.guardarActividades(procesoId, dto, getHiringAccess(req));
  }

  @Put('actividades/:actividadId/cumplida')
  @Puede('editar', '5.2')
  @ApiOperation({
    summary: 'Actividad 5.2 · Marcar cumplida una actividad propia del cronograma',
    description:
      'Solo las propias del proceso (139): las del flujo se dan por cumplidas solas cuando se aprueban. Cumplida deja de alertar; desmarcarla la vuelve a vigilar.',
  })
  marcarCumplida(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('actividadId', ParseUUIDPipe) actividadId: string,
    @Body() dto: CumplidaCronogramaDto,
    @Req() req: any,
  ) {
    return this.service.marcarCumplida(procesoId, actividadId, dto.cumplida, getHiringAccess(req));
  }
}

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateDisciplinaryProcessActuacionDto } from '../dtos/disciplinary-process-actuacion.dto';
import { DisciplinaryProcessActuacion } from '../entities/disciplinary-process-actuacion.entity';
import { DisciplinaryProcessActuacionesService } from '../services/disciplinary-process-actuaciones.service';

@ApiTags('Actuaciones Proceso Disciplinario')
@Controller('disciplinary-processes/:id/actuaciones')
export class DisciplinaryProcessActuacionesController {
  constructor(
    private readonly actuacionesService: DisciplinaryProcessActuacionesService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar actuaciones de un proceso disciplinario',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de actuaciones del proceso',
    type: DisciplinaryProcessActuacion,
    isArray: true,
  })
  async list(@Param('id') processId: string): Promise<DisciplinaryProcessActuacion[]> {
    return this.actuacionesService.listByProcess(processId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear una actuacion para un proceso disciplinario',
  })
  @ApiResponse({
    status: 201,
    description: 'Actuacion creada exitosamente',
    type: DisciplinaryProcessActuacion,
  })
  async create(
    @Param('id') processId: string,
    @Body() dto: CreateDisciplinaryProcessActuacionDto,
  ): Promise<DisciplinaryProcessActuacion> {
    return this.actuacionesService.create(processId, dto);
  }
}

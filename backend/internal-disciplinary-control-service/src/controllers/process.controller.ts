import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ProcessService } from '../services/process.service';
import {
  CreateDisciplinaryProcessDto,
  DisciplinaryProcessResponseDto,
} from '../dtos/create-disciplinary-process.dto';
import { ChangeStageDto } from '../dtos/change-stage.dto';
import { UpdateDisciplinaryProcessDto } from '../dtos/update-disciplinary-process.dto';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';

@ApiTags('Procesos Disciplinarios')
@Controller('disciplinary-processes')
export class ProcessController {
  constructor(private processService: ProcessService) { }

  /**
   * Obtener estadísticas para el dashboard
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener estadísticas del dashboard',
    description: 'Retorna estadísticas de procesos activos, próximos a vencer, vencidos y profesionales',
  })
  async getStats() {
    return await this.processService.getStats();
  }

  /**
   * H2: Asignar un profesional a una noticia (crear proceso)
   */
  @Post('assign')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Asignar Profesional',
    description:
      'El Jefe asigna una noticia a un abogado, creando el proceso disciplinario',
  })
  @ApiResponse({
    status: 201,
    description: 'Proceso creado exitosamente',
    type: DisciplinaryProcess,
  })
  @ApiResponse({ status: 400, description: 'Noticia inválida o ya asignada' })
  @ApiResponse({ status: 404, description: 'Noticia no encontrada' })
  async assign(
    @Body() createProcessDto: CreateDisciplinaryProcessDto,
  ): Promise<DisciplinaryProcess> {
    return await this.processService.create(createProcessDto);
  }

  /**
   * Actualizar datos generales del proceso
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar Procesos',
    description: 'Actualiza datos del proceso como el abogado asignado, hechos y datos del disciplinable',
  })
  @ApiResponse({
    status: 200,
    description: 'Proceso actualizado',
    type: DisciplinaryProcess,
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDisciplinaryProcessDto,
  ): Promise<DisciplinaryProcess> {
    return await this.processService.update(id, updateDto);
  }

  /**
   * H3, H7: Cambiar etapa del proceso
   */
  @Patch(':id/stage')
  @ApiOperation({
    summary: 'Cambiar Etapa del Proceso',
    description: 'El abogado avanza el proceso a la siguiente etapa',
  })
  @ApiResponse({
    status: 200,
    description: 'Etapa actualizada',
    type: DisciplinaryProcess,
  })
  @ApiResponse({ status: 400, description: 'Transición de etapa no permitida' })
  @ApiResponse({ status: 404, description: 'Proceso no encontrado' })
  async updateStage(
    @Param('id') id: string,
    @Body() changeStageDto: ChangeStageDto,
  ): Promise<DisciplinaryProcess> {
    return await this.processService.changeStage(id, changeStageDto.stage);
  }

  /**
   * Agregar evidencia al proceso
   */
  @Patch(':id/evidence')
  @ApiOperation({
    summary: 'Agregar Evidencia',
    description: 'Agrega una URL de evidencia al proceso',
  })
  @ApiResponse({
    status: 200,
    description: 'Evidencia agregada',
    type: DisciplinaryProcess,
  })
  async addEvidence(
    @Param('id') id: string,
    @Body() body: { url: string; originalName: string },
  ): Promise<DisciplinaryProcess> {
    return await this.processService.addEvidence(id, body.url, body.originalName);
  }

  /**
   * H3: Obtener procesos del abogado actual
   */
  @Get('my-processes')
  @ApiOperation({
    summary: 'Mis Procesos',
    description: 'Retorna los procesos asignados al abogado autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de procesos del abogado',
    type: [DisciplinaryProcess],
  })
  async getMyProcesses(
    @Query('abogadoId') abogadoId: string,
  ): Promise<DisciplinaryProcess[]> {
    if (!abogadoId) {
      throw new Error('abogadoId es requerido');
    }
    return await this.processService.findByAbogadoId(abogadoId);
  }

  /**
   * Obtener todos los procesos
   */
  @Get()
  @ApiOperation({
    summary: 'Listar todos los Procesos',
    description: 'Retorna todos los procesos disciplinarios',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de procesos',
    type: [DisciplinaryProcess],
  })
  async getAll(): Promise<DisciplinaryProcess[]> {
    return await this.processService.findAll();
  }

  /**
   * Obtener proceso por ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener Proceso por ID',
    description: 'Retorna un proceso específico con sus autos',
  })
  @ApiResponse({
    status: 200,
    description: 'Proceso encontrado',
    type: DisciplinaryProcess,
  })
  @ApiResponse({ status: 404, description: 'Proceso no encontrado' })
  async getById(@Param('id') id: string): Promise<DisciplinaryProcess> {
    return await this.processService.findById(id);
  }

  /**
   * Eliminar proceso
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar Proceso' })
  @ApiResponse({ status: 204, description: 'Proceso eliminado' })
  @ApiResponse({ status: 404, description: 'Proceso no encontrado' })
  async delete(@Param('id') id: string): Promise<void> {
    return await this.processService.delete(id);
  }
}

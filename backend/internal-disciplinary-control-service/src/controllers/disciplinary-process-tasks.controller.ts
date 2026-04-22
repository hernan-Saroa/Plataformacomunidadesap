import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CreateDisciplinaryProcessTaskDto,
  UpdateDisciplinaryProcessTaskStatusDto,
} from '../dtos/disciplinary-process-task.dto';
import { DisciplinaryProcessTask } from '../entities/disciplinary-process-task.entity';
import { DisciplinaryProcessTasksService } from '../services/disciplinary-process-tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DISCIPLINARY_MODULE_ACCESS } from '../auth/authorization.constants';

@ApiTags('Tareas Proceso Disciplinario')
@Controller('disciplinary-processes/:id/tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', DISCIPLINARY_MODULE_ACCESS)
export class DisciplinaryProcessTasksController {
  constructor(
    private readonly tasksService: DisciplinaryProcessTasksService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar tareas de un proceso disciplinario',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de tareas del proceso',
    type: DisciplinaryProcessTask,
    isArray: true,
  })
  async list(@Param('id') processId: string): Promise<DisciplinaryProcessTask[]> {
    return this.tasksService.listByProcess(processId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear una tarea para un proceso disciplinario',
  })
  @ApiResponse({
    status: 201,
    description: 'Tarea creada exitosamente',
    type: DisciplinaryProcessTask,
  })
  async create(
    @Param('id') processId: string,
    @Body() dto: CreateDisciplinaryProcessTaskDto,
  ): Promise<DisciplinaryProcessTask> {
    return this.tasksService.create(processId, dto);
  }

  @Patch(':taskId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar estado de completado de una tarea',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de la tarea actualizado',
    type: DisciplinaryProcessTask,
  })
  async updateStatus(
    @Param('id') processId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateDisciplinaryProcessTaskStatusDto,
  ): Promise<DisciplinaryProcessTask> {
    return this.tasksService.updateStatus(processId, taskId, dto);
  }
}

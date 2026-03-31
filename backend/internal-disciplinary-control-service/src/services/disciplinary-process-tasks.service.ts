import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateDisciplinaryProcessTaskDto,
  UpdateDisciplinaryProcessTaskStatusDto,
} from '../dtos/disciplinary-process-task.dto';
import { DisciplinaryProcessTask } from '../entities/disciplinary-process-task.entity';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';

@Injectable()
export class DisciplinaryProcessTasksService {
  constructor(
    @InjectRepository(DisciplinaryProcessTask)
    private readonly tasksRepository: Repository<DisciplinaryProcessTask>,
    @InjectRepository(DisciplinaryProcess)
    private readonly processRepository: Repository<DisciplinaryProcess>,
  ) {}

  async listByProcess(processId: string): Promise<DisciplinaryProcessTask[]> {
    await this.ensureProcessExists(processId);

    return this.tasksRepository.find({
      where: { processId },
      order: {
        completada: 'ASC',
        fechaVencimiento: 'ASC',
        createdAt: 'DESC',
      },
    });
  }

  async create(
    processId: string,
    dto: CreateDisciplinaryProcessTaskDto,
  ): Promise<DisciplinaryProcessTask> {
    const process = await this.ensureProcessExists(processId);

    const task = this.tasksRepository.create({
      processId,
      titulo: dto.titulo.trim(),
      descripcion: dto.descripcion?.trim() || null,
      prioridad: dto.prioridad.trim().toLowerCase(),
      etapa: dto.etapa?.trim() || process.kanbanStage || process.etapaActual,
      responsableNombre: dto.responsableNombre?.trim() || null,
      fechaVencimiento: dto.fechaVencimiento,
      completada: false,
      fechaCompletada: null,
      observaciones: dto.observaciones?.trim() || null,
    });

    return this.tasksRepository.save(task);
  }

  async updateStatus(
    processId: string,
    taskId: string,
    dto: UpdateDisciplinaryProcessTaskStatusDto,
  ): Promise<DisciplinaryProcessTask> {
    await this.ensureProcessExists(processId);

    const task = await this.tasksRepository.findOne({
      where: { id: taskId, processId },
    });

    if (!task) {
      throw new HttpException('Tarea no encontrada', HttpStatus.NOT_FOUND);
    }

    task.completada = dto.completada;
    task.fechaCompletada = dto.completada ? new Date() : null;

    return this.tasksRepository.save(task);
  }

  private async ensureProcessExists(processId: string): Promise<DisciplinaryProcess> {
    const process = await this.processRepository.findOne({
      where: { id: processId },
    });

    if (!process) {
      throw new HttpException('Proceso no encontrado', HttpStatus.NOT_FOUND);
    }

    return process;
  }
}

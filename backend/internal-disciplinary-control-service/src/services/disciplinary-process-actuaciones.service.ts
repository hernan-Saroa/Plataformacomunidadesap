import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDisciplinaryProcessActuacionDto } from '../dtos/disciplinary-process-actuacion.dto';
import { DisciplinaryProcessActuacion } from '../entities/disciplinary-process-actuacion.entity';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';

@Injectable()
export class DisciplinaryProcessActuacionesService {
  constructor(
    @InjectRepository(DisciplinaryProcessActuacion)
    private readonly actuacionesRepository: Repository<DisciplinaryProcessActuacion>,
    @InjectRepository(DisciplinaryProcess)
    private readonly processRepository: Repository<DisciplinaryProcess>,
  ) {}

  async listByProcess(processId: string): Promise<DisciplinaryProcessActuacion[]> {
    await this.ensureProcessExists(processId);

    return this.actuacionesRepository.find({
      where: { processId },
      order: {
        fechaActuacion: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async create(
    processId: string,
    dto: CreateDisciplinaryProcessActuacionDto,
  ): Promise<DisciplinaryProcessActuacion> {
    const process = await this.ensureProcessExists(processId);

    const actuacion = this.actuacionesRepository.create({
      processId,
      tipo: dto.tipo.trim().toLowerCase(),
      etapa: dto.etapa?.trim() || process.kanbanStage || process.etapaActual,
      descripcion: dto.descripcion.trim(),
      responsableNombre: dto.responsableNombre.trim(),
      fechaActuacion: new Date(dto.fechaActuacion),
      observaciones: dto.observaciones?.trim() || null,
    });

    return this.actuacionesRepository.save(actuacion);
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

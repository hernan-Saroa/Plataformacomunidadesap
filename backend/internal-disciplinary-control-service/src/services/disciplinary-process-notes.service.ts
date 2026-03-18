import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDisciplinaryProcessNoteDto } from '../dtos/disciplinary-process-note.dto';
import { DisciplinaryProcessNote } from '../entities/disciplinary-process-note.entity';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';

@Injectable()
export class DisciplinaryProcessNotesService {
  constructor(
    @InjectRepository(DisciplinaryProcessNote)
    private readonly notesRepository: Repository<DisciplinaryProcessNote>,
    @InjectRepository(DisciplinaryProcess)
    private readonly processRepository: Repository<DisciplinaryProcess>,
  ) {}

  async listByProcess(processId: string): Promise<DisciplinaryProcessNote[]> {
    await this.ensureProcessExists(processId);

    return this.notesRepository.find({
      where: { processId },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async create(
    processId: string,
    dto: CreateDisciplinaryProcessNoteDto,
  ): Promise<DisciplinaryProcessNote> {
    const process = await this.ensureProcessExists(processId);

    const note = this.notesRepository.create({
      processId,
      texto: dto.texto.trim(),
      etapa: dto.etapa?.trim() || process.kanbanStage || process.etapaActual,
    });

    return this.notesRepository.save(note);
  }

  async remove(processId: string, noteId: string): Promise<void> {
    await this.ensureProcessExists(processId);

    const note = await this.notesRepository.findOne({
      where: { id: noteId, processId },
    });

    if (!note) {
      throw new HttpException('Nota no encontrada', HttpStatus.NOT_FOUND);
    }

    await this.notesRepository.delete(noteId);
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

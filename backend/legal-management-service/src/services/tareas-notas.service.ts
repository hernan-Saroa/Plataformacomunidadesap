import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TareaExpediente } from '../entities/tarea-expediente.entity';
import { NotaExpediente } from '../entities/nota-expediente.entity';

@Injectable()
export class TareasNotasService {
    constructor(
        @InjectRepository(TareaExpediente)
        private readonly tareaRepository: Repository<TareaExpediente>,
        @InjectRepository(NotaExpediente)
        private readonly notaRepository: Repository<NotaExpediente>
    ) { }

    // ==================== TAREAS ====================

    async findTareasByExpediente(expedienteId: string): Promise<TareaExpediente[]> {
        return this.tareaRepository.find({
            where: { expedienteId },
            relations: ['responsable'],
            order: { fechaVencimiento: 'ASC' }
        });
    }

    async findTareaById(id: string): Promise<TareaExpediente> {
        const tarea = await this.tareaRepository.findOne({
            where: { id },
            relations: ['responsable']
        });
        if (!tarea) throw new NotFoundException('Tarea no encontrada');
        return tarea;
    }

    async createTarea(data: Partial<TareaExpediente>): Promise<TareaExpediente> {
        const tarea = this.tareaRepository.create({
            ...data,
            fechaCreacion: new Date()
        });
        return this.tareaRepository.save(tarea);
    }

    async updateTarea(id: string, data: Partial<TareaExpediente>): Promise<TareaExpediente> {
        const tarea = await this.findTareaById(id);

        // If completing task, set completion date
        if (data.estado === 'completada' && tarea.estado !== 'completada') {
            data.fechaCompletada = new Date();
        }

        await this.tareaRepository.update(id, data);
        return this.findTareaById(id);
    }

    async deleteTarea(id: string): Promise<void> {
        const tarea = await this.findTareaById(id);
        await this.tareaRepository.remove(tarea);
    }

    // ==================== NOTAS ====================

    async findNotasByExpediente(expedienteId: string): Promise<NotaExpediente[]> {
        return this.notaRepository.find({
            where: { expedienteId },
            relations: ['autor'],
            order: { createdAt: 'DESC' }
        });
    }

    async findNotaById(id: string): Promise<NotaExpediente> {
        const nota = await this.notaRepository.findOne({
            where: { id },
            relations: ['autor']
        });
        if (!nota) throw new NotFoundException('Nota no encontrada');
        return nota;
    }

    async createNota(data: Partial<NotaExpediente>): Promise<NotaExpediente> {
        const nota = this.notaRepository.create(data);
        return this.notaRepository.save(nota);
    }

    async updateNota(id: string, data: Partial<NotaExpediente>): Promise<NotaExpediente> {
        await this.notaRepository.update(id, data);
        return this.findNotaById(id);
    }

    async deleteNota(id: string): Promise<void> {
        const nota = await this.findNotaById(id);
        await this.notaRepository.remove(nota);
    }
}

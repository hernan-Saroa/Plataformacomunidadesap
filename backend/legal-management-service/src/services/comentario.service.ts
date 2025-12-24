import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comentario } from '../entities/comentario.entity';
import { CreateComentarioDto } from '../dtos/comentario.dto';

@Injectable()
export class ComentarioService {
    constructor(
        @InjectRepository(Comentario)
        private comentarioRepo: Repository<Comentario>,
    ) { }

    async findByExpediente(expedienteId: string): Promise<Comentario[]> {
        return this.comentarioRepo.find({
            where: { expedienteId },
            order: { createdAt: 'DESC' }
        });
    }

    async create(expedienteId: string, dto: CreateComentarioDto): Promise<Comentario> {
        const comentario = this.comentarioRepo.create({
            expedienteId,
            contenido: dto.contenido,
            usuarioId: dto.usuarioId,
            usuarioNombre: dto.usuarioNombre
        });
        return this.comentarioRepo.save(comentario);
    }

    async delete(id: string): Promise<void> {
        await this.comentarioRepo.delete(id);
    }
}

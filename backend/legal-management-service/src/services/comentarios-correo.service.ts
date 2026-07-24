
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComentarioCorreo } from '../entities/comentario-correo.entity';

@Injectable()
export class ComentariosCorreoService {
    constructor(
        @InjectRepository(ComentarioCorreo)
        private readonly comentarioRepository: Repository<ComentarioCorreo>,
    ) { }

    async findAll(correoId: string): Promise<ComentarioCorreo[]> {
        return this.comentarioRepository.find({
            where: { correoId },
            order: { fecha: 'DESC' }
        });
    }

    async create(data: Partial<ComentarioCorreo>): Promise<ComentarioCorreo> {
        const nuevoComentario = this.comentarioRepository.create({
            ...data,
            fecha: new Date()
        });
        return this.comentarioRepository.save(nuevoComentario);
    }
}

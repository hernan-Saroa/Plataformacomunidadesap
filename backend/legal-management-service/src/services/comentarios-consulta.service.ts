
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComentarioConsulta } from '../entities/comentario-consulta.entity';

@Injectable()
export class ComentariosConsultaService {
    constructor(
        @InjectRepository(ComentarioConsulta)
        private readonly comentarioRepository: Repository<ComentarioConsulta>,
    ) { }

    async findAll(consultaId: string): Promise<ComentarioConsulta[]> {
        return this.comentarioRepository.find({
            where: { consultaId },
            order: { fecha: 'DESC' }
        });
    }

    async create(data: Partial<ComentarioConsulta>): Promise<ComentarioConsulta> {
        const nuevoComentario = this.comentarioRepository.create({
            ...data,
            fecha: new Date()
        });
        return this.comentarioRepository.save(nuevoComentario);
    }
}

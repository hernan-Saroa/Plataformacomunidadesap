import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Acta } from '../entities/acta.entity';
import { ExpedienteService } from './expediente.service';

@Injectable()
export class ActasService {
    constructor(
        @InjectRepository(Acta)
        private readonly actaRepository: Repository<Acta>,
        private readonly expedienteService: ExpedienteService
    ) { }

    async findAllByExpediente(expedienteId: string): Promise<Acta[]> {
        return this.actaRepository.find({
            where: { expedienteId },
            order: { fecha: 'DESC' }
        });
    }

    async create(expedienteId: string, data: Partial<Acta>, file?: Express.Multer.File): Promise<Acta> {
        const nuevaActa = this.actaRepository.create({
            ...data,
            expedienteId: expedienteId,
            ...(file && {
                archivoNombre: file.originalname,
                archivoUrl: `files/${file.filename}`,
                archivoTamano: file.size,
            })
        });

        return this.actaRepository.save(nuevaActa);
    }

    async updateEstado(id: string, estado: string): Promise<Acta> {
        const acta = await this.actaRepository.findOneBy({ id });
        if (!acta) throw new NotFoundException('Acta no encontrada');

        acta.estado = estado;
        return this.actaRepository.save(acta);
    }

    async delete(id: string): Promise<{ success: boolean; message: string }> {
        const acta = await this.actaRepository.findOneBy({ id });
        if (!acta) throw new NotFoundException('Acta no encontrada');

        await this.actaRepository.remove(acta);
        return { success: true, message: 'Acta eliminada correctamente' };
    }

    async uploadArchivo(id: string, file: Express.Multer.File): Promise<Acta> {
        const acta = await this.actaRepository.findOneBy({ id });
        if (!acta) throw new NotFoundException('Acta no encontrada');

        acta.archivoNombre = file.originalname;
        acta.archivoUrl = `files/${file.filename}`;
        acta.archivoTamano = file.size;
        acta.estado = 'Firmada';

        return this.actaRepository.save(acta);
    }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlantillaDocumento } from '../entities/plantilla-documento.entity';

@Injectable()
export class PlantillasService {
    constructor(
        @InjectRepository(PlantillaDocumento)
        private readonly plantillaRepo: Repository<PlantillaDocumento>
    ) {}

    async create(data: {
        nombre: string;
        categoria: string;
        nombreOriginal: string;
        mimeType: string;
        tamano: number;
        contenidoBase64: string;
        subidoPor?: string;
    }): Promise<PlantillaDocumento> {
        const plantilla = this.plantillaRepo.create(data);
        return this.plantillaRepo.save(plantilla);
    }

    async findAll(categoria?: string): Promise<Omit<PlantillaDocumento, 'contenidoBase64'>[]> {
        const query = this.plantillaRepo
            .createQueryBuilder('p')
            .select(['p.id', 'p.nombre', 'p.categoria', 'p.nombreOriginal', 'p.mimeType', 'p.tamano', 'p.subidoPor', 'p.createdAt', 'p.updatedAt']);

        if (categoria) {
            query.where('p.categoria = :categoria', { categoria });
        }

        query.orderBy('p.createdAt', 'DESC');
        return query.getMany();
    }

    async findOne(id: string): Promise<PlantillaDocumento> {
        const plantilla = await this.plantillaRepo.findOne({ where: { id } });
        if (!plantilla) throw new NotFoundException(`Plantilla ${id} no encontrada`);
        return plantilla;
    }

    async delete(id: string): Promise<void> {
        const plantilla = await this.findOne(id);
        await this.plantillaRepo.remove(plantilla);
    }
}

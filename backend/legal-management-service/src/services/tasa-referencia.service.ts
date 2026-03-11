import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TasaReferencia, TipoTasaReferencia } from '../entities/tasa-referencia.entity';

export class CreateTasaReferenciaDto {
    anio: number;
    mes: number;
    valorTasa: number;
    tipoTasa: TipoTasaReferencia;
}

@Injectable()
export class TasaReferenciaService {
    constructor(
        @InjectRepository(TasaReferencia)
        private readonly tasaRepository: Repository<TasaReferencia>,
    ) { }

    async findAll(): Promise<TasaReferencia[]> {
        return this.tasaRepository.find({
            order: { anio: 'DESC', mes: 'DESC' }
        });
    }

    async findByPeriod(anio: number, mes: number, tipoTasa?: TipoTasaReferencia | string): Promise<TasaReferencia[]> {
        const query: any = { anio, mes };
        if (tipoTasa) query.tipoTasa = tipoTasa as TipoTasaReferencia;
        return this.tasaRepository.find({ where: query });
    }

    async create(dto: CreateTasaReferenciaDto): Promise<TasaReferencia> {
        // Verificar si existe para actualizar en vez de duplicar
        let existing = await this.tasaRepository.findOne({
            where: { anio: dto.anio, mes: dto.mes, tipoTasa: dto.tipoTasa }
        });

        if (existing) {
            existing.valorTasa = dto.valorTasa;
            return this.tasaRepository.save(existing);
        }

        const tasa = this.tasaRepository.create(dto);
        return this.tasaRepository.save(tasa);
    }

    async update(id: string, dto: Partial<CreateTasaReferenciaDto>): Promise<TasaReferencia> {
        const tasa = await this.tasaRepository.findOne({ where: { id } });
        if (!tasa) throw new NotFoundException('Tasa de Referencia no encontrada');

        Object.assign(tasa, dto);
        return this.tasaRepository.save(tasa);
    }

    async delete(id: string): Promise<void> {
        const tasa = await this.tasaRepository.findOne({ where: { id } });
        if (!tasa) throw new NotFoundException('Tasa de Referencia no encontrada');

        await this.tasaRepository.remove(tasa);
    }
}

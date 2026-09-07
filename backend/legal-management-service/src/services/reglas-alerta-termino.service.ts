import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReglaAlertaTermino } from '../entities/regla-alerta-termino.entity';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class ReglasAlertaTerminoService {
    constructor(
        @InjectRepository(ReglaAlertaTermino)
        private reglaRepository: Repository<ReglaAlertaTermino>,
    ) { }

    async findAll(): Promise<ReglaAlertaTermino[]> {
        return this.reglaRepository.find({ order: { horasAnticipacion: 'ASC' } });
    }

    async create(data: Partial<ReglaAlertaTermino>): Promise<ReglaAlertaTermino> {
        const regla = this.reglaRepository.create(data);
        try {
            return await this.reglaRepository.save(regla);
        } catch (err: any) {
            if (err?.code === PG_UNIQUE_VIOLATION) {
                throw new ConflictException('Ya existe una regla con esa misma anticipación (horasAnticipacion)');
            }
            throw err;
        }
    }

    async update(id: string, data: Partial<ReglaAlertaTermino>): Promise<ReglaAlertaTermino> {
        const regla = await this.findOne(id);
        Object.assign(regla, data);
        try {
            return await this.reglaRepository.save(regla);
        } catch (err: any) {
            if (err?.code === PG_UNIQUE_VIOLATION) {
                throw new ConflictException('Ya existe una regla con esa misma anticipación (horasAnticipacion)');
            }
            throw err;
        }
    }

    async remove(id: string): Promise<void> {
        const regla = await this.findOne(id);
        await this.reglaRepository.remove(regla);
    }

    private async findOne(id: string): Promise<ReglaAlertaTermino> {
        const regla = await this.reglaRepository.findOne({ where: { id } });
        if (!regla) throw new NotFoundException('Regla de alerta no encontrada');
        return regla;
    }
}

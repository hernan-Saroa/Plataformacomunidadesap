import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PtaEntity } from './pta.entity';

@Injectable()
export class PtaService {
    constructor(
        @InjectRepository(PtaEntity)
        private readonly ptaRepo: Repository<PtaEntity>,
    ) { }

    findAll() {
        return this.ptaRepo.find();
    }

    findOne(id: string) {
        return this.ptaRepo.findOne({ where: { id } });
    }

    async aprobar(id: string, aprobadoPor: string) {
        const pta = await this.ptaRepo.findOne({ where: { id } });
        if (!pta) throw new NotFoundException('PTA no encontrado');
        pta.estado = 'APROBADO';
        pta.aprobadoPor = aprobadoPor;
        return this.ptaRepo.save(pta);
    }

    async rechazar(id: string, aprobadoPor: string) {
        const pta = await this.ptaRepo.findOne({ where: { id } });
        if (!pta) throw new NotFoundException('PTA no encontrado');
        pta.estado = 'RECHAZADO';
        pta.aprobadoPor = aprobadoPor;
        return this.ptaRepo.save(pta);
    }
}

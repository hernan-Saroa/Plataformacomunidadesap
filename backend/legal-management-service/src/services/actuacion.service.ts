import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Actuacion } from '../entities/actuacion.entity';
import { ExpedienteService } from './expediente.service';

@Injectable()
export class ActuacionService {
    constructor(
        @InjectRepository(Actuacion)
        private actuacionRepository: Repository<Actuacion>,
        private expedienteService: ExpedienteService,
    ) { }

    async registrarActuacion(expedienteId: string, data: Partial<Actuacion>): Promise<Actuacion> {
        console.log('ActuacionService.registrarActuacion input:', { expedienteId, data });
        const safeData = data || {};
        const nuevaActuacion = this.actuacionRepository.create({
            ...safeData,
            expedienteId,
            fechaActuacion: safeData.fechaActuacion || new Date()
        });

        const saved = await this.actuacionRepository.save(nuevaActuacion);

        // Lógica de cambio de estado automático
        if (data.tipoActuacion === 'FALLO') {
            await this.expedienteService.updateExpediente(expedienteId, { estado: 'FALLO_PRIMERA_INSTANCIA' });
        } else if (data.tipoActuacion === 'AUTO_ADMISORIO') {
            await this.expedienteService.updateExpediente(expedienteId, { estado: 'EN_TRAMITE' });
        }

        return saved;
    }

    async listarPorExpediente(expedienteId: string): Promise<Actuacion[]> {
        return this.actuacionRepository.find({
            where: { expedienteId },
            order: { fechaActuacion: 'DESC' }
        });
    }
}

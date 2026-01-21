import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Actuacion } from '../entities/actuacion.entity';
import { ExpedienteService } from './expediente.service';
import { TerminosService } from './terminos.service';

@Injectable()
export class ActuacionService {
    constructor(
        @InjectRepository(Actuacion)
        private actuacionRepository: Repository<Actuacion>,
        private expedienteService: ExpedienteService,
        private terminosService: TerminosService
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

        // Lógica de cambio de estado automático y creación de términos
        if (data.tipoActuacion === 'FALLO') {
            await this.expedienteService.updateExpediente(expedienteId, { estado: 'FALLO_PRIMERA_INSTANCIA' });
        } else if (data.tipoActuacion === 'AUTO_ADMISORIO') {
            await this.expedienteService.updateExpediente(expedienteId, { estado: 'EN_TRAMITE' });

            // Trigger automatic term creation
            const expediente = await this.expedienteService.findOne(expedienteId);
            if (expediente) {
                await this.terminosService.createAutomatico(
                    'DEFENSA',
                    expediente.id,
                    expediente.radicado,
                    'Contestación de Demanda',
                    new Date(), // Start counting from today (notification date)
                    30, // Default 30 days for testing. Real logic depends on jurisdiction.
                    undefined // No specific responsible yet, or could be expediente.abogadoSustanciador
                );
            }
        }

        return saved;
    }

    /**
     * Registra automáticamente un evento crítico en el historial cronológico unificado
     * (Usado por hooks desde otros servicios)
     */
    async registrarEventoAutomatico(
        expedienteId: string,
        titulo: string,
        descripcion: string,
        origen: string,
        referenciaId: string,
        metadatos: any = {},
        usuario: string = 'Sistema'
    ): Promise<Actuacion> {
        const actuacion = this.actuacionRepository.create({
            expedienteId,
            tipoActuacion: titulo, // El título del evento actúa como tipo
            descripcion,
            origen,
            referenciaId,
            metadata: metadatos,
            usuarioResponsable: usuario,
            fechaActuacion: new Date()
        });
        return this.actuacionRepository.save(actuacion);
    }

    async listarPorExpediente(expedienteId: string): Promise<Actuacion[]> {
        return this.actuacionRepository.find({
            where: { expedienteId },
            order: { fechaActuacion: 'DESC' }
        });
    }
}

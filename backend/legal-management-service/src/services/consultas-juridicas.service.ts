import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConsultaJuridica } from '../entities/consulta-juridica.entity';

@Injectable()
export class ConsultasJuridicasService {
    constructor(
        @InjectRepository(ConsultaJuridica)
        private readonly consultaRepository: Repository<ConsultaJuridica>
    ) { }

    async findAll(): Promise<ConsultaJuridica[]> {
        return this.consultaRepository.find({
            relations: ['abogadoAsignado'],
            order: { fechaRecepcion: 'DESC' }
        });
    }

    async findOne(id: string): Promise<ConsultaJuridica> {
        const consulta = await this.consultaRepository.findOne({
            where: { id },
            relations: ['abogadoAsignado']
        });
        if (!consulta) throw new NotFoundException('Consulta no encontrada');
        return consulta;
    }

    async create(data: Partial<ConsultaJuridica>): Promise<ConsultaJuridica> {
        // Generate radicado number
        const year = new Date().getFullYear();
        const count = await this.consultaRepository.count();
        const numeroRadicado = `CJ-${year}-${String(count + 1).padStart(4, '0')}`;

        // Calculate fecha maxima respuesta (30 business days from now)
        const fechaMaxima = new Date();
        fechaMaxima.setDate(fechaMaxima.getDate() + (data.terminoLegalDias || 30));

        const nuevaConsulta = this.consultaRepository.create({
            ...data,
            numeroRadicado,
            fechaRecepcion: new Date(),
            fechaMaximaRespuesta: fechaMaxima,
            estado: 'en_radicacion'
        });

        return this.consultaRepository.save(nuevaConsulta);
    }

    async update(id: string, data: Partial<ConsultaJuridica>): Promise<ConsultaJuridica> {
        const consulta = await this.findOne(id);

        // If assigning abogado, update estado and fechaAsignacion
        if (data.abogadoAsignadoId && !consulta.abogadoAsignadoId) {
            data.fechaAsignacion = new Date();
            if (consulta.estado === 'en_radicacion') {
                data.estado = 'asignado';
            }
        }

        Object.assign(consulta, data);
        return this.consultaRepository.save(consulta);
    }

    async updateEstado(id: string, estado: string): Promise<ConsultaJuridica> {
        const consulta = await this.findOne(id);
        consulta.estado = estado;
        return this.consultaRepository.save(consulta);
    }

    async responder(id: string, respuestaData: {
        numeroOficioRespuesta?: string;
        tipoRespuesta: string;
        documentoRespuestaUrl?: string | null;
        observaciones?: string;
    }): Promise<ConsultaJuridica> {
        const consulta = await this.findOne(id);

        consulta.tipoRespuesta = respuestaData.tipoRespuesta;
        consulta.numeroOficioRespuesta = respuestaData.numeroOficioRespuesta ?? consulta.numeroOficioRespuesta;
        consulta.documentoRespuestaUrl = respuestaData.documentoRespuestaUrl ?? consulta.documentoRespuestaUrl;
        consulta.observaciones = respuestaData.observaciones ?? consulta.observaciones;
        consulta.fechaRespuesta = new Date();
        consulta.estado = 'respondido';

        return this.consultaRepository.save(consulta);
    }

    async delete(id: string): Promise<void> {
        const consulta = await this.findOne(id);
        await this.consultaRepository.remove(consulta);
    }

    // Helper to calculate dias restantes
    calcularDiasRestantes(fechaMaxima: Date | null): number {
        if (!fechaMaxima) return 30; // Default if no date set
        const hoy = new Date();
        const diff = fechaMaxima.getTime() - hoy.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }
}

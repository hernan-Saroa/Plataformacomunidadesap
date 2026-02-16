import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evidencia } from '../entities/evidencia.entity';
import { ExpedienteService } from './expediente.service';

import { ActuacionService } from './actuacion.service';

@Injectable()
export class EvidenciasService {
    constructor(
        @InjectRepository(Evidencia)
        private readonly evidenciaRepository: Repository<Evidencia>,
        private readonly expedienteService: ExpedienteService,
        private readonly actuacionService: ActuacionService
    ) { }

    // Helper para validar si es UUID
    private isValidUUID(str: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
    }

    // Resolver expedienteId: si es UUID lo usa directo, si es radicado busca el UUID
    private async resolveExpedienteId(expedienteIdOrRadicado: string): Promise<string | null> {
        if (this.isValidUUID(expedienteIdOrRadicado)) {
            return expedienteIdOrRadicado;
        }
        // Es radicado, buscar el expediente
        const expediente = await this.expedienteService.findOneByRadicado(expedienteIdOrRadicado);
        return expediente?.id || null;
    }

    async findAllByExpediente(expedienteIdOrRadicado: string): Promise<Evidencia[]> {
        const expedienteId = await this.resolveExpedienteId(expedienteIdOrRadicado);
        if (!expedienteId) {
            return []; // No se encontró el expediente
        }
        return this.evidenciaRepository.find({
            where: { expedienteId },
            order: { fechaPresentacion: 'DESC' }
        });
    }

    async create(expedienteIdOrRadicado: string, data: Partial<Evidencia>, file: Express.Multer.File): Promise<Evidencia> {
        // Resolver UUID del expediente si se pasó un radicado
        const expedienteId = await this.resolveExpedienteId(expedienteIdOrRadicado);
        if (!expedienteId) {
            throw new NotFoundException('Expediente no encontrado');
        }

        // Verificar que el expediente existe, o crearlo si es un proceso disciplinario
        const expediente = await this.expedienteService.findOneOrCreateFromDisciplinaryProcess(expedienteId);

        const nuevaEvidencia = this.evidenciaRepository.create({
            ...data,
            expedienteId: expedienteId,
            archivoNombre: data.archivoNombre || file.originalname,
            archivoUrl: `files/${file.filename}`,
            archivoTamano: file.size,
        });

        const saved = await this.evidenciaRepository.save(nuevaEvidencia);

        // REGISTRO AUTOMÁTICO EN HISTORIAL UNIFICADO
        try {
            await this.actuacionService.registrarEventoAutomatico(
                expedienteId,
                saved.descripcion || 'Evidencia Cargada',
                `Nueva Evidencia: "${saved.archivoNombre}". Tipo: ${saved.tipo}. Prioridad: ${saved.prioridad}.`,
                'EVIDENCIA',
                saved.id,
                { archivo: saved.archivoUrl, prioridad: saved.prioridad }
            );
        } catch (error) {
            console.error('Error creando log de actuación automática para Evidencia:', error);
        }

        return saved;
    }

    async updateEstado(id: string, estado: string): Promise<Evidencia> {
        const evidencia = await this.evidenciaRepository.findOneBy({ id });
        if (!evidencia) throw new NotFoundException('Evidencia no encontrada');

        evidencia.estado = estado;
        const saved = await this.evidenciaRepository.save(evidencia);

        // LOG CAMBIO ESTADO
        try {
            await this.actuacionService.registrarEventoAutomatico(
                evidencia.expedienteId,
                `Evidencia ${estado}`,
                `La evidencia "${evidencia.archivoNombre}" ha cambiado de estado a: ${estado}.`,
                'EVIDENCIA',
                evidencia.id,
                { nuevoEstado: estado }
            );
        } catch (e) { console.error(e); }

        return saved;
    }

    async delete(id: string): Promise<{ success: boolean; message: string }> {
        const evidencia = await this.evidenciaRepository.findOneBy({ id });
        if (!evidencia) throw new NotFoundException('Evidencia no encontrada');

        await this.evidenciaRepository.remove(evidencia);
        return { success: true, message: 'Evidencia eliminada correctamente' };
    }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evidencia } from '../entities/evidencia.entity';
import { ExpedienteService } from './expediente.service';

@Injectable()
export class EvidenciasService {
    constructor(
        @InjectRepository(Evidencia)
        private readonly evidenciaRepository: Repository<Evidencia>,
        private readonly expedienteService: ExpedienteService
    ) { }

    async findAllByExpediente(expedienteId: string): Promise<Evidencia[]> {
        return this.evidenciaRepository.find({
            where: { expedienteId },
            order: { fechaPresentacion: 'DESC' }
        });
    }

    async create(expedienteId: string, data: Partial<Evidencia>, file: Express.Multer.File): Promise<Evidencia> {
        // Verify expediente exists - assuming findOne works with ID, if not we rely on FK constraint or add checks
        // For simplicity and to match Autos pattern, we can fetch it even if we just need the ID for the entity.
        // Actually, we can just save it with the ID.

        const nuevaEvidencia = this.evidenciaRepository.create({
            ...data,
            expedienteId: expedienteId,
            archivoNombre: data.archivoNombre || file.originalname, // Keep custom or use original
            archivoUrl: `files/${file.filename}`, // Ruta relativa, el frontend construye la URL completa
            archivoTamano: file.size,
            // tipo is handled in data
        });

        return this.evidenciaRepository.save(nuevaEvidencia);
    }

    async updateEstado(id: string, estado: string): Promise<Evidencia> {
        const evidencia = await this.evidenciaRepository.findOneBy({ id });
        if (!evidencia) throw new NotFoundException('Evidencia no encontrada');

        evidencia.estado = estado;
        return this.evidenciaRepository.save(evidencia);
    }

    async delete(id: string): Promise<{ success: boolean; message: string }> {
        const evidencia = await this.evidenciaRepository.findOneBy({ id });
        if (!evidencia) throw new NotFoundException('Evidencia no encontrada');

        await this.evidenciaRepository.remove(evidencia);
        return { success: true, message: 'Evidencia eliminada correctamente' };
    }
}

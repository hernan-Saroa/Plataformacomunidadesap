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

    async findAllByExpediente(expedienteIdOrRadicado: string): Promise<Acta[]> {
        const expedienteId = await this.resolveExpedienteId(expedienteIdOrRadicado);
        if (!expedienteId) {
            return []; // No se encontró el expediente
        }
        return this.actaRepository.find({
            where: { expedienteId },
            order: { fecha: 'DESC' }
        });
    }

    async create(expedienteIdOrRadicado: string, data: Partial<Acta>, file?: Express.Multer.File): Promise<Acta> {
        // Resolver UUID del expediente si se pasó un radicado
        const expedienteId = await this.resolveExpedienteId(expedienteIdOrRadicado);
        if (!expedienteId) {
            throw new NotFoundException('Expediente no encontrado');
        }

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

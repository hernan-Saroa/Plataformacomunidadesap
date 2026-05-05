import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComentarioOC } from '../entities/comentario-oc.entity';
import { DocumentoOC } from '../entities/documento-oc.entity';
import { RequerimientoOC } from '../entities/requerimiento-oc.entity';
import { LegalNotificationsService } from './legal-notifications.service';

@Injectable()
export class ComentariosDocumentosOCService {
    constructor(
        @InjectRepository(ComentarioOC)
        private readonly comentarioRepository: Repository<ComentarioOC>,
        @InjectRepository(DocumentoOC)
        private readonly documentoRepository: Repository<DocumentoOC>,
        @InjectRepository(RequerimientoOC)
        private readonly requerimientoRepository: Repository<RequerimientoOC>,
        private readonly legalNotifications: LegalNotificationsService
    ) { }

    // ==================== COMENTARIOS ====================

    async findComentariosByRequerimiento(requerimientoId: string): Promise<ComentarioOC[]> {
        return this.comentarioRepository.find({
            where: { requerimientoId },
            relations: ['autor'],
            order: { createdAt: 'DESC' }
        });
    }

    async createComentario(data: Partial<ComentarioOC>): Promise<ComentarioOC> {
        const comentario = this.comentarioRepository.create(data);
        return this.comentarioRepository.save(comentario);
    }

    async deleteComentario(id: string): Promise<void> {
        const comentario = await this.comentarioRepository.findOne({ where: { id } });
        if (!comentario) throw new NotFoundException('Comentario no encontrado');
        await this.comentarioRepository.remove(comentario);
    }

    // ==================== DOCUMENTOS ====================

    async findDocumentosByRequerimiento(requerimientoId: string): Promise<DocumentoOC[]> {
        return this.documentoRepository.find({
            where: { requerimientoId },
            order: { createdAt: 'DESC' }
        });
    }

    async createDocumento(data: Partial<DocumentoOC>): Promise<DocumentoOC> {
        const documento = this.documentoRepository.create(data);
        const saved = await this.documentoRepository.save(documento);

        if (saved.requerimientoId) {
            const requerimiento = await this.requerimientoRepository.findOne({ where: { id: saved.requerimientoId } });
            if (requerimiento) {
                await this.legalNotifications.notifyDocumentoSubido({
                    modulo: 'ORGANOS_CONTROL',
                    radicado: requerimiento.radicadoInterno || requerimiento.id,
                    procesoId: requerimiento.id,
                    nombreDocumento: saved.nombre,
                    subidoPor: saved.subidoPor || 'Sistema',
                });
            }
        }

        return saved;
    }

    async deleteDocumento(id: string): Promise<void> {
        const documento = await this.documentoRepository.findOne({ where: { id } });
        if (!documento) throw new NotFoundException('Documento no encontrado');
        await this.documentoRepository.remove(documento);
    }
}

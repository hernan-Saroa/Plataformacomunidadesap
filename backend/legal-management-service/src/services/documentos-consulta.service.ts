import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentoConsulta } from '../entities/documento-consulta.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumentosConsultaService {
    constructor(
        @InjectRepository(DocumentoConsulta)
        private readonly documentoRepository: Repository<DocumentoConsulta>
    ) { }

    async findByConsulta(consultaId: string): Promise<DocumentoConsulta[]> {
        return this.documentoRepository.find({
            where: { consultaId },
            order: { createdAt: 'DESC' }
        });
    }

    async findOne(id: string): Promise<DocumentoConsulta> {
        const doc = await this.documentoRepository.findOne({ where: { id } });
        if (!doc) {
            throw new NotFoundException(`Documento ${id} no encontrado`);
        }
        return doc;
    }

    async create(data: Partial<DocumentoConsulta>): Promise<DocumentoConsulta> {
        const documento = this.documentoRepository.create(data);
        return this.documentoRepository.save(documento);
    }

    async update(id: string, data: Partial<DocumentoConsulta>): Promise<DocumentoConsulta> {
        const documento = await this.findOne(id);
        Object.assign(documento, data);
        return this.documentoRepository.save(documento);
    }

    async delete(id: string): Promise<void> {
        const documento = await this.findOne(id);

        // Eliminar archivo físico si existe
        if (documento.archivoUrl) {
            try {
                const filename = documento.archivoUrl.includes('/api/legal/files/')
                    ? documento.archivoUrl.split('/api/legal/files/').pop() || ''
                    : path.basename(documento.archivoUrl);

                const filePath = path.join(process.cwd(), 'uploads', filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (error) {
                console.error('Error eliminando archivo físico:', error);
            }
        }

        await this.documentoRepository.delete(id);
    }

    async countByConsulta(consultaId: string): Promise<number> {
        return this.documentoRepository.count({ where: { consultaId } });
    }
}

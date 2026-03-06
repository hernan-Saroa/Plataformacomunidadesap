import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Documento } from '../entities/documento.entity';

export class CreateDocumentoDto {
    expedienteId: string;
    nombre: string;
    tipo: string;
    descripcion?: string;
    archivoUrl?: string;
    archivoNombreOriginal?: string;
    archivoTamano?: number;
    archivoMimeType?: string;
    fechaDocumento?: string;
    numeroFolios?: number;
    confidencial?: boolean;
    subidoPor?: string;
    categoria?: string;
    etapa?: string;
}

export class UpdateDocumentoDto {
    nombre?: string;
    tipo?: string;
    descripcion?: string;
    archivoUrl?: string;
    fechaDocumento?: string;
    numeroFolios?: number;
    confidencial?: boolean;
    categoria?: string;
    etapa?: string;
}

@Injectable()
export class DocumentoService {
    constructor(
        @InjectRepository(Documento)
        private documentoRepository: Repository<Documento>,
    ) { }

    async listarPorExpediente(expedienteId: string): Promise<Documento[]> {
        return this.documentoRepository.find({
            where: { expedienteId },
            order: { createdAt: 'DESC' },
        });
    }

    async obtenerPorId(id: string): Promise<Documento | null> {
        return this.documentoRepository.findOne({ where: { id } });
    }

    async crear(dto: CreateDocumentoDto): Promise<Documento> {
        const documento = this.documentoRepository.create({
            expedienteId: dto.expedienteId,
            nombre: dto.nombre,
            tipo: dto.tipo,
            descripcion: dto.descripcion,
            archivoUrl: dto.archivoUrl,
            archivoNombreOriginal: dto.archivoNombreOriginal,
            archivoTamano: dto.archivoTamano,
            archivoMimeType: dto.archivoMimeType,
            fechaDocumento: dto.fechaDocumento ? new Date(dto.fechaDocumento) : undefined,
            numeroFolios: dto.numeroFolios,
            confidencial: dto.confidencial || false,
            subidoPor: dto.subidoPor,
            categoria: dto.categoria || 'documentos',
            etapa: dto.etapa || undefined,
        });
        return this.documentoRepository.save(documento);
    }

    async actualizar(id: string, dto: UpdateDocumentoDto): Promise<Documento | null> {
        const documento = await this.documentoRepository.findOne({ where: { id } });
        if (!documento) {
            return null;
        }

        if (dto.nombre !== undefined) documento.nombre = dto.nombre;
        if (dto.tipo !== undefined) documento.tipo = dto.tipo;
        if (dto.descripcion !== undefined) documento.descripcion = dto.descripcion;
        if (dto.archivoUrl !== undefined) documento.archivoUrl = dto.archivoUrl;
        if (dto.fechaDocumento !== undefined) documento.fechaDocumento = new Date(dto.fechaDocumento);
        if (dto.numeroFolios !== undefined) documento.numeroFolios = dto.numeroFolios;
        if (dto.confidencial !== undefined) documento.confidencial = dto.confidencial;
        if (dto.categoria !== undefined) documento.categoria = dto.categoria;

        return this.documentoRepository.save(documento);
    }

    async eliminar(id: string): Promise<boolean> {
        const result = await this.documentoRepository.delete(id);
        return (result.affected ?? 0) > 0;
    }

    async contarPorExpediente(expedienteId: string): Promise<number> {
        return this.documentoRepository.count({ where: { expedienteId } });
    }
}

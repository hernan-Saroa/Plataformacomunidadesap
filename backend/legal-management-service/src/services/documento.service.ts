import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Documento } from '../entities/documento.entity';
import { Expediente } from '../entities/expediente.entity';
import { LegalNotificationsService } from './legal-notifications.service';

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
    /** Override explícito del módulo: 'DEFENSA_JUDICIAL' | 'JUZGAMIENTO_DISCIPLINARIO'. Si no viene, se infiere de la jurisdicción del expediente. */
    modulo?: 'DEFENSA_JUDICIAL' | 'JUZGAMIENTO_DISCIPLINARIO';
}

export class UpdateDocumentoDto {
    nombre?: string;
    tipo?: string;
    descripcion?: string;
    archivoUrl?: string;
    archivoNombreOriginal?: string;
    archivoTamano?: number;
    archivoMimeType?: string;
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
        @InjectRepository(Expediente)
        private expedienteRepository: Repository<Expediente>,
        private readonly legalNotifications: LegalNotificationsService,
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
        const saved = await this.documentoRepository.save(documento);

        const expediente = await this.expedienteRepository.findOne({ where: { id: dto.expedienteId } });
        if (expediente) {
            // Prioridad: override explícito del cliente > inferencia por jurisdicción/radicado
            let modulo: 'DEFENSA_JUDICIAL' | 'JUZGAMIENTO_DISCIPLINARIO';
            if (dto.modulo === 'DEFENSA_JUDICIAL' || dto.modulo === 'JUZGAMIENTO_DISCIPLINARIO') {
                modulo = dto.modulo;
            } else {
                const radicado = (expediente.radicado || '').toUpperCase();
                const esDisciplinario =
                    expediente.jurisdiccion === 'DISCIPLINARIO' ||
                    expediente.jurisdiccion === 'Disciplinaria' ||
                    expediente.tipoProceso === 'DISCIPLINARIO' ||
                    expediente.tipoProceso === 'Disciplinario' ||
                    radicado.startsWith('PD-');
                modulo = esDisciplinario ? 'JUZGAMIENTO_DISCIPLINARIO' : 'DEFENSA_JUDICIAL';
            }

            try {
                await this.legalNotifications.notifyDocumentoSubido({
                    modulo,
                    radicado: expediente.radicado,
                    procesoId: expediente.id,
                    nombreDocumento: saved.archivoNombreOriginal || saved.nombre,
                    subidoPor: saved.subidoPor || 'Sistema',
                });
            } catch (e: any) {
                console.error('[DocumentoService.crear] notify falló:', e?.message);
            }
        }

        return saved;
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
        if (dto.archivoNombreOriginal !== undefined) documento.archivoNombreOriginal = dto.archivoNombreOriginal;
        if (dto.archivoTamano !== undefined) documento.archivoTamano = dto.archivoTamano;
        if (dto.archivoMimeType !== undefined) documento.archivoMimeType = dto.archivoMimeType;
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

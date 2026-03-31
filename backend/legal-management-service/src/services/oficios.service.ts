import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OficioEnviado } from '../entities/oficio-enviado.entity';
import { MicrosoftGraphService } from './microsoft-graph.service';
import * as path from 'path';
import * as fs from 'fs';

export interface CreateOficioDto {
    numero: string;
    expedienteId: string;
    modulo?: string;
    asunto: string;
    destinatario: string;
    destinatarioEmail?: string;
    contenido: string;
    contenidoHtml?: string;
    firma?: string;
    plantilla?: string;
    archivosAdjuntos?: { nombre: string; url: string; tipo: string; size?: number }[];
    enviar?: boolean; // true = enviar via Graph, false = solo guardar
}

@Injectable()
export class OficiosService {
    private readonly logger = new Logger(OficiosService.name);

    constructor(
        @InjectRepository(OficioEnviado)
        private readonly oficioRepository: Repository<OficioEnviado>,
        private readonly graphService: MicrosoftGraphService
    ) { }

    /**
     * Create and optionally send an oficio
     */
    async create(dto: CreateOficioDto, attachmentFiles?: Express.Multer.File[]): Promise<OficioEnviado> {
        this.logger.log(`Creating oficio ${dto.numero} for expediente ${dto.expedienteId}`);

        // Build archivosAdjuntos from uploaded files
        let archivosAdjuntos = dto.archivosAdjuntos || [];
        if (attachmentFiles && attachmentFiles.length > 0) {
            archivosAdjuntos = attachmentFiles.map(file => ({
                nombre: file.originalname,
                url: `/legal/files/${file.filename}`,
                tipo: file.mimetype,
                size: file.size
            }));
        }

        // Create oficio entity
        const oficio = this.oficioRepository.create({
            numero: dto.numero,
            expedienteId: dto.expedienteId,
            modulo: dto.modulo,
            asunto: dto.asunto,
            destinatario: dto.destinatario,
            destinatarioEmail: dto.destinatarioEmail,
            contenido: dto.contenido,
            contenidoHtml: dto.contenidoHtml,
            firma: dto.firma,
            plantilla: dto.plantilla,
            archivosAdjuntos,
            estado: dto.enviar ? 'ENVIADO' : 'BORRADOR',
            ...(dto.enviar && { fechaEnvio: new Date() })
        });

        // Save to DB first
        const savedOficio = await this.oficioRepository.save(oficio);
        this.logger.log(`Oficio ${savedOficio.id} saved to database`);

        // Send via Graph API if requested
        if (dto.enviar && dto.destinatarioEmail) {
            try {
                // Prepare attachments for Graph API (base64 encoded)
                const graphAttachments: { name: string; contentBytes: string; contentType: string }[] = [];

                if (attachmentFiles && attachmentFiles.length > 0) {
                    for (const file of attachmentFiles) {
                        const filePath = path.join(process.cwd(), 'uploads', file.filename);
                        if (fs.existsSync(filePath)) {
                            const fileBuffer = fs.readFileSync(filePath);
                            graphAttachments.push({
                                name: file.originalname,
                                contentBytes: fileBuffer.toString('base64'),
                                contentType: file.mimetype
                            });
                        }
                    }
                }

                // Use HTML content if available, otherwise plain text
                const emailBody = dto.contenidoHtml || dto.contenido;

                const sent = await this.graphService.sendEmail(
                    dto.destinatarioEmail,
                    dto.asunto,
                    emailBody,
                    [], // No CC for now
                    graphAttachments.length > 0 ? graphAttachments : undefined
                );

                if (sent) {
                    this.logger.log(`Oficio ${savedOficio.id} sent to ${dto.destinatarioEmail}`);
                } else {
                    this.logger.warn(`Oficio ${savedOficio.id} may not have been sent (graph returned false)`);
                }
            } catch (error) {
                this.logger.error(`Failed to send oficio ${savedOficio.id} via Graph:`, error);
                // Update estado to reflect sending failure
                savedOficio.estado = 'ERROR_ENVIO';
                await this.oficioRepository.save(savedOficio);
                throw error;
            }
        }

        return savedOficio;
    }

    /**
     * Find oficios by expediente
     */
    async findByExpediente(expedienteId: string, modulo?: string): Promise<OficioEnviado[]> {
        const where: any = { expedienteId };
        if (modulo) {
            where.modulo = modulo;
        }

        return this.oficioRepository.find({
            where,
            order: { fechaEnvio: 'DESC' }
        });
    }

    /**
     * Find single oficio by ID
     */
    async findOne(id: string): Promise<OficioEnviado> {
        const oficio = await this.oficioRepository.findOne({ where: { id } });
        if (!oficio) {
            throw new NotFoundException(`Oficio ${id} not found`);
        }
        return oficio;
    }

    /**
     * Get all oficios for ZIP download
     */
    async getOficiosForZip(expedienteId: string, modulo?: string): Promise<OficioEnviado[]> {
        const oficios = await this.findByExpediente(expedienteId, modulo);
        // Filter only those with attachments
        return oficios.filter(o => o.archivosAdjuntos && o.archivosAdjuntos.length > 0);
    }

    /**
     * Delete oficio
     */
    async delete(id: string): Promise<void> {
        const oficio = await this.findOne(id);
        await this.oficioRepository.remove(oficio);
        this.logger.log(`Oficio ${id} deleted`);
    }
}

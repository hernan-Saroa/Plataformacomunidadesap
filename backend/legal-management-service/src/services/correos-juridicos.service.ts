import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { CorreoJuridico } from '../entities/correo-juridico.entity';
import { AdjuntoCorreo } from '../entities/adjunto-correo.entity';
import { MicrosoftGraphService, GraphEmail } from './microsoft-graph.service';

export interface EmailFilters {
    tipo?: string;
    leido?: boolean;
    urgente?: boolean;
    archivado?: boolean;
    search?: string;
}

export interface EmailClassification {
    tipo: 'JUDICIAL' | 'CORREO' | 'OFICIO';
    categoria: string;
    moduloSugerido: string;
    urgente: boolean;
    confianza: number;
}

export interface SendEmailDto {
    to: string;
    cc?: string[];
    subject: string;
    body: string;
    attachments?: { name: string; contentBytes: string; contentType: string }[];
}

@Injectable()
export class CorreosJuridicosService {
    private readonly logger = new Logger(CorreosJuridicosService.name);

    constructor(
        @InjectRepository(CorreoJuridico)
        private readonly correoRepo: Repository<CorreoJuridico>,
        @InjectRepository(AdjuntoCorreo)
        private readonly adjuntoRepo: Repository<AdjuntoCorreo>,
        private readonly graphService: MicrosoftGraphService,
    ) { }

    /**
     * Classify an email based on subject and body content
     */
    classifyEmail(subject: string, bodyPreview: string): EmailClassification {
        const text = `${subject} ${bodyPreview}`.toLowerCase();

        // JUDICIAL patterns
        const judicialPatterns = [
            'tutela', 'juzgado', 'fallo', 'tribunal', 'demanda', 'sentencia',
            'notificación judicial', 'auto', 'despacho judicial', 'proceso judicial',
            'acción popular', 'acción de grupo', 'nulidad', 'restablecimiento'
        ];

        // URGENTE patterns
        const urgentePatterns = [
            'urgente', 'inmediato', 'prioritario', 'termino perentorio',
            'vencimiento', 'último día', 'caducidad', 'prescripción'
        ];

        // Control bodies patterns
        const organosControlPatterns = [
            'contraloría', 'procuraduría', 'personería', 'defensoría',
            'fiscalía', 'superintendencia', 'auditoría'
        ];

        // Legal consultation patterns
        const consultaPatterns = [
            'consulta', 'concepto jurídico', 'concepto legal', 'asesoría',
            'revisión jurídica', 'viabilidad jurídica'
        ];

        // Check for JUDICIAL
        const isJudicial = judicialPatterns.some(p => text.includes(p));
        if (isJudicial) {
            return {
                tipo: 'JUDICIAL',
                categoria: 'Proceso Judicial',
                moduloSugerido: 'MOD-02: Defensa Judicial',
                urgente: urgentePatterns.some(p => text.includes(p)),
                confianza: 95,
            };
        }

        // Check for control bodies
        const isOrganoControl = organosControlPatterns.some(p => text.includes(p));
        if (isOrganoControl) {
            return {
                tipo: 'CORREO',
                categoria: 'Órgano de Control',
                moduloSugerido: 'MOD-07: Órganos de Control',
                urgente: true, // Control bodies are always priority
                confianza: 98,
            };
        }

        // Check for legal consultations
        const isConsulta = consultaPatterns.some(p => text.includes(p));
        if (isConsulta) {
            return {
                tipo: 'CORREO',
                categoria: 'Consulta Jurídica',
                moduloSugerido: 'MOD-03: Asesoría Jurídica',
                urgente: urgentePatterns.some(p => text.includes(p)),
                confianza: 90,
            };
        }

        // Check for urgency in any email
        const isUrgente = urgentePatterns.some(p => text.includes(p));

        // Default classification
        return {
            tipo: 'CORREO',
            categoria: 'Correo General',
            moduloSugerido: 'MOD-08: Buzón Oficina Jurídica',
            urgente: isUrgente,
            confianza: 70,
        };
    }

    /**
     * Sync emails from Microsoft Graph to local database
     * Uses pagination to ensure all emails are fetched
     */
    async syncInbox(): Promise<{ synced: number; errors: number; total: number }> {
        this.logger.log('Starting inbox sync with pagination...');

        let synced = 0;
        let errors = 0;

        try {
            // Fetch all emails with pagination (up to 500)
            const emails = await this.graphService.getAllEmailsWithPaging(500);
            this.logger.log(`Retrieved ${emails.length} emails from Graph API`);

            for (const email of emails) {
                try {
                    // Check if already exists
                    const existing = await this.correoRepo.findOne({
                        where: { graphMessageId: email.id },
                    });

                    if (existing) {
                        // Update read status if changed
                        if (existing.leido !== email.isRead) {
                            existing.leido = email.isRead;
                            await this.correoRepo.save(existing);
                        }

                        // Sync attachments for existing emails that have them but haven't synced yet
                        if (existing.tieneAdjuntos) {
                            const existingAttachments = await this.adjuntoRepo.count({
                                where: { correoId: existing.id }
                            });

                            if (existingAttachments === 0) {
                                try {
                                    const attachments = await this.graphService.getAttachments(email.id);
                                    for (const att of attachments) {
                                        const adjunto = this.adjuntoRepo.create({
                                            correoId: existing.id,
                                            graphMessageId: email.id,
                                            graphAttachmentId: att.id,
                                            nombre: att.name,
                                            contentType: att.contentType,
                                            tamanio: att.size,
                                            descargado: false,
                                        });
                                        await this.adjuntoRepo.save(adjunto);
                                    }
                                    if (attachments.length > 0) {
                                        this.logger.log(`  -> Synced ${attachments.length} attachment(s) for existing email`);
                                        synced++; // Count as synced since we added attachments
                                    }
                                } catch (attError) {
                                    this.logger.error(`Error syncing attachments for existing email ${email.id}:`, attError);
                                }
                            }
                        }
                        continue;
                    }

                    // Classify the email
                    const classification = this.classifyEmail(email.subject || '', email.bodyPreview || '');

                    // Create new record
                    const newCorreo = this.correoRepo.create({
                        graphMessageId: email.id,
                        asunto: email.subject || '(Sin asunto)',
                        remitenteEmail: email.from?.emailAddress?.address || '',
                        remitenteNombre: email.from?.emailAddress?.name || '',
                        destinatarios: JSON.stringify(email.toRecipients || []),
                        fechaRecepcion: new Date(email.receivedDateTime),
                        cuerpoTexto: email.bodyPreview || '',
                        tieneAdjuntos: email.hasAttachments || false,
                        leido: email.isRead || false,
                        archivado: false,
                        urgente: classification.urgente,
                        tipo: classification.tipo,
                        categoria: classification.categoria,
                        moduloSugerido: classification.moduloSugerido,
                        confianzaClasificacion: classification.confianza,
                    });

                    const savedCorreo = await this.correoRepo.save(newCorreo);

                    // Sync attachments if email has any
                    if (email.hasAttachments) {
                        try {
                            const attachments = await this.graphService.getAttachments(email.id);
                            for (const att of attachments) {
                                const adjunto = this.adjuntoRepo.create({
                                    correoId: savedCorreo.id,
                                    graphMessageId: email.id,
                                    graphAttachmentId: att.id,
                                    nombre: att.name,
                                    contentType: att.contentType,
                                    tamanio: att.size,
                                    descargado: false,
                                });
                                await this.adjuntoRepo.save(adjunto);
                            }
                            this.logger.log(`  -> Synced ${attachments.length} attachment(s)`);
                        } catch (attError) {
                            this.logger.error(`Error syncing attachments for email ${email.id}:`, attError);
                        }
                    }

                    synced++;
                    this.logger.log(`Synced: ${email.subject?.substring(0, 50)}...`);
                } catch (emailError) {
                    this.logger.error(`Error syncing email ${email.id}:`, emailError);
                    errors++;
                }
            }

            this.logger.log(`Sync complete. New: ${synced}, Errors: ${errors}, Total scanned: ${emails.length}`);
            return { synced, errors, total: emails.length };
        } catch (error) {
            this.logger.error('Error during inbox sync:', error);
            throw error;
        }
    }

    /**
     * Get all emails with filters
     */
    async getAll(filters?: EmailFilters): Promise<CorreoJuridico[]> {
        const where: FindOptionsWhere<CorreoJuridico> = {};

        if (filters?.tipo) {
            where.tipo = filters.tipo;
        }

        if (filters?.leido !== undefined) {
            where.leido = filters.leido;
        }

        if (filters?.urgente !== undefined) {
            where.urgente = filters.urgente;
        }

        if (filters?.archivado !== undefined) {
            where.archivado = filters.archivado;
        }

        const correos = await this.correoRepo.find({
            where,
            order: { fechaRecepcion: 'DESC' },
        });

        // Apply search filter if present
        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            return correos.filter(c =>
                c.asunto.toLowerCase().includes(searchLower) ||
                c.remitenteEmail.toLowerCase().includes(searchLower) ||
                c.remitenteNombre?.toLowerCase().includes(searchLower)
            );
        }

        return correos;
    }

    /**
     * Get a single email by ID with full body from Graph
     */
    async getById(id: string): Promise<CorreoJuridico> {
        const correo = await this.correoRepo.findOne({ where: { id } });

        if (!correo) {
            throw new NotFoundException(`Correo ${id} not found`);
        }

        // Fetch full body from Graph if not cached
        if (!correo.cuerpoHtml && correo.graphMessageId) {
            try {
                const graphEmail = await this.graphService.getEmailById(correo.graphMessageId);
                if (graphEmail?.body?.content) {
                    correo.cuerpoHtml = graphEmail.body.content;
                    await this.correoRepo.save(correo);
                }
            } catch (error) {
                this.logger.warn(`Could not fetch body for email ${id}:`, error);
            }
        }

        return correo;
    }

    /**
     * Mark email as read in both DB and Graph
     */
    async markAsRead(id: string): Promise<CorreoJuridico> {
        const correo = await this.correoRepo.findOne({ where: { id } });

        if (!correo) {
            throw new NotFoundException(`Correo ${id} not found`);
        }

        // Update in Graph
        if (correo.graphMessageId) {
            await this.graphService.markAsRead(correo.graphMessageId);
        }

        // Update in DB
        correo.leido = true;
        return this.correoRepo.save(correo);
    }

    /**
     * Archive email (DB only)
     */
    async archive(id: string): Promise<CorreoJuridico> {
        const correo = await this.correoRepo.findOne({ where: { id } });

        if (!correo) {
            throw new NotFoundException(`Correo ${id} not found`);
        }

        correo.archivado = true;
        return this.correoRepo.save(correo);
    }

    /**
     * Send an email via Graph API
     */
    async sendEmail(dto: SendEmailDto): Promise<boolean> {
        return this.graphService.sendEmail(dto.to, dto.subject, dto.body, dto.cc, dto.attachments);
    }

    /**
     * Test Microsoft Graph connection
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        return this.graphService.testConnection();
    }

    /**
     * Get attachments for a specific email
     */
    async getAttachments(correoId: string): Promise<AdjuntoCorreo[]> {
        return this.adjuntoRepo.find({
            where: { correoId },
            order: { nombre: 'ASC' },
        });
    }

    /**
     * Download attachment from Graph API
     * Returns the attachment data (base64)
     */
    async downloadAttachment(adjuntoId: string): Promise<{
        name: string;
        contentType: string;
        contentBytes: string;
        size: number;
    }> {
        const adjunto = await this.adjuntoRepo.findOne({ where: { id: adjuntoId } });

        if (!adjunto) {
            throw new NotFoundException(`Adjunto ${adjuntoId} not found`);
        }

        // Download from Graph API
        const attachment = await this.graphService.downloadAttachment(
            adjunto.graphMessageId,
            adjunto.graphAttachmentId
        );

        return attachment;
    }
}

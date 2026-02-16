import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { CorreoJuridico } from '../entities/correo-juridico.entity';
import { AdjuntoCorreo } from '../entities/adjunto-correo.entity';
import { MicrosoftGraphService, GraphEmail } from './microsoft-graph.service';
import { SmartClassificationService } from './smart-classification.service';

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

import { ActuacionService } from './actuacion.service';

@Injectable()
export class CorreosJuridicosService {
    private readonly logger = new Logger(CorreosJuridicosService.name);

    constructor(
        @InjectRepository(CorreoJuridico)
        private readonly correoRepo: Repository<CorreoJuridico>,
        @InjectRepository(AdjuntoCorreo)
        private readonly adjuntoRepo: Repository<AdjuntoCorreo>,
        private readonly graphService: MicrosoftGraphService,
        private readonly smartService: SmartClassificationService,
        private readonly actuacionService: ActuacionService,
    ) { }



    /**
     * Sync one page of emails from Microsoft Graph
     * Returns nextLink for pagination
     */
    async syncInbox(nextLink?: string): Promise<{ synced: number; errors: number; total: number; nextLink: string | null }> {
        this.logger.log(`Starting inbox sync page (NextLink provided: ${!!nextLink})...`);

        let synced = 0;
        let errors = 0;

        try {
            // Fetch one page (50 emails default)
            const pageResult = await this.graphService.getEmailsPage(nextLink, 50);
            const emails = pageResult.emails;
            const newNextLink = pageResult.nextLink;

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
                    } else {
                        // Classify the email (AI)
                        const classification = await this.smartService.classify(email.subject || '', email.bodyPreview || '');
                        const isUrgente = this.smartService.analyzeUrgency(email.subject || '', email.bodyPreview || '');

                        // Map AI specific category to DB generic Type
                        let tipoDB = 'CORREO';
                        if (classification.category === 'JUDICIAL') tipoDB = 'JUDICIAL';
                        if (classification.category === 'OFICIO') tipoDB = 'OFICIO';

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
                            urgente: isUrgente,
                            tipo: tipoDB, // JUDICIAL, OFICIO, CORREO
                            categoria: classification.category, // Specific category (e.g. CONSULTA)
                            moduloSugerido: classification.module,
                            confianzaClasificacion: classification.confidence,
                            aiSuggestedCategory: classification.category,
                            isTrained: false,
                            expedienteId: undefined
                        });

                        const savedCorreo = await this.correoRepo.save(newCorreo);
                        synced++;
                        this.logger.log(`Synced: ${email.subject?.substring(0, 50)}...`);

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
                    }
                } catch (emailError) {
                    this.logger.error(`Error syncing email ${email.id}:`, emailError);
                    errors++;
                }
            }

            this.logger.log(`Sync page complete. New/Updated: ${synced}, Errors: ${errors}, Next page available: ${!!newNextLink}`);
            return { synced, errors, total: emails.length, nextLink: newNextLink };
        } catch (error: any) {
            this.logger.error(`CRITICAL Error during inbox sync: ${error.message}`, error.stack);
            throw new Error(`Failed to sync emails: ${error.message}`);
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
        const fs = require('fs');
        const path = require('path');

        const adjunto = await this.adjuntoRepo.findOne({ where: { id: adjuntoId } });

        if (!adjunto) {
            throw new NotFoundException(`Adjunto ${adjuntoId} not found`);
        }

        // 1. Check if we already have it locally
        if (adjunto.descargado && adjunto.archivoLocalUrl) {
            if (fs.existsSync(adjunto.archivoLocalUrl)) {
                const buffer = fs.readFileSync(adjunto.archivoLocalUrl);
                return {
                    name: adjunto.nombre,
                    contentType: adjunto.contentType || 'application/octet-stream',
                    contentBytes: buffer.toString('base64'),
                    size: buffer.length
                };
            }
        }

        // 2. Not local? Download from Graph
        const attachment = await this.graphService.downloadAttachment(
            adjunto.graphMessageId,
            adjunto.graphAttachmentId
        );

        // 3. Save locally for next time (Lazy Cache)
        try {
            const uploadsDir = path.join(process.cwd(), 'uploads', 'adjuntos');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const safeName = `${adjunto.id}_${adjunto.nombre.replace(/[^a-z0-9.]/gi, '_')}`;
            const localPath = path.join(uploadsDir, safeName);

            const buffer = Buffer.from(attachment.contentBytes, 'base64');
            fs.writeFileSync(localPath, buffer);

            // Update DB
            adjunto.archivoLocalUrl = localPath;
            adjunto.descargado = true;
            await this.adjuntoRepo.save(adjunto);

            this.logger.log(`Adjunto cached locally: ${localPath}`);
        } catch (saveError) {
            this.logger.error('Could not cache attachment locally', saveError);
            // Non-blocking, return downloaded content anyway
        }

        return attachment;
    }

    /**
     * Export email to ZIP (PDF Report + Attachments)
     */
    async exportCorreoToZip(id: string): Promise<any> {
        const correo = await this.correoRepo.findOne({ where: { id } });
        if (!correo) throw new NotFoundException('Correo no encontrado');

        const adjuntos = await this.adjuntoRepo.find({ where: { correoId: id } });

        const archiver = require('archiver');
        const PDFDocument = require('pdfkit');

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        // Error handling
        archive.on('error', (err: any) => {
            console.error('Archiver error:', err);
        });

        // 1. Generate PDF Report
        try {
            const doc = new PDFDocument();
            archive.append(doc, { name: `Reporte_${correo.id}.pdf` });

            // Header
            doc.fontSize(18).text('Detalle de Comunicación Jurídica', { align: 'center' });
            doc.moveDown();

            // Metadata
            const formatDate = (d: any) => d ? new Date(d).toLocaleString('es-CO') : 'N/A';

            doc.fontSize(12).font('Helvetica-Bold').text('Asunto:', { continued: true }).font('Helvetica').text(` ${correo.asunto}`);
            doc.font('Helvetica-Bold').text('Remitente:', { continued: true }).font('Helvetica').text(` ${correo.remitenteNombre} <${correo.remitenteEmail}>`);
            doc.font('Helvetica-Bold').text('Fecha:', { continued: true }).font('Helvetica').text(` ${formatDate(correo.fechaRecepcion)}`);
            doc.font('Helvetica-Bold').text('Tipo:', { continued: true }).font('Helvetica').text(` ${correo.tipo} - ${correo.categoria || ''}`);
            doc.font('Helvetica-Bold').text('Estado:', { continued: true }).font('Helvetica').text(` ${correo.archivado ? 'ARCHIVADO' : (correo.leido ? 'LEIDO' : 'PENDIENTE')}`);

            doc.moveDown();
            doc.font('Helvetica-Bold').text('Contenido:', { underline: true });
            doc.moveDown(0.5);
            doc.font('Helvetica').text(correo.cuerpoTexto || '(Sin contenido de texto previa)');

            doc.moveDown();

            // Attachments info
            if (adjuntos.length > 0) {
                doc.font('Helvetica-Bold').text(`Adjuntos Relacionados (${adjuntos.length}):`);
                adjuntos.forEach(adj => {
                    doc.font('Helvetica').text(`- ${adj.nombre} (${(adj.tamanio / 1024).toFixed(1)} KB)`);
                });
            } else {
                doc.text('Sin archivos adjuntos.');
            }

            doc.end();
        } catch (pdfError) {
            console.error('Error generating PDF report for email export:', pdfError);
            archive.append(Buffer.from(`Error generando PDF: ${pdfError}`), { name: 'error_pdf.txt' });
        }

        // 2. Add Attachments
        if (adjuntos.length > 0) {
            for (const adj of adjuntos) {
                try {
                    // Fetch attachment content from Graph
                    const attData = await this.graphService.downloadAttachment(adj.graphMessageId, adj.graphAttachmentId);

                    // Decode base64 
                    if (attData && attData.contentBytes) {
                        const buffer = Buffer.from(attData.contentBytes, 'base64');
                        archive.append(buffer, { name: `Adjuntos/${adj.nombre}` });
                    }
                } catch (attError) {
                    console.error(`Error fetching attachment ${adj.nombre}:`, attError);
                    archive.append(Buffer.from(`Error descargando adjunto: ${attError}`), { name: `Adjuntos/ERROR_${adj.nombre}.txt` });
                }
            }
        }

        archive.finalize();
        return archive;
    }

    /**
     * Update classification manually and retrain AI
     */
    async updateClassification(id: string, newCategory: string): Promise<CorreoJuridico> {
        const correo = await this.correoRepo.findOne({ where: { id } });
        if (!correo) throw new NotFoundException('Correo no encontrado');

        correo.categoria = newCategory;
        correo.isTrained = true;

        // Also update 'tipo' if necessary mapping is clear
        if (newCategory === 'JUDICIAL') correo.tipo = 'JUDICIAL';
        else if (newCategory === 'OFICIO') correo.tipo = 'OFICIO';
        // else keep existing tipo or map to CORREO? Better trust the user correction on category.

        const updated = await this.correoRepo.save(correo);

        // Retrain AI
        const text = `${correo.asunto} ${correo.cuerpoTexto || ''}`;
        await this.smartService.train(text, newCategory);

        return updated;
    }

    /**
     * Link email to an expediente
     * Creates an Actuacion automatically to ensure visibility in legal process
     */
    async linkToProcess(id: string, expedienteId: string, targetModule?: string): Promise<CorreoJuridico> {
        const correo = await this.correoRepo.findOne({ where: { id } });
        if (!correo) throw new NotFoundException('Correo no encontrado');

        // 1. Update Email relation
        correo.expedienteId = expedienteId;
        // Optional: Save targetModule in email if column exists? Not for now.
        const savedCorreo = await this.correoRepo.save(correo);

        // 2. Create Actuacion
        try {
            const adjuntos = await this.adjuntoRepo.find({ where: { correoId: id } });
            let documentoUrl: string | undefined = undefined;
            let documentoNombre: string | undefined = undefined;

            if (adjuntos.length > 0) {
                documentoUrl = `/legal/api/v1/correos/adjuntos/${adjuntos[0].id}/download`;
                documentoNombre = adjuntos[0].nombre;
            }

            const descripcionDetallada = `${correo.asunto} - REMITENTE: ${correo.remitenteNombre || correo.remitenteEmail} - RECIBIDO`;

            // If target is DISCIPLINARIO, we might need a specific handling if the system separates tables.
            // For now, assuming ActuacionService handles 'expedienteId' universally (since UUIDs are unique)
            // But we will add it to metadata to be sure.

            await this.actuacionService.registrarActuacion(expedienteId, {
                tipoActuacion: 'OFICIO',
                descripcion: descripcionDetallada,
                fechaActuacion: correo.fechaRecepcion,
                origen: 'OFICIO',
                referenciaId: correo.id,
                documentoUrl: documentoUrl,
                documentoNombre: documentoNombre,
                metadata: {
                    remitente: correo.remitenteNombre || correo.remitenteEmail,
                    destinatarios: correo.destinatarios,
                    source: 'EMAIL_LINK',
                    targetModule: targetModule || 'DEFENSA_JUDICIAL'
                },
                usuarioResponsable: 'Sistema (Vinculación Automática)'
            });

            this.logger.log(`Actuacion created for linked email ${id} in expediente ${expedienteId} (Module: ${targetModule})`);

        } catch (error) {
            this.logger.error(`Error creating atuacion for linked email ${id}`, error);
            // Non-blocking error
        }

        return savedCorreo;
    }

    /**
     * Batch Backfill: Classify unclassified emails
     * @param limit Number of emails to process in this run
     */
    async batchClassifyBackfill(limit: number = 50): Promise<{ processed: number; updated: number }> {
        this.logger.log(`Starting Batch Backfill for ${limit} emails...`);

        // 1. Fetch unclassified emails (where ai_suggested_category is NULL)
        const unclassified = await this.correoRepo.createQueryBuilder('correo')
            .where('correo.aiSuggestedCategory IS NULL')
            .take(limit)
            .getMany();

        this.logger.log(`Found ${unclassified.length} unclassified emails.`);

        let processed = 0;
        let updated = 0;

        for (const email of unclassified) {
            try {
                // 2. Classify
                const classification = await this.smartService.classify(email.asunto || '', email.cuerpoTexto || '');
                const isUrgente = this.smartService.analyzeUrgency(email.asunto || '', email.cuerpoTexto || '');

                // 3. Map to DB fields
                let tipoDB = 'CORREO';
                if (classification.category === 'JUDICIAL') tipoDB = 'JUDICIAL';
                if (classification.category === 'OFICIO') tipoDB = 'OFICIO';
                // Keep existing 'tipo' if it was manually set? 
                // Assumption: Backfill overwrites or fills initial classification.
                // Safest: Update tipo only if it's currently generic 'CORREO'
                if (email.tipo === 'CORREO' && tipoDB !== 'CORREO') {
                    email.tipo = tipoDB;
                }

                email.categoria = classification.category;
                email.aiSuggestedCategory = classification.category;
                email.moduloSugerido = classification.module;
                email.confianzaClasificacion = classification.confidence;
                email.urgente = isUrgente;

                await this.correoRepo.save(email);
                updated++;
                processed++;
            } catch (error) {
                this.logger.error(`Error classifying email ${email.id} during backfill:`, error);
                processed++; // Count as processed (attempted)
            }
        }

        this.logger.log(`Batch Backfill complete. Updated ${updated}/${processed} emails.`);
        return { processed, updated };
    }
}

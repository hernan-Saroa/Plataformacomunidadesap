import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { CorreoJuridico } from '../entities/correo-juridico.entity';
import { AdjuntoCorreo } from '../entities/adjunto-correo.entity';
import { CorreoJuridicoHistorial } from '../entities/correo-juridico-historial.entity';
import { CorreoTrackingToken } from '../entities/correo-tracking-token.entity';
import { MicrosoftGraphService, GraphEmail } from './microsoft-graph.service';
import { SmartClassificationService } from './smart-classification.service';
import { randomUUID } from 'crypto';

export interface EmailFilters {
    tipo?: string;
    leido?: boolean;
    urgente?: boolean;
    archivado?: boolean;
    direccion?: string;
    search?: string;
    expedienteId?: string;
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
        @InjectRepository(CorreoJuridicoHistorial)
        private readonly historialRepo: Repository<CorreoJuridicoHistorial>,
        @InjectRepository(CorreoTrackingToken)
        private readonly trackingRepo: Repository<CorreoTrackingToken>,
        private readonly graphService: MicrosoftGraphService,
        private readonly smartService: SmartClassificationService,
        private readonly actuacionService: ActuacionService,
    ) { }

    /**
     * Registra una acción en el historial del correo
     */
    async registrarAccion(correoId: string, tipoEvento: string, descripcion: string, usuario: string = 'Sistema', detalleJson: any = null): Promise<void> {
        try {
            const registro = this.historialRepo.create({
                correoJuridicoId: correoId,
                tipoEvento,
                descripcion,
                usuario,
                detalleJson
            });
            await this.historialRepo.save(registro);
            this.logger.log(`📱 Historial guardado [${tipoEvento}] para correo ${correoId}`);
        } catch (error) {
            this.logger.error(`Error guardando historial para correo ${correoId}:`, error);
        }
    }

    /**
     * Obtiene el historial de acciones de un correo jurídico
     */
    async getHistorial(correoJuridicoId: string): Promise<CorreoJuridicoHistorial[]> {
        try {
            return await this.historialRepo
                .createQueryBuilder('h')
                .where('h.correoJuridicoId = :correoJuridicoId', { correoJuridicoId })
                .orderBy('h.fechaCreacion', 'DESC')
                .getMany();
        } catch (error) {
            this.logger.error(`Error fetching historial for correo ${correoJuridicoId}:`, error);
            return [];
        }
    }

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
                        // Inherit thread context if available
                        let inheritsThread = false;
                        let inheritedExpedienteId: string | undefined = undefined;
                        let tipoDB = 'CORREO';
                        let categoriaStr = 'General';
                        let moduleStr = 'CENTRO_COMUNICACIONES';
                        let confidenceNum = 1.0;

                        if (email.conversationId) {
                            const parentEmail = await this.correoRepo.findOne({
                                where: { threadId: email.conversationId },
                                order: { fechaRecepcion: 'DESC' }
                            });

                            if (parentEmail && (parentEmail.expedienteId || parentEmail.tipo === 'OFICIO' || parentEmail.tipo === 'JUDICIAL')) {
                                inheritsThread = true;
                                inheritedExpedienteId = parentEmail.expedienteId || undefined;
                                tipoDB = parentEmail.tipo;
                                categoriaStr = parentEmail.categoria || 'Historial';
                                moduleStr = parentEmail.moduloSugerido || 'DEFENSA_JUDICIAL';
                                this.logger.log(`Inheriting context from thread ${email.conversationId}: Tipo=${tipoDB}, Expediente=${inheritedExpedienteId}`);
                            }
                        }

                        let isUrgente = false;

                        if (!inheritsThread) {
                            // Classify the email (AI)
                            const classification = await this.smartService.classify(email.subject || '', email.bodyPreview || '', email.hasAttachments || false);
                            isUrgente = this.smartService.analyzeUrgency(email.subject || '', email.bodyPreview || '');

                            // Map AI specific category to DB generic Type
                            if (classification.category === 'JUDICIAL') tipoDB = 'JUDICIAL';
                            if (classification.category === 'OFICIO') tipoDB = 'OFICIO';

                            categoriaStr = classification.category;
                            moduleStr = classification.module;
                            confidenceNum = classification.confidence;
                        } else {
                            // Even if inheriting, we can check urgency
                            isUrgente = this.smartService.analyzeUrgency(email.subject || '', email.bodyPreview || '');
                        }

                        // Extract NLP entities
                        const entities = this.smartService.extractEntities(email.subject || '', email.bodyPreview || '');

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
                            categoria: categoriaStr,
                            moduloSugerido: moduleStr,
                            confianzaClasificacion: confidenceNum,
                            aiSuggestedCategory: categoriaStr,
                            isTrained: false,
                            expedienteId: inheritedExpedienteId,
                            // Threading fields
                            internetMessageId: email.internetMessageId || undefined,
                            threadId: email.conversationId || undefined,
                            // NLP entity extraction
                            procesoIdSugerido: entities.procesoId || undefined,
                            implicadoSugerido: entities.implicado || undefined,
                            submoduloSugerido: entities.submodulo || undefined,
                        });

                        const savedCorreo = await this.correoRepo.save(newCorreo);
                        this.registrarAccion(savedCorreo.id, 'RECIBIDO', 'Correo sincronizado desde Microsoft Graph');
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

        if (filters?.expedienteId) {
            where.expedienteId = filters.expedienteId;
        }

        if (filters?.direccion) {
            where.direccion = filters.direccion;
        }

        const correos = await this.correoRepo.find({
            where,
            order: { fechaRecepcion: 'DESC' },
            relations: ['adjuntos']
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

        // Resolve inline images (cid: references) to base64 data URLs
        if (correo.cuerpoHtml && correo.graphMessageId && /src="cid:/i.test(correo.cuerpoHtml)) {
            try {
                correo.cuerpoHtml = await this.resolveInlineImages(correo.graphMessageId, correo.cuerpoHtml);
            } catch (error) {
                this.logger.warn(`Could not resolve inline images for email ${id}:`, error);
            }
        }

        return correo;
    }

    /**
     * Replace cid: references in HTML with base64 data URLs from Graph attachments
     */
    private async resolveInlineImages(graphMessageId: string, html: string): Promise<string> {
        const attachments = await this.graphService.getAttachments(graphMessageId);
        if (!attachments || attachments.length === 0) return html;

        let processedHtml = html;
        for (const att of attachments) {
            // Graph inline attachments have contentId (sometimes without angle brackets)
            const contentId = (att as any).contentId;
            if (!contentId || !att.contentBytes) continue;

            // Clean contentId (remove angle brackets if present)
            const cleanCid = contentId.replace(/^<|>$/g, '');
            const contentType = att.contentType || 'image/png';
            const dataUrl = `data:${contentType};base64,${att.contentBytes}`;

            // Replace all variations: cid:xxx, cid:<xxx>
            processedHtml = processedHtml
                .replace(new RegExp(`src="cid:${cleanCid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'gi'), `src="${dataUrl}"`)
                .replace(new RegExp(`src='cid:${cleanCid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'gi'), `src='${dataUrl}'`);
        }

        return processedHtml;
    }

    /**
     * Mark email as read in both DB and Graph
     */
    async markAsRead(id: string): Promise<CorreoJuridico> {
        const correo = await this.correoRepo.findOne({ where: { id } });

        if (!correo) {
            throw new NotFoundException(`Correo ${id} not found`);
        }

        // Update in Graph (best-effort, may fail if Mail.ReadWrite permission is missing)
        if (correo.graphMessageId) {
            try {
                await this.graphService.markAsRead(correo.graphMessageId);
            } catch (error) {
                this.logger.warn(`Graph markAsRead failed for ${id} (permission issue?), DB update continues`);
            }
        }

        // Update in DB (always succeeds regardless of Graph)
        correo.leido = true;
        const saved = await this.correoRepo.save(correo);
        await this.registrarAccion(correo.id, 'LEIDO', 'Correo marcado como leído');
        return saved;
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
        const saved = await this.correoRepo.save(correo);
        await this.registrarAccion(correo.id, 'ARCHIVADO', 'Correo archivado en el sistema');
        return saved;
    }

    /**
     * Unarchive email - restores it to its original location
     */
    async unarchive(id: string): Promise<CorreoJuridico> {
        const correo = await this.correoRepo.findOne({ where: { id } });

        if (!correo) {
            throw new NotFoundException(`Correo ${id} not found`);
        }

        correo.archivado = false;
        const saved = await this.correoRepo.save(correo);
        await this.registrarAccion(correo.id, 'DESARCHIVADO', 'Correo restaurado de archivo');
        return saved;
    }

    /**
     * Send an email via Graph API and save record in DB
     */
    async sendEmail(dto: SendEmailDto): Promise<{ success: boolean; correo?: CorreoJuridico }> {
        let finalBody = dto.body;
        const inlineAttachments: any[] = [];
        const largeAttachments: any[] = [];
        const fs = require('fs');
        const path = require('path');

        // Extract and sort attachments by size
        if (dto.attachments && dto.attachments.length > 0) {
            for (const att of dto.attachments) {
                const buffer = Buffer.from(att.contentBytes, 'base64');
                // 2.5MB limit for inline Graph API attachments (to avoid 413 Payload Too Large)
                if (buffer.length > 2.5 * 1024 * 1024) {
                    largeAttachments.push({ att, buffer });
                } else {
                    inlineAttachments.push(att);
                }
            }
        }

        // Handle large attachments by saving locally and appending links
        if (largeAttachments.length > 0) {
            finalBody += '<br><br><div style="margin-top:20px; padding:15px; border:1px solid #e2e8f0; border-radius:8px; background-color:#f8fafc;">';
            finalBody += '<h4 style="margin-top:0; color:#0f172a; font-family:sans-serif;">Archivos Adjuntos Pesados</h4>';
            finalBody += '<ul style="font-family:sans-serif; color:#334155; margin-bottom:0;">';

            const uploadsDir = path.join(process.cwd(), 'uploads', 'adjuntos');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            for (const { att, buffer } of largeAttachments) {
                const safeName = att.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const uniqueFilename = `sent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${safeName}`;
                const filepath = path.join(uploadsDir, uniqueFilename);
                fs.writeFileSync(filepath, buffer);

                // Construct the download link using the API Gateway URL 
                // Ensure this points to the external reachable API if available, else fallback to localhost
                const baseUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';
                const downloadLink = `${baseUrl}/legal/api/v1/correos/adjuntos/local/${uniqueFilename}/download`;

                finalBody += `<li><a href="${downloadLink}" target="_blank" style="color:#2563eb; text-decoration:none;">Descargar ${att.name}</a> (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)</li>`;
            }
            finalBody += '</ul></div>';
        }

        const sent = await this.graphService.sendEmail(
            dto.to,
            dto.subject,
            finalBody,
            dto.cc,
            inlineAttachments
        );

        if (!sent) {
            return { success: false };
        }

        // Save sent email record in DB
        try {
            const newCorreo = this.correoRepo.create({
                graphMessageId: `sent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                asunto: dto.subject || '(Sin asunto)',
                remitenteEmail: 'oficina.juridica@esap.edu.co',
                remitenteNombre: 'Oficina Jurídica ESAP',
                destinatariosTo: dto.to,
                destinatarios: dto.cc ? JSON.stringify(dto.cc) : undefined,
                fechaRecepcion: new Date(),
                cuerpoHtml: dto.body,
                cuerpoTexto: dto.body?.replace(/<[^>]*>/g, '') || '',
                tieneAdjuntos: !!(dto.attachments && dto.attachments.length > 0),
                leido: true,
                archivado: false,
                urgente: false,
                tipo: 'CORREO',
                direccion: 'ENVIADO',
                categoria: 'ENVIADO',
                expedienteId: undefined,
            });

            const savedCorreo = await this.correoRepo.save(newCorreo);
            // ── Trazabilidad: Registrar ENVIADO en timeline ──
            await this.registrarAccion(savedCorreo.id, 'ENVIADO', `Correo enviado a ${dto.to}`, 'Sistema');
            // ── Tracking: Inyectar pixel y links trackeados ──
            await this.injectTrackingIntoEmail(savedCorreo, dto.to as string);
            this.logger.log(`Sent email saved to DB: ${savedCorreo.id} -> ${dto.to}`);
            return { success: true, correo: savedCorreo };
        } catch (dbError) {
            this.logger.error('Error saving sent email to DB (email was sent successfully):', dbError);
            return { success: true };
        }
    }

    /**
     * Reply to an email — maintains thread via Graph API
     */
    async replyEmail(correoId: string, body: string, attachments?: { name: string; contentBytes: string; contentType: string }[]): Promise<{ success: boolean; correo?: CorreoJuridico }> {
        const original = await this.correoRepo.findOne({ where: { id: correoId } });
        if (!original) throw new NotFoundException('Correo original no encontrado');

        // Send reply via Graph API (sendMail — only requires Mail.Send permission)
        const replySubject = original.asunto.startsWith('RE:') ? original.asunto : `RE: ${original.asunto}`;
        const sent = await this.graphService.replyToEmail(original.graphMessageId, body, attachments, original.remitenteEmail, replySubject);
        if (!sent) return { success: false };

        // Save reply record in DB
        try {
            const replyCorreo = this.correoRepo.create({
                graphMessageId: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                asunto: original.asunto.startsWith('RE:') ? original.asunto : `RE: ${original.asunto}`,
                remitenteEmail: 'oficina.juridica@esap.edu.co',
                remitenteNombre: 'Oficina Jurídica ESAP',
                destinatariosTo: original.remitenteEmail,
                destinatarios: original.destinatarios,
                fechaRecepcion: new Date(),
                cuerpoHtml: body,
                cuerpoTexto: body?.replace(/<[^>]*>/g, '') || '',
                tieneAdjuntos: !!(attachments && attachments.length > 0),
                leido: true,
                archivado: false,
                urgente: false,
                tipo: original.tipo,
                direccion: 'ENVIADO',
                categoria: 'RESPUESTA',
                parentEmailId: original.id,
                threadId: original.threadId,
                expedienteId: original.expedienteId,
            });

            const savedReply = await this.correoRepo.save(replyCorreo);

            // Mark original as replied
            original.isReplied = true;
            await this.correoRepo.save(original);
            await this.registrarAccion(original.id, 'RESPONDIDO', `Respuesta enviada (${savedReply.id})`);
            // ── Trazabilidad: Registrar ENVIADO en la respuesta ──
            await this.registrarAccion(savedReply.id, 'ENVIADO', `Respuesta enviada a ${original.remitenteEmail}`, 'Sistema');
            await this.injectTrackingIntoEmail(savedReply, original.remitenteEmail);

            this.logger.log(`Reply saved: ${savedReply.id} -> parent: ${original.id}`);
            return { success: true, correo: savedReply };
        } catch (dbError) {
            this.logger.error('Error saving reply to DB (reply was sent successfully):', dbError);
            return { success: true };
        }
    }

    /**
     * Forward an email.
     * Graph native forward automatically includes original attachments.
     * Any additional attachments uploaded by the user are sent via a separate
     * sendMail call so they arrive alongside the forwarded thread.
     */
    async forwardEmail(
        correoId: string,
        to: string,
        comment: string,
        additionalAttachments?: { name: string; contentBytes: string; contentType: string }[],
    ): Promise<{ success: boolean; correo?: CorreoJuridico }> {
        const original = await this.correoRepo.findOne({ where: { id: correoId }, relations: ['adjuntos'] });
        if (!original) throw new NotFoundException('Correo original no encontrado');

        // Build comment that includes original body so the recipient sees both
        const fullComment = this.buildForwardComment(comment, original);

        // Send the native Graph forward — this carries the original body + original attachments
        const sent = await this.graphService.forwardEmail(original.graphMessageId, to, fullComment);
        if (!sent) return { success: false };

        // If the user also uploaded new attachments, send them in a companion email
        // referencing the same thread so they are grouped together.
        if (additionalAttachments && additionalAttachments.length > 0) {
            const companionSubject = original.asunto.startsWith('RV:') || original.asunto.startsWith('FW:')
                ? original.asunto
                : `RV: ${original.asunto}`;

            const companionBody = `
                <p>Adjuntos adicionales del reenvío:</p>
                <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555;">
                    ${fullComment.replace(/\n/g, '<br/>')}
                </blockquote>
            `;

            await this.graphService.sendEmail(to, companionSubject, companionBody, [], additionalAttachments);
        }

        // Persist the forward record in DB
        try {
            const hasExtraAttachments = (additionalAttachments?.length ?? 0) > 0;
            const forwardCorreo = this.correoRepo.create({
                graphMessageId: `fwd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                asunto: original.asunto.startsWith('RV:') || original.asunto.startsWith('FW:') ? original.asunto : `RV: ${original.asunto}`,
                remitenteEmail: 'oficina.juridica@esap.edu.co',
                remitenteNombre: 'Oficina Jurídica ESAP',
                destinatariosTo: to,
                fechaRecepcion: new Date(),
                cuerpoHtml: fullComment,
                cuerpoTexto: comment,
                // Original attachments go via Graph; flag reflects both sources
                tieneAdjuntos: original.tieneAdjuntos || hasExtraAttachments,
                leido: true,
                archivado: false,
                urgente: original.urgente,
                tipo: 'CORREO',
                direccion: 'ENVIADO',
                categoria: 'REENVIO',
                parentEmailId: original.id,
                threadId: original.threadId,
                expedienteId: original.expedienteId,
            });

            const savedForward = await this.correoRepo.save(forwardCorreo);

            // Mark original as forwarded
            original.isForwarded = true;
            await this.correoRepo.save(original);

            const adjuntosDesc = hasExtraAttachments
                ? `Correo reenviado a ${to} (con ${additionalAttachments!.length} adjunto(s) adicional(es))`
                : `Correo reenviado a ${to}`;
            await this.registrarAccion(original.id, 'REENVIADO', adjuntosDesc);
            // ── Trazabilidad: Registrar ENVIADO en el reenvío ──
            await this.registrarAccion(savedForward.id, 'ENVIADO', `Reenvío enviado a ${to}`, 'Sistema');
            await this.injectTrackingIntoEmail(savedForward, to);

            this.logger.log(`Forward saved: ${savedForward.id} -> parent: ${original.id}`);
            return { success: true, correo: savedForward };
        } catch (dbError) {
            this.logger.error('Error saving forward to DB (forward was sent successfully):', dbError);
            return { success: true };
        }
    }

    /**
     * Builds a plain-text comment for Graph forward that includes the original body
     * so the recipient sees the user comment + the full original content.
     */
    private buildForwardComment(userComment: string, original: CorreoJuridico): string {
        const formattedDate = new Intl.DateTimeFormat('es-CO', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        }).format(new Date(original.fechaRecepcion));

        const originalText = original.cuerpoTexto || '';

        return [
            userComment,
            '',
            '─'.repeat(60),
            `De: ${original.remitenteNombre || original.remitenteEmail}`,
            `Fecha: ${formattedDate}`,
            `Asunto: ${original.asunto}`,
            '─'.repeat(60),
            originalText,
        ].join('\n');
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

        // ── Trazabilidad: Registrar DOCUMENTO_ABIERTO (tracking interno) ──
        this.registrarAccion(
            adjunto.correoId,
            'DOCUMENTO_ABIERTO',
            `Documento "${adjunto.nombre}" descargado/abierto desde la plataforma`,
            'Usuario plataforma',
            { adjuntoId: adjunto.id, nombreDocumento: adjunto.nombre }
        ).catch(() => {});

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
        await this.registrarAccion(correo.id, 'CLASIFICADO_MANUAL', `Clasificación manual: ${newCategory}`);

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
        await this.registrarAccion(correo.id, 'ASOCIADO_PROCESO', `Asociado al proceso: ${expedienteId}`);

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
                const classification = await this.smartService.classify(email.asunto || '', email.cuerpoTexto || '', email.tieneAdjuntos || false);
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

    /**
     * Reclassify ALL incoming emails with updated heuristics
     * Skips manually-trained emails (isTrained = true) and sent emails
     */
    async reclassifyAll(): Promise<{ processed: number; updated: number; unchanged: number }> {
        this.logger.log('Starting FULL reclassification with updated heuristics...');

        const allEmails = await this.correoRepo.find({
            where: { direccion: 'ENTRANTE' },
            order: { fechaRecepcion: 'DESC' },
        });

        this.logger.log(`Found ${allEmails.length} incoming emails to reclassify.`);

        let processed = 0;
        let updated = 0;
        let unchanged = 0;

        for (const email of allEmails) {
            try {
                // Skip manually corrected emails
                if (email.isTrained) {
                    unchanged++;
                    processed++;
                    continue;
                }

                const classification = await this.smartService.classify(email.asunto || '', email.cuerpoTexto || '', email.tieneAdjuntos || false);
                const isUrgente = this.smartService.analyzeUrgency(email.asunto || '', email.cuerpoTexto || '');
                const entities = this.smartService.extractEntities(email.asunto || '', email.cuerpoTexto || '');

                let tipoDB = 'CORREO';
                if (classification.category === 'JUDICIAL') tipoDB = 'JUDICIAL';
                if (classification.category === 'OFICIO') tipoDB = 'OFICIO';

                const oldTipo = email.tipo;

                email.tipo = tipoDB;
                email.categoria = classification.category;
                email.aiSuggestedCategory = classification.category;
                email.moduloSugerido = classification.module;
                email.confianzaClasificacion = classification.confidence;
                email.urgente = isUrgente;
                email.procesoIdSugerido = entities.procesoId || email.procesoIdSugerido;
                email.implicadoSugerido = entities.implicado || email.implicadoSugerido;
                email.submoduloSugerido = entities.submodulo || email.submoduloSugerido;

                await this.correoRepo.save(email);

                if (oldTipo !== tipoDB) {
                    updated++;
                    this.logger.debug(`Reclassified: "${email.asunto?.substring(0, 40)}..." ${oldTipo} → ${tipoDB}`);
                } else {
                    unchanged++;
                }
                processed++;
            } catch (error) {
                this.logger.error(`Error reclassifying email ${email.id}:`, error);
                processed++;
            }
        }

        this.logger.log(`Reclassification complete. Processed: ${processed}, Changed: ${updated}, Unchanged: ${unchanged}`);
        return { processed, updated, unchanged };
    }

    // ===================================================================
    //  TRACKING: Trazabilidad de apertura de correos y documentos
    // ===================================================================

    /**
     * Inyecta pixel de tracking y convierte adjuntos a links con token en el HTML guardado.
     * Se llama después de guardar un correo enviado/respondido/reenviado.
     */
    private async injectTrackingIntoEmail(correo: CorreoJuridico, destinatarioEmail: string): Promise<void> {
        try {
            const baseUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';
            let htmlBody = correo.cuerpoHtml || correo.cuerpoTexto || '';

            // 1. Crear token para pixel de apertura
            const pixelToken = randomUUID();
            const pixelTracking = this.trackingRepo.create({
                correoId: correo.id,
                token: pixelToken,
                tipo: 'OPEN_PIXEL',
                destinatarioEmail,
            });
            await this.trackingRepo.save(pixelTracking);

            // Inyectar pixel invisible al final del HTML
            const pixelUrl = `${baseUrl}/legal/api/v1/correos/track/open/${pixelToken}?_=${Date.now()}`;
            const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" style="display:none;opacity:0;height:0;width:0;" alt="" />`;

            // 2. Crear tokens para cada adjunto del correo
            const adjuntos = await this.adjuntoRepo.find({ where: { correoId: correo.id } });

            if (adjuntos.length > 0) {
                let linksHtml = '<br/><div style="margin-top:16px;padding:16px;border:1px solid #e2e8f0;border-radius:8px;background-color:#f8fafc;font-family:sans-serif;">';
                linksHtml += '<h4 style="margin-top:0;color:#003DA5;font-size:14px;">📎 Documentos Adjuntos</h4>';
                linksHtml += '<ul style="padding-left:18px;margin-bottom:0;">';

                for (const adj of adjuntos) {
                    const downloadToken = randomUUID();
                    const dlTracking = this.trackingRepo.create({
                        correoId: correo.id,
                        adjuntoId: adj.id,
                        token: downloadToken,
                        tipo: 'DOWNLOAD_LINK',
                        destinatarioEmail,
                    });
                    await this.trackingRepo.save(dlTracking);

                    const downloadUrl = `${baseUrl}/legal/api/v1/correos/track/download/${downloadToken}`;
                    const sizeMB = (adj.tamanio / (1024 * 1024)).toFixed(2);
                    linksHtml += `<li style="margin-bottom:6px;"><a href="${downloadUrl}" target="_blank" style="color:#2563eb;text-decoration:none;font-weight:600;">${adj.nombre}</a> <span style="color:#64748b;font-size:12px;">(${sizeMB} MB)</span></li>`;
                }

                linksHtml += '</ul></div>';
                htmlBody += linksHtml;
            }

            // Agregar pixel al final
            htmlBody += pixelHtml;

            // Guardar el HTML actualizado
            correo.cuerpoHtml = htmlBody;
            await this.correoRepo.save(correo);

            this.logger.log(`📡 Tracking inyectado para correo ${correo.id}: pixel=${pixelToken}, adjuntos=${adjuntos.length}`);
        } catch (error) {
            this.logger.error(`Error inyectando tracking en correo ${correo.id}:`, error);
            // Non-blocking
        }
    }

    /**
     * Procesa la apertura del pixel de tracking (llamado por GET /track/open/:token)
     */
    async processTrackingPixel(token: string, ip: string, userAgent: string): Promise<void> {
        try {
            const tracking = await this.trackingRepo.findOne({ where: { token, tipo: 'OPEN_PIXEL' } });
            if (!tracking) return;

            // Registrar solo la primera apertura como evento principal
            const isFirstOpen = !tracking.abierto;

            tracking.abierto = true;
            tracking.fechaApertura = tracking.fechaApertura || new Date();
            tracking.ipApertura = ip;
            tracking.userAgent = userAgent;
            await this.trackingRepo.save(tracking);

            if (isFirstOpen) {
                await this.registrarAccion(
                    tracking.correoId,
                    'CORREO_ABIERTO_EXTERNO',
                    `El destinatario (${tracking.destinatarioEmail || 'externo'}) abrió el correo`,
                    'Destinatario externo',
                    { ip, userAgent: userAgent?.substring(0, 200), token }
                );
                this.logger.log(`📬 Tracking pixel activado para correo ${tracking.correoId} (IP: ${ip})`);
            }
        } catch (error) {
            this.logger.error(`Error procesando tracking pixel ${token}:`, error);
        }
    }

    /**
     * Procesa la descarga trackeada de un documento (llamado por GET /track/download/:token)
     * Retorna el archivo para que el controller lo sirva al usuario.
     */
    async processTrackingDownload(token: string, ip: string, userAgent: string): Promise<{
        name: string;
        contentType: string;
        contentBytes: string;
    } | null> {
        try {
            const tracking = await this.trackingRepo.findOne({ where: { token, tipo: 'DOWNLOAD_LINK' } });
            if (!tracking || !tracking.adjuntoId) return null;

            // Registrar apertura
            const isFirstOpen = !tracking.abierto;
            tracking.abierto = true;
            tracking.fechaApertura = tracking.fechaApertura || new Date();
            tracking.ipApertura = ip;
            tracking.userAgent = userAgent;
            await this.trackingRepo.save(tracking);

            // Buscar el adjunto
            const adjunto = await this.adjuntoRepo.findOne({ where: { id: tracking.adjuntoId } });
            if (!adjunto) return null;

            if (isFirstOpen) {
                await this.registrarAccion(
                    tracking.correoId,
                    'DOCUMENTO_ABIERTO_EXTERNO',
                    `El destinatario (${tracking.destinatarioEmail || 'externo'}) abrió el documento "${adjunto.nombre}"`,
                    'Destinatario externo',
                    { ip, adjuntoId: adjunto.id, nombreDocumento: adjunto.nombre, token }
                );
                this.logger.log(`📄 Tracking download activado para adjunto ${adjunto.nombre} (correo ${tracking.correoId})`);
            }

            // Descargar y servir el archivo
            const attachment = await this.downloadAttachment(tracking.adjuntoId);
            return attachment;
        } catch (error) {
            this.logger.error(`Error procesando tracking download ${token}:`, error);
            return null;
        }
    }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { CorreoJuridico } from '../entities/correo-juridico.entity';
import { AdjuntoCorreo } from '../entities/adjunto-correo.entity';
import { CorreoJuridicoHistorial } from '../entities/correo-juridico-historial.entity';
import { CorreoTrackingToken } from '../entities/correo-tracking-token.entity';
import { Documento } from '../entities/documento.entity';
import { DocumentoConsulta } from '../entities/documento-consulta.entity';
import { Expediente } from '../entities/expediente.entity';
import { ConsultaJuridica } from '../entities/consulta-juridica.entity';
import { MicrosoftGraphService, GraphEmail } from './microsoft-graph.service';
import { SmartClassificationService } from './smart-classification.service';
import { NotificationClientService } from './notification-client.service';
import { randomUUID } from 'crypto';

export interface EmailFilters {
    tipo?: string;
    leido?: boolean;
    urgente?: boolean;
    archivado?: boolean;
    direccion?: string;
    search?: string;
    expedienteId?: string;
    buzon?: string; // JUDICIAL | CORREOS
}

export interface EmailClassification {
    tipo: 'JUDICIAL' | 'CORREO' | 'OFICIO';
    categoria: string;
    moduloSugerido: string;
    urgente: boolean;
    confianza: number;
}

export interface SendEmailDto {
    to: string | string[];
    cc?: string[];
    bcc?: string[]; // Copia Oculta (CCO) — destinatarios no visibles para los demás
    subject: string;
    body: string;
    attachments?: { name: string; contentBytes: string; contentType: string }[];
    requestReadReceipt?: boolean;
    requestDeliveryReceipt?: boolean;
    buzon?: string; // JUDICIAL | CORREOS — cuenta remitente según el tab
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
        @InjectRepository(Documento)
        private readonly documentoRepo: Repository<Documento>,
        @InjectRepository(DocumentoConsulta)
        private readonly documentoConsultaRepo: Repository<DocumentoConsulta>,
        @InjectRepository(Expediente)
        private readonly expedienteRepo: Repository<Expediente>,
        @InjectRepository(ConsultaJuridica)
        private readonly consultaRepo: Repository<ConsultaJuridica>,
        private readonly graphService: MicrosoftGraphService,
        private readonly smartService: SmartClassificationService,
        private readonly actuacionService: ActuacionService,
        private readonly notificationClient: NotificationClientService,
    ) { }

    /**
     * Notifica al JEFE_GESTION_LEGAL cuando un destinatario externo abre por primera vez
     * un correo enviado desde la plataforma (acuse de recibido automático).
     */
    private async notificarAcuseDeRecibido(correoId: string, destinatarioEmail?: string): Promise<void> {
        try {
            const correo = await this.correoRepo.findOne({ where: { id: correoId } });
            if (!correo) return;

            // Solo notificar para correos ENVIADOS desde la plataforma
            if (correo.direccion !== 'ENVIADO') return;

            const destinatario = destinatarioEmail || correo.destinatariosTo || 'destinatario externo';
            const remitente = correo.remitenteNombre || correo.remitenteEmail || 'Oficina Jurídica';
            const fechaEnvio = correo.fechaRecepcion
                ? new Date(correo.fechaRecepcion).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
                : 'N/A';
            const fechaApertura = new Date().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

            const urlAccion = `/gestion-legal?modulo=comunicaciones&correoId=${encodeURIComponent(correoId)}`;

            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px; background: #ffffff;">
                    <div style="border-left: 4px solid #10B981; padding-left: 16px; margin-bottom: 20px;">
                        <h2 style="color: #003DA5; margin: 0 0 4px;">📬 Acuse de Recibido</h2>
                        <p style="color: #6b7280; margin: 0; font-size: 14px;">El destinatario ha abierto el correo enviado desde la plataforma</p>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 13px; width: 40%;">Destinatario:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 13px; font-weight: 600;">${destinatario}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Asunto:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 13px; font-weight: 600;">${correo.asunto || '(Sin asunto)'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Enviado por:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 13px;">${remitente}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Fecha de envío:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 13px;">${fechaEnvio}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Fecha de apertura:</td>
                            <td style="padding: 8px 0; color: #10B981; font-size: 13px; font-weight: 600;">${fechaApertura}</td>
                        </tr>
                    </table>
                    <p style="color: #6b7280; font-size: 12px; margin: 16px 0 0; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                        Este es un mensaje automático generado por el sistema de Gestión Legal SIGL.
                    </p>
                </div>
            `;

            await this.notificationClient.notifyByRoles(
                ['JEFE_GESTION_LEGAL'],
                {
                    tipo_notificacion: 'ACUSE_RECIBIDO_CORREO',
                    titulo: '📬 Acuse de recibido',
                    mensaje: `${destinatario} ha recibido y abierto el correo "${correo.asunto || '(Sin asunto)'}"`,
                    descripcion_corta: `Correo abierto: ${(correo.asunto || '').substring(0, 60)}`,
                    icono: 'MailCheck',
                    color: '#10B981',
                    prioridad: 'Media',
                    categoria: 'gestion-legal',
                    tiene_accion: true,
                    texto_boton_accion: 'Ver correo',
                    url_accion: urlAccion,
                    datos_adicionales: {
                        correoId,
                        destinatario,
                        asunto: correo.asunto,
                        fechaApertura: new Date().toISOString(),
                    },
                },
                {
                    subject: `Acuse de recibido: ${correo.asunto || '(Sin asunto)'}`,
                    html: emailHtml,
                },
            );

            this.logger.log(`✅ Acuse de recibido notificado a JEFE_GESTION_LEGAL para correo ${correoId}`);
        } catch (error: any) {
            this.logger.error(`Error notificando acuse de recibido para correo ${correoId}: ${error?.message}`);
        }
    }

    /**
     * Obtiene la URL base para tracking (pixel + links de descarga).
     *
     * Los enlaces se envían por correo a destinatarios externos, por lo que DEBEN
     * apuntar al host público del ambiente donde está desplegada la app — nunca a
     * `localhost` ni a un host interno de Docker (que solo resuelven en el servidor).
     *
     * Para que funcione en CUALQUIER ambiente/despliegue sin configuración manual,
     * el host se resuelve de forma dinámica en este orden de prioridad:
     *   1. TRACKING_PUBLIC_URL — override explícito por ambiente (si se define).
     *   2. El origen público de la request que disparó el envío (cabecera Origin /
     *      Referer / X-Forwarded-Proto+Host). El frontend siempre llega al backend
     *      a través de nginx en `/services/*`, así que este origen es exactamente el
     *      host que el destinatario también puede alcanzar. Funciona en dev-server,
     *      QA, pre y prod por igual, sin depender de env vars por servicio.
     *   3. CORS_ORIGIN — fallback de configuración.
     *   4. localhost:PORT — último recurso solo para desarrollo local directo.
     *
     * En los casos 1-3 la ruta pública pasa por el gateway: nginx recibe `/services/*`
     * y lo reenvía al api-gateway, de ahí a legal-management-service.
     */
    private getTrackingBaseUrl(req?: any): { baseUrl: string; pathPrefix: string } {
        const gatewayPrefix = '/services/legal/api/v1';

        // 1. Override explícito por ambiente
        const explicit = process.env.TRACKING_PUBLIC_URL;
        if (explicit) {
            return { baseUrl: this.normalizeBaseUrl(explicit), pathPrefix: gatewayPrefix };
        }

        // 2. Origen público derivado de la request (dinámico, sirve para todo ambiente)
        const fromRequest = this.resolvePublicOriginFromRequest(req);
        if (fromRequest) {
            return { baseUrl: fromRequest, pathPrefix: gatewayPrefix };
        }

        // 3. Fallback de configuración
        const cors = process.env.CORS_ORIGIN;
        if (cors) {
            return { baseUrl: this.normalizeBaseUrl(cors), pathPrefix: gatewayPrefix };
        }

        // 4. Desarrollo local directo al puerto del servicio (sin proxy)
        const port = process.env.PORT || '3008';
        return { baseUrl: `http://localhost:${port}`, pathPrefix: '' };
    }

    /**
     * Normaliza una URL base: toma la primera si viene lista separada por comas
     * y elimina la barra final para evitar rutas con `//`.
     */
    private normalizeBaseUrl(url: string): string {
        return url.split(',')[0].trim().replace(/\/+$/, '');
    }

    /**
     * Reconstruye el origen público (esquema + host) desde las cabeceras de la
     * request que llegó a través de nginx → api-gateway. Devuelve null si no se
     * puede determinar (p.ej. no hay request, o es un host interno/local).
     */
    private resolvePublicOriginFromRequest(req?: any): string | null {
        if (!req || !req.headers) return null;
        const headers = req.headers;
        const header = (name: string): string | undefined => {
            const v = headers[name] ?? headers[name.toLowerCase()];
            return Array.isArray(v) ? v[0] : v;
        };

        // Filtra hosts que no sirven para un destinatario externo.
        const isUsable = (host: string): boolean => {
            const h = host.toLowerCase();
            return !!h
                && !h.startsWith('localhost')
                && !h.startsWith('127.0.0.1')
                // hosts internos de Docker (ej: api-gateway-pre:3000, legal-management-service:3008)
                && !/^[a-z0-9-]+(-(?:dev|qa|pre|prod))?:\d+$/i.test(h);
        };

        // a) Origin — el más fiable: lo envía el navegador en los POST (send/reply/forward)
        const origin = header('origin');
        if (origin) {
            try {
                const u = new URL(origin);
                if (isUsable(u.host)) return this.normalizeBaseUrl(origin);
            } catch { /* ignore */ }
        }

        // b) X-Forwarded-Proto + X-Forwarded-Host / Host
        const proto = (header('x-forwarded-proto') || '').split(',')[0].trim();
        const fwdHost = (header('x-forwarded-host') || header('host') || '').split(',')[0].trim();
        if (proto && fwdHost && isUsable(fwdHost)) {
            return `${proto}://${fwdHost}`;
        }

        // c) Referer como último intento
        const referer = header('referer');
        if (referer) {
            try {
                const u = new URL(referer);
                if (isUsable(u.host)) return `${u.protocol}//${u.host}`;
            } catch { /* ignore */ }
        }

        return null;
    }

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
     * Detecta si un email es un Delivery Status Notification (DSN), acuse de entrega/lectura,
     * o bounce automático del MTA. Estos correos los genera el servidor (no un humano) y no
     * deben aparecer como comunicaciones reales en la bandeja.
     */
    private esDeliveryReceiptOrDSN(email: any): boolean {
        const subject = (email.subject || '').toLowerCase().trim();
        const fromAddress = (email.from?.emailAddress?.address || '').toLowerCase();
        const fromName = (email.from?.emailAddress?.name || '').toLowerCase();

        // Prefijos típicos de asunto en español e inglés
        const subjectPrefixes = [
            'retransmitido:',
            'relayed:',
            'delivery status notification',
            'undelivered mail',
            'undeliverable',
            'mail delivery failed',
            'failure notice',
            'returned mail',
            'mail delivery subsystem',
            'leído:',
            'read:',
            'no leído:',
            'not read:',
            'acuse de recibo',
            'delivery receipt',
            'read receipt',
            'recibo de entrega',
            'recibo de lectura',
            'sin entregar:',
            'no entregado:',
        ];
        if (subjectPrefixes.some(p => subject.startsWith(p))) {
            return true;
        }

        // Remitentes típicos del MTA
        const senderHints = [
            'mailer-daemon',
            'postmaster@',
            'microsoftexchange',
            'noreply@',
            'no-reply@',
            'donotreply@',
            'do-not-reply@',
        ];
        if (senderHints.some(s => fromAddress.includes(s) || fromName.includes(s))) {
            return true;
        }

        return false;
    }

    /**
     * Sync one page of emails from Microsoft Graph
     * Returns nextLink for pagination
     */
    async syncInbox(nextLink?: string, buzon: string = 'JUDICIAL'): Promise<{ synced: number; errors: number; total: number; nextLink: string | null }> {
        const buzonNorm = String(buzon || 'JUDICIAL').toUpperCase() === 'CORREOS' ? 'CORREOS' : 'JUDICIAL';
        this.logger.log(`Starting inbox sync page for buzón ${buzonNorm} (NextLink provided: ${!!nextLink})...`);

        let synced = 0;
        let errors = 0;

        // Si la cuenta del buzón no está configurada (p. ej. CORREOS aún sin asignar),
        // no se sincroniza: se devuelve vacío sin error (ready to replace).
        if (!this.graphService.isBuzonConfigured(buzonNorm)) {
            this.logger.warn(`Buzón ${buzonNorm} sin cuenta configurada; se omite la sincronización.`);
            return { synced: 0, errors: 0, total: 0, nextLink: null };
        }

        try {
            // Fetch one page (50 emails default) desde la cuenta del buzón
            const account = this.graphService.resolveAccount(buzonNorm);
            const pageResult = await this.graphService.getEmailsPage(nextLink, 50, account);
            const emails = pageResult.emails;
            const newNextLink = pageResult.nextLink;

            this.logger.log(`Retrieved ${emails.length} emails from Graph API`);

            for (const email of emails) {
                try {
                    // Filtrar Delivery Status Notifications (DSN), acuses de lectura/entrega y bounces.
                    // Estos correos los genera automáticamente el MTA y no son comunicaciones reales.
                    if (this.esDeliveryReceiptOrDSN(email)) {
                        this.logger.log(`  ⏭️  DSN/Auto-reply omitido: "${email.subject?.substring(0, 60)}"`);
                        continue;
                    }

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
                        // Extraer body completo (HTML + texto). Si el sync no trae body (queries viejas),
                        // se queda en NULL y se hidrata lazy desde getById() cuando el usuario abra el correo.
                        const bodyHtmlFromGraph = (email as any).body?.content || '';
                        const bodyContentType = (email as any).body?.contentType?.toLowerCase() || '';
                        const cuerpoHtmlValue = bodyContentType === 'html' ? bodyHtmlFromGraph : '';
                        const cuerpoTextoValue = bodyContentType === 'text'
                            ? bodyHtmlFromGraph
                            : (email.bodyPreview || '');

                        const newCorreo = this.correoRepo.create({
                            graphMessageId: email.id,
                            asunto: email.subject || '(Sin asunto)',
                            remitenteEmail: email.from?.emailAddress?.address || '',
                            remitenteNombre: email.from?.emailAddress?.name || '',
                            destinatarios: JSON.stringify(email.toRecipients || []),
                            fechaRecepcion: new Date(email.receivedDateTime),
                            cuerpoHtml: cuerpoHtmlValue || undefined,
                            cuerpoTexto: cuerpoTextoValue,
                            tieneAdjuntos: email.hasAttachments || false,
                            leido: email.isRead || false,
                            archivado: false,
                            urgente: isUrgente,
                            buzon: buzonNorm, // bandeja de origen (JUDICIAL | CORREOS)
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

                        // Sync attachments if email has any — descargar y persistir a disco
                        // para que el usuario pueda visualizarlos sin extra calls a Graph.
                        if (email.hasAttachments) {
                            try {
                                const fs = require('fs');
                                const path = require('path');
                                const uploadsDir = path.join(process.cwd(), 'uploads', 'adjuntos');
                                if (!fs.existsSync(uploadsDir)) {
                                    fs.mkdirSync(uploadsDir, { recursive: true });
                                }

                                const attachments = await this.graphService.getAttachments(email.id);
                                for (const att of attachments) {
                                    let archivoLocalUrl: string | undefined;
                                    let descargado = false;

                                    // Guardar contentBytes a disco si Graph lo devolvió
                                    if (att.contentBytes) {
                                        try {
                                            const buffer = Buffer.from(att.contentBytes, 'base64');
                                            const safeName = (att.name || 'adjunto').replace(/[^a-zA-Z0-9.-]/g, '_');
                                            const uniqueFilename = `recv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${safeName}`;
                                            const filepath = path.join(uploadsDir, uniqueFilename);
                                            fs.writeFileSync(filepath, buffer);
                                            archivoLocalUrl = filepath;
                                            descargado = true;
                                        } catch (writeErr: any) {
                                            this.logger.warn(`No se pudo persistir adjunto ${att.name} a disco: ${writeErr?.message}`);
                                        }
                                    }

                                    const adjunto = this.adjuntoRepo.create({
                                        correoId: savedCorreo.id,
                                        graphMessageId: email.id,
                                        graphAttachmentId: att.id,
                                        nombre: att.name,
                                        contentType: att.contentType,
                                        tamanio: att.size,
                                        descargado,
                                        archivoLocalUrl,
                                    });
                                    await this.adjuntoRepo.save(adjunto);
                                }
                                this.logger.log(`  -> Synced ${attachments.length} attachment(s) (descargados localmente)`);
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

    /** Buzones de correo configurados (delegado al servicio de Microsoft Graph). */
    getMailboxes(): Array<{ buzon: string; address: string }> {
        return this.graphService.getMailboxes();
    }

    /** Sugerencias de destinatarios (contactos, personas frecuentes y directorio) para el autocompletado. */
    async buscarDestinatarios(query: string, buzon?: string) {
        const account = this.graphService.resolveAccount(buzon);
        return this.graphService.searchRecipients(query, account);
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

        if (filters?.buzon) {
            where.buzon = filters.buzon;
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

        // Ya está leído — idempotencia, no registrar duplicados
        if (correo.leido) {
            return correo;
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

        // Solo registrar LEIDO en timeline si es un correo ENTRANTE (no enviado por nosotros)
        if (correo.direccion !== 'ENVIADO') {
            await this.registrarAccion(correo.id, 'LEIDO', 'Correo marcado como leído');

            // ── Propagar LEIDO al correo ENVIADO del remitente ──
            // Para que quien envió el correo vea en SU timeline que fue leído
            await this.propagarEventoAEnviado(correo, 'LEIDO',
                `Correo leído por destinatario desde la plataforma`);
        }
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
     * Send an email via Graph API and save record in DB.
     * ALL attachments are converted to tracked download links (no inline attachments).
     * A tracking pixel is injected to detect when the recipient opens the email.
     */
    async sendEmail(dto: SendEmailDto, req?: any): Promise<{ success: boolean; correo?: CorreoJuridico }> {
        const fs = require('fs');
        const path = require('path');
        const { baseUrl, pathPrefix } = this.getTrackingBaseUrl(req);
        const toList = Array.isArray(dto.to) ? dto.to : [dto.to];
        const destinatariosTo = toList.join(', ');

        // Buzón de envío (según el tab desde el que se compone). Default JUDICIAL.
        const buzonEnvio = String(dto.buzon || 'JUDICIAL').toUpperCase() === 'CORREOS' ? 'CORREOS' : 'JUDICIAL';
        const fromAccount = this.graphService.resolveAccount(buzonEnvio);

        // 1. Save correo record in DB first (need ID for tracking tokens)
        const newCorreo = this.correoRepo.create({
            graphMessageId: `sent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            asunto: dto.subject || '(Sin asunto)',
            remitenteEmail: fromAccount,
            remitenteNombre: 'Oficina Jurídica ESAP',
            destinatariosTo,
            destinatarios: dto.cc ? JSON.stringify(dto.cc) : undefined,
            destinatariosCco: dto.bcc?.length ? JSON.stringify(dto.bcc) : undefined,
            fechaRecepcion: new Date(),
            cuerpoHtml: dto.body,
            cuerpoTexto: dto.body?.replace(/<[^>]*>/g, '') || '',
            tieneAdjuntos: !!(dto.attachments && dto.attachments.length > 0),
            leido: true,
            archivado: false,
            urgente: false,
            tipo: 'CORREO',
            buzon: buzonEnvio,
            direccion: 'ENVIADO',
            categoria: 'ENVIADO',
            expedienteId: undefined,
        });
        const savedCorreo = await this.correoRepo.save(newCorreo);

        // 2. Save ALL attachments locally and create adjunto records
        const uploadsDir = path.join(process.cwd(), 'uploads', 'adjuntos');
        if (dto.attachments && dto.attachments.length > 0) {
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
        }

        const savedAdjuntos: any[] = [];
        if (dto.attachments && dto.attachments.length > 0) {
            for (const att of dto.attachments) {
                const buffer = Buffer.from(att.contentBytes, 'base64');
                const safeName = att.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const uniqueFilename = `sent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${safeName}`;
                const filepath = path.join(uploadsDir, uniqueFilename);
                fs.writeFileSync(filepath, buffer);

                const adjunto = this.adjuntoRepo.create({
                    correoId: savedCorreo.id,
                    graphMessageId: savedCorreo.graphMessageId,
                    graphAttachmentId: `local-${uniqueFilename}`,
                    nombre: att.name,
                    contentType: att.contentType,
                    tamanio: buffer.length,
                    descargado: true,
                    archivoLocalUrl: filepath,
                });
                const savedAdj = await this.adjuntoRepo.save(adjunto);
                savedAdjuntos.push(savedAdj);
            }
        }

        // 3. Build HTML body with tracking pixel + tracked download links
        let finalBody = dto.body;

        // Pixel de tracking (apertura del correo)
        const pixelToken = randomUUID();
        await this.trackingRepo.save(this.trackingRepo.create({
            correoId: savedCorreo.id,
            token: pixelToken,
            tipo: 'OPEN_PIXEL',
            destinatarioEmail: destinatariosTo,
        }));

        // Links trackeados para cada adjunto
        if (savedAdjuntos.length > 0) {
            finalBody += '<br/><div style="margin-top:16px;padding:16px;border:1px solid #e2e8f0;border-radius:8px;background-color:#f8fafc;font-family:sans-serif;">';
            finalBody += '<h4 style="margin-top:0;color:#003DA5;font-size:14px;">📎 Documentos Adjuntos</h4>';
            finalBody += '<ul style="padding-left:18px;margin-bottom:0;">';

            for (const adj of savedAdjuntos) {
                const dlToken = randomUUID();
                await this.trackingRepo.save(this.trackingRepo.create({
                    correoId: savedCorreo.id,
                    adjuntoId: adj.id,
                    token: dlToken,
                    tipo: 'DOWNLOAD_LINK',
                    destinatarioEmail: destinatariosTo,
                }));
                const downloadUrl = `${baseUrl}${pathPrefix}/correos/track/download/${dlToken}`;
                const sizeMB = (adj.tamanio / (1024 * 1024)).toFixed(2);
                finalBody += `<li style="margin-bottom:6px;"><a href="${downloadUrl}" target="_blank" style="color:#2563eb;text-decoration:none;font-weight:600;">${adj.nombre}</a> <span style="color:#64748b;font-size:12px;">(${sizeMB} MB)</span></li>`;
            }
            finalBody += '</ul></div>';
        }

        // Pixel invisible al final
        const pixelUrl = `${baseUrl}${pathPrefix}/correos/track/open/${pixelToken}?_=${Date.now()}`;
        finalBody += `<img src="${pixelUrl}" width="1" height="1" style="display:none;opacity:0;height:0;width:0;" alt="" />`;

        // 4. Send via Graph with modified HTML and NO inline file attachments
        const sent = await this.graphService.sendEmail(
            dto.to,
            dto.subject,
            finalBody,
            dto.cc,
            [],  // No inline attachments — everything goes as tracked links
            {
                requestReadReceipt: !!dto.requestReadReceipt,
                requestDeliveryReceipt: !!dto.requestDeliveryReceipt,
            },
            fromAccount, // remitente según el buzón del tab
            dto.bcc,     // Copia Oculta (CCO) — no visible para los demás destinatarios
        );

        if (!sent) {
            // Cleanup DB on failure
            await this.adjuntoRepo.delete({ correoId: savedCorreo.id });
            await this.trackingRepo.delete({ correoId: savedCorreo.id });
            await this.correoRepo.delete(savedCorreo.id);
            return { success: false };
        }

        // 5. Update HTML in DB with the tracked version
        savedCorreo.cuerpoHtml = finalBody;
        await this.correoRepo.save(savedCorreo);

        // 6. Register ENVIADO event
        // El CCO (bcc) se deja en la traza interna de auditoría, pero NO viaja visible
        // a los demás destinatarios ni se guarda en el campo `destinatarios` (que se
        // muestra como CC al leer el correo).
        const bccList = Array.isArray(dto.bcc) ? dto.bcc.filter(Boolean) : [];
        const detalleEnvio = `Correo enviado a ${destinatariosTo}` +
            (dto.cc?.length ? ` · CC: ${dto.cc.join(', ')}` : '') +
            (bccList.length ? ` · CCO: ${bccList.join(', ')}` : '');
        await this.registrarAccion(savedCorreo.id, 'ENVIADO', detalleEnvio, 'Sistema');
        this.logger.log(`Sent email with tracking: ${savedCorreo.id} -> ${destinatariosTo} (${savedAdjuntos.length} tracked attachments)`);
        return { success: true, correo: savedCorreo };
    }

    /**
     * Reply to an email — maintains thread via Graph API
     */
    async replyEmail(
        correoId: string,
        body: string,
        attachments?: { name: string; contentBytes: string; contentType: string }[],
        req?: any,
        to?: string | string[],
        cc?: string[],
        bcc?: string[],
    ): Promise<{ success: boolean; correo?: CorreoJuridico }> {
        const original = await this.correoRepo.findOne({ where: { id: correoId } });
        if (!original) throw new NotFoundException('Correo original no encontrado');

        // Si no se especifica destinatario, se responde al remitente original (comportamiento por defecto).
        const toList = (Array.isArray(to) ? to : to ? [to] : [original.remitenteEmail]).filter(Boolean);
        const destinatariosTo = toList.join(', ');

        // La respuesta sale desde la cuenta del BUZÓN del correo original (depende del tab).
        const fromAccount = this.graphService.resolveAccount(original.buzon);

        // Send reply via Graph API (sendMail — only requires Mail.Send permission)
        const replySubject = original.asunto.startsWith('RE:') ? original.asunto : `RE: ${original.asunto}`;
        const sent = await this.graphService.replyToEmail(original.graphMessageId, body, attachments, toList, replySubject, fromAccount, cc, bcc);
        if (!sent) return { success: false };

        // Save reply record in DB
        try {
            const replyCorreo = this.correoRepo.create({
                graphMessageId: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                asunto: original.asunto.startsWith('RE:') ? original.asunto : `RE: ${original.asunto}`,
                remitenteEmail: fromAccount,
                remitenteNombre: 'Oficina Jurídica ESAP',
                destinatariosTo,
                destinatarios: cc?.length ? JSON.stringify(cc) : original.destinatarios,
                destinatariosCco: bcc?.length ? JSON.stringify(bcc) : undefined,
                fechaRecepcion: new Date(),
                cuerpoHtml: body,
                cuerpoTexto: body?.replace(/<[^>]*>/g, '') || '',
                tieneAdjuntos: !!(attachments && attachments.length > 0),
                leido: true,
                archivado: false,
                urgente: false,
                tipo: original.tipo,
                buzon: original.buzon || 'JUDICIAL', // la respuesta queda en el mismo buzón
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
            await this.registrarAccion(savedReply.id, 'ENVIADO', `Respuesta enviada a ${destinatariosTo}`, 'Sistema');
            await this.injectTrackingIntoEmail(savedReply, destinatariosTo, req);

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
        to: string | string[],
        comment: string,
        additionalAttachments?: { name: string; contentBytes: string; contentType: string }[],
        req?: any,
        cc?: string[],
        bcc?: string[],
    ): Promise<{ success: boolean; correo?: CorreoJuridico }> {
        const original = await this.correoRepo.findOne({ where: { id: correoId }, relations: ['adjuntos'] });
        if (!original) throw new NotFoundException('Correo original no encontrado');

        const toList = Array.isArray(to) ? to : [to];
        const destinatariosTo = toList.join(', ');

        // El reenvío sale desde la cuenta del BUZÓN del correo original (depende del tab).
        const fromAccount = this.graphService.resolveAccount(original.buzon);
        const forwardSubject = original.asunto?.startsWith('RV:') || original.asunto?.startsWith('FW:')
            ? original.asunto
            : `RV: ${original.asunto || 'Sin asunto'}`;

        // Recuperar los adjuntos ORIGINALES como base64 desde nuestro propio almacenamiento
        // (cache local o Graph) para adjuntarlos EXPLÍCITAMENTE al reenvío.
        // Antes se delegaba TODO al forward nativo de Graph (`/messages/{id}/forward`), que:
        //   (a) fallaba cuando el correo no era un mensaje Graph vigente (reenvíos previos,
        //       enviados o registros sintéticos con graphMessageId `fwd-...`) → el reenvío no salía;
        //   (b) no dejaba ninguna fila de adjunto en el registro del reenvío → dentro de la
        //       plataforma el adjunto original "no se conservaba".
        // Enviar como correo normal con los archivos adjuntados es fiable e independiente de que
        // el mensaje original siga existiendo en el buzón.
        const originalAttachments: { name: string; contentBytes: string; contentType: string }[] = [];
        for (const adj of (original.adjuntos || [])) {
            const content = await this.loadAttachmentContent(adj);
            if (content) {
                originalAttachments.push({ name: content.name, contentBytes: content.contentBytes, contentType: content.contentType });
            } else {
                this.logger.warn(`No se pudo recuperar el adjunto original ${adj.id} (${adj.nombre}) para el reenvío`);
            }
        }

        const allAttachments = [...originalAttachments, ...(additionalAttachments || [])];

        // Cuerpo del reenvío: comentario del usuario + contenido original (preserva formato HTML).
        const forwardHtml = this.buildForwardHtml(comment, original);
        const forwardText = this.buildForwardComment(comment, original);

        const sent = await this.graphService.sendEmail(
            toList,
            forwardSubject,
            forwardHtml,
            cc,
            allAttachments.length > 0 ? allAttachments : undefined,
            undefined,
            fromAccount,
            bcc,
        );
        if (!sent) return { success: false };

        // Persist the forward record in DB
        try {
            const forwardCorreo = this.correoRepo.create({
                graphMessageId: `fwd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                asunto: forwardSubject,
                remitenteEmail: fromAccount,
                remitenteNombre: 'Oficina Jurídica ESAP',
                destinatariosTo,
                destinatarios: cc?.length ? JSON.stringify(cc) : undefined,
                destinatariosCco: bcc?.length ? JSON.stringify(bcc) : undefined,
                fechaRecepcion: new Date(),
                cuerpoHtml: forwardHtml,
                cuerpoTexto: forwardText,
                tieneAdjuntos: allAttachments.length > 0,
                leido: true,
                archivado: false,
                urgente: original.urgente,
                tipo: 'CORREO',
                buzon: original.buzon || 'JUDICIAL', // el reenvío queda en el mismo buzón
                direccion: 'ENVIADO',
                categoria: 'REENVIO',
                parentEmailId: original.id,
                threadId: original.threadId,
                expedienteId: original.expedienteId,
            });

            const savedForward = await this.correoRepo.save(forwardCorreo);

            // Copiar las filas de adjunto al registro del reenvío para que se puedan
            // ver/descargar dentro de la plataforma (no solo en el correo saliente).
            const adjuntosCopia: AdjuntoCorreo[] = [];
            // 1) Adjuntos ORIGINALES: reutilizan el mismo almacenamiento (cache local o
            //    referencia Graph), sin duplicar el archivo.
            for (const adj of (original.adjuntos || [])) {
                adjuntosCopia.push(this.adjuntoRepo.create({
                    correoId: savedForward.id,
                    graphMessageId: adj.graphMessageId,
                    graphAttachmentId: adj.graphAttachmentId,
                    nombre: adj.nombre,
                    contentType: adj.contentType,
                    tamanio: adj.tamanio,
                    archivoLocalUrl: adj.archivoLocalUrl,
                    descargado: adj.descargado,
                }));
            }
            // 2) Adjuntos NUEVOS subidos por el usuario: se guardan en disco para que también
            //    queden visibles/descargables desde el registro del reenvío.
            if (additionalAttachments && additionalAttachments.length > 0) {
                const fs = require('fs');
                const path = require('path');
                const uploadsDir = path.join(process.cwd(), 'uploads', 'adjuntos');
                try { if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true }); } catch { /* noop */ }
                for (const att of additionalAttachments) {
                    let localPath: string | undefined = undefined;
                    let size = 0;
                    try {
                        const buffer = Buffer.from(att.contentBytes, 'base64');
                        size = buffer.length;
                        const safeName = `fwd_${savedForward.id}_${(att.name || 'adjunto').replace(/[^a-z0-9.]/gi, '_')}`;
                        localPath = path.join(uploadsDir, safeName);
                        fs.writeFileSync(localPath, buffer);
                    } catch (e: any) {
                        this.logger.warn(`No se pudo guardar en disco el adjunto nuevo del reenvío "${att.name}": ${e?.message || e}`);
                        localPath = undefined;
                    }
                    adjuntosCopia.push(this.adjuntoRepo.create({
                        correoId: savedForward.id,
                        graphMessageId: '',
                        graphAttachmentId: '',
                        nombre: att.name,
                        contentType: att.contentType,
                        tamanio: size,
                        archivoLocalUrl: localPath,
                        descargado: !!localPath,
                    }));
                }
            }
            if (adjuntosCopia.length > 0) {
                await this.adjuntoRepo.save(adjuntosCopia);
            }

            // Mark original as forwarded
            original.isForwarded = true;
            await this.correoRepo.save(original);

            const adjuntosDesc = allAttachments.length > 0
                ? `Correo reenviado a ${destinatariosTo} (con ${allAttachments.length} adjunto(s))`
                : `Correo reenviado a ${destinatariosTo}`;
            await this.registrarAccion(original.id, 'REENVIADO', adjuntosDesc);
            // ── Trazabilidad: Registrar ENVIADO en el reenvío ──
            await this.registrarAccion(savedForward.id, 'ENVIADO', `Reenvío enviado a ${destinatariosTo}`, 'Sistema');
            await this.injectTrackingIntoEmail(savedForward, destinatariosTo, req);

            this.logger.log(`Forward saved: ${savedForward.id} -> parent: ${original.id} (${allAttachments.length} adjunto(s))`);
            return { success: true, correo: savedForward };
        } catch (dbError) {
            this.logger.error('Error saving forward to DB (forward was sent successfully):', dbError);
            return { success: true };
        }
    }

    /**
     * Obtiene el contenido (base64) de un adjunto desde la cache local o Graph, SIN los
     * efectos secundarios de trazabilidad de `downloadAttachment` (que registra
     * DOCUMENTO_ABIERTO). Se usa para reenviar los adjuntos originales. Devuelve null si no
     * se puede recuperar (para no bloquear el reenvío por un adjunto inaccesible).
     */
    private async loadAttachmentContent(adjunto: AdjuntoCorreo): Promise<{
        name: string;
        contentType: string;
        contentBytes: string;
        size: number;
    } | null> {
        try {
            const fs = require('fs');
            if (adjunto.descargado && adjunto.archivoLocalUrl && fs.existsSync(adjunto.archivoLocalUrl)) {
                const buffer = fs.readFileSync(adjunto.archivoLocalUrl);
                return {
                    name: adjunto.nombre,
                    contentType: adjunto.contentType || 'application/octet-stream',
                    contentBytes: buffer.toString('base64'),
                    size: buffer.length,
                };
            }
            if (!adjunto.graphMessageId || !adjunto.graphAttachmentId) return null;
            return await this.graphService.downloadAttachment(adjunto.graphMessageId, adjunto.graphAttachmentId);
        } catch (e: any) {
            this.logger.warn(`loadAttachmentContent falló para adjunto ${adjunto.id}: ${e?.message || e}`);
            return null;
        }
    }

    /**
     * Construye el cuerpo HTML de un reenvío: comentario del usuario + contenido original.
     * Preserva el HTML original (imágenes/formato) cuando existe; si no, usa el texto plano.
     */
    private buildForwardHtml(userComment: string, original: CorreoJuridico): string {
        const formattedDate = new Intl.DateTimeFormat('es-CO', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        }).format(new Date(original.fechaRecepcion));

        const originalHtml = original.cuerpoHtml
            || (original.cuerpoTexto ? original.cuerpoTexto.replace(/\n/g, '<br/>') : '');
        const commentHtml = (userComment || '').trim()
            ? `${userComment.trim().replace(/\n/g, '<br/>')}<br/><br/>`
            : '';

        return `${commentHtml}` +
            `<hr style="border:none;border-top:1px solid #ccc;margin:16px 0;"/>` +
            `<p style="color:#666;font-size:12px;margin:0 0 8px;">` +
            `<strong>De:</strong> ${original.remitenteNombre || original.remitenteEmail || ''}<br/>` +
            `<strong>Fecha:</strong> ${formattedDate}<br/>` +
            `<strong>Asunto:</strong> ${original.asunto || ''}` +
            `</p>` +
            `<blockquote style="border-left:3px solid #ccc;padding-left:12px;margin:12px 0;color:#555;">${originalHtml}</blockquote>`;
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

        // ── Propagar DOCUMENTO_ABIERTO al correo ENVIADO (si este es ENTRANTE) ──
        const parentCorreo = await this.correoRepo.findOne({ where: { id: adjunto.correoId } });
        if (parentCorreo && parentCorreo.direccion !== 'ENVIADO') {
            this.propagarEventoAEnviado(parentCorreo, 'DOCUMENTO_ABIERTO',
                `Documento "${adjunto.nombre}" abierto por destinatario desde la plataforma`
            ).catch(() => {});
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
    /**
     * Normaliza el módulo destino recibido desde el frontend ('DEFENSA', 'DISCIPLINARIO',
     * 'ASESORIA', etc.) a los valores canónicos usados para trazabilidad.
     */
    private normalizarModuloDestino(targetModule?: string): 'DEFENSA_JUDICIAL' | 'JUZGAMIENTO_DISCIPLINARIO' | 'ASESORIA_JURIDICA' {
        const m = (targetModule || '').toUpperCase();
        if (m.includes('ASESORIA')) return 'ASESORIA_JURIDICA';
        if (m.includes('DISCIPLINARIO') || m.includes('JUZGAMIENTO')) return 'JUZGAMIENTO_DISCIPLINARIO';
        return 'DEFENSA_JUDICIAL';
    }

    /**
     * Copia los adjuntos de una comunicación a la pestaña Documentos del proceso destino.
     * Asesoría Jurídica → tabla `documentos_consulta`; Defensa/Juzgamiento → tabla `documentos`.
     * Reutiliza {@link downloadAttachment} para obtener los bytes (local o Graph con caché).
     * Devuelve la cantidad de adjuntos copiados. No lanza: los errores por adjunto se registran.
     */
    private async copiarAdjuntosADocumentos(
        correo: CorreoJuridico,
        procesoId: string,
        modulo: 'DEFENSA_JUDICIAL' | 'JUZGAMIENTO_DISCIPLINARIO' | 'ASESORIA_JURIDICA',
    ): Promise<number> {
        const fs = require('fs');
        const path = require('path');

        const adjuntos = await this.adjuntoRepo.find({ where: { correoId: correo.id } });
        if (!adjuntos.length) return 0;

        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        let copiados = 0;
        for (const adj of adjuntos) {
            try {
                const data = await this.downloadAttachment(adj.id);
                const buffer = Buffer.from(data.contentBytes, 'base64');

                const ext = path.extname(adj.nombre || '') || '';
                const filename = `${randomUUID()}${ext}`;
                fs.writeFileSync(path.join(uploadsDir, filename), buffer);

                const descripcion = `Documento recibido en la comunicación: ${correo.asunto}`;

                if (modulo === 'ASESORIA_JURIDICA') {
                    await this.documentoConsultaRepo.save(this.documentoConsultaRepo.create({
                        consultaId: procesoId,
                        nombre: adj.nombre,
                        tipoDocumento: 'otro',
                        descripcion,
                        archivoUrl: `files/${filename}`,
                        archivoNombreOriginal: adj.nombre,
                        tamanoBytes: adj.tamanio,
                        mimeType: adj.contentType || data.contentType,
                        subidoPor: 'Sistema (Derivación de Comunicación)',
                    }));
                } else {
                    await this.documentoRepo.save(this.documentoRepo.create({
                        expedienteId: procesoId,
                        nombre: adj.nombre,
                        tipo: 'OTRO',
                        categoria: 'documentos',
                        descripcion,
                        archivoUrl: `files/${filename}`,
                        archivoNombreOriginal: adj.nombre,
                        archivoTamano: adj.tamanio,
                        archivoMimeType: adj.contentType || data.contentType,
                        subidoPor: 'Sistema (Derivación de Comunicación)',
                    }));
                }
                copiados++;
            } catch (err) {
                this.logger.warn(`No se pudo copiar el adjunto ${adj.id} al proceso ${procesoId}: ${err}`);
            }
        }
        return copiados;
    }

    /**
     * ASOCIAR una comunicación a un proceso / expediente / consulta EXISTENTE.
     * Persiste el módulo destino y, para Asesoría Jurídica, la consulta asociada
     * (correos_juridicos.consulta_id). Para Defensa/Juzgamiento crea además una
     * Actuación para dar visibilidad al oficio dentro del expediente.
     */
    async linkToProcess(id: string, procesoId: string, targetModule?: string): Promise<CorreoJuridico> {
        const correo = await this.correoRepo.findOne({ where: { id } });
        if (!correo) throw new NotFoundException('Correo no encontrado');

        const modulo = this.normalizarModuloDestino(targetModule);
        correo.moduloDestino = modulo;

        // Asesoría Jurídica usa una tabla independiente (consultas_juridicas)
        if (modulo === 'ASESORIA_JURIDICA') {
            correo.consultaId = procesoId;
            const savedCorreo = await this.correoRepo.save(correo);
            await this.registrarAccion(correo.id, 'ASOCIADO_PROCESO', `Asociado a consulta de Asesoría Jurídica: ${procesoId}`);
            // Sin concepto de "Actuación" en Asesoría: adjuntamos los documentos a la consulta
            await this.copiarAdjuntosADocumentos(correo, procesoId, modulo).catch(() => 0);
            return savedCorreo;
        }

        // Defensa Judicial / Juzgamiento Disciplinario (comparten la tabla expedientes)
        correo.expedienteId = procesoId;
        const savedCorreo = await this.correoRepo.save(correo);
        await this.registrarAccion(correo.id, 'ASOCIADO_PROCESO', `Asociado al proceso: ${procesoId}`);

        // Crear Actuacion (visibilidad del oficio en el expediente)
        try {
            const adjuntos = await this.adjuntoRepo.find({ where: { correoId: id } });
            let documentoUrl: string | undefined = undefined;
            let documentoNombre: string | undefined = undefined;

            if (adjuntos.length > 0) {
                documentoUrl = `/legal/api/v1/correos/adjuntos/${adjuntos[0].id}/download`;
                documentoNombre = adjuntos[0].nombre;
            }

            const descripcionDetallada = `${correo.asunto} - REMITENTE: ${correo.remitenteNombre || correo.remitenteEmail} - RECIBIDO`;

            await this.actuacionService.registrarActuacion(procesoId, {
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
                    targetModule: modulo
                },
                usuarioResponsable: 'Sistema (Vinculación Automática)'
            });

            this.logger.log(`Actuacion created for linked email ${id} in expediente ${procesoId} (Module: ${modulo})`);

        } catch (error) {
            this.logger.error(`Error creating atuacion for linked email ${id}`, error);
            // Non-blocking error
        }

        return savedCorreo;
    }

    /**
     * DERIVAR una comunicación a un proceso RECIÉN CREADO desde el Centro de
     * Comunicaciones → Clasificación IA. Además de asociar (módulo destino + relación
     * recíproca), registra la comunicación de origen en el proceso/consulta creado
     * (origen_comunicacion_id) y copia los adjuntos recibidos a su pestaña Documentos.
     */
    async derivarANuevoProceso(id: string, procesoId: string, targetModule?: string): Promise<CorreoJuridico> {
        const correo = await this.correoRepo.findOne({ where: { id } });
        if (!correo) throw new NotFoundException('Correo no encontrado');

        const modulo = this.normalizarModuloDestino(targetModule);
        correo.moduloDestino = modulo;

        if (modulo === 'ASESORIA_JURIDICA') {
            correo.consultaId = procesoId;
            await this.consultaRepo.update({ id: procesoId }, { origenComunicacionId: correo.id });
        } else {
            correo.expedienteId = procesoId;
            await this.expedienteRepo.update({ id: procesoId }, { origenComunicacionId: correo.id });
        }
        const savedCorreo = await this.correoRepo.save(correo);

        // Copiar los documentos recibidos a la pestaña Documentos del proceso creado
        const copiados = await this.copiarAdjuntosADocumentos(correo, procesoId, modulo).catch(() => 0);

        await this.registrarAccion(
            correo.id,
            'PROCESO_CREADO',
            `Proceso creado a partir de esta comunicación (${modulo})${copiados ? ` — ${copiados} documento(s) adjuntado(s)` : ''}`,
        );

        return savedCorreo;
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
    private async injectTrackingIntoEmail(correo: CorreoJuridico, destinatarioEmail: string, req?: any): Promise<void> {
        try {
            // Usa el mismo resolvedor dinámico que sendEmail para que los enlaces
            // apunten al host público del ambiente (no a un host interno de Docker).
            const { baseUrl, pathPrefix } = this.getTrackingBaseUrl(req);
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
            const pixelUrl = `${baseUrl}${pathPrefix}/correos/track/open/${pixelToken}?_=${Date.now()}`;
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

                    const downloadUrl = `${baseUrl}${pathPrefix}/correos/track/download/${downloadToken}`;
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

                // Notificar al JEFE_GESTION_LEGAL (acuse de recibido automático)
                this.notificarAcuseDeRecibido(tracking.correoId, tracking.destinatarioEmail).catch(err =>
                    this.logger.warn(`Error enviando acuse de recibido: ${err?.message}`)
                );
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

    /**
     * Propaga un evento (LEIDO, DOCUMENTO_ABIERTO) de un correo ENTRANTE
     * al correo ENVIADO correspondiente del remitente.
     * Busca por threadId primero, luego por asunto.
     */
    private async propagarEventoAEnviado(
        correoEntrante: CorreoJuridico,
        tipoEvento: string,
        descripcion: string,
    ): Promise<void> {
        try {
            let sentEmail: CorreoJuridico | null = null;

            // 1. Buscar por threadId (más preciso)
            if (correoEntrante.threadId) {
                sentEmail = await this.correoRepo.findOne({
                    where: { threadId: correoEntrante.threadId, direccion: 'ENVIADO' },
                    order: { fechaRecepcion: 'DESC' },
                });
            }

            // 2. Fallback: buscar por asunto exacto (sin prefijos RE:/RV:/FW:)
            if (!sentEmail) {
                const cleanSubject = correoEntrante.asunto
                    ?.replace(/^(RE:|RV:|FW:|FWD:)\s*/gi, '')
                    .trim();
                if (cleanSubject) {
                    sentEmail = await this.correoRepo.findOne({
                        where: [
                            { asunto: cleanSubject, direccion: 'ENVIADO' },
                            { asunto: `RE: ${cleanSubject}`, direccion: 'ENVIADO' },
                            { asunto: `RV: ${cleanSubject}`, direccion: 'ENVIADO' },
                        ],
                        order: { fechaRecepcion: 'DESC' },
                    });
                }
            }

            if (sentEmail) {
                await this.registrarAccion(sentEmail.id, tipoEvento, descripcion, 'Sistema');
                this.logger.log(`📨 Evento ${tipoEvento} propagado al correo ENVIADO ${sentEmail.id}`);
            }
        } catch (error) {
            this.logger.error(`Error propagando evento ${tipoEvento} a ENVIADO:`, error);
        }
    }
}

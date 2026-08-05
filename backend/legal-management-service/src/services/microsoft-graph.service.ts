import { Injectable, Logger } from '@nestjs/common';
import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';

export interface GraphRecipientSuggestion {
    name: string;
    email: string;
    source: 'contacto' | 'frecuente' | 'directorio';
}

export interface GraphEmail {
    id: string;
    subject: string;
    from: {
        emailAddress: {
            name: string;
            address: string;
        };
    };
    toRecipients: Array<{
        emailAddress: {
            name: string;
            address: string;
        };
    }>;
    receivedDateTime: string;
    body: {
        contentType: string;
        content: string;
    };
    bodyPreview: string;
    hasAttachments: boolean;
    isRead: boolean;
    internetMessageId?: string;
    conversationId?: string;
}

@Injectable()
export class MicrosoftGraphService {
    private readonly logger = new Logger(MicrosoftGraphService.name);
    private graphClient: Client | null = null;

    private readonly tenantId = process.env.AZURE_TENANT_ID || '';
    private readonly clientId = process.env.AZURE_CLIENT_ID || '';
    private readonly clientSecret = process.env.AZURE_CLIENT_SECRET || '';

    // Cuenta del buzón JUDICIAL (la única configurada hoy). El default mantiene el
    // comportamiento actual; para producción se setea LEGAL_EMAIL_ACCOUNT_JUDICIAL.
    private readonly judicialAccount =
        process.env.LEGAL_EMAIL_ACCOUNT_JUDICIAL ||
        process.env.LEGAL_EMAIL_ACCOUNT ||
        'desarrollo.ccd@esap.edu.co';

    // Cuenta del buzón CORREOS. Vacía hasta que exista la segunda cuenta:
    // basta con setear LEGAL_EMAIL_ACCOUNT_CORREOS para activarla (ready to replace).
    private readonly correosAccount = process.env.LEGAL_EMAIL_ACCOUNT_CORREOS || '';

    // Cuenta por defecto para envíos/lecturas sin buzón explícito (la judicial).
    private readonly emailAccount =
        process.env.LEGAL_EMAIL_ACCOUNT_JUDICIAL ||
        process.env.LEGAL_EMAIL_ACCOUNT ||
        'desarrollo.ccd@esap.edu.co';

    /** Buzones configurados (solo los que tienen cuenta definida). */
    getMailboxes(): Array<{ buzon: 'JUDICIAL' | 'CORREOS'; address: string }> {
        const boxes: Array<{ buzon: 'JUDICIAL' | 'CORREOS'; address: string }> = [];
        if (this.judicialAccount) boxes.push({ buzon: 'JUDICIAL', address: this.judicialAccount });
        if (this.correosAccount) boxes.push({ buzon: 'CORREOS', address: this.correosAccount });
        return boxes;
    }

    /** Resuelve la cuenta de correo para un buzón dado (default: judicial). */
    resolveAccount(buzon?: string): string {
        if (String(buzon || '').toUpperCase() === 'CORREOS' && this.correosAccount) {
            return this.correosAccount;
        }
        return this.judicialAccount;
    }

    /** ¿Está configurada la cuenta para este buzón? */
    isBuzonConfigured(buzon?: string): boolean {
        if (String(buzon || '').toUpperCase() === 'CORREOS') return !!this.correosAccount;
        return !!this.judicialAccount;
    }

    private getClient(): Client {
        if (this.graphClient) {
            return this.graphClient;
        }

        if (!this.tenantId || !this.clientId || !this.clientSecret || this.tenantId === 'development-disabled') {
            this.logger.warn('Azure credentials not configured or disabled for development. Microsoft Graph features will be unavailable.');
            throw new Error('Microsoft Graph is disabled in development mode');
        }

        const credential = new ClientSecretCredential(
            this.tenantId,
            this.clientId,
            this.clientSecret
        );

        const authProvider = new TokenCredentialAuthenticationProvider(credential, {
            scopes: ['https://graph.microsoft.com/.default'],
        });

        this.graphClient = Client.initWithMiddleware({ authProvider });
        this.logger.log('Microsoft Graph client initialized');
        return this.graphClient;
    }

    /**
     * Get a page of emails with pagination token support
     */
    async getEmailsPage(nextLink?: string, limit: number = 50, account?: string): Promise<{ emails: GraphEmail[]; nextLink: string | null }> {
        try {
            const client = this.getClient();
            const mailbox = account || this.emailAccount;
            let response;

            if (nextLink) {
                // Fetch next page using provided link
                this.logger.log(`Fetching next page...`);
                response = await client.api(nextLink).get();
            } else {
                // First request
                this.logger.log(`Fetching first page from ${mailbox} (limit: ${limit})...`);
                response = await client
                    .api(`/users/${mailbox}/messages`)
                    .top(limit)
                    .orderby('receivedDateTime desc')
                    .select('id,subject,from,toRecipients,receivedDateTime,body,bodyPreview,hasAttachments,isRead,internetMessageId,conversationId')
                    .get();
            }

            const emails = response.value || [];
            const newNextLink = response['@odata.nextLink'] || null;

            this.logger.log(`Page fetched: ${emails.length} emails. Has next page: ${!!newNextLink}`);
            return { emails, nextLink: newNextLink };
        } catch (error) {
            this.logger.error('Error fetching emails page:', error);
            throw error;
        }
    }

    /**
     * Get ALL emails with pagination - ensures no emails are missed
     * Uses @odata.nextLink to fetch all pages
     * @param maxEmails Maximum total emails to fetch (default 500, set to 0 for unlimited)
     */
    async getAllEmailsWithPaging(maxEmails: number = 500): Promise<GraphEmail[]> {
        try {
            const client = this.getClient();
            let allEmails: GraphEmail[] = [];
            let nextLink: string | null = null;

            // First request
            this.logger.log('Fetching emails with pagination...');
            const response = await client
                .api(`/users/${this.emailAccount}/messages`)
                .top(100) // Fetch 100 per page
                .orderby('receivedDateTime desc')
                .select('id,subject,from,toRecipients,receivedDateTime,body,bodyPreview,hasAttachments,isRead,internetMessageId,conversationId')
                .get();

            allEmails = response.value || [];
            nextLink = response['@odata.nextLink'] || null;
            this.logger.log(`Page 1: ${allEmails.length} emails`);

            // Follow pagination
            let pageCount = 1;
            while (nextLink && (maxEmails === 0 || allEmails.length < maxEmails)) {
                pageCount++;
                this.logger.log(`Fetching page ${pageCount}...`);

                const nextResponse = await client.api(nextLink).get();
                const newEmails = nextResponse.value || [];
                allEmails = allEmails.concat(newEmails);
                nextLink = nextResponse['@odata.nextLink'] || null;

                this.logger.log(`Page ${pageCount}: +${newEmails.length} emails (total: ${allEmails.length})`);

                // Respect maxEmails limit
                if (maxEmails > 0 && allEmails.length >= maxEmails) {
                    allEmails = allEmails.slice(0, maxEmails);
                    break;
                }
            }

            this.logger.log(`Pagination complete: ${allEmails.length} total emails fetched`);
            return allEmails;
        } catch (error) {
            this.logger.error('Error fetching emails with pagination:', error);
            throw error;
        }
    }

    /**
     * Get unread emails from the configured email account
     */
    async getUnreadEmails(top: number = 50): Promise<GraphEmail[]> {
        try {
            const client = this.getClient();

            const response = await client
                .api(`/users/${this.emailAccount}/messages`)
                .filter('isRead eq false')
                .top(top)
                .orderby('receivedDateTime desc')
                .select('id,subject,from,toRecipients,receivedDateTime,body,bodyPreview,hasAttachments,isRead,internetMessageId,conversationId')
                .get();

            this.logger.log(`Fetched ${response.value?.length || 0} unread emails`);
            return response.value || [];
        } catch (error) {
            this.logger.error('Error fetching unread emails:', error);
            throw error;
        }
    }

    /**
     * Get recent emails (simple, no pagination)
     */
    async getRecentEmails(top: number = 100): Promise<GraphEmail[]> {
        try {
            const client = this.getClient();

            const response = await client
                .api(`/users/${this.emailAccount}/messages`)
                .top(top)
                .orderby('receivedDateTime desc')
                .select('id,subject,from,toRecipients,receivedDateTime,body,bodyPreview,hasAttachments,isRead,internetMessageId,conversationId')
                .get();

            this.logger.log(`Fetched ${response.value?.length || 0} recent emails`);
            return response.value || [];
        } catch (error) {
            this.logger.error('Error fetching recent emails:', error);
            throw error;
        }
    }

    /**
     * Get a single email with full body content
     */
    async getEmailById(messageId: string): Promise<GraphEmail | null> {
        try {
            const client = this.getClient();

            const email = await client
                .api(`/users/${this.emailAccount}/messages/${messageId}`)
                .select('id,subject,from,toRecipients,receivedDateTime,body,bodyPreview,hasAttachments,isRead')
                .get();

            return email;
        } catch (error) {
            this.logger.error(`Error fetching email ${messageId}:`, error);
            return null;
        }
    }

    /**
     * Mark an email as read
     */
    async markAsRead(messageId: string): Promise<boolean> {
        try {
            const client = this.getClient();

            await client
                .api(`/users/${this.emailAccount}/messages/${messageId}`)
                .patch({ isRead: true });

            this.logger.log(`Marked email ${messageId} as read`);
            return true;
        } catch (error) {
            this.logger.error(`Error marking email ${messageId} as read:`, error);
            return false;
        }
    }

    /**
     * Send an email with optional CC and attachments
     * IMPORTANT: From address MUST be the configured email account
     * Note: Microsoft/Exchange may add organizational signature after the content
     */
    async sendEmail(
        to: string | string[],
        subject: string,
        body: string,
        cc?: string[],
        attachments?: { name: string; contentBytes: string; contentType: string }[],
        options?: { requestReadReceipt?: boolean; requestDeliveryReceipt?: boolean },
        fromAccount?: string,
        bcc?: string[],
    ): Promise<boolean> {
        const toList = Array.isArray(to) ? to : [to];
        // Cuenta remitente: depende del buzón del correo (judicial vs correos). Default: primaria.
        const mailbox = fromAccount || this.emailAccount;
        // MOCK FOR DEV: Si no hay credenciales configuradas, simular envío exitoso
        if (!this.tenantId || !this.clientId || !this.clientSecret || this.tenantId === 'development-disabled') {
            this.logger.warn(`[DEV MOCK] Email simulación enviado a: ${toList.join(', ')} | Asunto: ${subject}`);
            this.logger.debug(`[DEV MOCK] Cuerpo: ${body.substring(0, 100)}...`);
            return true;
        }

        try {
            const client = this.getClient();

            // Build ccRecipients if provided
            const ccRecipients = cc?.length
                ? cc.map(email => ({ emailAddress: { address: email.trim() } }))
                : [];

            // Build bccRecipients (Copia Oculta / CCO) if provided.
            // These recipients are NOT visible to the other addressees.
            const bccRecipients = bcc?.length
                ? bcc.map(email => ({ emailAddress: { address: email.trim() } }))
                : [];

            // Format body as HTML with clear separation
            // This helps distinguish user content from any org-added signatures
            const htmlBody = `
                <div style="font-family: Arial, sans-serif; font-size: 14px;">
                    ${body.replace(/\n/g, '<br/>')}
                </div>
                <br/><br/>
                <hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;"/>
                <!-- Cualquier firma organizacional aparecerá debajo de esta línea -->
            `;

            // Build attachments array for Graph API
            const graphAttachments = attachments?.map(att => ({
                '@odata.type': '#microsoft.graph.fileAttachment',
                name: att.name,
                contentBytes: att.contentBytes,
                contentType: att.contentType
            })) || [];

            const message: any = {
                message: {
                    subject,
                    body: {
                        contentType: 'HTML',
                        content: htmlBody,
                    },
                    toRecipients: toList.map(addr => ({
                        emailAddress: { address: addr.trim() },
                    })),
                    ...(ccRecipients.length > 0 && { ccRecipients }),
                    ...(bccRecipients.length > 0 && { bccRecipients }),
                    ...(graphAttachments.length > 0 && { attachments: graphAttachments }),
                    ...(options?.requestReadReceipt && { isReadReceiptRequested: true }),
                    ...(options?.requestDeliveryReceipt && { isDeliveryReceiptRequested: true }),
                    from: {
                        emailAddress: {
                            address: mailbox,
                        },
                    },
                },
                saveToSentItems: true,
            };

            await client
                .api(`/users/${mailbox}/sendMail`)
                .post(message);

            this.logger.log(`Email sent from ${mailbox} to ${to}${cc?.length ? ` (CC: ${cc.join(', ')})` : ''}${bcc?.length ? ` (BCC: ${bcc.length} oculto[s])` : ''}${attachments?.length ? ` with ${attachments.length} attachment(s)` : ''} - Subject: ${subject}`);
            return true;
        } catch (error) {
            this.logger.error(`Error sending email to ${to}:`, error);
            throw error;
        }
    }

    /**
     * Forward an email
     * Uses Microsoft Graph native forward which automatically includes Original Attachments
     */
    async forwardEmail(
        messageId: string,
        to: string,
        comment: string,
        fromAccount?: string,
    ): Promise<boolean> {
        if (!this.tenantId || !this.clientId || !this.clientSecret || this.tenantId === 'development-disabled') {
            this.logger.warn(`[DEV MOCK] Forward simulación de email ${messageId} enviado a: ${to} con comentario: ${comment}`);
            return true;
        }

        try {
            const client = this.getClient();
            // El reenvío usa la cuenta del buzón del correo original.
            const mailbox = fromAccount || this.emailAccount;

            const forwardMessage = {
                toRecipients: [
                    {
                        emailAddress: {
                            address: to.trim()
                        }
                    }
                ],
                comment: comment || ''
            };

            await client
                .api(`/users/${mailbox}/messages/${messageId}/forward`)
                .post(forwardMessage);

            this.logger.log(`Email ${messageId} forwarded from ${mailbox} to ${to}`);
            return true;
        } catch (error) {
            this.logger.error(`Error forwarding email ${messageId} to ${to}:`, error);
            throw error;
        }
    }

    /**
     * Test connection to Microsoft Graph
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            const client = this.getClient();

            const user = await client
                .api(`/users/${this.emailAccount}`)
                .select('displayName,mail')
                .get();

            return {
                success: true,
                message: `Connected successfully. Account: ${user.mail || user.displayName}`,
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Connection failed',
            };
        }
    }

    /**
     * Get attachments for a specific email message
     */
    async getAttachments(messageId: string): Promise<Array<{
        id: string;
        name: string;
        contentType: string;
        size: number;
        contentBytes?: string;
        contentId?: string;  // Needed to resolve CID inline images
        isInline?: boolean;
    }>> {
        try {
            const client = this.getClient();

            const response = await client
                .api(`/users/${this.emailAccount}/messages/${messageId}/attachments`)
                .get();

            const attachments = response.value || [];
            this.logger.log(`Fetched ${attachments.length} attachments for message ${messageId}`);

            return attachments.map((att: any) => ({
                id: att.id,
                name: att.name,
                contentType: att.contentType,
                size: att.size,
                contentBytes: att.contentBytes, // Base64 encoded
                contentId: att.contentId || null,  // Preserve for CID inline image resolution
                isInline: att.isInline ?? false,
            }));
        } catch (error) {
            this.logger.error(`Error fetching attachments for message ${messageId}:`, error);
            throw error;
        }
    }

    /**
     * Download a specific attachment by ID
     */
    async downloadAttachment(messageId: string, attachmentId: string): Promise<{
        name: string;
        contentType: string;
        contentBytes: string;
        size: number;
    }> {
        try {
            const client = this.getClient();

            const attachment = await client
                .api(`/users/${this.emailAccount}/messages/${messageId}/attachments/${attachmentId}`)
                .get();

            this.logger.log(`Downloaded attachment: ${attachment.name} (${attachment.size} bytes)`);

            return {
                name: attachment.name,
                contentType: attachment.contentType,
                contentBytes: attachment.contentBytes,
                size: attachment.size,
            };
        } catch (error) {
            this.logger.error(`Error downloading attachment ${attachmentId}:`, error);
            throw error;
        }
    }

    /**
     * Reply to an email via sendMail (requires only Mail.Send permission).
     * The body already contains the quoted original assembled by the frontend.
     */
    async replyToEmail(
        messageId: string,
        body: string,
        attachments?: { name: string; contentBytes: string; contentType: string }[],
        to?: string,
        subject?: string,
        fromAccount?: string,
    ): Promise<boolean> {
        // MOCK FOR DEV
        if (!this.tenantId || !this.clientId || !this.clientSecret || this.tenantId === 'development-disabled') {
            this.logger.warn(`[DEV MOCK] Reply simulado al mensaje: ${messageId}`);
            return true;
        }

        if (!to || !subject) {
            this.logger.error('replyToEmail: to and subject are required');
            throw new Error('to and subject are required to send a reply');
        }

        try {
            const client = this.getClient();
            // Cuenta remitente según el buzón del correo original (judicial vs correos).
            const mailbox = fromAccount || this.emailAccount;

            const graphAttachments = attachments?.map(att => ({
                '@odata.type': '#microsoft.graph.fileAttachment',
                name: att.name,
                contentBytes: att.contentBytes,
                contentType: att.contentType,
            })) || [];

            const message: any = {
                message: {
                    subject,
                    body: {
                        contentType: 'HTML',
                        content: body,
                    },
                    toRecipients: [{ emailAddress: { address: to } }],
                    from: { emailAddress: { address: mailbox } },
                    ...(graphAttachments.length > 0 && { attachments: graphAttachments }),
                },
                saveToSentItems: true,
            };

            await client
                .api(`/users/${mailbox}/sendMail`)
                .post(message);

            this.logger.log(`Reply sent from ${mailbox} to ${to} for original message ${messageId}`);
            return true;
        } catch (error) {
            this.logger.error(`Error replying to message ${messageId}:`, error);
            throw error;
        }
    }

    /**
     * Busca destinatarios sugeridos para autocompletar el campo "Destinatarios",
     * combinando contactos personales del buzón (Contacts.Read), personas frecuentes
     * (People.Read.All) y el directorio institucional de Azure AD (User.Read.All).
     * Los permisos son de aplicación (app-only): si alguno no está concedido, esa
     * fuente simplemente se omite en lugar de romper toda la búsqueda.
     */
    async searchRecipients(query: string, mailbox?: string): Promise<GraphRecipientSuggestion[]> {
        const q = query.trim();
        if (q.length < 2) return [];

        if (!this.tenantId || !this.clientId || !this.clientSecret || this.tenantId === 'development-disabled') {
            this.logger.warn(`[DEV MOCK] Búsqueda de destinatarios deshabilitada (sin credenciales Azure): "${q}"`);
            return [];
        }

        const account = mailbox || this.emailAccount;
        const client = this.getClient();
        const escaped = q.replace(/"/g, '\\"');

        const [peopleResult, contactsResult, directoryResult] = await Promise.allSettled([
            client
                .api(`/users/${account}/people`)
                .search(`"${escaped}"`)
                .top(10)
                .select('displayName,scoredEmailAddresses')
                .get(),
            client
                .api(`/users/${account}/contacts`)
                .search(`"displayName:${escaped}"`)
                .top(10)
                .select('displayName,emailAddresses')
                .get(),
            client
                .api('/users')
                .header('ConsistencyLevel', 'eventual')
                .search(`"displayName:${escaped}" OR "mail:${escaped}"`)
                .count(true)
                .top(10)
                .select('displayName,mail,userPrincipalName')
                .get(),
        ]);

        const suggestions = new Map<string, GraphRecipientSuggestion>();
        const addSuggestion = (name: string | undefined, email: string | undefined, source: GraphRecipientSuggestion['source']) => {
            const addr = (email || '').trim().toLowerCase();
            if (!addr || !addr.includes('@')) return;
            if (!suggestions.has(addr)) {
                suggestions.set(addr, { name: name?.trim() || addr, email: addr, source });
            }
        };

        if (peopleResult.status === 'fulfilled') {
            for (const person of peopleResult.value?.value || []) {
                addSuggestion(person.displayName, person.scoredEmailAddresses?.[0]?.address, 'frecuente');
            }
        } else {
            this.logger.warn(`Búsqueda de personas frecuentes no disponible (¿falta People.Read.All?): ${peopleResult.reason?.message || peopleResult.reason}`);
        }

        if (contactsResult.status === 'fulfilled') {
            for (const contact of contactsResult.value?.value || []) {
                addSuggestion(contact.displayName, contact.emailAddresses?.[0]?.address, 'contacto');
            }
        } else {
            this.logger.warn(`Búsqueda de contactos no disponible (¿falta Contacts.Read?): ${contactsResult.reason?.message || contactsResult.reason}`);
        }

        if (directoryResult.status === 'fulfilled') {
            for (const user of directoryResult.value?.value || []) {
                addSuggestion(user.displayName, user.mail || user.userPrincipalName, 'directorio');
            }
        } else {
            this.logger.warn(`Búsqueda en el directorio institucional no disponible (¿falta User.Read.All?): ${directoryResult.reason?.message || directoryResult.reason}`);
        }

        return Array.from(suggestions.values()).slice(0, 10);
    }
}

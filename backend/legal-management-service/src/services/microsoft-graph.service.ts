import { Injectable, Logger } from '@nestjs/common';
import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';

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
}

@Injectable()
export class MicrosoftGraphService {
    private readonly logger = new Logger(MicrosoftGraphService.name);
    private graphClient: Client | null = null;

    private readonly tenantId = process.env.AZURE_TENANT_ID || '';
    private readonly clientId = process.env.AZURE_CLIENT_ID || '';
    private readonly clientSecret = process.env.AZURE_CLIENT_SECRET || '';
    private readonly emailAccount = process.env.EMAIL_ACCOUNT_QA || 'desarrollo.ccd@esap.edu.co';

    private getClient(): Client {
        if (this.graphClient) {
            return this.graphClient;
        }

        if (!this.tenantId || !this.clientId || !this.clientSecret) {
            throw new Error('Azure credentials not configured. Check AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET in .env');
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
                .select('id,subject,from,toRecipients,receivedDateTime,bodyPreview,hasAttachments,isRead')
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
                .select('id,subject,from,toRecipients,receivedDateTime,bodyPreview,hasAttachments,isRead')
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
                .select('id,subject,from,toRecipients,receivedDateTime,bodyPreview,hasAttachments,isRead')
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
     * Send an email
     * IMPORTANT: From address MUST be the configured email account
     */
    async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
        try {
            const client = this.getClient();

            const message = {
                message: {
                    subject,
                    body: {
                        contentType: 'HTML',
                        content: body,
                    },
                    toRecipients: [
                        {
                            emailAddress: {
                                address: to,
                            },
                        },
                    ],
                    from: {
                        emailAddress: {
                            address: this.emailAccount,
                        },
                    },
                },
                saveToSentItems: true,
            };

            await client
                .api(`/users/${this.emailAccount}/sendMail`)
                .post(message);

            this.logger.log(`Email sent to ${to} with subject: ${subject}`);
            return true;
        } catch (error) {
            this.logger.error(`Error sending email to ${to}:`, error);
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
}

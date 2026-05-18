import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { SendValidationCodeDto } from './dto/send-validation-code.dto';
import { SendEmailAttachmentDto } from './dto/send-email-attachment.dto';
import { SendEmailDto } from './dto/send-email.dto';

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

type MicrosoftGraphConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  emailAccount: string;
};

type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
};

type EmailProvider = 'smtp' | 'microsoft_graph';

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);
  private transporter: nodemailer.Transporter | null = null;
  private graphClient: Client | null = null;

  private getSmtpConfig(): SmtpConfig | null {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
      this.logger.warn('SMTP no configurado. Variables requeridas: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM');
      return null;
    }

    return {
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      user: SMTP_USER,
      pass: SMTP_PASS,
      from: SMTP_FROM,
    };
  }

  private async getTransporter(config: SmtpConfig): Promise<nodemailer.Transporter> {
    if (!this.transporter) {
      const transportConfig: SMTPTransport.Options = {
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      };

      this.transporter = nodemailer.createTransport(transportConfig);
    }

    return this.transporter;
  }

  private getConfiguredProvider(): EmailProvider {
    const provider = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase();

    if (provider === 'microsoft' || provider === 'microsoft_graph' || provider === 'graph') {
      return 'microsoft_graph';
    }

    if (provider === 'smtp') {
      return 'smtp';
    }

    return this.hasMicrosoftGraphEnv() ? 'microsoft_graph' : 'smtp';
  }

  private hasMicrosoftGraphEnv(): boolean {
    return Boolean(
      process.env.AZURE_TENANT_ID &&
        process.env.AZURE_CLIENT_ID &&
        process.env.AZURE_CLIENT_SECRET &&
        process.env.NOTIFICATIONS_EMAIL_ACCOUNT,
    );
  }

  private getMicrosoftGraphConfig(): MicrosoftGraphConfig | null {
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const emailAccount = process.env.NOTIFICATIONS_EMAIL_ACCOUNT;

    if (!tenantId || !clientId || !clientSecret || !emailAccount || tenantId === 'development-disabled') {
      this.logger.warn(
        'Microsoft Graph no configurado. Variables requeridas: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, NOTIFICATIONS_EMAIL_ACCOUNT',
      );
      return null;
    }

    return { tenantId, clientId, clientSecret, emailAccount };
  }

  private getGraphClient(config: MicrosoftGraphConfig): Client {
    if (this.graphClient) {
      return this.graphClient;
    }

    const credential = new ClientSecretCredential(config.tenantId, config.clientId, config.clientSecret);
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default'],
    });

    this.graphClient = Client.initWithMiddleware({ authProvider });
    this.logger.log(`Microsoft Graph inicializado para ${config.emailAccount}`);
    return this.graphClient;
  }

  private async sendMail(payload: EmailPayload): Promise<{ sent: boolean }> {
    const provider = this.getConfiguredProvider();

    if (provider === 'microsoft_graph') {
      return this.sendWithMicrosoftGraph(payload);
    }

    return this.sendWithSmtp(payload);
  }

  private async sendWithSmtp(payload: EmailPayload): Promise<{ sent: boolean }> {
    const config = this.getSmtpConfig();
    if (!config) {
      throw new BadRequestException('SMTP no configurado, no se puede enviar el email');
    }

    const transporter = await this.getTransporter(config);
    await transporter.sendMail({
      from: config.from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      attachments: payload.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
      })),
    });

    return { sent: true };
  }

  private async sendWithMicrosoftGraph(payload: EmailPayload): Promise<{ sent: boolean }> {
    const config = this.getMicrosoftGraphConfig();
    if (!config) {
      throw new BadRequestException('Microsoft Graph no configurado, no se puede enviar el email');
    }

    const client = this.getGraphClient(config);
    const attachments =
      payload.attachments?.map((attachment) => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: attachment.filename,
        contentBytes: attachment.content.toString('base64'),
        contentType: attachment.contentType,
      })) || [];

    const message = {
      message: {
        subject: payload.subject,
        body: {
          contentType: payload.html ? 'HTML' : 'Text',
          content: payload.html || payload.text,
        },
        toRecipients: [
          {
            emailAddress: {
              address: payload.to,
            },
          },
        ],
        ...(attachments.length > 0 && { attachments }),
      },
      saveToSentItems: true,
    };

    await client.api(`/users/${config.emailAccount}/sendMail`).post(message);
    return { sent: true };
  }

  async sendValidationCode(data: SendValidationCodeDto) {
    const subject = data.subject ?? 'Código de validación - Certificado Laboral ESAP';
    const mailPayload: EmailPayload = {
      to: data.to,
      subject,
      text: `Tu código de validación es: ${data.code}\n\nEste código es válido por un tiempo limitado.`,
      html: `
        <div style="font-family: Arial,'Helvetica Neue',sans-serif; background-color: #f0f4f8; padding: 32px 16px; margin: 0;">
          <table width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr><td align="center">
              <table cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #dde3ed;">
                <tr>
                  <td style="background-image:linear-gradient(135deg,#003DA5 0%,#1565C0 100%);background-color:#003DA5;padding:0;">
                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr><td style="height:4px;background-color:#60A5FA;font-size:0;line-height:0;">&nbsp;</td></tr>
                      <tr>
                        <td style="padding:22px 28px 18px 28px;">
                          <table width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
                            <td><div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">ESAP</div><div style="font-size:10px;color:rgba(255,255,255,0.7);margin-top:2px;letter-spacing:0.8px;text-transform:uppercase;">Certificados y Registros</div></td>
                            <td align="right"><span style="background-color:rgba(255,255,255,0.18);color:#ffffff;font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;">Verificación</span></td>
                          </tr></table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 28px 8px 28px;">
                    <h1 style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#111827;">Código de validación</h1>
                    <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">Ingresa este código para continuar con tu solicitud de certificado. Es de un solo uso y tiene vigencia limitada.</p>
                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr><td align="center" style="padding:8px 0 24px 0;">
                        <div style="display:inline-block;background-color:#eff6ff;border:2px solid #bfdbfe;border-radius:10px;padding:16px 48px;">
                          <span style="font-size:32px;font-weight:800;color:#1d4ed8;letter-spacing:6px;">${data.code}</span>
                        </div>
                      </td></tr>
                    </table>
                    <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fefce8;border:1px solid #fde68a;border-radius:8px;margin-bottom:24px;">
                      <tr><td style="padding:12px 16px;font-size:13px;color:#92400e;line-height:1.5;">&#9888; Si no solicitaste este código, puedes ignorar este mensaje con seguridad.</td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 28px 18px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;">ESAP — Escuela Superior de Administración Pública</p>
                    
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </div>
      `,
    };

    try {
      await this.sendMail(mailPayload);
      this.logger.log(`Código de validación enviado a ${data.to}`);
      return { sent: true };
    } catch (error) {
      this.logger.error(`Error al enviar el código a ${data.to}: ${error?.message || error}`);
      throw new InternalServerErrorException('No se pudo enviar el email de validación');
    }
  }

  async sendEmailWithAttachment(data: SendEmailAttachmentDto) {
    let contentBuffer: Buffer;
    try {
      contentBuffer = Buffer.from(data.attachmentBase64, 'base64');
      this.logger.log(`Attachment decoded: ${contentBuffer.length} bytes for ${data.attachmentName}`);
    } catch (error) {
      throw new BadRequestException('El adjunto no es un base64 válido');
    }

    const mailPayload: EmailPayload = {
      to: data.to,
      subject: data.subject,
      text: data.text || 'Se adjunta el archivo solicitado.',
      html: data.html || this.buildAttachmentTemplate(data),
      attachments: [
        {
          filename: data.attachmentName,
          content: contentBuffer,
          contentType: data.attachmentContentType || 'application/octet-stream',
        },
      ],
    };

    try {
      await this.sendMail(mailPayload);
      this.logger.log(`Email con adjunto enviado a ${data.to} (${data.attachmentName})`);
      return { sent: true };
    } catch (error) {
      this.logger.error(`Error al enviar email con adjunto a ${data.to}: ${error?.message || error}`, error?.stack || '');
      throw new InternalServerErrorException('No se pudo enviar el email con adjunto');
    }
  }

  async sendEmail(data: SendEmailDto) {
    const mailPayload: EmailPayload = {
      to: data.to,
      subject: data.subject,
      text: data.text || 'Notificacion ESAP',
      html:
        data.html ||
        `
          <div style="font-family: Arial,'Helvetica Neue',sans-serif; background-color: #f0f4f8; padding: 32px 16px; margin: 0;">
            <table width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center">
              <table cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #dde3ed;">
                <tr>
                  <td style="background-image:linear-gradient(135deg,#003DA5 0%,#1565C0 100%);background-color:#003DA5;padding:0;">
                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr><td style="height:4px;background-color:#60A5FA;font-size:0;line-height:0;">&nbsp;</td></tr>
                      <tr><td style="padding:22px 28px 18px 28px;">
                        <table width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
                          <td><div style="font-size:20px;font-weight:800;color:#ffffff;">ESAP</div><div style="font-size:10px;color:rgba(255,255,255,0.7);margin-top:2px;letter-spacing:0.8px;text-transform:uppercase;">Notificaciones</div></td>
                          <td align="right"><span style="background-color:rgba(255,255,255,0.18);color:#ffffff;font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;">Aviso</span></td>
                        </tr></table>
                      </td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 28px 28px 28px;">
                    <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#111827;">${data.subject}</h1>
                    <p style="margin:0;font-size:14px;color:#4b5563;line-height:1.7;">${data.text || 'Notificación ESAP'}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 28px 18px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;">ESAP — Escuela Superior de Administración Pública</p>
                    
                  </td>
                </tr>
              </table>
            </td></tr></table>
          </div>
        `,
    };

    try {
      await this.sendMail(mailPayload);
      this.logger.log(`Email enviado a ${data.to}`);
      return { sent: true };
    } catch (error) {
      this.logger.error(`Error al enviar email a ${data.to}: ${error?.message || error}`);
      throw new InternalServerErrorException('No se pudo enviar el email');
    }
  }

  private buildAttachmentTemplate(data: SendEmailAttachmentDto): string {
    const message = data.text || 'Se adjunta el archivo solicitado.';
    return `
      <div style="font-family: Arial,'Helvetica Neue',sans-serif; background-color: #f0f4f8; padding: 32px 16px; margin: 0;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center">
          <table cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #dde3ed;">
            <tr>
              <td style="background-image:linear-gradient(135deg,#003DA5 0%,#1565C0 100%);background-color:#003DA5;padding:0;">
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr><td style="height:4px;background-color:#34D399;font-size:0;line-height:0;">&nbsp;</td></tr>
                  <tr><td style="padding:22px 28px 18px 28px;">
                    <table width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
                      <td><div style="font-size:20px;font-weight:800;color:#ffffff;">ESAP</div><div style="font-size:10px;color:rgba(255,255,255,0.7);margin-top:2px;letter-spacing:0.8px;text-transform:uppercase;">Documentos</div></td>
                      <td align="right"><span style="background-color:rgba(52,211,153,0.25);color:#ffffff;font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;">Documento adjunto</span></td>
                    </tr></table>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 8px 28px;">
                <h1 style="margin:0 0 6px 0;font-size:20px;font-weight:700;color:#111827;">${data.subject || 'Documento adjunto'}</h1>
                <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">${message}</p>
                <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:12px 16px;">
                    <span style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.5px;">Archivo adjunto</span><br>
                    <span style="font-size:14px;font-weight:600;color:#111827;margin-top:4px;display:inline-block;">${data.attachmentName}</span>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 28px 18px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">ESAP — Escuela Superior de Administración Pública</p>
                
              </td>
            </tr>
          </table>
        </td></tr></table>
      </div>
    `;
  }
}

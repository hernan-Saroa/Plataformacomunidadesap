import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
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

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);
  private transporter: nodemailer.Transporter | null = null;

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
      };

      this.transporter = nodemailer.createTransport(transportConfig);
    }

    return this.transporter;
  }

  async sendValidationCode(data: SendValidationCodeDto) {
    const config = this.getSmtpConfig();
    if (!config) {
      throw new BadRequestException('SMTP no configurado, no se puede enviar el código');
    }

    const transporter = await this.getTransporter(config);
    const subject = data.subject ?? 'Código de validación - Certificado Laboral ESAP';

    const mailOptions = {
      from: config.from,
      to: data.to,
      subject,
      text: `Tu código de validación es: ${data.code}\n\nEste código es válido por un tiempo limitado.`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; background: #f5f7fb; padding: 24px; color: #1f2937;">
          <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; border: 1px solid #0b68d1; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.3);">
            <tr>
              <td style="background: linear-gradient(135deg, #003DA5 0%, #0b68d1 100%); padding: 18px 24px; color: #ffffff; font-weight: 700; font-size: 18px;">
                Certificados ESAP
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
                Código de validación
              </td>
            </tr>
            <tr>
              <td style="padding: 0 24px 12px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
                Usa este código para validar tu solicitud de certificado. Es válido por tiempo limitado.
              </td>
            </tr>
            <tr>
              <td style="padding: 0 24px 18px 24px; text-align: center;">
                <div style="display: inline-block; background: #f0f7ff; color: #0b68d1; font-weight: 800; font-size: 24px; letter-spacing: 2px; padding: 12px 40px; border-radius: 10px; border: 2px solid #d7e9ff;">
                  ${data.code}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 24px 18px 24px; font-size: 13px; color: #6b7280;">
                Si no solicitaste este código, puedes ignorar este mensaje.
              </td>
            </tr>
            <tr>
              <td style="padding: 15px 24px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
                ESAP - Escuela Superior de Administración Pública
              </td>
            </tr>
          </table>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      this.logger.log(`Código de validación enviado a ${data.to}`);
      return { sent: true };
    } catch (error) {
      this.logger.error(`Error al enviar el código a ${data.to}: ${error?.message || error}`);
      throw new InternalServerErrorException('No se pudo enviar el email de validación');
    }
  }

  async sendEmailWithAttachment(data: SendEmailAttachmentDto) {
    const config = this.getSmtpConfig();
    if (!config) {
      throw new BadRequestException('SMTP no configurado, no se puede enviar el email con adjunto');
    }

    let contentBuffer: Buffer;
    try {
      contentBuffer = Buffer.from(data.attachmentBase64, 'base64');
    } catch (error) {
      throw new BadRequestException('El adjunto no es un base64 válido');
    }

    const transporter = await this.getTransporter(config);

    const mailOptions = {
      from: config.from,
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
      await transporter.sendMail(mailOptions);
      this.logger.log(`Email con adjunto enviado a ${data.to} (${data.attachmentName})`);
      return { sent: true };
    } catch (error) {
      this.logger.error(`Error al enviar email con adjunto a ${data.to}: ${error?.message || error}`);
      throw new InternalServerErrorException('No se pudo enviar el email con adjunto');
    }
  }

  async sendEmail(data: SendEmailDto) {
    const config = this.getSmtpConfig();
    if (!config) {
      throw new BadRequestException('SMTP no configurado, no se puede enviar el email');
    }

    const transporter = await this.getTransporter(config);

    const mailOptions = {
      from: config.from,
      to: data.to,
      subject: data.subject,
      text: data.text || 'Notificacion ESAP',
      html:
        data.html ||
        `
          <div style="font-family: 'Inter', Arial, sans-serif; background: #f5f7fb; padding: 24px; color: #1f2937;">
            <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; border: 1px solid #0b68d1; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.3);">
              <tr>
                <td style="background: linear-gradient(135deg, #003DA5 0%, #0b68d1 100%); padding: 18px 24px; color: #ffffff; font-weight: 700; font-size: 18px;">
                  Notificaciones ESAP
                </td>
              </tr>
              <tr>
                <td style="padding: 24px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
                  ${data.subject}
                </td>
              </tr>
              <tr>
                <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
                  ${data.text || 'Notificacion ESAP'}
                </td>
              </tr>
              <tr>
                <td style="padding: 15px 24px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
                  ESAP - Escuela Superior de Administracion Publica
                </td>
              </tr>
            </table>
          </div>
        `,
    };

    try {
      await transporter.sendMail(mailOptions);
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
      <div style="font-family: 'Inter', Arial, sans-serif; background: #f5f7fb; padding: 24px; color: #1f2937;">
        <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; border: 1px solid #0b68d1; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.3);">
          <tr>
            <td style="background: linear-gradient(135deg, #003DA5 0%, #0b68d1 100%); padding: 18px 24px; color: #ffffff; font-weight: 700; font-size: 18px;">
              Notificaciones ESAP
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 24px 8px 24px; font-size: 16px; font-weight: 600; color: #111827;">
              ${data.subject || 'Documento adjunto'}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px 24px; font-size: 14px; color: #4b5563; line-height: 1.6;">
              ${message}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 18px 24px; font-size: 13px; color: #6b7280;">
              Archivo adjunto: <strong>${data.attachmentName}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding: 15px 24px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
              ESAP - Escuela Superior de Administración Pública
            </td>
          </tr>
        </table>
      </div>
    `;
  }
}

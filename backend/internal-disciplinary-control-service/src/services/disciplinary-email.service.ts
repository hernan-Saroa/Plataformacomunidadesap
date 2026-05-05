import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DisciplinaryEmailService {
  private readonly logger = new Logger(DisciplinaryEmailService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Envía un correo de notificación de reasignación a un profesional
   */
  async sendReassignmentEmail(
    to: string,
    radicadoProceso: string,
    profesionalNombre: string,
    justificacion: string,
    observacionesJefe?: string,
  ): Promise<boolean> {
    const notificationsUrl = process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3009';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; color: #1f2937; line-height: 1.6; background-color: #f3f4f6; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #003DA5 0%, #2563EB 100%); color: white; padding: 32px 24px; text-align: center; }
          .content { padding: 32px; }
          .info-box { background-color: #f9fafb; padding: 24px; border-radius: 8px; margin: 24px 0; border: 1px solid #f3f4f6; }
          .footer { background-color: #f9fafb; padding: 24px; font-size: 12px; color: #6b7280; text-align: center; border-top: 1px solid #f3f4f6; }
          .btn { display: inline-block; background-color: #2563EB; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0; font-size: 24px;">Control Interno Disciplinario</h1>
            <p style="margin:8px 0 0 0; opacity: 0.9;">Notificación de Reasignación</p>
          </div>
          <div class="content">
            <h2 style="margin-top:0; color: #111827;">Hola, ${profesionalNombre}</h2>
            <p>Se te ha reasignado formalmente un nuevo proceso disciplinario en la plataforma SIGL-ESAP.</p>
            
            <div class="info-box">
              <p style="margin-top:0;"><strong>Radicado del Proceso:</strong><br><span style="color: #2563EB; font-size: 18px; font-weight: 700;">${radicadoProceso}</span></p>
              <p><strong>Justificación:</strong><br>${justificacion}</p>
              ${observacionesJefe ? `<p><strong>Observaciones del Jefe:</strong><br>${observacionesJefe}</p>` : ''}
            </div>
            
            <p>Por favor, ingresa a la plataforma para revisar los detalles del expediente y continuar con el trámite correspondiente.</p>
            
            <div style="text-align: center;">
              <a href="#" class="btn">Ir a la Plataforma</a>
            </div>
          </div>
          <div class="footer">
            <p><strong>ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP</strong><br>Oficina de Control Interno Disciplinario</p>
            <p style="margin-top: 8px;">Este correo fue generado automáticamente. Por favor no responder.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await firstValueFrom(
        this.httpService.post(`${notificationsUrl}/api/v1/emails/send`, {
          to,
          subject: `[REASIGNACIÓN] Nuevo proceso asignado: ${radicadoProceso}`,
          html,
        }),
      );
      this.logger.log(`Email de reasignación enviado exitosamente a ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando email de reasignación a ${to}: ${error.message}`);
      return false;
    }
  }
}

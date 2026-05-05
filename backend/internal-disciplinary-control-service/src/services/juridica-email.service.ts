import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class JuridicaEmailService {
  private readonly logger = new Logger(JuridicaEmailService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Envía correo a la oficina de jurídica usando el notifications-service.
   * POST http://notifications-service:3009/api/v1/emails/send
   */
  async enviarCorreoJuridica(
    processId: string,
    datosConsolidados: {
      radicado: string;
      etapaAlCierre: string;
      profesionalResponsable: string;
      fechaCreacion: string;
      fechaCierre: string;
      fechaVencimiento: string;
      disciplinable: any;
      hechos: string;
      autosGenerados: number;
      historialEtapas: string;
    },
  ): Promise<boolean> {
    const destinatario = process.env.JURIDICA_EMAIL || 'juridica@esap.edu.co';
    const notificationsUrl = process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3009';

    const disciplinable = datosConsolidados.disciplinable || {};
    const nombreDisciplinable = disciplinable.nombre || disciplinable.nombreCompleto || 'No registrado';
    const identificacionDisciplinable = disciplinable.cedula || disciplinable.identificacion || 'No registrado';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
          .header { background: #003DA5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .info-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .info-table td { padding: 8px 12px; border: 1px solid #ddd; }
          .info-table td:first-child { background: #F3F4F6; font-weight: bold; width: 200px; }
          .footer { background: #F9FAFB; padding: 15px 20px; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
          .badge-cerrado { background: #FEF3C7; color: #92400E; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>ESCUELA SUPERIOR DE ADMINISTRACI&Oacute;N P&Uacute;BLICA - ESAP</h2>
          <h3>Oficina de Control Interno Disciplinario</h3>
          <p>Traslado de Proceso por Auto Pliego de Cargos</p>
        </div>
        <div class="content">
          <p>Estimada Oficina Jur&iacute;dica,</p>
          <p>Se informa que el siguiente proceso disciplinario ha sido <strong>cerrado</strong> mediante Auto Pliego de Cargos y se traslada a su despacho para la continuaci&oacute;n del tr&aacute;mite correspondiente.</p>

          <h3>Informaci&oacute;n del Proceso</h3>
          <table class="info-table">
            <tr><td>Radicado</td><td><strong>${datosConsolidados.radicado}</strong></td></tr>
            <tr><td>Estado</td><td><span class="badge badge-cerrado">CERRADO</span></td></tr>
            <tr><td>Etapa al momento del cierre</td><td>${datosConsolidados.etapaAlCierre}</td></tr>
            <tr><td>Profesional responsable</td><td>${datosConsolidados.profesionalResponsable}</td></tr>
            <tr><td>Fecha de apertura</td><td>${datosConsolidados.fechaCreacion}</td></tr>
            <tr><td>Fecha de cierre</td><td>${datosConsolidados.fechaCierre}</td></tr>
            <tr><td>Fecha de vencimiento</td><td>${datosConsolidados.fechaVencimiento}</td></tr>
            <tr><td>Autos generados</td><td>${datosConsolidados.autosGenerados}</td></tr>
          </table>

          <h3>Datos del Disciplinable</h3>
          <table class="info-table">
            <tr><td>Nombre</td><td>${nombreDisciplinable}</td></tr>
            <tr><td>Identificaci&oacute;n</td><td>${identificacionDisciplinable}</td></tr>
          </table>

          <h3>Hechos</h3>
          <div style="background: #F9FAFB; padding: 12px; border-radius: 8px; border: 1px solid #E5E7EB;">
            ${datosConsolidados.hechos || '<em>No registrados</em>'}
          </div>

          <p style="margin-top: 20px;">
            <strong>Nota:</strong> El expediente completo del proceso se encuentra disponible en el Sistema Integrado de Gesti&oacute;n Legal (SIGL) de la ESAP.
          </p>
        </div>
        <div class="footer">
          <p>Este correo fue generado autom&aacute;ticamente por el m&oacute;dulo de Control Disciplinario del SIGL - ESAP.</p>
          <p>Fecha de env&iacute;o: ${new Date().toLocaleString('es-CO')}</p>
        </div>
      </body>
      </html>
    `;

    try {
      await firstValueFrom(
        this.httpService.post(`${notificationsUrl}/api/v1/emails/send`, {
          to: destinatario,
          subject: `[PLIEGO DE CARGOS] Proceso ${datosConsolidados.radicado} - Traslado a Oficina Jurídica`,
          html,
        }),
      );

      this.logger.log(`Correo enviado a jurídica para proceso ${processId} vía notifications-service`);
      return true;
    } catch (error) {
      this.logger.error(`Error al enviar correo para proceso ${processId}: ${error.message}`);
      return false;
    }
  }
}

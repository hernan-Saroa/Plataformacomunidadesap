import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Ip,
  Req,
} from '@nestjs/common';
import { CompartirExpedienteService } from '../services/compartir-expediente.service';
import { CrearCompartidoDto, AccederCompartidoDto } from '../dtos/compartir-expediente.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import type { Request as ExpressRequest } from 'express';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Controller('compartir-expediente')
export class CompartirExpedienteController {
  constructor(
    private readonly compartirService: CompartirExpedienteService,
    private httpService: HttpService,
  ) {}

  /**
   * Obtener la URL base del frontend desde los headers
   * Sigue el mismo patrón que graduation-certificates.controller
   */
  private getFrontendBaseUrl(req: ExpressRequest): string | undefined {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const referer = typeof req.headers.referer === 'string' ? req.headers.referer : undefined;
    let frontendBaseUrl = origin;
    if (!frontendBaseUrl && referer) {
      try {
        frontendBaseUrl = new URL(referer).origin;
      } catch (_) {
        frontendBaseUrl = undefined;
      }
    }
    return frontendBaseUrl;
  }

  /**
   * Crear un nuevo enlace compartido
   */
  @UseGuards(JwtAuthGuard)
  @Post(':procesoId')
  async crearCompartido(
    @Param('procesoId') procesoId: string,
    @Body() dto: CrearCompartidoDto,
    @Request() req: any,
    @Req() expressReq: ExpressRequest,
  ) {
    const usuarioId = req.user?.id;
    const compartido = await this.compartirService.crearCompartido(procesoId, dto, usuarioId);

    // Determinar la URL base del frontend:
    // 1. Primero: usar la URL proporcionada directamente por el cliente (prioridad más alta)
    // 2. Segundo: intentar obtener desde los headers (origin/referer)
    // 3. Tercero: usar variables de entorno del backend
    const frontendBaseUrl = dto.frontendBaseUrl || this.getFrontendBaseUrl(expressReq);
    const urlExpediente = this.compartirService.generarUrlPublica(compartido.tokenAcceso, frontendBaseUrl);

    // Si es tipo EMAIL, enviar el correo con el enlace
    if (dto.tipoCompartido === 'EMAIL' && dto.emailDestinatario) {
      try {
        const notificationsServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3009';
        console.log('📧 [CompartirExpediente] URL del servicio de notificaciones:', notificationsServiceUrl);

        // Construir contenido HTML del correo
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2962FF;">📋 Expediente Compartido - Control Disciplinario ESAP</h2>
            <p>Se ha compartido un expediente disciplinario con usted.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Enlace de acceso:</strong></p>
              <a href="${urlExpediente}" style="color: #2962FF; font-size: 16px;">${urlExpediente}</a>
            </div>
            ${dto.requiereClave && dto.clave ? `
              <p><strong>Clave de acceso:</strong> ${dto.clave}</p>
            ` : ''}
            ${dto.mensajeAdicional ? `
              <p><strong>Mensaje adicional:</strong></p>
              <p>${dto.mensajeAdicional}</p>
            ` : ''}
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Este enlace fue generado por el Sistema de Gestión Integral de la ESAP.
              ${compartido.tiempoExpiracionHoras ? ` | Expira en ${compartido.tiempoExpiracionHoras} horas.` : ''}
            </p>
          </div>
        `;

        const emailPayload = {
          to: dto.emailDestinatario,
          subject: `📋 Expediente Compartido - ESAP Control Disciplinario`,
          text: `Se ha compartido un expediente disciplinario con usted.\n\nEnlace: ${urlExpediente}${dto.requiereClave && dto.clave ? `\nClave: ${dto.clave}` : ''}`,
          html: emailHtml,
        };

        console.log('📧 [CompartirExpediente] Enviando correo a:', dto.emailDestinatario);

        const response = await firstValueFrom(
          this.httpService.post(`${notificationsServiceUrl}/api/v1/emails/send`, emailPayload),
        );

        console.log('📧 [CompartirExpediente] Correo enviado exitosamente:', response.data);
      } catch (error) {
        console.error('❌ [CompartirExpediente] Error al enviar correo:', error);
        // No fallamos la operación si el correo falla, pero registramos el error
      }
    }

    return {
      id: compartido.id,
      token: compartido.tokenAcceso,
      url: urlExpediente,
      urlQR: this.compartirService.generarUrlQR(compartido.tokenAcceso, frontendBaseUrl),
      tipoCompartido: compartido.tipoCompartido,
      requiereClave: compartido.requiereClave,
      tiempoExpiracionHoras: compartido.tiempoExpiracionHoras,
      fechaExpiracion: compartido.fechaExpiracion,
      emailDestinatario: compartido.emailDestinatario,
      createdAt: compartido.createdAt,
    };
  }

  /**
   * Listar todos los enlaces compartidos de un proceso
   */
  @UseGuards(JwtAuthGuard)
  @Get('proceso/:procesoId')
  async listarPorProceso(@Param('procesoId') procesoId: string) {
    const enlaces = await this.compartirService.listarPorProceso(procesoId);
    return enlaces.map((enlace) => ({
      id: enlace.id,
      token: enlace.tokenAcceso.substring(0, 8) + '...',
      tipoCompartido: enlace.tipoCompartido,
      estado: enlace.estado,
      requiereClave: enlace.requiereClave,
      tiempoExpiracionHoras: enlace.tiempoExpiracionHoras,
      fechaExpiracion: enlace.fechaExpiracion,
      contadorAccesos: enlace.contadorAccesos,
      ultimoAcceso: enlace.ultimoAcceso,
      createdAt: enlace.createdAt,
    }));
  }

  /**
   * Desactivar un enlace compartido
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/desactivar')
  async desactivar(@Param('id') id: string) {
    const enlace = await this.compartirService.desactivar(id);
    return {
      id: enlace.id,
      estado: enlace.estado,
      message: 'Enlace compartido desactivado exitosamente',
    };
  }

  /**
   * Verificar acceso a un enlace compartido (público)
   * Cambiado a GET para evitar problemas con autenticación
   */
  @Public()
  @Get('verificar/:token')
  async verificarAcceso(
    @Param('token') token: string,
    @Query('clave') clave: string,
    @Ip() ip: string,
  ) {
    return this.compartirService.verificarAcceso({ token, clave }, ip);
  }

  /**
   * Obtener datos públicos del expediente compartido (sin autenticación)
   * Este endpoint es público y retorna información básica del proceso
   */
  @Public()
  @Get('publico/:token')
  async obtenerExpedientePublico(
    @Param('token') token: string,
    @Req() req: ExpressRequest,
  ) {
    const frontendBaseUrl = this.getFrontendBaseUrl(req);
    return this.compartirService.obtenerExpedientePublico(token, frontendBaseUrl);
  }

  /**
   * Página pública para ver el expediente compartido
   * Este endpoint devuelve los datos necesarios para renderizar la página pública
   */
  @Public()
  @Get('vista/:token')
  async obtenerVistaPublica(
    @Param('token') token: string,
    @Req() req: ExpressRequest,
  ) {
    const frontendBaseUrl = this.getFrontendBaseUrl(req);
    return this.compartirService.obtenerExpedientePublico(token, frontendBaseUrl);
  }
}

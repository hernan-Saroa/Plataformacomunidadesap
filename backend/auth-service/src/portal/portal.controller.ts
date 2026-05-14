import { Controller, Get, Post, Put, Param, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Portal Controller - Endpoints para el Portal Transaccional
 * Rutas: /portal/*
 * 
 * Estos endpoints son consumidos por portalApi.ts del frontend shell.
 * Proveen datos de perfil, estadísticas y configuración para el usuario del portal.
 */
@Controller('portal')
export class PortalController {

  /**
   * POST /portal/inicializar
   * Inicializa los datos del portal para un usuario.
   * Devuelve OK inmediatamente (inicialización lazy).
   */
  @Post('inicializar')
  @HttpCode(HttpStatus.OK)
  inicializar(@Body() body: { personaId?: string }, @Req() req: Request & { user?: any }) {
    const user = req.user;
    return {
      ok: true,
      personaId: body?.personaId || user?.userId,
      message: 'Portal inicializado correctamente',
    };
  }

  /**
   * GET /portal/estadisticas/:id
   * Estadísticas del usuario en el portal (auditorías, certificados, etc.)
   */
  @Get('estadisticas/:id')
  getEstadisticas(@Param('id') id: string, @Req() req: Request & { user?: any }) {
    // Estadísticas básicas - se enriquecerán con datos reales en fases posteriores
    return {
      success: true,
      data: {
        procesosActivos: 0,
        pendientes: 0,
        completados: 0,
        cumplimiento: 0,
        enComunicacion: 2,
        enPlanMejora: 2,
        hallazgosTotales: 4,
        proximosAVencer: 0,
        incrementoSemana: 'Sin cambios',
        incrementoMes: 'Sin cambios',
        certificadosLaborales: 0,
        documentosCarpeta: 0,
        tieneCarpetaDigital: false,
        userId: id,
      },
    };
  }

  /**
   * GET /portal/perfil/:id
   * Perfil extendido del usuario para el portal
   */
  @Get('perfil/:id')
  getPerfil(@Param('id') id: string, @Req() req: Request & { user?: any }) {
    const user = req.user;
    return {
      success: true,
      data: {
        userId: id,
        email: user?.email || user?.username,
        nombre: user?.name,
        roles: user?.roles || [],
        configuracion: {
          notificacionesEmail: true,
          notificacionesPush: false,
          idiomaPreferido: 'es',
        },
      },
    };
  }

  /**
   * PUT /portal/perfil/:id
   * Actualiza el perfil del usuario en el portal
   */
  @Put('perfil/:id')
  updatePerfil(@Param('id') id: string, @Body() body: any) {
    return {
      success: true,
      data: { userId: id, ...body },
      message: 'Perfil actualizado',
    };
  }

  /**
   * PUT /portal/privacidad/:id
   * Actualiza configuración de privacidad
   */
  @Put('privacidad/:id')
  updatePrivacidad(@Param('id') id: string, @Body() body: any) {
    return {
      success: true,
      data: { userId: id, ...body },
    };
  }

  /**
   * GET /portal/certificados-laborales/:id
   * Certificados laborales del usuario
   */
  @Get('certificados-laborales/:id')
  getCertificadosLaborales(@Param('id') id: string) {
    return {
      success: true,
      data: [],
    };
  }

  /**
   * POST /portal/certificados-laborales/solicitar
   * Solicita un certificado laboral
   */
  @Post('certificados-laborales/solicitar')
  @HttpCode(HttpStatus.CREATED)
  solicitarCertificado(@Body() body: any) {
    return {
      success: true,
      message: 'Solicitud recibida',
      data: { id: Date.now().toString(), estado: 'pendiente', ...body },
    };
  }

  /**
   * GET /portal/carpeta-digital/:id
   * Carpeta digital del usuario
   */
  @Get('carpeta-digital/:id')
  getCarpetaDigital(@Param('id') id: string) {
    return {
      success: true,
      data: {
        documentos: [],
        tipos_requeridos: [],
        persona: null,
      },
    };
  }
}

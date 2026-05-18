import { Controller, Get, Post, Put, Param, Body, Req, HttpCode, HttpStatus, UploadedFile, UseInterceptors } from '@nestjs/common';
import type { Request } from 'express';
import { PortalService } from './portal.service';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Portal Controller - Endpoints para el Portal Transaccional
 * Rutas: /portal/*
 *
 * Estos endpoints son consumidos por portalApi.ts del frontend shell.
 */
@Public()
@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  /**
   * POST /portal/inicializar
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
   */
  @Get('estadisticas/:id')
  getEstadisticas(@Param('id') id: string) {
    return {
      success: true,
      data: {
        procesosActivos: 0,
        pendientes: 0,
        completados: 0,
        cumplimiento: 0,
        enComunicacion: 0,
        enPlanMejora: 0,
        hallazgosTotales: 0,
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
   * Retorna datos reales de la persona desde la DB.
   */
  @Get('perfil/:id')
  async getPerfil(@Param('id') id: string) {
    try {
      const data = await this.portalService.getPerfilByPersonId(id);
      return { success: true, data };
    } catch (err: any) {
      // Si no encuentra la persona, devuelve fallback vacío (no rompe el frontend)
      return {
        success: false,
        data: null,
        message: err?.message || 'Perfil no disponible',
      };
    }
  }

  /**
   * GET /portal/perfil/mi-perfil
   * Perfil del usuario autenticado (via cookie/JWT).
   */
  @Get('perfil/mi-perfil')
  async getMiPerfil(@Req() req: Request & { user?: any }) {
    const personId = req.user?.personId || req.user?.person?.id;
    if (!personId) return { success: false, data: null, message: 'Sin personId en token' };
    try {
      const data = await this.portalService.getPerfilByPersonId(personId);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, data: null, message: err?.message };
    }
  }

  /**
   * PUT /portal/perfil/:id
   * Actualiza campos editables del perfil en la DB.
   */
  @Put('perfil/:id')
  async updatePerfil(@Param('id') id: string, @Body() body: any) {
    try {
      const data = await this.portalService.updatePerfil(id, body);
      return { success: true, data, message: 'Perfil actualizado' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error al actualizar perfil' };
    }
  }

  /**
   * PUT /portal/privacidad/:id
   * Stub — configuración de privacidad (tabla futura).
   */
  @Put('privacidad/:id')
  updatePrivacidad(@Param('id') id: string, @Body() body: any) {
    return { success: true, data: { userId: id, ...body } };
  }

  /**
   * GET /portal/certificados-laborales/:id
   */
  @Get('certificados-laborales/:id')
  getCertificadosLaborales(@Param('id') id: string) {
    return { success: true, data: [] };
  }

  /**
   * POST /portal/certificados-laborales/solicitar
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
   */
  @Get('carpeta-digital/:id')
  getCarpetaDigital(@Param('id') id: string) {
    return {
      success: true,
      data: { documentos: [], tipos_requeridos: [], persona: null },
    };
  }

  /**
   * POST /portal/foto-perfil
   * Carga de foto de perfil.
   * Stub funcional — acepta la petición y devuelve success.
   * En producción se integrará con S3 / almacenamiento local.
   */
  @Post('foto-perfil')
  @HttpCode(HttpStatus.OK)
  uploadFotoPerfil(@Req() req: Request & { user?: any }) {
    return {
      success: true,
      message: 'Foto de perfil recibida (almacenamiento pendiente de configurar)',
      data: { url: null },
    };
  }
}


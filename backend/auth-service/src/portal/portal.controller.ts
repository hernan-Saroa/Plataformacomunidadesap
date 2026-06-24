import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req, HttpCode, HttpStatus, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import type { Request } from 'express';
import { PortalService } from './portal.service';
import { CarpetaDigitalService } from '../carpeta-digital/carpeta-digital.service';
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
  constructor(
    private readonly portalService: PortalService,
    private readonly carpetaDigitalService: CarpetaDigitalService,
  ) {}

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

  // ═══════════════════════════════════════════════════════════════════
  // CARPETA DIGITAL — wrappers que reutilizan CarpetaDigitalService.
  // Las rutas mantienen el prefijo /portal/* esperado por el shell.
  // El orden importa: rutas estáticas ANTES de las dinámicas (:id).
  // ═══════════════════════════════════════════════════════════════════

  /**
   * GET /portal/carpeta-digital/tipos-documentos
   * Catálogo global de tipos de documentos requeridos.
   */
  @Get('carpeta-digital/tipos-documentos')
  async getTiposDocumentos(@Query('carpetaDigitalId') carpetaDigitalId?: string) {
    const data = await this.carpetaDigitalService.getTiposDocumentos(carpetaDigitalId);
    return { success: true, data: Array.isArray(data) ? data : [] };
  }

  /**
   * GET /portal/carpeta-digital/:personaId/checklist
   * Tipos de documentos requeridos + carpeta de la persona.
   */
  @Get('carpeta-digital/:personaId/checklist')
  async getChecklistForPersona(@Param('personaId') personaId: string) {
    const cleanId = String(personaId || '').replace(/^carpeta:/, '');
    try {
      const data = await this.carpetaDigitalService.getChecklistForPersona(cleanId);
      return { success: true, data };
    } catch (err: any) {
      return { success: true, data: { useGlobalTypes: true, tiposDocumentos: [] }, message: err?.message };
    }
  }

  /**
   * GET /portal/carpeta-digital/:personaId/documentos
   * Documentos persistidos (UNIÓN auth.documento_carpeta_digital + RUND soportes).
   */
  @Get('carpeta-digital/:personaId/documentos')
  async getDocumentosByPersona(@Param('personaId') personaId: string) {
    try {
      const data = await this.carpetaDigitalService.listDocumentosByPersona(personaId);
      return { success: true, data: Array.isArray(data) ? data : [] };
    } catch (err: any) {
      return { success: true, data: [], message: err?.message };
    }
  }

  /**
   * POST /portal/carpeta-digital/upload
   * Sube un documento a la carpeta de una persona. Multipart con field "file".
   * Body extra: personaId, tipoDocumento (id|nombre), categoria, descripcion, rundSoporteId
   */
  @Post('carpeta-digital/upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, _file, cb) => {
        const personaId = String(req.body?.personaId || req.body?.persona_id || 'desconocido').replace(/^carpeta:/, '');
        const path = `./uploads/carpeta-digital/${personaId}`;
        if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
        cb(null, path);
      },
      filename: (_req, file, cb) => {
        const rand = Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
        cb(null, `${rand}${extname(file.originalname)}`);
      },
    }),
  }))
  async uploadDocumento(@Body() body: any, @UploadedFile() file?: any) {
    if (!file) return { success: false, message: 'Archivo requerido' };
    const personaId = String(body?.personaId || body?.persona_id || '').replace(/^carpeta:/, '');
    if (!personaId) return { success: false, message: 'personaId es requerido' };
    const urlArchivo = `/auth/api/v1/uploads/carpeta-digital/${personaId}/${file.filename}`;
    try {
      const data = await this.carpetaDigitalService.createDocumento({
        personaId,
        nombre: file.originalname,
        urlArchivo,
        tipoDocumentoId: body?.tipoDocumentoId || body?.tipoDocumento || null,
        rundSoporteId: body?.rundSoporteId || null,
        categoria: body?.categoria || 'otros',
        tipoArchivo: extname(file.originalname).replace('.', '').toLowerCase(),
        tamanoBytes: file.size,
        comentarios: body?.descripcion || null,
      });
      return { success: true, data };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error al guardar documento' };
    }
  }

  /**
   * PUT /portal/carpeta-digital/documentos/:id/reclassify
   */
  @Put('carpeta-digital/documentos/:id/reclassify')
  async reclassifyDocumento(@Param('id') id: string, @Body() body: any) {
    try {
      const data = await this.carpetaDigitalService.reclassifyDocumento(id, {
        tipoDocumentoId: body?.tipo_documento_id || body?.tipoDocumentoId,
        categoria: body?.categoria,
      });
      return { success: true, data };
    } catch (err: any) {
      return { success: false, message: err?.message };
    }
  }

  /**
   * PUT /portal/carpeta-digital/documentos/:id/validate
   */
  @Put('carpeta-digital/documentos/:id/validate')
  async validateDocumento(@Param('id') id: string, @Body() body: any) {
    try {
      const data = await this.carpetaDigitalService.validateDocumento(id, {
        estado: body?.estado,
        comentarios: body?.comentarios,
        validadoPor: body?.validadoPor,
      });
      return { success: true, data };
    } catch (err: any) {
      return { success: false, message: err?.message };
    }
  }

  /**
   * DELETE /portal/carpeta-digital/documentos/:id
   */
  @Delete('carpeta-digital/documentos/:id')
  async deleteDocumento(@Param('id') id: string) {
    try {
      const data = await this.carpetaDigitalService.deleteDocumento(id);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, message: err?.message };
    }
  }

  /**
   * GET /portal/carpeta-digital/:id
   * Resumen agregado: carpeta + documentos + tipos. Conserva el contrato anterior.
   */
  @Get('carpeta-digital/:id')
  async getCarpetaDigital(@Param('id') id: string) {
    const cleanId = String(id || '').replace(/^carpeta:/, '');
    try {
      const [carpeta, documentos, checklist] = await Promise.all([
        this.carpetaDigitalService.getCarpetaByPersona(cleanId).catch(() => null),
        this.carpetaDigitalService.listDocumentosByPersona(cleanId).catch(() => []),
        this.carpetaDigitalService.getChecklistForPersona(cleanId).catch(() => ({ tiposDocumentos: [] })),
      ]);
      return {
        success: true,
        data: {
          carpeta,
          persona: carpeta ? { id: cleanId, nombre: carpeta.nombre_carpeta, email: carpeta.email_propietario, numero_documento: carpeta.numero_documento } : null,
          documentos: Array.isArray(documentos) ? documentos : [],
          tipos_requeridos: (checklist as any)?.tiposDocumentos || [],
        },
      };
    } catch (err: any) {
      return {
        success: true,
        data: { documentos: [], tipos_requeridos: [], persona: null },
        message: err?.message,
      };
    }
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


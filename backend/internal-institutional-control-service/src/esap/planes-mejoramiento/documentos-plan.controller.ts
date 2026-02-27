import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Res,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ControlInternoPermissions as CIP } from '../../common/permissions.constants';
import { DocumentosPlanService } from './documentos-plan.service';

// Tipo para el archivo subido
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@Controller('planes-mejoramiento/:planId/documentos')
export class DocumentosPlanController {
  constructor(private readonly documentosPlanService: DocumentosPlanService) {}

  /**
   * POST /planes-mejoramiento/:planId/documentos
   * Crea un nuevo documento para un plan de mejoramiento
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_EDIT)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = process.env.UPLOAD_PATH || './uploads/evidencias/temp';
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('planId') planId: string,
    @UploadedFile() file: MulterFile,
    @Body() body: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    return await this.documentosPlanService.create(
      file,
      planId,
      body.nombre || file.originalname,
      body.descripcion,
      body.tipoDocumento || 'documento_plan',
      body.subidoPor || 'system',
      body.subidoPorId ? parseInt(body.subidoPorId, 10) : undefined,
    );
  }

  /**
   * GET /planes-mejoramiento/:planId/documentos
   * Obtiene todos los documentos de un plan
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_VIEW)
  async findAll(@Param('planId') planId: string) {
    return await this.documentosPlanService.findByPlan(planId);
  }

  /**
   * GET /planes-mejoramiento/:planId/documentos/:id
   * Obtiene un documento específico
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_VIEW)
  async findOne(@Param('planId') planId: string, @Param('id') id: string) {
    const documento = await this.documentosPlanService.findOne(id);
    if (documento.planMejoramientoId !== planId) {
      throw new NotFoundException('Documento no pertenece al plan especificado');
    }
    return documento;
  }

  /**
   * GET /planes-mejoramiento/:planId/documentos/:id/descargar
   * Descarga un documento
   */
  @Get(':id/descargar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_VIEW)
  async download(
    @Param('planId') planId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const documento = await this.documentosPlanService.findOne(id);
    if (documento.planMejoramientoId !== planId) {
      throw new NotFoundException('Documento no pertenece al plan especificado');
    }

    const fs = require('fs');
    if (!fs.existsSync(documento.rutaArchivo)) {
      throw new NotFoundException('El archivo no existe en el servidor');
    }

    res.setHeader('Content-Type', documento.tipoMime);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${documento.nombreArchivoOriginal}"`,
    );
    res.setHeader('Content-Length', documento.tamanioBytes.toString());

    const fileStream = fs.createReadStream(documento.rutaArchivo);
    fileStream.pipe(res);
  }

  /**
   * DELETE /planes-mejoramiento/:planId/documentos/:id
   * Elimina un documento
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_EDIT)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('planId') planId: string, @Param('id') id: string) {
    const documento = await this.documentosPlanService.findOne(id);
    if (documento.planMejoramientoId !== planId) {
      throw new NotFoundException('Documento no pertenece al plan especificado');
    }
    await this.documentosPlanService.remove(id);
  }

  // ========================================================================
  // ENDPOINTS PARA DOCUMENTOS POR ACCIÓN CORRECTIVA
  // ========================================================================

  /**
   * POST /planes-mejoramiento/:planId/acciones/:accionId/documentos
   * Crea un nuevo documento para una acción correctiva específica
   */
  @Post('acciones/:accionId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_EDIT)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = process.env.UPLOAD_PATH || './uploads/evidencias/temp';
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async createParaAccion(
    @Param('planId') planId: string,
    @Param('accionId') accionId: string,
    @UploadedFile() file: MulterFile,
    @Body() body: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    return await this.documentosPlanService.createParaAccion(
      file,
      planId,
      accionId,
      body.nombre || file.originalname,
      body.descripcion,
      body.tipoDocumento || 'evidencia_accion',
      body.subidoPor || 'system',
      body.subidoPorId ? parseInt(body.subidoPorId, 10) : undefined,
    );
  }

  /**
   * GET /planes-mejoramiento/:planId/acciones/:accionId/documentos
   * Obtiene todos los documentos de una acción correctiva
   */
  @Get('acciones/:accionId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_VIEW)
  async findByAccion(
    @Param('planId') planId: string,
    @Param('accionId') accionId: string,
  ) {
    return await this.documentosPlanService.findByAccion(planId, accionId);
  }

  /**
   * GET /planes-mejoramiento/:planId/documentos/agrupados
   * Obtiene todos los documentos del plan agrupados por acción
   */
  @Get('agrupados')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_VIEW)
  async findAgrupados(@Param('planId') planId: string) {
    return await this.documentosPlanService.findByPlanAgrupados(planId);
  }

  /**
   * POST /planes-mejoramiento/:planId/documentos/:id/validar
   * Valida un documento (solo auditor)
   */
  @Post(':id/validar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.PLAN_MEJORAMIENTO_FOLLOW_UP)
  async validarDocumento(
    @Param('planId') planId: string,
    @Param('id') id: string,
    @Body() body: {
      estadoValidacion: 'ACEPTADA' | 'CON_OBSERVACIONES' | 'RECHAZADA';
      validadoPor: string;
      comentariosAuditor?: string;
      solicitaNuevaEvidencia?: boolean;
    },
  ) {
    const documento = await this.documentosPlanService.findOne(id);
    if (documento.planMejoramientoId !== planId) {
      throw new NotFoundException('Documento no pertenece al plan especificado');
    }

    return await this.documentosPlanService.validarDocumento(
      id,
      body.estadoValidacion,
      body.validadoPor,
      body.comentariosAuditor,
      body.solicitaNuevaEvidencia || false,
    );
  }
}

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
import { EvidenciasService } from './evidencias.service';
import { CreateEvidenciaDto } from './dto/create-evidencia.dto';
import { ValidarEvidenciaDto } from './dto/validar-evidencia.dto';

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

@Controller('evidencias')
export class EvidenciasController {
  constructor(private readonly evidenciasService: EvidenciasService) {}

  /**
   * POST /evidencias
   * Crea una nueva evidencia/documento
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.EVIDENCIA_CREATE)
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
    @UploadedFile() file: MulterFile,
    @Body() body: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const createDto: CreateEvidenciaDto = {
      nombre: body.nombre || file.originalname,
      descripcion: body.descripcion,
      tipoDocumento: body.tipoDocumento,
      hallazgoId: body.hallazgoId || undefined,
      accionCorrectivaId: body.accionCorrectivaId || undefined,
      planMejoramientoId: body.planMejoramientoId || undefined,
      auditoriaId: body.auditoriaId || undefined,
    };

    // TODO: Obtener usuario del token JWT
    const subidoPor = body.subidoPor || 'Sistema';
    const subidoPorId = body.subidoPorId ? parseInt(body.subidoPorId) : undefined;

    return this.evidenciasService.create(file, createDto, subidoPor, subidoPorId);
  }

  /**
   * GET /evidencias/accion/:accionId
   * Obtiene evidencias de una acción
   */
  @Get('accion/:accionId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.EVIDENCIA_VIEW)
  findByAccion(@Param('accionId') accionId: string) {
    return this.evidenciasService.findByAccion(accionId);
  }

  /**
   * GET /evidencias/hallazgo/:hallazgoId
   * Obtiene evidencias de un hallazgo
   */
  @Get('hallazgo/:hallazgoId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.EVIDENCIA_VIEW)
  findByHallazgo(@Param('hallazgoId') hallazgoId: string) {
    return this.evidenciasService.findByHallazgo(hallazgoId);
  }

  /**
   * GET /evidencias/plan/:planId
   * Obtiene evidencias de un plan
   */
  @Get('plan/:planId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.EVIDENCIA_VIEW)
  findByPlan(@Param('planId') planId: string) {
    return this.evidenciasService.findByPlan(planId);
  }

  /**
   * GET /evidencias/auditoria/:auditoriaId
   * Obtiene evidencias de una auditoría
   */
  @Get('auditoria/:auditoriaId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.EVIDENCIA_VIEW)
  findByAuditoria(@Param('auditoriaId') auditoriaId: string) {
    return this.evidenciasService.findByAuditoria(auditoriaId);
  }

  /**
   * GET /evidencias/:id
   * Obtiene una evidencia por ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.EVIDENCIA_VIEW)
  findOne(@Param('id') id: string) {
    return this.evidenciasService.findOne(id);
  }

  /**
   * GET /evidencias/:id/download
   * Descarga un archivo de evidencia
   */
  @Get(':id/download')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.EVIDENCIA_VIEW)
  async download(@Param('id') id: string, @Res() res: Response) {
    const evidencia = await this.evidenciasService.findOne(id);
    const path = require('path');

    if (!existsSync(evidencia.rutaArchivo)) {
      throw new BadRequestException('El archivo no existe en el servidor');
    }

    // Codificar el nombre del archivo para UTF-8 (RFC 5987)
    const encodedFilename = encodeURIComponent(evidencia.nombreArchivoOriginal);
    const filenameStar = `filename*=UTF-8''${encodedFilename}`;

    res.setHeader('Content-Type', `${evidencia.tipoMime}; charset=utf-8`);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${evidencia.nombreArchivoOriginal}"; ${filenameStar}`,
    );
    res.setHeader('Content-Length', evidencia.tamanioBytes.toString());

    return res.sendFile(path.resolve(evidencia.rutaArchivo));
  }

  /**
   * GET /evidencias/:id/preview
   * Previsualiza un documento (si es imagen o PDF)
   */
  @Get(':id/preview')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.EVIDENCIA_VIEW)
  async preview(@Param('id') id: string, @Res() res: Response) {
    const evidencia = await this.evidenciasService.findOne(id);
    const path = require('path');

    if (!existsSync(evidencia.rutaArchivo)) {
      throw new BadRequestException('El archivo no existe en el servidor');
    }

    // Normalizar el tipo MIME (eliminar espacios y convertir a minúsculas)
    const tipoMimeNormalizado = evidencia.tipoMime?.trim().toLowerCase() || '';

    // Solo permitir preview de imágenes y PDFs
    const esImagen = tipoMimeNormalizado.startsWith('image/');
    const esPdf = tipoMimeNormalizado === 'application/pdf' || 
                  tipoMimeNormalizado.startsWith('application/pdf');

    if (!esImagen && !esPdf) {
      throw new BadRequestException(
        `Este tipo de archivo no se puede previsualizar. Tipo MIME: ${evidencia.tipoMime}. Solo se permiten imágenes y PDFs.`
      );
    }

    // Codificar el nombre del archivo para UTF-8 (RFC 5987)
    const encodedFilename = encodeURIComponent(evidencia.nombreArchivoOriginal);
    const filenameStar = `filename*=UTF-8''${encodedFilename}`;

    res.setHeader('Content-Type', `${evidencia.tipoMime}; charset=utf-8`);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${evidencia.nombreArchivoOriginal}"; ${filenameStar}`,
    );

    return res.sendFile(path.resolve(evidencia.rutaArchivo));
  }

  /**
   * POST /evidencias/:id/validar
   * Valida una evidencia (US-032)
   */
  @Post(':id/validar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.EVIDENCIA_VALIDATE)
  validar(
    @Param('id') id: string,
    @Body() validarDto: ValidarEvidenciaDto,
  ) {
    // TODO: Obtener usuario del token JWT
    const validadoPor = 'Auditor Actual';
    return this.evidenciasService.validar(id, validarDto, validadoPor);
  }

  /**
   * DELETE /evidencias/:id
   * Elimina una evidencia
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.EVIDENCIA_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.evidenciasService.remove(id);
  }
}

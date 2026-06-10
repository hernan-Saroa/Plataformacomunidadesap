import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  Get,
  Param,
  Res,
  HttpException,
  HttpStatus,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DISCIPLINARY_MODULE_ACCESS } from '../auth/authorization.constants';

@Controller('files')
export class FilesController {
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', DISCIPLINARY_MODULE_ACCESS)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploads';
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath);
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
      fileFilter: (req, file, cb) => {
        // Obtener el tipo de documento del body
        const tipoDocumento = (req.body?.tipo as string)?.toUpperCase() || 'default';
        
        // Verificar extensiones prohibidas PRIMERO (seguridad)
        const forbiddenPattern = FilesController.getForbiddenExtensions();
        if (forbiddenPattern.test(file.originalname)) {
          cb(new HttpException(
            `Tipo de archivo no permitido. Las extensiones prohibidas incluyen: zip, exe, bat, cmd, ps1, sh, bash, vbs, js, jar, rar, 7z, tar, gz, bz2, iso, img, dmg`,
            HttpStatus.BAD_REQUEST
          ), false);
          return;
        }
        
        // Validar tamaño para evidencias (hasta 10GB)
        if (tipoDocumento === 'EVIDENCIA') {
          const maxSizeEvidencia = 10 * 1024 * 1024 * 1024; // 10GB
          if (file.size > maxSizeEvidencia) {
            cb(new HttpException(
              `El archivo excede el tamaño máximo permitido para evidencias (10 GB)`,
              HttpStatus.BAD_REQUEST
            ), false);
            return;
          }
        }
        
        // Usar métodos estáticos para la validación
        const allowedMimeTypes = FilesController.getAllowedMimeTypes(tipoDocumento);
        const allowedExts = FilesController.getAllowedExtensions(tipoDocumento);
        const allowedLabel = FilesController.getAllowedExtensionsLabel(tipoDocumento);
        
        if (allowedMimeTypes.includes(file.mimetype) || allowedExts.test(file.originalname)) {
          cb(null, true);
          return;
        }
        cb(new HttpException(
          `Tipo de archivo no permitido para "${tipoDocumento}". Solo se permiten: ${allowedLabel}`,
          HttpStatus.BAD_REQUEST
        ), false);
      },
    }),
  )
  uploadFile(
    @UploadedFile(new ParseFilePipe({
      validators: [
        // Por defecto 50MB para autos/oficios. Las evidencias se validan en fileFilter.
        new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
      ],
    })) file: Express.Multer.File,
    @Body() body: { tipo?: string },
  ) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }
    return {
      filename: file.filename,
      originalname: file.originalname,
      path: file.path,
      url: `/files/${file.filename}`, // URL relativa para acceso
    };
  }

  /**
   * Extensiones PROHIBIDAS para TODOS los tipos de documentos
   * Estas extensiones nunca serán permitidas por seguridad
   */
  private static getForbiddenExtensions(): RegExp {
    // Prohibir: ejecutables, comprimidos, scripts, etc.
    return /\.(zip|exe|bat|cmd|ps1|sh|bash|vbs|js|jar|rar|7z|tar|gz|bz2|iso|img|dmg)$/i;
  }

  /**
   * Obtiene los tipos MIME permitidos según el tipo de documento
   */
  private static getAllowedMimeTypes(tipoDocumento: string): string[] {
    const tiposPermitidos: Record<string, string[]> = {
      // Evidencias: HTML, PDF, Word, Excel, Imágenes, Videos, Audio
      'EVIDENCIA': [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/html',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'image/gif',
        'image/webp',
        'image/heic',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-msvideo',
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
      ],
      // Auto: Solo Word
      'AUTO': [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      // Oficio: Solo PDF
      'OFICIO': [
        'application/pdf',
      ],
      // Otros: PDF, Word, Excel
      'default': [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
    };

    return tiposPermitidos[tipoDocumento] ?? tiposPermitidos['default'];
  }

  /**
   * Obtiene las extensiones permitidas según el tipo de documento (como regex)
   */
  private static getAllowedExtensions(tipoDocumento: string): RegExp {
    const extensiones: Record<string, RegExp> = {
      // Evidencias: PDF, Word, Excel, HTML, Imágenes, Videos, Audio - INCLUYE .heic y .mp3
      'EVIDENCIA': /\.(pdf|doc|docx|xls|xlsx|html|jpg|jpeg|png|gif|webp|heic|mp4|webm|mov|avi|mp3|wav)$/i,
      'AUTO': /\.(doc|docx)$/i,
      'OFICIO': /\.(pdf)$/i,
      'default': /\.(pdf|doc|docx|xls|xlsx)$/i,
    };

    return extensiones[tipoDocumento] ?? extensiones['default'];
  }

  /**
   * Obtiene las extensiones permitidas como texto legible
   */
  private static getAllowedExtensionsLabel(tipoDocumento: string): string {
    const extensiones: Record<string, string> = {
      'EVIDENCIA': 'PDF, Word, Excel, HTML, Imágenes (JPG, PNG, GIF, WebP, HEIC), Videos (MP4, WebM, MOV, AVI), Audio (MP3, WAV)',
      'AUTO': 'Solo Word (.doc, .docx)',
      'OFICIO': 'Solo PDF',
      'default': 'PDF, Word, Excel',
    };

    return extensiones[tipoDocumento] ?? extensiones['default'];
  }

  /**
   * Obtiene el tamaño máximo de archivo según el tipo de documento
   * Evidencias: 10 GB (para videos grandes)
   * Autos/Oficios: 50 MB
   */
  private static getMaxFileSize(tipoDocumento: string): number {
    const tamanoMaximo: Record<string, number> = {
      // Evidencias: hasta 10 GB (10 * 1024 * 1024 * 1024 bytes)
      'EVIDENCIA': 10 * 1024 * 1024 * 1024,
      // Autos: 50 MB
      'AUTO': 50 * 1024 * 1024,
      // Oficios: 50 MB
      'OFICIO': 50 * 1024 * 1024,
      // Default: 50 MB
      'default': 50 * 1024 * 1024,
    };

    return tamanoMaximo[tipoDocumento] ?? tamanoMaximo['default'];
  }

  @Get(':filename')
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    // First try in ./uploads (for files uploaded via /files/upload endpoint)
    let filePath = join(process.cwd(), 'uploads', filename);
    if (existsSync(filePath)) {
      res.sendFile(filePath);
      return;
    }

    // Then try in ./uploads/plantillas-autos/{filename} (for auto templates)
    filePath = join(process.cwd(), 'uploads', 'plantillas-autos', filename);
    if (existsSync(filePath)) {
      res.sendFile(filePath);
      return;
    }

    // Then try in ./uploads/plantillas-oficios/{filename} (for oficio templates)
    filePath = join(process.cwd(), 'uploads', 'plantillas-oficios', filename);
    if (existsSync(filePath)) {
      res.sendFile(filePath);
      return;
    }

    // Then try in ./uploads/plantillas-actas/{filename} (for acta templates)
    filePath = join(process.cwd(), 'uploads', 'plantillas-actas', filename);
    if (existsSync(filePath)) {
      res.sendFile(filePath);
      return;
    }

    // Then try in ./uploads/expedientes/{radicado}/filename (for news attachments)
    // The filename might come as "ND-2026-001/archivo.pdf" or just "archivo.pdf"
    if (filename.includes('/')) {
      filePath = join(process.cwd(), 'uploads', 'expedientes', filename);
    } else {
      // Try to find file in any expediente folder
      const expedientesDir = join(process.cwd(), 'uploads', 'expedientes');
      if (existsSync(expedientesDir)) {
        const folders = require('fs').readdirSync(expedientesDir);
        for (const folder of folders) {
          const potentialPath = join(expedientesDir, folder, filename);
          if (existsSync(potentialPath)) {
            res.sendFile(potentialPath);
            return;
          }
        }
      }
    }

    if (existsSync(filePath)) {
      res.sendFile(filePath);
      return;
    }

    throw new HttpException('File not found', HttpStatus.NOT_FOUND);
  }

  /**
   * Serve files from expedientes with full path: /files/expediente/:radicado/:filename
   */
  @Get('expediente/:radicado/:filename')
  serveExpedienteFile(
    @Param('radicado') radicado: string,
    @Param('filename') filename: string,
    @Res() res: Response
  ) {
    const filePath = join(process.cwd(), 'uploads', 'expedientes', radicado, filename);
    if (!existsSync(filePath)) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }
    res.sendFile(filePath);
  }
}

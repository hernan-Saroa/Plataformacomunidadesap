import { Body, Controller, Get, Param, Put, Post, Delete, UseInterceptors, UploadedFiles, BadRequestException } from '@nestjs/common';
import { GraduationCertificatesService } from './graduation-certificates.service';
import type { UpdateGraduateDto } from './dto/update-graduate.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

@Controller(['graduates', 'academic-registration/api/v1/graduates'])
export class GraduatesController {
  constructor(private readonly service: GraduationCertificatesService) {}

  @Get()
  async listarGraduados() {
    return await this.service.listarGraduados();
  }

  @Get('cedula/:idNumber')
  async obtenerPorCedula(@Param('idNumber') idNumber: string) {
    return await this.service.buscarGraduadoPorCedula(idNumber);
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string) {
    return await this.service.obtenerGraduado(id);
  }

  @Put(':id')
  async actualizarGraduado(
    @Param('id') id: string,
    @Body() payload: UpdateGraduateDto,
  ) {
    return await this.service.actualizarGraduado(id, payload);
  }

  @Get(':id/files')
  async listarArchivos(@Param('id') id: string) {
    return await this.service.listarArchivosGraduado(id);
  }

  @Post(':id/files')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = join(process.cwd(), 'uploads', 'graduate-files');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `graduate-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowedExtensions = new Set([
          '.pdf',
          '.doc',
          '.docx',
          '.xls',
          '.xlsx',
          '.png',
          '.jpg',
          '.jpeg',
          '.webp',
        ]);
        const allowedMimeTypes = new Set([
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/png',
          'image/jpeg',
          'image/webp',
        ]);
        const ext = extname(file.originalname || '').toLowerCase();
        const isAllowed = allowedExtensions.has(ext) || allowedMimeTypes.has(file.mimetype);
        if (!isAllowed) {
          return cb(new Error('Tipo de archivo no permitido'), false);
        }
        cb(null, true);
      },
      limits: {
        files: 5,
      },
    }),
  )
  async subirArchivos(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('uploadedBy') uploadedBy?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibieron archivos');
    }
    return await this.service.subirArchivosGraduado(id, files, uploadedBy);
  }

  @Delete(':id/files/:fileId')
  async eliminarArchivo(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
  ) {
    return await this.service.eliminarArchivoGraduado(id, fileId);
  }
}

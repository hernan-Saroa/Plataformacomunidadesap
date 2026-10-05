import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { Permissions } from '../../common/permissions.decorator';
import { getUploadRootDir } from '../../common/storage.util';
import { RegistrarReintegroDto } from '../../dto/registrar-reintegro.dto';
import { EstadoReintegro } from '../../entities/reintegro-comision.entity';
import { ReintegrosService } from './reintegros.service';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    roles?: string[];
    role?: string;
    permissions?: string[];
  };
}

/**
 * RF-PAG-004 — Controlador de reintegros de comisiones pagadas por avance.
 *
 * Expone endpoints bajo el tag Swagger `reintegros` para:
 *   - Consultar los reintegros pendientes y registrados.
 *   - Cargar el soporte de la consignación.
 *   - Registrar el reintegro (valor, fecha y soporte).
 */
@ApiTags('reintegros')
@Controller('reintegros')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReintegrosController {
  constructor(private readonly reintegrosService: ReintegrosService) {}

  @Get()
  @Permissions('travel_expenses:read_reintegros')
  @ApiOperation({
    summary: 'Consultar reintegros de comisiones',
    description:
      'Devuelve los reintegros de comisiones pagadas por avance que no se realizaron o se ejecutaron por menos días. Si se envía ?estado=PENDIENTE|REGISTRADO, filtra por ese estado.',
  })
  @ApiResponse({ status: 200, description: 'Reintegros consultados correctamente.' })
  @ApiBearerAuth()
  async listarReintegros(@Query('estado') estado?: string) {
    if (estado && !Object.values(EstadoReintegro).includes(estado as EstadoReintegro)) {
      throw new BadRequestException('El estado del reintegro no es válido.');
    }
    const data = await this.reintegrosService.listarReintegros(estado);
    return {
      data,
      total: data.length,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/soporte')
  @Permissions('travel_expenses:register_reintegro')
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: multer.diskStorage({
        destination: (req: any, _file: any, cb: any) => {
          const dir = join(getUploadRootDir(), req.params.id);
          try {
            mkdirSync(dir, { recursive: true });
          } catch {}
          cb(null, dir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const rawName = file.originalname || 'soporte_reintegro.pdf';
          const ext = extname(rawName) || '.pdf';
          const base = rawName.replace(ext, '').replace(/[^a-zA-Z0-9._-]/g, '_');
          cb(null, `reintegro_${Date.now()}_${base}${ext}`);
        },
      }),
      fileFilter: (_req: any, file: any, cb: any) => {
        const mime = String(file.mimetype || '').toLowerCase();
        const nombre = String(file.originalname || '').toLowerCase();
        const esValido =
          mime === 'application/pdf' ||
          mime.startsWith('image/') ||
          nombre.endsWith('.pdf') ||
          nombre.endsWith('.png') ||
          nombre.endsWith('.jpg') ||
          nombre.endsWith('.jpeg') ||
          nombre.endsWith('.webp');
        if (!esValido) {
          return cb(
            new BadRequestException(
              'El soporte de la consignación debe ser un documento PDF o imagen válida (PDF, PNG, JPG, JPEG).',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  @ApiOperation({
    summary: 'Subir soporte de consignación del reintegro',
    description:
      'Permite cargar el archivo (PDF o imagen) del comprobante de consignación del reintegro.',
  })
  @ApiResponse({ status: 201, description: 'Soporte cargado exitosamente.' })
  @ApiBearerAuth()
  async subirSoporte(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No se ha proporcionado ningún archivo para el soporte de la consignación.',
      );
    }
    return {
      success: true,
      data: {
        urlRepositorio: `/uploads/${id}/${file.filename}`,
        nombreArchivo: file.originalname,
        nombreArchivoSeguro: file.filename,
        tamano: file.size,
        tipoMime: file.mimetype,
      },
      message: 'Soporte de la consignación cargado exitosamente.',
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/registrar')
  @HttpCode(HttpStatus.OK)
  @Permissions('travel_expenses:register_reintegro')
  @ApiOperation({
    summary: 'Registrar reintegro de una comisión',
    description:
      'Registra el valor reintegrado, la fecha y el soporte de la consignación, y libera el pendiente de reintegro de la comisión.',
  })
  @ApiResponse({ status: 200, description: 'Reintegro registrado correctamente.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o reintegro ya registrado.' })
  @ApiResponse({ status: 404, description: 'Reintegro no encontrado.' })
  @ApiBearerAuth()
  async registrarReintegro(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegistrarReintegroDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const usuarioId = req.user?.userId;
    if (!usuarioId) {
      throw new BadRequestException('No se pudo identificar al usuario autenticado.');
    }
    const data = await this.reintegrosService.registrarReintegro(id, usuarioId, dto);
    return {
      success: true,
      data,
      message: 'Reintegro registrado exitosamente.',
      timestamp: new Date().toISOString(),
    };
  }
}

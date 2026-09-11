import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { MantenimientoService } from './mantenimiento.service.js';
import { CreateMantenimientoDto, UpdateMantenimientoEstadoDto } from './dto/create-mantenimiento.dto.js';
import { Public } from '../auth/public.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

const MAX_SIZE_20MB = 20 * 1024 * 1024;
const MIMES_PERMITIDOS = /^(image\/(png|jpe?g|gif|webp|heic|heif)|application\/pdf)$/i;

@ApiTags('Mantenimiento e Infraestructura')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mantenimiento')
export class MantenimientoController {
  constructor(private readonly mantenimientoService: MantenimientoService) {}

  // ---------------------------------------------------------------------------
  // Catálogos
  // ---------------------------------------------------------------------------
  @Get('catalogos/:nombre')
  @Public()
  @ApiOperation({ summary: 'Obtener un catálogo parametrizable (TIPO_MANTENIMIENTO, PRIORIDAD, ESTADO_SOLICITUD, TIPO_ATENCION)' })
  getCatalogo(@Param('nombre') nombre: string) {
    const permitidos = ['TIPO_MANTENIMIENTO', 'PRIORIDAD', 'TIPO_ATENCION', 'ESTADO_SOLICITUD'];
    if (!permitidos.includes(nombre)) {
      throw new BadRequestException(`Catálogo ${nombre} no permitido. Usa uno de: ${permitidos.join(', ')}`);
    }
    return this.mantenimientoService.getCatalogo(nombre, true);
  }

  // ---------------------------------------------------------------------------
  // Solicitudes
  // ---------------------------------------------------------------------------
  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar solicitudes de mantenimiento (bandeja general)' })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({ name: 'prioridad', required: false })
  findAll(@Query('estado') estado?: string, @Query('prioridad') prioridad?: string) {
    return this.mantenimientoService.findAll(estado, prioridad);
  }

  @Get('mis-solicitudes')
  @ApiOperation({ summary: 'Consultar las solicitudes radicadas por el usuario autenticado' })
  @ApiResponse({ status: 403, description: 'Usuario no autenticado' })
  findMisSolicitudes(@Req() req: any) {
    const usuarioId = req?.user?.userId;
    return this.mantenimientoService.findByUsuario(usuarioId);
  }

  @Post()
  @ApiOperation({ summary: 'Radicación oficial de una solicitud de mantenimiento (EFDS-1730)' })
  @ApiResponse({ status: 201, description: 'Solicitud radicada con consecutivo y estado RECIBIDA' })
  @ApiResponse({ status: 400, description: 'Datos invalidos o sede inactiva' })
  @ApiResponse({ status: 403, description: 'Usuario no autenticado' })
  create(@Body() dto: CreateMantenimientoDto, @Req() req: any) {
    const user = req?.user;
    return this.mantenimientoService.create(dto, user);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obtener detalle de una solicitud de mantenimiento' })
  findById(@Param('id') id: string) {
    return this.mantenimientoService.findById(id);
  }

  @Patch(':id/estado')
  @Public()
  @ApiOperation({ summary: 'Actualizar estado y responsable de una solicitud' })
  updateEstado(@Param('id') id: string, @Body() dto: UpdateMantenimientoEstadoDto) {
    return this.mantenimientoService.updateEstado(id, dto);
  }

  // ---------------------------------------------------------------------------
  // Evidencias / Upload
  // ---------------------------------------------------------------------------
  @Post('evidencias/upload')
  @ApiOperation({
    summary:
      'Subir un archivo evidencia al storage (MinIO). Se pueden subir antes de radicar y luego ligar por uploadedEvidenciaIds, o después con idSolicitud opcional.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Archivo (PNG/JPG/HEIC/PDF, hasta 20MB)' },
        idSolicitud: { type: 'string', format: 'uuid', description: '(Opcional) ligar directamente a una solicitud existente' },
        orden: { type: 'integer', description: '(Opcional) orden visual, default 1' },
        notas: { type: 'string', description: '(Opcional) nota sobre la evidencia' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async subirEvidencia(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_SIZE_20MB, message: 'Archivo excede 20MB' }),
          new FileTypeValidator({ fileType: MIMES_PERMITIDOS }),
        ],
      }),
    )
    file: any,
    @Req() req: any,
    @Body() body: any,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Archivo no puede estar vacío');
    }
    return this.mantenimientoService.subirEvidencia({
      nombreOriginal: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
      tamanoBytes: file.size,
      user: req?.user,
      idSolicitud: body?.idSolicitud,
      orden: body?.orden ? parseInt(body.orden, 10) : undefined,
      notas: body?.notas,
    });
  }

  @Get(':id/evidencias')
  @Public()
  @ApiOperation({ summary: 'Listar evidencias/adjuntos de una solicitud, regenera URLs firmadas si van a vencer' })
  getEvidencias(@Param('id') idSolicitud: string) {
    return this.mantenimientoService.getEvidenciasBySolicitud(idSolicitud, 48);
  }
}

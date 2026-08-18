import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { createHash, randomBytes } from 'crypto';
import { createReadStream } from 'fs';

import { EstudioPrevioService } from './estudio-previo.service';
import { CrearProcesoDto, GuardarBorradorDto, RevisarDto } from './dto/estudio-previo.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_ESCRITURA_ESTUDIO_PREVIO,
  ROLES_LECTURA_CONTRATACION,
  ROLES_REVISION_ESTUDIO_PREVIO,
} from '../../auth/hiring-access';

const STORAGE_PATH = process.env.HIRING_STORAGE_PATH || './uploads';
const MIME_PERMITIDOS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function sha256Archivo(ruta: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(ruta)
      .on('data', (c) => hash.update(c))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

@ApiTags('Estudio previo')
@Controller('procesos')
export class EstudioPrevioController {
  constructor(private readonly service: EstudioPrevioService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ESCRITURA_ESTUDIO_PREVIO)
  @ApiOperation({ summary: 'Crear proceso en etapa 3 y abrir su expediente electrónico' })
  crearProceso(@Body() dto: CrearProcesoDto, @Req() req: any) {
    return this.service.crearProceso(dto, getHiringAccess(req));
  }

  @Get()
  @ApiOperation({ summary: 'Listar procesos' })
  listar() {
    return this.service.listarProcesos();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar un proceso' })
  obtenerProceso(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.obtenerProceso(id);
  }

  @Get(':id/estudio-previo')
  @ApiOperation({ summary: 'Datos del estudio previo y definición de sus campos' })
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.obtener(id);
  }

  @Put(':id/estudio-previo')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ESCRITURA_ESTUDIO_PREVIO)
  @ApiOperation({ summary: 'Guardar borrador (no valida campos obligatorios)' })
  guardar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GuardarBorradorDto,
    @Req() req: any,
  ) {
    return this.service.guardarBorrador(id, dto, getHiringAccess(req));
  }

  @Post(':id/estudio-previo/enviar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ESCRITURA_ESTUDIO_PREVIO)
  @ApiOperation({
    summary: 'Enviar a revisión',
    description:
      'Valida los campos obligatorios. Si faltan responde 422 con camposFaltantes. ' +
      'Si está completo registra el estudio previo como documento del expediente.',
  })
  enviar(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.enviar(id, getHiringAccess(req));
  }

  @Post(':id/estudio-previo/aprobar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_REVISION_ESTUDIO_PREVIO)
  @ApiOperation({
    summary: 'Aprobar el estudio previo (numeral 3.4)',
    description: 'Solo aplica si está en revisión. Tras aprobarlo no admite cambios.',
  })
  aprobar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevisarDto,
    @Req() req: any,
  ) {
    return this.service.aprobar(id, dto.observaciones, getHiringAccess(req));
  }

  @Post(':id/estudio-previo/devolver')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_REVISION_ESTUDIO_PREVIO)
  @ApiOperation({
    summary: 'Devolver el estudio previo con observaciones (numeral 3.4)',
    description: 'Regresa a borrador para que el gestor corrija y lo reenvíe.',
  })
  devolver(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevisarDto,
    @Req() req: any,
  ) {
    return this.service.devolver(id, dto.observaciones ?? '', getHiringAccess(req));
  }

  @Get(':id/estudio-previo/revisiones')
  @ApiOperation({ summary: 'Historial de aprobaciones y devoluciones' })
  revisiones(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.revisiones(id);
  }

  @Get('plantillas/:numeral')
  // Con guard como todos sus gemelos: era el único endpoint de plantillas
  // que quedó sin control de roles.
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({ summary: 'Formatos oficiales aplicables a la actividad' })
  plantillas(@Param('numeral') numeral: string, @Query('modalidad') modalidad?: string) {
    return this.service.plantillas(numeral, modalidad);
  }

  @Get(':id/expediente')
  @ApiOperation({ summary: 'Documentos del expediente electrónico del proceso' })
  expediente(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.expediente(id);
  }

  @Post(':id/estudio-previo/documentos')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ESCRITURA_ESTUDIO_PREVIO)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: STORAGE_PATH,
        filename: (_req, file, cb) =>
          cb(null, `${randomBytes(16).toString('hex')}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        MIME_PERMITIDOS.includes(file.mimetype)
          ? cb(null, true)
          : cb(new BadRequestException('Solo se admiten archivos PDF, Word o Excel'), false),
    }),
  )
  @ApiOperation({ summary: 'Adjuntar un documento al estudio previo' })
  async adjuntar(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const hash = await sha256Archivo(join(STORAGE_PATH, file.filename));
    return this.service.registrarAdjunto(id, file, hash, getHiringAccess(req));
  }
}

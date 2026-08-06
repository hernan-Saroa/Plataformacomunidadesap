import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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

import { CdpService } from './cdp.service';
import { ExpedirCdpDto, RechazarCdpDto, SolicitarCdpDto } from './dto/cdp.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_GESTION_CDP,
  ROLES_LECTURA_CONTRATACION,
  ROLES_SOLICITUD_CDP,
} from '../../auth/hiring-access';

// Mismo destino y mismos formatos que los adjuntos del estudio previo: el
// expediente es uno solo y sus documentos se guardan igual sea cual sea la
// etapa que los produce.
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

/**
 * Ciclo del CDP — etapa 4 (EFDS-1148).
 *
 * El área solicitante radica; la Dirección Financiera verifica y expide. Esa
 * separación no es de interfaz: es quién compromete el presupuesto.
 */
@ApiTags('CDP')
@Controller('procesos/:id/cdp')
export class CdpController {
  constructor(private readonly service: CdpService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION, ...ROLES_GESTION_CDP)
  @ApiOperation({
    summary: 'Estado del respaldo presupuestal del proceso',
    description:
      'Devuelve el CDP en curso, si la modalidad lo requiere y por qué el proceso todavía no puede abrirse.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string) {
    return this.service.estadoRespaldo(procesoId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_SOLICITUD_CDP)
  @ApiOperation({ summary: 'Actividad 4.1 · Radicar la solicitud de CDP' })
  solicitar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: SolicitarCdpDto,
    @Req() req: any,
  ) {
    return this.service.solicitar(procesoId, dto, getHiringAccess(req));
  }

  @Post('verificar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION_CDP)
  @ApiOperation({ summary: 'Actividad 4.2 · Verificar la disponibilidad presupuestal' })
  verificar(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.verificar(procesoId, getHiringAccess(req));
  }

  @Post('expedir')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION_CDP)
  @ApiOperation({
    summary: 'Actividad 4.3 · Expedir el CDP',
    description:
      'Mientras no exista la integración con KLIC, el número y el valor se registran a mano con el soporte de la Dirección Financiera.',
  })
  expedir(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: ExpedirCdpDto,
    @Req() req: any,
  ) {
    return this.service.expedir(procesoId, dto, getHiringAccess(req));
  }

  @Post('documento')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION_CDP, ...ROLES_SOLICITUD_CDP)
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
  @ApiOperation({
    summary: 'Actividad 4.4 · Adjuntar el CDP al expediente',
    description:
      'El soporte queda vinculado al CDP, no solo al numeral, para que un CDP anulado y su reemplazo conserven cada uno el suyo.',
  })
  async adjuntar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const hash = await sha256Archivo(join(STORAGE_PATH, file.filename));
    return this.service.adjuntarSoporte(procesoId, file, hash, getHiringAccess(req));
  }

  @Post('rechazar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION_CDP)
  @ApiOperation({ summary: 'Cerrar el ciclo por falta de disponibilidad en el rubro' })
  rechazar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RechazarCdpDto,
    @Req() req: any,
  ) {
    return this.service.rechazar(procesoId, dto, getHiringAccess(req));
  }
}

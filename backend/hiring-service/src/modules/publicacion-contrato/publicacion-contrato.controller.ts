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
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { join } from 'path';
import { unlink } from 'fs/promises';

import { PublicacionContratoService } from './publicacion-contrato.service';
import { PublicarContratoDto } from './dto/publicacion-contrato.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_LECTURA_CONTRATACION,
  ROLES_PUBLICACION_PLIEGO,
} from '../../auth/hiring-access';
import {
  MIME_DOCUMENTOS,
  MIME_IMAGENES,
  opcionesDeCarga,
  sha256Archivo,
  STORAGE_PATH,
} from '../archivos';

/**
 * Publicación del contrato — actividad 8.8 (EFDS-1166).
 *
 * Mismos roles que la publicación del pliego y por la misma razón: es el gestor
 * del proceso quien publica, no hay presupuesto de por medio, es un trámite de
 * publicidad.
 */
@ApiTags('Etapa 8 · Publicación del contrato')
@Controller('procesos/:id/publicacion-contrato')
export class PublicacionContratoController {
  constructor(private readonly service: PublicacionContratoService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({
    summary: 'Publicaciones del contrato',
    description:
      'Dónde se publicó, si llegó dentro del plazo y qué destinos quedan pendientes.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_PUBLICACION_PLIEGO)
  @UseInterceptors(
    FileInterceptor(
      'file',
      // Se admiten imágenes además de ofimáticos: la prueba de que algo se
      // publicó en otra plataforma suele ser una captura de pantalla. Mismo
      // criterio que la publicación del pliego.
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'La evidencia se carga en PDF, Word, Excel o como captura de pantalla',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 8.8 · Registrar la publicación del contrato',
    description:
      'Con la evidencia del sitio donde se publicó. El plazo se cuenta desde el perfeccionamiento.',
  })
  async publicar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: PublicarContratoDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta la evidencia: sin soporte no hay publicación registrada, solo la afirmación de que se hizo',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.publicar(
        procesoId,
        dto,
        file,
        await sha256Archivo(ruta),
        getHiringAccess(req),
      );
    } catch (error) {
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }
}

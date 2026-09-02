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

import { PublicacionService } from './publicacion.service';
import { AnularPublicacionDto, RegistrarPublicacionDto } from './dto/publicacion.dto';
import { RolesGuard } from '../../auth/roles.guard';

import { getHiringAccess } from '../../auth/hiring-access';

import {
  MIME_DOCUMENTOS,
  MIME_IMAGENES,
  opcionesDeCarga,
  sha256Archivo,
  STORAGE_PATH,
} from '../archivos';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';

/**
 * Publicación del proyecto de pliego — actividad 5.2 (EFDS-1150).
 *
 * No publica en SECOP II: registra que se publicó y controla el plazo legal que
 * corre desde ese día. Mientras no exista la integración (EFDS-1386), la
 * evidencia cargada es la única prueba del hecho.
 */
@ApiTags('Publicación del pliego')
@Controller('procesos/:id/publicacion-pliego')
export class PublicacionController {
  constructor(private readonly service: PublicacionService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({
    summary: 'Estado de la publicación y del plazo de publicidad',
    description:
      'Devuelve la publicación vigente, el plazo aplicado, la fecha de vencimiento y los días hábiles que faltan.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estadoPublicacion(procesoId, undefined, getHiringAccess(req));
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.actividad.edit')
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'Solo se admiten archivos PDF, Word, Excel o imágenes PNG y JPG',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 5.2 · Registrar la publicación del proyecto de pliego',
    description:
      'Multipart: los datos van con la evidencia en la misma petición. La fecha es la de la publicación real en SECOP II, no la del registro: es la que arranca el plazo. Sin evidencia no se registra, porque el soporte es lo único que prueba que la publicación existió.',
  })
  async registrar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RegistrarPublicacionDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta la evidencia de la publicación: sin el soporte no se puede registrar',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      const hash = await sha256Archivo(ruta);
      return await this.service.registrar(procesoId, dto, file, hash, getHiringAccess(req));
    } catch (error) {
      // Multer ya escribió el archivo antes de que el servicio validara nada.
      // Si el registro no prospera, ese archivo no pertenece a ningún
      // expediente y quedaría ocupando disco sin que nadie lo reclame.
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post('anular')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.actividad.edit')
  @ApiOperation({
    summary: 'Anular la publicación registrada para corregirla',
    description:
      'No se edita ni se borra: la fecha equivocada ya movió el vencimiento del plazo y el expediente conserva el rastro.',
  })
  anular(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: AnularPublicacionDto,
    @Req() req: any,
  ) {
    return this.service.anular(procesoId, dto, getHiringAccess(req));
  }
}

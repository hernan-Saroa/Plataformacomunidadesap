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

import { AdendasService } from './adendas.service';
import { AnularAdendaDto, EmitirAdendaDto, PublicarAdendaDto } from './dto/adendas.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_ADENDAS,
  ROLES_LECTURA_CONTRATACION,
} from '../../auth/hiring-access';
import {
  MIME_DOCUMENTOS,
  MIME_IMAGENES,
  opcionesDeCarga,
  sha256Archivo,
  STORAGE_PATH,
} from '../archivos';

/**
 * Adendas del proceso — actividad 5.6 (EFDS-1154).
 *
 * Emitir y publicar van en dos peticiones porque son dos hechos distintos: la
 * adenda se firma un día y se publica otro, y solo al publicarse produce
 * efectos. En una de cronograma, ese efecto es mover el plazo del proceso.
 */
@ApiTags('Etapa 5 · Adendas')
@Controller('procesos/:id/adendas')
export class AdendasController {
  constructor(private readonly service: AdendasService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({
    summary: 'Adendas del proceso, con su estado',
    description:
      'Incluye si el proceso admite emitir nuevas: sin pliego publicado no hay nada que adendar, y con el proceso abierto rige el pliego definitivo.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string) {
    return this.service.estado(procesoId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADENDAS)
  @UseInterceptors(
    FileInterceptor(
      'file',
      // Solo ofimáticos: la adenda es un acto administrativo firmado.
      opcionesDeCarga(MIME_DOCUMENTOS, 'La adenda se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 5.6 · Emitir una adenda',
    description:
      'Registra la adenda con su documento firmado y le asigna el consecutivo del proceso. Emitir no publica: la adenda no produce efectos hasta que se publique.',
  })
  async emitir(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: EmitirAdendaDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Adjunta el documento firmado de la adenda');

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.emitir(
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

  @Post(':adendaId/publicar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADENDAS)
  @UseInterceptors(
    FileInterceptor(
      'file',
      // La evidencia admite imagen, como en la actividad 5.2: suele ser una
      // captura de SECOP II.
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'La evidencia admite PDF, Word, Excel o imágenes PNG y JPG',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Publicar una adenda emitida',
    description:
      'Con la evidencia de la publicación. Si la adenda es de cronograma, aquí es donde el vencimiento del plazo pasa a ser la fecha nueva.',
  })
  async publicar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('adendaId', ParseUUIDPipe) adendaId: string,
    @Body() dto: PublicarAdendaDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta la evidencia: sin soporte no hay prueba de que la adenda se publicó',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.publicar(
        procesoId,
        adendaId,
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

  @Post(':adendaId/anular')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADENDAS)
  @ApiOperation({
    summary: 'Anular una adenda emitida por error',
    description:
      'Solo antes de publicarla: una adenda publicada ya produjo efectos frente a terceros, y dejarla sin efecto es otra adenda, no un borrado.',
  })
  anular(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('adendaId', ParseUUIDPipe) adendaId: string,
    @Body() dto: AnularAdendaDto,
    @Req() req: any,
  ) {
    return this.service.anular(procesoId, adendaId, dto, getHiringAccess(req));
  }
}

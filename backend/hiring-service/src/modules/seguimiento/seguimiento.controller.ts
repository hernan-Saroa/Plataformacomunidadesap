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

import { SeguimientoService } from './seguimiento.service';
import { CargarSeguimientoDto } from './dto/seguimiento.dto';
import { PermisosGuard } from '../../auth/permisos.guard';
import { Permisos } from '../../auth/permisos.decorator';
import {
  PERMISO_SEGUIMIENTO_CARGAR,
  PERMISO_SEGUIMIENTO_VER,
} from '../../auth/permisos';
import { getHiringAccess } from '../../auth/hiring-access';

import {
  MIME_DOCUMENTOS,
  MIME_IMAGENES,
  opcionesDeCarga,
  sha256Archivo,
  STORAGE_PATH,
} from '../archivos';

/**
 * Seguimiento de la ejecución — actividad 9.2 (EFDS-1168).
 *
 * La consulta es más ancha que la carga: el seguimiento de un contrato lo
 * revisan control interno y la propia Dirección, no solo quien lo alimenta.
 */
@ApiTags('Etapa 9 · Seguimiento de la ejecución')
@Controller('procesos/:id/seguimiento')
export class SeguimientoController {
  constructor(private readonly service: SeguimientoService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_SEGUIMIENTO_VER)
  @ApiOperation({
    summary: 'Estado del contrato en ejecución y sus soportes',
    description:
      'El estado actual del contrato, quién responde por él y los informes, actas y soportes cargados.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_SEGUIMIENTO_CARGAR)
  @UseInterceptors(
    FileInterceptor(
      'file',
      // Se admiten imágenes además de ofimáticos: un soporte de la ejecución
      // puede ser la foto de una entrega o el pantallazo de una plataforma.
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'El soporte se carga en PDF, Word, Excel o como imagen',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 9.2 · Cargar un soporte del seguimiento',
    description:
      'Informes, actas y soportes de la ejecución, con el periodo que cubren. Quedan asociados al expediente del proceso.',
  })
  async cargar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: CargarSeguimientoDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta el soporte: sin archivo queda la afirmación de que existe, no el documento',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.cargar(
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

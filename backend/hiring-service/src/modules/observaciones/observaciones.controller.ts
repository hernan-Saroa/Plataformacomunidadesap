import {
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

import { ObservacionesService } from './observaciones.service';
import { RegistrarObservacionDto, ResponderObservacionDto } from './dto/observacion.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_LECTURA_CONTRATACION,
  ROLES_PARTICIPACION,
} from '../../auth/hiring-access';
import {
  MIME_DOCUMENTOS,
  MIME_IMAGENES,
  opcionesDeCarga,
  sha256Archivo,
  STORAGE_PATH,
} from '../archivos';

/**
 * Observaciones al proyecto de pliego — actividad 5.3 (EFDS-1151).
 *
 * Las observaciones llegan por SECOP II y la plataforma no habla con SECOP
 * (EFDS-1386), así que el gestor las transcribe con su soporte. Lo que la
 * entidad debe poder demostrar es que las recibió y que las respondió.
 */
@ApiTags('Observaciones al pliego')
@Controller('procesos/:id/observaciones')
export class ObservacionesController {
  constructor(private readonly service: ObservacionesService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({
    summary: 'Observaciones del proceso con su resumen',
    description:
      'Incluye cuántas quedan sin responder y cuántas llegaron fuera del plazo de publicidad.',
  })
  listar(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.listar(procesoId, undefined, getHiringAccess(req));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_PARTICIPACION)
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
    summary: 'Actividad 5.3 · Registrar una observación recibida',
    description:
      'El soporte es opcional: la observación pudo llegar por un canal que no deja documento. La fecha es la de presentación, no la del registro.',
  })
  async registrar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RegistrarObservacionDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    const ruta = file ? join(STORAGE_PATH, file.filename) : null;
    try {
      const hash = ruta ? await sha256Archivo(ruta) : null;
      return await this.service.registrar(
        procesoId,
        dto,
        file ?? null,
        hash,
        getHiringAccess(req),
      );
    } catch (error) {
      // Multer ya escribió el archivo antes de que el servicio validara nada.
      if (ruta) await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post(':observacionId/responder')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_PARTICIPACION)
  @ApiOperation({
    summary: 'Responder una observación',
    description:
      'Se pide siempre si la observación modificó el pliego: es lo que justifica una adenda posterior.',
  })
  responder(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('observacionId', ParseUUIDPipe) observacionId: string,
    @Body() dto: ResponderObservacionDto,
    @Req() req: any,
  ) {
    return this.service.responder(procesoId, observacionId, dto, getHiringAccess(req));
  }

  @Post('cerrar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_PARTICIPACION)
  @ApiOperation({
    summary: 'Dar por cumplida la recepción cuando no hubo observaciones',
    description:
      'Solo procede con el plazo de publicidad vencido: antes, que no haya ninguna no significa nada.',
  })
  cerrar(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.cerrarSinObservaciones(procesoId, getHiringAccess(req));
  }
}

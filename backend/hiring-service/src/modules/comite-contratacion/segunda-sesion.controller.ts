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
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { join } from 'path';
import { unlink } from 'fs/promises';

import { SegundaSesionService } from './segunda-sesion.service';
import { RegistrarSegundaSesionDto } from './dto/comite-contratacion.dto';
import { getHiringAccess } from '../../auth/hiring-access';
import { Puede } from '../../auth/puede.guard';
import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';

/**
 * Pliego definitivo y segunda sesión del Comité — actividad 5.6.1 (113).
 *
 * Enviarla a revisión y decidirla van por el trámite genérico de aprobación
 * (`procesos/:id/actividades/5.6.1/...`): aquí solo lo propio de la actividad.
 * Escribir no lleva `@Puede`: quién la hace depende del puesto que ocupa en
 * este proceso, y eso lo comprueba el servicio.
 */
@ApiTags('Etapa 5 · Segunda sesión del comité')
@Controller('procesos/:id/segunda-sesion-comite')
export class SegundaSesionController {
  constructor(private readonly service: SegundaSesionService) {}

  @Get()
  @Puede('ver', '5.6.1')
  @ApiOperation({
    summary: 'El pliego definitivo, el CDP y lo que decidió el comité en la segunda sesión',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post('documentos/:codigo')
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(MIME_DOCUMENTOS, 'Los documentos del proceso se cargan en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Subir la versión definitiva de un documento de la 5.1',
    description:
      'Sustituye la versión vigente en la misma transacción; la anterior queda en el historial. Solo mientras el pliego definitivo no esté en revisión ni aprobado.',
  })
  async nuevaVersion(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('codigo') codigo: string,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Adjunta la versión definitiva del documento');

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.nuevaVersion(
        procesoId,
        codigo,
        file,
        await sha256Archivo(ruta),
        getHiringAccess(req),
      );
    } catch (error) {
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post('enviar')
  @ApiOperation({
    summary: 'Enviar el pliego definitivo a revisión',
    description: 'Lo hace quien ocupa el puesto que hace la 5.6.1. Exige el CDP cargado.',
  })
  enviar(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.enviar(procesoId, getHiringAccess(req));
  }

  @Post('retirar')
  @ApiOperation({ summary: 'Retirar el pliego definitivo de revisión para corregirlo' })
  retirar(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.retirar(procesoId, getHiringAccess(req));
  }

  @Post('sesiones')
  @UseInterceptors(
    FileInterceptor('file', opcionesDeCarga(MIME_DOCUMENTOS, 'El acta se carga en PDF, Word o Excel')),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 5.6.1 · Registrar lo que decidió el comité en la segunda sesión',
    description:
      'Exige el pliego definitivo aprobado y el CDP cargado. Aprobar habilita la apertura; observar devuelve la 5.6.1; rechazar niega el proceso. El acta es opcional: puede cargarse después.',
  })
  async registrar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RegistrarSegundaSesionDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    const ruta = file ? join(STORAGE_PATH, file.filename) : null;
    try {
      return await this.service.registrar(
        procesoId,
        dto,
        file ?? null,
        ruta ? await sha256Archivo(ruta) : null,
        getHiringAccess(req),
      );
    } catch (error) {
      if (ruta) await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }
}

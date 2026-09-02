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

import { ArchivoExpedienteService } from './archivo-expediente.service';
import {
  ArchivarExpedienteDto,
  PublicarActaDto,
  ReabrirExpedienteDto,
} from './dto/archivo-expediente.dto';
import { RolesGuard } from '../../auth/roles.guard';

import { getHiringAccess } from '../../auth/hiring-access';

import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';

/**
 * Publicación del acta y archivo del expediente — actividad 10.4 (EFDS-1174).
 *
 * Archivar y reabrir son del Archivo de Gestión: la matriz de roles lo describe
 * como quien «organiza y custodia los expedientes en su totalidad». Publicar es
 * más amplio, porque en este módulo publicar en SECOP II ha sido siempre del
 * gestor.
 */
@ApiTags('Etapa 10 · Publicación y archivo')
@Controller('procesos/:id/archivo-expediente')
export class ArchivoExpedienteController {
  constructor(private readonly service: ArchivoExpedienteService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.seguimiento.ver')
  @ApiOperation({
    summary: 'Estado de la publicación del acta y del archivo',
    description:
      'Las publicaciones del acta con su control de plazo, qué destinos faltan, el expediente con su índice congelado si ya se archivó, y qué falta para poder archivarlo.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post('publicaciones')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.expediente.archivar')
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(
        MIME_DOCUMENTOS,
        'La evidencia de la publicación se carga en PDF, Word o Excel',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 10.4 · Registrar la publicación del acta',
    description:
      'Sobre un acta de liquidación vigente. La publicación ocurre en SECOP II y aquí se transcribe con su soporte, que es obligatorio.',
  })
  async publicar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: PublicarActaDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    // A diferencia del cierre financiero, aquí la evidencia no es opcional: sin
    // soporte no hay publicación registrada, solo la afirmación de que se hizo.
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

  @Post('archivar')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.expediente.archivar')
  @ApiOperation({
    summary: 'Actividad 10.4 · Archivar el expediente contractual',
    description:
      'Con el acta publicada en SECOP II y el contrato cerrado financieramente. Congela el índice de lo que el expediente contiene, que es lo que lo vuelve prueba ante auditoría.',
  })
  archivar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: ArchivarExpedienteDto,
    @Req() req: any,
  ) {
    return this.service.archivar(procesoId, dto, getHiringAccess(req));
  }

  @Post('reabrir')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.expediente.archivar')
  @ApiOperation({
    summary: 'Reabrir el expediente archivado',
    description:
      'Con motivo: el expediente ya se declaró completo ante entes de control. El índice congelado no se toca, para que se vea qué se movió después.',
  })
  reabrir(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: ReabrirExpedienteDto,
    @Req() req: any,
  ) {
    return this.service.reabrir(procesoId, dto, getHiringAccess(req));
  }
}

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

import { ActoAdjudicacionService } from './acto-adjudicacion.service';
import { AdjudicarDto, PublicarActoDto, RevocarActoDto } from './dto/acto.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_ADJUDICAR,
  ROLES_EVALUACION,
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
 * Acto de adjudicación — actividad 7.4 (EFDS-1159).
 *
 * Escribe el **Ordenador del Gasto**, no el gestor: el gestor lleva el trámite,
 * pero comprometer a la entidad con un tercero es de quien ordena el gasto. Lo
 * dice la historia, así que aquí no hay supuesto que confirmar.
 */
@ApiTags('Etapa 7 · Acto de adjudicación')
@Controller('procesos/:id/adjudicacion/acto')
export class ActoAdjudicacionController {
  constructor(private readonly service: ActoAdjudicacionService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION, ...ROLES_EVALUACION, ...ROLES_ADJUDICAR)
  @ApiOperation({
    summary: 'Estado de la adjudicación',
    description:
      'El acto vigente con su adjudicatario, la ganadora que propone el informe definitivo, y qué falta para poder adjudicar.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string) {
    return this.service.estado(procesoId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADJUDICAR)
  @UseInterceptors(
    FileInterceptor(
      'file',
      // Solo ofimáticos: la resolución es una pieza firmada.
      opcionesDeCarga(MIME_DOCUMENTOS, 'El acto de adjudicación se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 7.4 · Adjudicar el proceso',
    description:
      'La resolución del Ordenador del Gasto con su adjudicatario y su valor. Va después del informe definitivo publicado.',
  })
  async adjudicar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: AdjudicarDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta la resolución firmada: sin ella no hay acto de adjudicación',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);

    try {
      const hash = await sha256Archivo(ruta);
      return await this.service.adjudicar(procesoId, dto, file, hash, getHiringAccess(req));
    } catch (error) {
      // El archivo ya está en disco cuando la regla de negocio lo rechaza.
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post('publicar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADJUDICAR)
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'La evidencia de la publicación se carga en PDF, Word, Excel o imagen',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Notificar y publicar el acto',
    description:
      'La matriz dice "se notifica y publica en SECOP 2"; no hay integración, así que lo que lo prueba es el soporte.',
  })
  async publicar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: PublicarActoDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta el soporte de la publicación: es lo que prueba que el acto se notificó',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);

    try {
      const hash = await sha256Archivo(ruta);
      return await this.service.publicar(procesoId, dto, file, hash, getHiringAccess(req));
    } catch (error) {
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post('revocar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADJUDICAR)
  @ApiOperation({
    summary: 'Revocar el acto de adjudicación',
    description:
      'Deja sin efecto el acto vigente. No se borra: pudo notificarse y publicarse, y hay terceros que lo conocieron.',
  })
  revocar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RevocarActoDto,
    @Req() req: any,
  ) {
    return this.service.revocar(procesoId, dto, getHiringAccess(req));
  }
}

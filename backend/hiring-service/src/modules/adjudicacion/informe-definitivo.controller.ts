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

import { InformeDefinitivoService } from './informe-definitivo.service';
import { AnularDefinitivoDto, PublicarDefinitivoDto } from './dto/informe-definitivo.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_AUDIENCIA_ADJUDICACION,
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
 * Informe de evaluación definitivo — actividad 7.3 (EFDS-1159).
 *
 * Lo produce la entidad, no el comité: el comité evaluó y, si hubo que
 * rectificar, ya lo hizo en la 6.3. Aquí se congela lo que quedó y se publica.
 */
@ApiTags('Etapa 7 · Informe de evaluación definitivo')
@Controller('procesos/:id/adjudicacion/informe-definitivo')
export class InformeDefinitivoController {
  constructor(private readonly service: InformeDefinitivoService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION, ...ROLES_EVALUACION)
  @ApiOperation({
    summary: 'Estado del informe definitivo',
    description:
      'El informe con su resultado congelado y lo que cambió desde el preliminar, y qué falta para poder generarlo.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string) {
    return this.service.estado(procesoId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_AUDIENCIA_ADJUDICACION)
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(MIME_DOCUMENTOS, 'El informe definitivo se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 7.3 · Generar el informe de evaluación definitivo',
    description:
      'Congela el resultado vigente del comité y resuelve qué cambió respecto del preliminar. El archivo es opcional si ya se adjuntó.',
  })
  async generar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    // Sin archivo es un caso legítimo: regenerar la fotografía porque el comité
    // rectificó, conservando el documento que ya se había adjuntado.
    if (!file) {
      return this.service.generar(procesoId, null, null, getHiringAccess(req));
    }

    const ruta = join(STORAGE_PATH, file.filename);

    try {
      const hash = await sha256Archivo(ruta);
      return await this.service.generar(procesoId, file, hash, getHiringAccess(req));
    } catch (error) {
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post('publicar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_AUDIENCIA_ADJUDICACION)
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
    summary: 'Publicar el informe definitivo',
    description: 'Deja el informe publicado con el soporte que lo prueba.',
  })
  async publicar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: PublicarDefinitivoDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta el soporte de la publicación: no hay integración con SECOP II, así que es lo que la prueba',
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

  @Post('anular')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_AUDIENCIA_ADJUDICACION)
  @ApiOperation({
    summary: 'Anular el informe definitivo',
    description: 'Deja sin efecto el informe para poder generar otro; el anulado queda con su motivo.',
  })
  anular(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: AnularDefinitivoDto,
    @Req() req: any,
  ) {
    return this.service.anular(procesoId, dto, getHiringAccess(req));
  }
}

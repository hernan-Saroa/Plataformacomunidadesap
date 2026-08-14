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

import { ComiteService } from './comite.service';
import { DesignarComiteDto, RevocarComiteDto } from './dto/comite.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_DESIGNAR_COMITE,
  ROLES_LECTURA_CONTRATACION,
} from '../../auth/hiring-access';
import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';

/**
 * Comité evaluador — actividad 6.2 (EFDS-1156).
 *
 * Designar es competencia del Ordenador del Gasto y no del gestor que lleva el
 * proceso: es él quien responde por a quién nombra. De ahí que estos endpoints
 * tengan roles más estrechos que el resto de la etapa.
 */
@ApiTags('Etapa 6 · Comité evaluador')
@Controller('procesos/:id/comite')
export class ComiteController {
  constructor(private readonly service: ComiteService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({
    summary: 'Comité evaluador del proceso',
    description:
      'Si la modalidad lo exige, si el proceso ya cerró con oferentes, quiénes lo integran y en qué dimensiones evalúa quien consulta.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_DESIGNAR_COMITE)
  @UseInterceptors(
    FileInterceptor(
      'file',
      // Solo ofimáticos: el memorando es un acto administrativo firmado.
      opcionesDeCarga(MIME_DOCUMENTOS, 'El memorando se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 6.2 · Designar el comité evaluador',
    description:
      'Con el memorando firmado y los miembros con su rol. Solo sobre una recepción ya cerrada y con oferentes.',
  })
  async designar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: DesignarComiteDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta el memorando: sin él la designación es una lista de nombres, no un comité',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.designar(
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

  @Post('revocar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_DESIGNAR_COMITE)
  @ApiOperation({
    summary: 'Revocar la designación vigente',
    description:
      'El comité revocado se conserva en el expediente con su motivo: existió y pudo evaluar. Después se designa otro.',
  })
  revocar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RevocarComiteDto,
    @Req() req: any,
  ) {
    return this.service.revocar(procesoId, dto, getHiringAccess(req));
  }
}

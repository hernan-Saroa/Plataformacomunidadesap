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

import { ComiteService } from './comite.service';
import { CargarMemorandoDto, DesignarComiteDto, RevocarComiteDto } from './dto/comite.dto';
import { RolesGuard } from '../../auth/roles.guard';

import { getHiringAccess } from '../../auth/hiring-access';
import { Puede } from '../../auth/puede.guard';

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
  @Puede('ver', '6.2')
  @ApiOperation({
    summary: 'Comité evaluador del proceso',
    description:
      'Si la modalidad lo exige, si el proceso ya cerró con oferentes, quiénes lo integran y en qué dimensiones evalúa quien consulta.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post()
  @Puede('decidir', '6.2')
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
      'Los miembros con su rol y, si ya está firmado, el memorando. Sin memorando el comité queda registrado y se alerta hasta que se cargue. Solo sobre una recepción ya cerrada y con oferentes.',
  })
  async designar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: DesignarComiteDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    // Sin memorando es un caso legítimo: depende de firmas que tardan, y el
    // proceso no se detiene por eso (EFDS-1156).
    if (!file) {
      return this.service.designar(procesoId, dto, null, null, getHiringAccess(req));
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

  @Post('memorando')
  @Puede('decidir', '6.2')
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(MIME_DOCUMENTOS, 'El memorando se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Cargar el memorando de un comité ya designado',
    description:
      'Para el comité vigente que se registró sin memorando. Una vez cargado no se reemplaza: corregirlo es revocar y designar otro.',
  })
  async cargarMemorando(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: CargarMemorandoDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Adjunta el memorando firmado');

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.cargarMemorando(
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
  @Puede('decidir', '6.2')
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

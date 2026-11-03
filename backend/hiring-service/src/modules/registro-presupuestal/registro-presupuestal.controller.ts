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

import { RegistroPresupuestalService } from './registro-presupuestal.service';
import { CargarRpDto } from './dto/registro-presupuestal.dto';

import { getHiringAccess } from '../../auth/hiring-access';
import { Puede } from '../../auth/puede.guard';

import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';

/**
 * Registro presupuestal — actividad 8.3 (EFDS-1163).
 *
 * Sin interacción con la Dirección Financiera dentro de la plataforma
 * (revisión de QA, 2026-10-16): el RP se expide por fuera y aquí solo se carga.
 */
@ApiTags('Etapa 8 · Registro presupuestal')
@Controller('procesos/:id/registro-presupuestal')
export class RegistroPresupuestalController {
  constructor(private readonly service: RegistroPresupuestalService) {}

  @Get()
  @Puede('ver', '8.3')
  @ApiOperation({
    summary: 'Registro presupuestal del contrato',
    description:
      'Si el contrato está suscrito, en qué punto va el trámite y si el monto alcanza a cubrirlo.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post('cargue')
  @Puede('editar', '8.3')
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(MIME_DOCUMENTOS, 'El RP se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 8.3 · Cargar el RP expedido',
    description:
      'La Dirección Financiera expide el RP por el canal de siempre; aquí se carga el PDF con su número, valor, fecha y rubro (si no se dice, el del CDP).',
  })
  async cargar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: CargarRpDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Adjunta el PDF del RP expedido');

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

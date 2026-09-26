import {
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

import { ActaInicioService } from './acta-inicio.service';
import { SuscribirActaDto, SuscribirActaInicioDto } from './dto/acta-inicio.dto';
import { getHiringAccess } from '../../auth/hiring-access';
import { Puede } from '../../auth/puede.guard';

import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';

/**
 * Reunión y acta de inicio — actividad 9.1 (EFDS-1167).
 *
 * Los endpoints declaran permisos y no roles: los roles los crea y renombra el
 * administrador desde la plataforma, así que nombrarlos aquí ataría el módulo a
 * una configuración que puede cambiar mañana.
 */
@ApiTags('Etapa 9 · Reunión y acta de inicio')
@Controller('procesos/:id/acta-inicio')
export class ActaInicioController {
  constructor(private readonly service: ActaInicioService) {}

  @Get('suscripcion')
  @Puede('ver', '8.7')
  @ApiOperation({
    summary: 'Acta de inicio suscrita del contrato (8.7)',
    description: 'Si la modalidad la exige, si se puede registrar ya y la registrada.',
  })
  estadoActa(@Param('id', ParseUUIDPipe) procesoId: string) {
    return this.service.estadoActa(procesoId);
  }

  @Post('suscripcion')
  @Puede('editar', '8.7')
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(MIME_DOCUMENTOS, 'El acta de inicio se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 8.7 · Registrar el acta de inicio suscrita',
    description:
      'Con el acta firmada por las dos partes. Cierra la legalización; el contrato entra en ejecución con la reunión (9.1).',
  })
  async registrarActa(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: SuscribirActaDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) return this.service.registrarActa(procesoId, dto, null, null, getHiringAccess(req));

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.registrarActa(
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

  @Get()
  @Puede('ver', '9.1')
  @ApiOperation({
    summary: 'Reunión de inicio del contrato',
    description:
      'Si el contrato puede arrancar, qué le falta, y la reunión registrada con su acta.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post()
  @Puede('editar', '9.1')
  @UseInterceptors(
    FileInterceptor(
      'file',
      // Solo ofimáticos: el acta es un documento firmado por las dos partes.
      opcionesDeCarga(MIME_DOCUMENTOS, 'El acta de inicio se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 9.1 · Registrar la reunión de inicio',
    description:
      'Con el acta firmada cuando el contrato la pactó. Deja el contrato en ejecución.',
  })
  async suscribir(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: SuscribirActaInicioDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    // El archivo puede faltar legítimamente: la matriz admite contratos sin
    // acta pactada. Si hacía falta lo dice el servicio, que es quien sabe si el
    // contrato la pactó.
    if (!file) {
      return this.service.suscribir(procesoId, dto, null, null, getHiringAccess(req));
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.suscribir(
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

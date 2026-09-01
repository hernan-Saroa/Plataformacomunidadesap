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

import { CierreDefinitivoService } from './cierre-definitivo.service';
import {
  CerrarDefinitivamenteDto,
  RevertirCierreDefinitivoDto,
} from './dto/cierre-definitivo.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_CIERRE_DEFINITIVO,
  ROLES_LECTURA_EJECUCION,
} from '../../auth/hiring-access';
import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';

/**
 * Cierre definitivo del contrato (EFDS-1175).
 *
 * De la Dirección de Contratación, que es quien lleva el expediente
 * contractual. No cuelga de un numeral: la matriz no le da actividad propia, así
 * que la ruta va bajo el contrato y no bajo una casilla del riel.
 */
@ApiTags('Etapa 10 · Cierre definitivo')
@Controller('procesos/:id/cierre-definitivo')
export class CierreDefinitivoController {
  constructor(private readonly service: CierreDefinitivoService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_EJECUCION)
  @ApiOperation({
    summary: 'Estado del cierre definitivo',
    description:
      'Los amparos de estabilidad y calidad con su vigencia, qué falta para poder cerrar, el cierre vigente si lo hay y los que se revirtieron.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_CIERRE_DEFINITIVO)
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(MIME_DOCUMENTOS, 'El soporte del cierre se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Cerrar definitivamente el contrato',
    description:
      'Sobre un contrato liquidado y con los amparos de estabilidad y calidad vencidos. Deja el contrato en CERRADO y congela los amparos que se miraron.',
  })
  async cerrar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: CerrarDefinitivamenteDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    // El soporte es opcional: no hay un documento típico —a veces es la
    // certificación de la aseguradora, a veces nada— y exigir uno concreto
    // dejaría a alguien sin poder cerrar.
    const ruta = file ? join(STORAGE_PATH, file.filename) : null;
    try {
      return await this.service.cerrar(
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

  @Post('revertir')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_CIERRE_DEFINITIVO)
  @ApiOperation({
    summary: 'Revertir el cierre definitivo',
    description:
      'El contrato vuelve a LIQUIDADO. El cierre anterior queda en el expediente con su motivo: se había declarado en firme ante entes de control.',
  })
  revertir(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RevertirCierreDefinitivoDto,
    @Req() req: any,
  ) {
    return this.service.revertir(procesoId, dto, getHiringAccess(req));
  }
}

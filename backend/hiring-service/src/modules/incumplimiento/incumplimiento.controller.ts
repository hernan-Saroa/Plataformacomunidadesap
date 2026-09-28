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

import { IncumplimientoService } from './incumplimiento.service';
import { ReportarIncumplimientoDto } from './dto/incumplimiento.dto';
import { getHiringAccess } from '../../auth/hiring-access';
import { Puede } from '../../auth/puede.guard';

import {
  MIME_DOCUMENTOS,
  MIME_IMAGENES,
  opcionesDeCarga,
  sha256Archivo,
  STORAGE_PATH,
} from '../archivos';

/**
 * Presunto incumplimiento — bloque transversal (EFDS-1180).
 *
 * Reportar es lo más estrecho del bloque: RF-INC-01 se lo encarga al
 * supervisor, que es quien vigila la ejecución y está en condiciones de
 * constatar el hecho. La consulta es más ancha porque el caso lo tramita el
 * área jurídica y lo revisa la Dirección.
 *
 * El acceso restringido por reserva legal que pide RF-INC-03 es EFDS-1182 y se
 * resuelve allí, sobre estos mismos permisos.
 */
@ApiTags('Presunto incumplimiento')
@Controller('procesos/:id/incumplimiento')
export class IncumplimientoController {
  constructor(private readonly service: IncumplimientoService) {}

  @Get()
  @Puede('ver', 'INC.1')
  @ApiOperation({
    summary: 'Casos de presunto incumplimiento del contrato',
    description:
      'Los reportes abiertos sobre el contrato, con su motivo y soporte, y si quien consulta puede abrir uno nuevo.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post()
  @Puede('editar', 'INC.1')
  @UseInterceptors(
    FileInterceptor(
      'file',
      // Se admiten imágenes además de ofimáticos: lo que acredita un
      // incumplimiento suele ser la foto de una obra detenida o el pantallazo
      // de una plataforma sin el entregable.
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'El soporte se carga en PDF, Word, Excel o como imagen',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Reportar un presunto incumplimiento',
    description:
      'El supervisor constata el hecho y abre el caso. El soporte es opcional: un incumplimiento se observa a veces sin documento a la mano.',
  })
  async reportar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: ReportarIncumplimientoDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    // Sin archivo se reporta igual: no se exige soporte, así que aquí no se
    // corta como en el seguimiento (EFDS-1168), donde el documento es la razón
    // de ser del registro.
    if (!file) {
      return this.service.reportar(procesoId, dto, null, null, getHiringAccess(req));
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.reportar(
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

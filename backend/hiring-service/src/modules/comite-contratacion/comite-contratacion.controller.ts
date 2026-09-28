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

import { ComiteContratacionService } from './comite-contratacion.service';
import { RegistrarSesionComiteDto } from './dto/comite-contratacion.dto';
import { getHiringAccess } from '../../auth/hiring-access';
import { Puede } from '../../auth/puede.guard';
import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';

/**
 * Comité de contratación — actividad 3.7 (la 3.6 de la matriz, RF-DOC-05).
 *
 * No confundir con el comité **evaluador** de la 6.2, que es otro cuerpo y otra
 * etapa: aquel evalúa las ofertas que llegaron; este revisa los documentos del
 * proceso antes de que salga al mercado.
 *
 * Escribir no lleva `@Permisos`: quién transcribe depende de quién recibió
 * *este* proceso en la 3.3, y eso el guard no puede saberlo. Lo comprueba el
 * servicio, con el mismo `quienDecide` del resto de la etapa.
 */
@ApiTags('Etapa 3 · Comité de contratación')
@Controller('procesos/:id/comite-contratacion')
export class ComiteContratacionController {
  constructor(private readonly service: ComiteContratacionService) {}

  @Get()
  @Puede('ver', '3.7')
  @ApiOperation({
    summary: 'Si el proceso pasa por comité y qué decidió',
    description:
      'Si la matriz lo lleva al comité, si además lo supera el umbral de cuantía de su modalidad —con la cifra y su fundamento—, y las sesiones que ya se celebraron.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post('sesiones')
  @UseInterceptors(
    FileInterceptor(
      'file',
      // Solo ofimáticos: el acta es el documento de un cuerpo colegiado.
      opcionesDeCarga(MIME_DOCUMENTOS, 'El acta se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 3.7 · Registrar lo que decidió el comité',
    description:
      'Aprobar —con o sin condiciones— cierra la actividad; observar la devuelve con las observaciones de fondo para corregir y volver al comité; rechazar la niega y termina el proceso. Cualquiera de los tres primeros puede reabrir actividades anteriores ya cerradas, obligatorio al observar y opcional al aprobar, cuando el comité quiere que se las validen.',
  })
  async registrar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RegistrarSesionComiteDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta el acta: sin ella lo registrado es la palabra de quien lo escribe, no lo que el comité decidió',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.registrar(
        procesoId,
        dto,
        file,
        await sha256Archivo(ruta),
        getHiringAccess(req),
      );
    } catch (error) {
      // El archivo ya está en disco cuando el servicio rechaza: se borra, o el
      // almacenamiento acumula actas de sesiones que no se registraron.
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post('no-va')
  @ApiOperation({
    summary: 'Dejar constancia de que el proceso no pasó por comité',
    description:
      'Solo cuando la cuantía dice que no: en contratación directa, por debajo de 1.000 SMMLV. La actividad queda en NO_APLICA y la etapa puede cerrar.',
  })
  noVa(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.noVaAlComite(procesoId, getHiringAccess(req));
  }
}

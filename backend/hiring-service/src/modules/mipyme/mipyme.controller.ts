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

import { MipymeService } from './mipyme.service';
import { DecidirLimitacionDto, RegistrarManifestacionDto } from './dto/mipyme.dto';
import { RolesGuard } from '../../auth/roles.guard';

import { getHiringAccess } from '../../auth/hiring-access';

import {
  MIME_DOCUMENTOS,
  MIME_IMAGENES,
  opcionesDeCarga,
  sha256Archivo,
  STORAGE_PATH,
} from '../archivos';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';

const CARGA = opcionesDeCarga(
  [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
  'Solo se admiten archivos PDF, Word, Excel o imágenes PNG y JPG',
);

/**
 * Limitación de la convocatoria a MIPYME — actividad 5.4 (EFDS-1151).
 *
 * El sistema calcula si se cumplen las condiciones y las pone delante de quien
 * decide. La limitación la decide la entidad, no el software.
 */
@ApiTags('Limitación a MIPYME')
@Controller('procesos/:id/mipyme')
export class MipymeController {
  constructor(private readonly service: MipymeService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({
    summary: 'Manifestaciones, condiciones evaluadas y decisión',
    description:
      'Cada condición dice si se cumple y contra qué se comparó. Una condición que no se puede evaluar responde null, no false.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, undefined, getHiringAccess(req));
  }

  @Post('manifestaciones')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.actividad.edit')
  @UseInterceptors(FileInterceptor('file', CARGA))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Registrar una manifestación de interés de MIPYME',
    description:
      'La identificación es obligatoria: de contar cuántas MIPYME distintas manifestaron interés depende la decisión.',
  })
  async registrarManifestacion(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RegistrarManifestacionDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    return this.conArchivo(file, (archivo, hash) =>
      this.service.registrarManifestacion(procesoId, dto, archivo, hash, getHiringAccess(req)),
    );
  }

  @Post('decision')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.actividad.edit')
  @UseInterceptors(FileInterceptor('file', CARGA))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 5.4 · Registrar la decisión sobre la limitación',
    description:
      'Apartarse del cálculo es legítimo pero exige motivo. Limitar exige además el acto administrativo que lo sustenta.',
  })
  async decidir(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: DecidirLimitacionDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    return this.conArchivo(file, (archivo, hash) =>
      this.service.decidir(procesoId, dto, archivo, hash, getHiringAccess(req)),
    );
  }

  /**
   * Calcula el hash del adjunto y borra el archivo si la operación no prospera.
   *
   * Multer ya lo escribió antes de que el servicio validara nada; sin esto, cada
   * intento rechazado dejaría un archivo que no pertenece a ningún expediente.
   */
  private async conArchivo<T>(
    file: any,
    operacion: (archivo: any, hash: string | null) => Promise<T>,
  ): Promise<T> {
    const ruta = file ? join(STORAGE_PATH, file.filename) : null;
    try {
      const hash = ruta ? await sha256Archivo(ruta) : null;
      return await operacion(file ?? null, hash);
    } catch (error) {
      if (ruta) await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }
}

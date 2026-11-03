import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { join } from 'path';
import { unlink } from 'fs/promises';

import { ObservacionesService } from './observaciones.service';
import {
  CerrarSinObservacionesDto,
  RegistrarObservacionDto,
  ResponderObservacionDto,
  ResponderTodasDto,
} from './dto/observacion.dto';
import { RolesGuard } from '../../auth/roles.guard';

import { getHiringAccess } from '../../auth/hiring-access';
import { Puede } from '../../auth/puede.guard';

import {
  MIME_DOCUMENTOS,
  MIME_IMAGENES,
  opcionesDeCarga,
  sha256Archivo,
  STORAGE_PATH,
} from '../archivos';

/** Archivos por interesado y por documento de respuestas (127). */
const MAX_ARCHIVOS = 10;

/**
 * Observaciones al proyecto de pliego — actividad 5.6 (EFDS-1151).
 *
 * Las observaciones llegan por SECOP II y la plataforma no habla con SECOP
 * (EFDS-1386), así que el gestor las transcribe con su soporte. Lo que la
 * entidad debe poder demostrar es que las recibió y que las respondió.
 */
@ApiTags('Observaciones al pliego')
@Controller('procesos/:id/observaciones')
export class ObservacionesController {
  constructor(private readonly service: ObservacionesService) {}

  @Get()
  @Puede('ver', '5.6')
  @ApiOperation({
    summary: 'Observaciones del proceso con su resumen',
    description:
      'Incluye cuántas quedan sin responder y cuántas llegaron fuera del plazo de publicidad.',
  })
  listar(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.listar(procesoId, undefined, getHiringAccess(req));
  }

  @Post()
  @Puede('editar', '5.6')
  @UseInterceptors(
    FilesInterceptor(
      'files',
      MAX_ARCHIVOS,
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'Solo se admiten archivos PDF, Word, Excel o imágenes PNG y JPG',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 5.6 · Registrar lo que presentó un interesado',
    description:
      'Una fila por interesado: observación general, identificación como aparece en SECOP (opcional) y hasta diez archivos con el detalle. La fecha es la de presentación; si no se dice, hoy.',
  })
  async registrar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RegistrarObservacionDto,
    @UploadedFiles() files: any[],
    @Req() req: any,
  ) {
    return this.conArchivos(files ?? [], (soportes) =>
      this.service.registrar(procesoId, dto, soportes, getHiringAccess(req)),
    );
  }

  @Post('responder-todas')
  @Puede('editar', '5.6')
  @UseInterceptors(
    FilesInterceptor(
      'files',
      MAX_ARCHIVOS,
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'Solo se admiten archivos PDF, Word, Excel o imágenes PNG y JPG',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Responder a todos los interesados pendientes con un solo documento',
    description:
      'Lo habitual: un documento de respuestas para toda la actividad. Cada observación pendiente queda respondida con él.',
  })
  async responderTodas(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: ResponderTodasDto,
    @UploadedFiles() files: any[],
    @Req() req: any,
  ) {
    if (!files?.length) {
      throw new BadRequestException('Adjunta el documento de respuestas');
    }
    return this.conArchivos(files, (soportes) =>
      this.service.responderTodas(procesoId, dto, soportes, getHiringAccess(req)),
    );
  }

  @Post(':observacionId/responder')
  @Puede('editar', '5.6')
  @ApiOperation({
    summary: 'Responder una observación',
    description:
      'Se pide siempre si la observación modificó el pliego: es lo que justifica una adenda posterior.',
  })
  responder(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('observacionId', ParseUUIDPipe) observacionId: string,
    @Body() dto: ResponderObservacionDto,
    @Req() req: any,
  ) {
    return this.service.responder(procesoId, observacionId, dto, getHiringAccess(req));
  }

  @Post('cerrar')
  @Puede('editar', '5.6')
  @ApiOperation({
    summary: 'Dar por cumplida la recepción cuando no hubo observaciones',
    description:
      'Solo procede con el plazo de publicidad vencido: antes, que no haya ninguna no significa nada.',
  })
  cerrar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: CerrarSinObservacionesDto,
    @Req() req: any,
  ) {
    return this.service.cerrarSinObservaciones(procesoId, getHiringAccess(req), dto?.firma);
  }

  /** Calcula la huella de cada archivo y los borra del disco si la regla los rechaza. */
  private async conArchivos<T>(
    files: any[],
    accion: (soportes: { archivo: any; hash: string }[]) => Promise<T>,
  ): Promise<T> {
    const rutas = files.map((f) => join(STORAGE_PATH, f.filename));
    try {
      const soportes = await Promise.all(
        files.map(async (archivo, i) => ({ archivo, hash: await sha256Archivo(rutas[i]) })),
      );
      return await accion(soportes);
    } catch (error) {
      // Multer ya escribió los archivos antes de que el servicio validara nada.
      await Promise.all(rutas.map((r) => unlink(r).catch(() => undefined)));
      throw error;
    }
  }
}

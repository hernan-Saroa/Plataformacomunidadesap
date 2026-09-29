import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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

import { DocumentosActividadService } from './documentos-actividad.service';
import { getHiringAccess } from '../../auth/hiring-access';
import { Puede } from '../../auth/puede.guard';
import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';

/**
 * Los documentos que pide cada actividad (EFDS-2066).
 *
 * Sirve a las sesenta y tres: las filas salen de lo que Configuración haya
 * definido para la actividad en `documentos_requeridos`, así que una actividad
 * empieza a pedir documentos sin que nadie despliegue nada.
 */
@ApiTags('Documentos requeridos por actividad')
@Controller('procesos/:id/actividades/:numeral/documentos')
export class DocumentosActividadController {
  constructor(private readonly service: DocumentosActividadService) {}

  @Get()
  @Puede('ver', { param: 'numeral' })
  @ApiOperation({
    summary: 'Documentos que pide la actividad y los que ya se entregaron',
    description:
      'Las filas salen de los documentos requeridos de la actividad, filtrados por la modalidad y la tipología del proceso. Responde con lista vacía cuando no hay ninguno: es la respuesta correcta, no un error.',
  })
  estado(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('numeral') numeral: string,
    @Req() req: any,
  ) {
    return this.service.estado(procesoId, numeral, getHiringAccess(req));
  }

  @Post()
  @Puede('editar', { param: 'numeral' })
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(
        MIME_DOCUMENTOS,
        'Los documentos de la actividad se cargan en PDF, Word o Excel',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Cargar un documento de la actividad',
    description:
      'Con `codigo` el documento cubre ese requisito; sin él queda como anexo adicional, que se guarda pero no se exige.',
  })
  async cargar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('numeral') numeral: string,
    @Body() body: { codigo?: string },
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Adjunta el documento que quieres registrar');

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      const documento = await this.service.cargar(
        procesoId,
        numeral,
        body?.codigo || undefined,
        file,
        await sha256Archivo(ruta),
        getHiringAccess(req),
      );
      return { id: documento.id, nombre: documento.nombre };
    } catch (error) {
      // Multer escribió el archivo antes de que el servicio validara nada: si
      // el registro no prospera, ese archivo no pertenece a ningún expediente.
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post(':documentoProcesoId/anular')
  @Puede('editar', { param: 'numeral' })
  @ApiOperation({
    summary: 'Sustituir un documento requerido',
    description:
      'Deja sin efecto la entrega para poder cargar otra. No se borra: el expediente conserva la versión anterior.',
  })
  anular(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('numeral') numeral: string,
    @Param('documentoProcesoId', ParseUUIDPipe) documentoProcesoId: string,
    @Req() req: any,
  ) {
    return this.service.anular(procesoId, numeral, documentoProcesoId, getHiringAccess(req));
  }

  @Delete(':documentoId')
  @Puede('editar', { param: 'numeral' })
  @ApiOperation({
    summary: 'Retirar un anexo adicional de la actividad',
    description:
      'Solo lo que no cubre ningún requisito; lo que sí lo cubre se sustituye. Queda la traza de que se cargó y de que se retiró, con quién y cuándo.',
  })
  retirar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('documentoId', ParseUUIDPipe) documentoId: string,
    @Req() req: any,
  ) {
    return this.service.retirar(procesoId, documentoId, getHiringAccess(req));
  }
}

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

import { DocumentosService } from './documentos.service';
import { CargarDocumentoDto } from './dto/documentos.dto';
import { RolesGuard } from '../../auth/roles.guard';

import { getHiringAccess } from '../../auth/hiring-access';

import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';

/**
 * Elaboración de los documentos del proceso — actividad 5.1 (EFDS-1149).
 *
 * El sistema no redacta los documentos: exige los que corresponden a la
 * modalidad —aviso y proyecto de pliego en las competitivas, acto de
 * justificación en directa— y guarda cada uno en el expediente con su hash.
 * Generarlos desde las plantillas oficiales queda pendiente de que existan
 * (RF-DOC-07): hoy hiring.plantillas solo tiene las del estudio previo, y sin
 * archivo.
 */
@ApiTags('Etapa 5 · Documentos del proceso')
@Controller('procesos/:id/documentos')
export class DocumentosController {
  constructor(private readonly service: DocumentosService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({
    summary: 'Documentos que exige la actividad y cuáles ya están cargados',
    description:
      'La lista depende de la modalidad del proceso. Responde aunque la actividad no se haya iniciado: saber qué va a pedirse es lo que permite prepararlo.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string) {
    return this.service.estado(procesoId);
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.actividad.edit')
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(
        MIME_DOCUMENTOS,
        'El aviso, el pliego y el acto de justificación se cargan en PDF, Word o Excel',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 5.1 · Cargar uno de los documentos del proceso',
    description:
      'Solo admite formatos ofimáticos, a diferencia de la evidencia de publicación: esto es el documento que se firma y se publica, no la prueba de un hecho ocurrido en otra plataforma. En contratación directa exige el CDP expedido (RF-EST-06).',
  })
  async cargar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: CargarDocumentoDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('Adjunta el documento que quieres registrar');
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.cargar(procesoId, dto.codigo, file, await sha256Archivo(ruta), getHiringAccess(req));
    } catch (error) {
      // Multer escribió el archivo antes de que el servicio validara nada: si
      // el registro no prospera, ese archivo no pertenece a ningún expediente.
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post(':documentoId/anular')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.actividad.edit')
  @ApiOperation({
    summary: 'Sustituir un documento ya cargado',
    description:
      'Lo deja sin efecto para poder cargar otro en su lugar. No lo borra: el expediente conserva que hubo una versión anterior.',
  })
  anular(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('documentoId', ParseUUIDPipe) documentoProcesoId: string,
    @Req() req: any,
  ) {
    return this.service.anular(procesoId, documentoProcesoId, getHiringAccess(req));
  }
}

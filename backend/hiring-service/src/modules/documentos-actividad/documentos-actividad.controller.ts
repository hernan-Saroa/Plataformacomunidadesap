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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { join } from 'path';
import { unlink } from 'fs/promises';

import { DocumentosActividadService } from './documentos-actividad.service';
import { getHiringAccess } from '../../auth/hiring-access';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';
import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';

/**
 * Los documentos que una actividad entrega según sus formatos (EFDS-1183).
 *
 * Sirve a cualquier actividad, a diferencia de `/documentos`, que resuelve la
 * lista fija de la 5.1: aquí las filas salen de los formatos que Contratación
 * le haya asignado desde la biblioteca, y por eso una actividad empieza a
 * pedir documentos sin que nadie despliegue nada.
 */
@ApiTags('Documentos por formato de la actividad')
@Controller('procesos/:id/actividades/:numeral/documentos')
export class DocumentosActividadController {
  constructor(private readonly service: DocumentosActividadService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({
    summary: 'Documentos que pide la actividad y los que ya se entregaron',
    description:
      'Las filas salen de los formatos asignados a la actividad, filtrados por la modalidad del proceso. Responde con lista vacía cuando no hay ninguno: es la respuesta correcta, no un error.',
  })
  estado(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('numeral') numeral: string,
    @Req() req: any,
  ) {
    return this.service.estado(procesoId, numeral, getHiringAccess(req));
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.documento.upload')
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
      'Con `plantillaId` el documento cumple el requisito de ese formato; sin él queda como anexo adicional, que se guarda pero no se exige.',
  })
  async cargar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('numeral') numeral: string,
    @Body() body: { plantillaId?: string },
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Adjunta el documento que quieres registrar');

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.cargar(
        procesoId,
        numeral,
        body?.plantillaId,
        file,
        await sha256Archivo(ruta),
        getHiringAccess(req),
      );
    } catch (error) {
      // Multer escribió el archivo antes de que el servicio validara nada: si
      // el registro no prospera, ese archivo no pertenece a ningún expediente.
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Delete(':documentoId')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.documento.upload')
  @ApiOperation({
    summary: 'Retirar un documento de la actividad',
    description:
      'Queda la traza de que se cargó y de que se retiró, con quién y cuándo. El archivo en disco se conserva: el expediente debe poder probar qué se entregó.',
  })
  retirar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('documentoId', ParseUUIDPipe) documentoId: string,
    @Req() req: any,
  ) {
    return this.service.retirar(procesoId, documentoId, getHiringAccess(req));
  }
}

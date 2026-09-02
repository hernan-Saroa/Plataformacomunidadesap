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

import { AudienciaService } from './audiencia.service';
import {
  AbrirSobreDto,
  AnularAudienciaDto,
  CargarPiezaAudienciaDto,
  CelebrarAudienciaDto,
} from './dto/audiencia.dto';
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

/**
 * Audiencia de adjudicación y sobre económico — actividades 7.1 y 7.2.
 *
 * Escribe el gestor del proceso: registrar que la audiencia se celebró y cargar
 * su acta es documentar un hecho, no decidir. Adjudicar sí es decidir, y eso es
 * del Ordenador del Gasto en la 7.4.
 */
@ApiTags('Etapa 7 · Audiencia de adjudicación')
@Controller('procesos/:id/adjudicacion/audiencia')
export class AudienciaController {
  constructor(private readonly service: AudienciaService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view', 'contratacion.evaluacion.registrar')
  @ApiOperation({
    summary: 'Estado de la audiencia de adjudicación',
    description:
      'La audiencia registrada con su acta y sus piezas, los sobres abiertos y qué falta para poder celebrarla.',
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
      // Solo ofimáticos: el acta es una pieza firmada.
      opcionesDeCarga(MIME_DOCUMENTOS, 'El acta de la audiencia se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 7.1 · Registrar la audiencia de adjudicación',
    description:
      'Cuándo se celebró, quién la presidió y el acta. Va después de cerrado el traslado del informe.',
  })
  async celebrar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: CelebrarAudienciaDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta el acta: una audiencia sin acta no se puede probar, y sobre ella se adjudica',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);

    try {
      const hash = await sha256Archivo(ruta);
      return await this.service.celebrar(procesoId, dto, file, hash, getHiringAccess(req));
    } catch (error) {
      // El archivo ya está en disco cuando la regla de negocio lo rechaza.
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post('piezas')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.actividad.edit')
  @UseInterceptors(
    FileInterceptor(
      'file',
      // Con imágenes: parte de lo que documenta una audiencia son capturas y
      // registros que no son ofimáticos.
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'La pieza se carga en PDF, Word, Excel o imagen',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Cargar una grabación, observación o anexo de la audiencia',
    description:
      'La matriz pide cargar observaciones y respuestas, acta y grabaciones. Van de a una, cada una con lo que es.',
  })
  async cargarPieza(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: CargarPiezaAudienciaDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Adjunta el archivo de la pieza');

    const ruta = join(STORAGE_PATH, file.filename);

    try {
      const hash = await sha256Archivo(ruta);
      return await this.service.cargarPieza(procesoId, dto, file, hash, getHiringAccess(req));
    } catch (error) {
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post('sobres')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.actividad.edit')
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'La evidencia de la apertura se carga en PDF, Word, Excel o imagen',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 7.2 · Abrir el sobre económico de una oferta',
    description:
      'Solo donde la modalidad lo exige. El valor que traía el sobre se guarda aparte del que la oferta declaró.',
  })
  async abrirSobre(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: AbrirSobreDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    // La evidencia es opcional: el acta de la audiencia ya documenta la
    // apertura, y exigir un soporte por sobre duplicaría el mismo hecho.
    if (!file) {
      return this.service.abrirSobre(procesoId, dto, null, null, getHiringAccess(req));
    }

    const ruta = join(STORAGE_PATH, file.filename);

    try {
      const hash = await sha256Archivo(ruta);
      return await this.service.abrirSobre(procesoId, dto, file, hash, getHiringAccess(req));
    } catch (error) {
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post('anular')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.actividad.edit')
  @ApiOperation({
    summary: 'Anular la audiencia registrada',
    description:
      'Deja sin efecto la audiencia para poder registrar otra. La anulada se conserva con su motivo.',
  })
  anular(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: AnularAudienciaDto,
    @Req() req: any,
  ) {
    return this.service.anular(procesoId, dto, getHiringAccess(req));
  }
}

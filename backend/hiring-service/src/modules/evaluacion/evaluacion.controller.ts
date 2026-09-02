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

import { EvaluacionService } from './evaluacion.service';
import {
  CargarEvidenciaDto,
  RectificarResultadoDto,
  RegistrarResultadoDto,
} from './dto/evaluacion.dto';
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
 * Evaluación de ofertas — actividad 6.3 (EFDS-1157).
 *
 * La plataforma no califica: el comité evalúa por fuera y aquí registra el
 * resultado con su informe. El rol del token solo abre la puerta; quién puede
 * registrar lo decide la membresía del comité de este proceso, así que un
 * evaluador designado en otro llega hasta aquí y no escribe nada.
 */
@ApiTags('Etapa 6 · Evaluación de ofertas')
@Controller('procesos/:id/evaluacion')
export class EvaluacionController {
  constructor(private readonly service: EvaluacionService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view', 'contratacion.evaluacion.registrar')
  @ApiOperation({
    summary: 'Estado de la evaluación del proceso',
    description:
      'Las ofertas de la lista publicada, el resultado registrado con su informe y evidencias, y si quien consulta integra el comité.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post('resultado')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.evaluacion.registrar')
  @UseInterceptors(
    FileInterceptor(
      'file',
      // Solo ofimáticos: el informe de evaluación es una pieza firmada.
      opcionesDeCarga(MIME_DOCUMENTOS, 'El informe de evaluación se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 6.3 · Registrar el resultado de la evaluación',
    description:
      'La oferta que el comité eligió, su valoración y el informe que la sustenta. La evaluación se hace por fuera; aquí se recibe.',
  })
  async registrar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RegistrarResultadoDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta el informe del comité: sin él el resultado es la opinión de quien lo digitó',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);

    try {
      const hash = await sha256Archivo(ruta);
      return await this.service.registrar(procesoId, dto, file, hash, getHiringAccess(req));
    } catch (error) {
      // El archivo ya está en disco cuando la regla de negocio lo rechaza: se
      // borra para no dejar huérfanos en el almacenamiento.
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post('resultado/rectificar')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.evaluacion.registrar')
  @ApiOperation({
    summary: 'Rectificar el resultado registrado',
    description:
      'Deja sin efecto el resultado vigente para poder registrar otro. El anterior se conserva con su motivo y su informe.',
  })
  rectificar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RectificarResultadoDto,
    @Req() req: any,
  ) {
    return this.service.rectificar(procesoId, dto, getHiringAccess(req));
  }

  @Post('resultado/evidencias')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.evaluacion.registrar')
  @UseInterceptors(
    FileInterceptor(
      'file',
      // Aquí sí entran imágenes: parte de la evidencia son capturas de lo que
      // muestra otra plataforma, con el mismo criterio de la etapa 5.
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'La evidencia se carga en PDF, Word, Excel o imagen',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Cargar una evidencia de la evaluación',
    description:
      'Las verificaciones jurídica, financiera y técnica, el cuadro comparativo o las actas del comité, de a una.',
  })
  async cargarEvidencia(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: CargarEvidenciaDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Adjunta el archivo de la evidencia');

    const ruta = join(STORAGE_PATH, file.filename);

    try {
      const hash = await sha256Archivo(ruta);
      return await this.service.agregarEvidencia(procesoId, dto, file, hash, getHiringAccess(req));
    } catch (error) {
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }
}

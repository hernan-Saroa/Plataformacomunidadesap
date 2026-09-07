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

import { SubsanacionesService } from './subsanaciones.service';
import {
  CerrarTrasladoDto,
  RegistrarSubsanacionDto,
  ResponderSubsanacionDto,
} from './dto/subsanaciones.dto';
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
 * Subsanaciones y observaciones al informe — actividad 6.5 (EFDS-1158).
 *
 * Las transcribe el gestor: llegan por SECOP II y no hay integración, así que
 * lo que la entidad puede demostrar es que las recibió, cuándo, y con qué
 * soporte. Los evaluadores leen —lo presentado puede llevarlos a rectificar su
 * resultado— pero no registran.
 */
@ApiTags('Etapa 6 · Subsanaciones y observaciones')
@Controller('procesos/:id/traslado/subsanaciones')
export class SubsanacionesController {
  constructor(private readonly service: SubsanacionesService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view', 'contratacion.evaluacion.registrar')
  @ApiOperation({
    summary: 'Lo presentado contra el informe trasladado',
    description:
      'Subsanaciones y observaciones del informe en juego, con su soporte y si llegaron en término.',
  })
  listar(@Param('id', ParseUUIDPipe) procesoId: string) {
    return this.service.listar(procesoId);
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.actividad.edit')
  @UseInterceptors(
    FileInterceptor(
      'file',
      // Con imágenes: parte del soporte son capturas de lo que muestra SECOP,
      // con el mismo criterio de las observaciones al pliego (5.3).
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'El soporte se carga en PDF, Word, Excel o imagen',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 6.5 · Registrar una subsanación u observación',
    description:
      'Lo que presentó un oferente durante el traslado, con la fecha en que lo presentó. Lo que llegue después del vencimiento se registra marcado como extemporáneo.',
  })
  async registrar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RegistrarSubsanacionDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta el escrito del oferente: sin soporte no se puede demostrar qué presentó',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);

    try {
      const hash = await sha256Archivo(ruta);
      return await this.service.registrar(procesoId, dto, file, hash, getHiringAccess(req));
    } catch (error) {
      // El archivo ya está en disco cuando la regla de negocio lo rechaza.
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post(':subsanacionId/responder')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.actividad.edit')
  @UseInterceptors(
    FileInterceptor(
      'file',
      // La matriz pide respuesta documentada por dimensión —jurídica,
      // financiera y técnica—, así que puede traer su documento.
      opcionesDeCarga(MIME_DOCUMENTOS, 'La respuesta se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 6.6 · Responder una subsanación u observación',
    description:
      'Qué decidió la entidad y por qué, con el documento de la dimensión que corresponda. Se puede corregir mientras el traslado siga abierto.',
  })
  async responder(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('subsanacionId', ParseUUIDPipe) subsanacionId: string,
    @Body() dto: ResponderSubsanacionDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    // Sin documento es un caso legítimo: hay respuestas que se sustentan en el
    // propio texto, y la matriz pide documento por dimensión, no por escrito.
    if (!file) {
      return this.service.responder(procesoId, subsanacionId, dto, null, null, getHiringAccess(req));
    }

    const ruta = join(STORAGE_PATH, file.filename);

    try {
      const hash = await sha256Archivo(ruta);
      return await this.service.responder(
        procesoId,
        subsanacionId,
        dto,
        file,
        hash,
        getHiringAccess(req),
      );
    } catch (error) {
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post('cerrar')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.actividad.edit')
  @ApiOperation({
    summary: 'Cerrar el traslado',
    description:
      'Da por agotado el término. Exige que el plazo haya vencido y que no quede nada sin responder.',
  })
  cerrar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: CerrarTrasladoDto,
    @Req() req: any,
  ) {
    return this.service.cerrar(procesoId, dto, getHiringAccess(req));
  }
}

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
import { RegistrarSubsanacionDto } from './dto/subsanaciones.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_EVALUACION,
  ROLES_LECTURA_CONTRATACION,
  ROLES_TRASLADO,
} from '../../auth/hiring-access';
import {
  MIME_DOCUMENTOS,
  MIME_IMAGENES,
  opcionesDeCarga,
  sha256Archivo,
  STORAGE_PATH,
} from '../archivos';

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
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION, ...ROLES_EVALUACION)
  @ApiOperation({
    summary: 'Lo presentado contra el informe trasladado',
    description:
      'Subsanaciones y observaciones del informe en juego, con su soporte y si llegaron en término.',
  })
  listar(@Param('id', ParseUUIDPipe) procesoId: string) {
    return this.service.listar(procesoId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_TRASLADO)
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
}

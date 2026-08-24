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

import { TrasladoService } from './traslado.service';
import { AnularInformeDto, GenerarInformeDto, TrasladarInformeDto } from './dto/traslado.dto';
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
 * Traslado del informe de evaluación — actividad 6.4 (EFDS-1158).
 *
 * Escribe el gestor del proceso, no el comité: el comité evaluó y entregó su
 * resultado (6.3), y trasladarlo es un acto de la entidad. Los evaluadores
 * quedan como lectores para poder ver qué se notificó de lo que ellos
 * evaluaron.
 */
@ApiTags('Etapa 6 · Traslado del informe de evaluación')
@Controller('procesos/:id/traslado')
export class TrasladoController {
  constructor(private readonly service: TrasladoService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION, ...ROLES_EVALUACION)
  @ApiOperation({
    summary: 'Estado del traslado del informe',
    description:
      'El informe en juego con su resultado congelado, el plazo aplicado y lo que queda de término.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post('informe')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_TRASLADO)
  @UseInterceptors(
    FileInterceptor(
      'file',
      // Solo ofimáticos: el informe preliminar es una pieza firmada.
      opcionesDeCarga(MIME_DOCUMENTOS, 'El informe preliminar se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 6.4 · Generar el informe de evaluación preliminar',
    description:
      'Congela el resultado del comité y arma el borrador. Volver a llamarlo mientras esté en borrador vuelve a tomar la fotografía; el archivo es opcional si ya se adjuntó.',
  })
  async generar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: GenerarInformeDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    // Sin archivo es un caso legítimo: regenerar la fotografía porque el comité
    // rectificó, conservando el documento que ya se había adjuntado.
    if (!file) {
      return this.service.generar(procesoId, dto, null, null, getHiringAccess(req));
    }

    const ruta = join(STORAGE_PATH, file.filename);

    try {
      const hash = await sha256Archivo(ruta);
      return await this.service.generar(procesoId, dto, file, hash, getHiringAccess(req));
    } catch (error) {
      // El archivo ya está en disco cuando la regla de negocio lo rechaza: se
      // borra para no dejar huérfanos en el almacenamiento.
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post('trasladar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_TRASLADO)
  @UseInterceptors(
    FileInterceptor(
      'file',
      // Aquí sí entran imágenes: la evidencia de la publicación suele ser una
      // captura de la otra plataforma, con el mismo criterio de la etapa 5.
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'La evidencia de la publicación se carga en PDF, Word, Excel o imagen',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Publicar y trasladar el informe',
    description:
      'Deja el informe notificado y abre el término de subsanaciones que corresponde a la modalidad.',
  })
  async trasladar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: TrasladarInformeDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta el soporte de la publicación: no hay integración con SECOP II, así que es lo que prueba el traslado',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);

    try {
      const hash = await sha256Archivo(ruta);
      return await this.service.trasladar(procesoId, dto, file, hash, getHiringAccess(req));
    } catch (error) {
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post('anular')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_TRASLADO)
  @ApiOperation({
    summary: 'Anular el informe',
    description:
      'Deja sin efecto el informe en juego para poder generar otro. El anulado se conserva con su motivo y lo que se presentó contra él.',
  })
  anular(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: AnularInformeDto,
    @Req() req: any,
  ) {
    return this.service.anular(procesoId, dto, getHiringAccess(req));
  }
}

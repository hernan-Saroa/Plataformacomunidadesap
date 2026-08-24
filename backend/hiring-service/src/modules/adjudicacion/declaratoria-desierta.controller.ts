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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { join } from 'path';
import { unlink } from 'fs/promises';

import { DeclaratoriaDesiertaService } from './declaratoria-desierta.service';
import {
  DeclararDesiertoDto,
  PublicarDesiertaDto,
  RevocarDesiertaDto,
} from './dto/desierta.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_ADJUDICAR,
  ROLES_DECLARAR_DESIERTO,
  ROLES_EVALUACION,
  ROLES_LECTURA_CONTRATACION,
} from '../../auth/hiring-access';
import {
  MIME_DOCUMENTOS,
  MIME_IMAGENES,
  opcionesDeCarga,
  sha256Archivo,
  STORAGE_PATH,
} from '../archivos';

/**
 * Declaratoria desierta — etapa 7 (EFDS-1160, RF-ADJ-02).
 *
 * El otro desenlace del proceso. Escribe el gestor, que es lo que dice la
 * historia; que un acto administrativo motivado normalmente lo firme el
 * Ordenador del Gasto —como el acto de adjudicación— es la tensión que queda
 * por confirmar en EFDS-1513.
 */
@ApiTags('Etapa 7 · Declaratoria desierta')
@Controller('procesos/:id/adjudicacion/desierta')
export class DeclaratoriaDesiertaController {
  constructor(private readonly service: DeclaratoriaDesiertaService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(
    ...ROLES_LECTURA_CONTRATACION,
    ...ROLES_EVALUACION,
    ...ROLES_ADJUDICAR,
    ...ROLES_DECLARAR_DESIERTO,
  )
  @ApiOperation({
    summary: 'Estado de la declaratoria desierta',
    description:
      'La declaratoria vigente, cuántas ofertas recibió el proceso, qué causal cabe según eso y qué impide declarar.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string) {
    return this.service.estado(procesoId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_DECLARAR_DESIERTO)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'acto', maxCount: 1 },
        { name: 'informeComite', maxCount: 1 },
      ],
      // Solo ofimáticos: los dos son piezas firmadas del expediente.
      opcionesDeCarga(
        MIME_DOCUMENTOS,
        'El acto y el informe del comité se cargan en PDF, Word o Excel',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Declarar desierto el proceso',
    description:
      'La resolución que declara desierto, con su causal y su motivación. El informe del comité va en la misma petición y solo cuando la causal es que ninguna oferta quedó habilitada: sin ofertas no hay comité que haya evaluado nada.',
  })
  async declarar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: DeclararDesiertoDto,
    @UploadedFiles() archivos: { acto?: any[]; informeComite?: any[] },
    @Req() req: any,
  ) {
    const acto = archivos?.acto?.[0];
    const informeComite = archivos?.informeComite?.[0];

    if (!acto) {
      await this.descartar(acto, informeComite);
      throw new BadRequestException(
        'Adjunta la resolución firmada: sin ella no hay declaratoria que probar',
      );
    }

    try {
      return await this.service.declarar(
        procesoId,
        dto,
        acto,
        await sha256Archivo(join(STORAGE_PATH, acto.filename)),
        informeComite ?? null,
        informeComite
          ? await sha256Archivo(join(STORAGE_PATH, informeComite.filename))
          : null,
        getHiringAccess(req),
      );
    } catch (error) {
      // Multer ya escribió los archivos antes de que el servicio validara nada.
      await this.descartar(acto, informeComite);
      throw error;
    }
  }

  @Post('publicar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_DECLARAR_DESIERTO)
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'La evidencia de la publicación se carga en PDF, Word, Excel o imagen',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Notificar y publicar la declaratoria',
    description:
      'La declaratoria se notifica y publica como el acto de adjudicación; no hay integración con SECOP II, así que lo que lo prueba es el soporte.',
  })
  async publicar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: PublicarDesiertaDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta el soporte de la publicación: es lo que prueba que la declaratoria se notificó',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);

    try {
      return await this.service.publicar(
        procesoId,
        dto,
        file,
        await sha256Archivo(ruta),
        getHiringAccess(req),
      );
    } catch (error) {
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post('revocar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_DECLARAR_DESIERTO)
  @ApiOperation({
    summary: 'Revocar la declaratoria desierta',
    description:
      'Deja sin efecto la declaratoria vigente y el proceso vuelve a quedar en curso. No se borra: pudo notificarse y publicarse, y hay terceros que la conocieron.',
  })
  revocar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RevocarDesiertaDto,
    @Req() req: any,
  ) {
    return this.service.revocar(procesoId, dto, getHiringAccess(req));
  }

  private async descartar(...archivos: Array<{ filename?: string } | undefined>) {
    for (const archivo of archivos) {
      if (archivo?.filename) {
        await unlink(join(STORAGE_PATH, archivo.filename)).catch(() => undefined);
      }
    }
  }
}

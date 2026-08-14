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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { join } from 'path';
import { unlink } from 'fs/promises';

import { RiesgosService } from './riesgos.service';
import { AnularAudienciaDto, RegistrarAudienciaDto } from './dto/riesgos.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_AUDIENCIA_RIESGOS,
  ROLES_LECTURA_CONTRATACION,
} from '../../auth/hiring-access';
import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';

/**
 * Audiencia de asignación de riesgos — actividad 5.5 (EFDS-1153).
 *
 * El sistema no celebra la audiencia: registra que se celebró y guarda lo que
 * produjo, que es el acta y la matriz de riesgos consolidada. Donde la
 * audiencia es obligatoria, ese registro es lo que habilita la apertura.
 */
@ApiTags('Etapa 5 · Audiencia de riesgos')
@Controller('procesos/:id/audiencia-riesgos')
export class RiesgosController {
  constructor(private readonly service: RiesgosService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({
    summary: 'Estado de la audiencia de riesgos del proceso',
    description:
      'Dice si la actividad aplica a la modalidad, si la audiencia es obligatoria y si ya se celebró, con sus documentos. Distingue aplicable de obligatoria: donde aplica sin serlo, la audiencia no bloquea la apertura.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string) {
    return this.service.estado(procesoId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_AUDIENCIA_RIESGOS)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'acta', maxCount: 1 },
        { name: 'matriz', maxCount: 1 },
      ],
      // Solo ofimáticos: el acta se firma y la matriz de riesgos se trabaja en
      // hoja de cálculo. Aquí no hay ningún hecho ocurrido en otra plataforma
      // que justifique una captura de pantalla.
      opcionesDeCarga(
        MIME_DOCUMENTOS,
        'El acta y la matriz de riesgos se cargan en PDF, Word o Excel',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 5.5 · Registrar la audiencia celebrada',
    description:
      'El acta y la matriz consolidada van en la misma petición: la historia exige la audiencia y la consolidación de su resultado, y un acta sin matriz dejaría la actividad a medias. La fecha es la de celebración y no puede ser futura.',
  })
  async registrar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RegistrarAudienciaDto,
    @UploadedFiles() archivos: { acta?: any[]; matriz?: any[] },
    @Req() req: any,
  ) {
    const acta = archivos?.acta?.[0];
    const matriz = archivos?.matriz?.[0];

    if (!acta || !matriz) {
      await this.descartar(acta, matriz);
      throw new BadRequestException(
        'Adjunta el acta de la audiencia y la matriz de riesgos consolidada',
      );
    }

    try {
      return await this.service.registrar(
        procesoId,
        dto,
        acta,
        await sha256Archivo(join(STORAGE_PATH, acta.filename)),
        matriz,
        await sha256Archivo(join(STORAGE_PATH, matriz.filename)),
        getHiringAccess(req),
      );
    } catch (error) {
      // Multer ya escribió los archivos antes de que el servicio validara nada.
      await this.descartar(acta, matriz);
      throw error;
    }
  }

  @Post('anular')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_AUDIENCIA_RIESGOS)
  @ApiOperation({
    summary: 'Anular la audiencia registrada para corregirla',
    description:
      'Donde la audiencia es obligatoria, anularla vuelve a impedir la apertura del proceso: mientras no haya una vigente, el requisito no está cumplido.',
  })
  anular(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: AnularAudienciaDto,
    @Req() req: any,
  ) {
    return this.service.anular(procesoId, dto, getHiringAccess(req));
  }

  private async descartar(...archivos: Array<{ filename?: string } | undefined>) {
    for (const archivo of archivos) {
      if (archivo?.filename) {
        await unlink(join(STORAGE_PATH, archivo.filename)).catch(() => undefined);
      }
    }
  }
}

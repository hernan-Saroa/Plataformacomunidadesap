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

import { ActaInicioService } from './acta-inicio.service';
import { AnularActaInicioDto, SuscribirActaInicioDto } from './dto/acta-inicio.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_ACTA_INICIO,
  ROLES_LECTURA_EJECUCION,
} from '../../auth/hiring-access';
import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';

/**
 * Reunión y acta de inicio — actividad 9.1 (EFDS-1167).
 *
 * Donde el contrato deja de tramitarse y empieza a cumplirse. La plataforma no
 * celebra la reunión: registra que ocurrió y guarda el acta que la prueba.
 */
@ApiTags('Etapa 9 · Acta de inicio')
@Controller('procesos/:id/acta-inicio')
export class ActaInicioController {
  constructor(private readonly service: ActaInicioService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_EJECUCION)
  @ApiOperation({
    summary: 'Estado del inicio de la ejecución',
    description:
      'Si el contrato admite acta, quién lo supervisa, el acta vigente con su fecha de inicio y las que se anularon antes.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ACTA_INICIO)
  @UseInterceptors(
    FileInterceptor(
      'file',
      // Solo ofimáticos: el acta la firman las partes, no es una captura.
      opcionesDeCarga(MIME_DOCUMENTOS, 'El acta de inicio se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 9.1 · Suscribir el acta de inicio',
    description:
      'Sobre un contrato legalizado y con supervisor designado. Deja el contrato en ejecución desde la fecha que fije el acta.',
  })
  async suscribir(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: SuscribirActaInicioDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta el acta firmada: sin ella hubo una reunión, no un inicio',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.suscribir(
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

  @Post('anular')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ACTA_INICIO)
  @ApiOperation({
    summary: 'Anular el acta vigente',
    description:
      'El contrato vuelve a legalizado y el acta queda en el expediente con su motivo: fijó la fecha desde la que corrió el plazo.',
  })
  anular(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: AnularActaInicioDto,
    @Req() req: any,
  ) {
    return this.service.anular(procesoId, dto, getHiringAccess(req));
  }
}

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

import { ModificacionesService } from './modificaciones.service';
import {
  AprobarModificacionDto,
  RechazarModificacionDto,
  SolicitarProrrogaDto,
} from './dto/modificaciones.dto';
import { PermisosGuard } from '../../auth/permisos.guard';
import { Permisos } from '../../auth/permisos.decorator';
import {
  PERMISO_MODIFICACION_APROBAR,
  PERMISO_MODIFICACION_SOLICITAR,
  PERMISO_MODIFICACION_VER,
} from '../../auth/permisos';
import { getHiringAccess } from '../../auth/hiring-access';
import {
  MIME_DOCUMENTOS,
  MIME_IMAGENES,
  opcionesDeCarga,
  sha256Archivo,
  STORAGE_PATH,
} from '../archivos';

/**
 * Modificaciones contractuales — actividad 9.5 (EFDS-1177).
 *
 * Solicitar y aprobar van por permisos distintos a propósito: quien pide la
 * prórroga no puede concedérsela. Es la misma separación del estudio previo y
 * del CDP.
 */
@ApiTags('Etapa 9 · Modificaciones contractuales')
@Controller('procesos/:id/modificaciones')
export class ModificacionesController {
  constructor(private readonly service: ModificacionesService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_MODIFICACION_VER)
  @ApiOperation({
    summary: 'Modificaciones del contrato y si se puede tramitar otra',
    description:
      'El plazo vigente, cuántos días se han prorrogado y el historial de modificaciones con su estado.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post('prorroga')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_MODIFICACION_SOLICITAR)
  @ApiOperation({
    summary: 'Solicitar una prórroga en tiempo',
    description:
      'Registra la solicitud con su justificación técnica. No extiende el plazo: eso ocurre al aprobarla.',
  })
  solicitarProrroga(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: SolicitarProrrogaDto,
    @Req() req: any,
  ) {
    return this.service.solicitarProrroga(procesoId, dto, getHiringAccess(req));
  }

  @Post(':modificacionId/aprobar')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_MODIFICACION_APROBAR)
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'El acto administrativo se carga en PDF, Word, Excel o como imagen',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Aprobar la prórroga y extender el plazo',
    description:
      'Exige el acto administrativo. Extiende el plazo del contrato sin tocar su valor (RF-MOD-02).',
  })
  async aprobar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('modificacionId', ParseUUIDPipe) modificacionId: string,
    @Body() dto: AprobarModificacionDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      // Aprobar sin acto dejaría el contrato extendido por un acuerdo verbal.
      throw new BadRequestException(
        'La aprobación necesita el acto administrativo que soporta la prórroga',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      const hash = await sha256Archivo(ruta);
      return await this.service.aprobar(
        procesoId,
        modificacionId,
        dto,
        file,
        hash,
        getHiringAccess(req),
      );
    } catch (error) {
      // El archivo ya está en disco: si la transacción falla, dejarlo ahí
      // llenaría el almacenamiento de soportes que no respaldan nada.
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post(':modificacionId/rechazar')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_MODIFICACION_APROBAR)
  @ApiOperation({
    summary: 'Negar la prórroga',
    description:
      'Exige el motivo. El plazo del contrato no se toca, y la solicitud queda en el expediente explicando por qué no se extendió.',
  })
  rechazar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('modificacionId', ParseUUIDPipe) modificacionId: string,
    @Body() dto: RechazarModificacionDto,
    @Req() req: any,
  ) {
    return this.service.rechazar(procesoId, modificacionId, dto, getHiringAccess(req));
  }
}

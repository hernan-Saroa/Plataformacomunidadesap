import {
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

import { RegistroPresupuestalService } from './registro-presupuestal.service';
import { ExpedirRpDto, RechazarRpDto, SolicitarRpDto } from './dto/registro-presupuestal.dto';
import { RolesGuard } from '../../auth/roles.guard';

import { getHiringAccess } from '../../auth/hiring-access';

import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';

/**
 * Registro presupuestal — actividad 8.3 (EFDS-1163).
 *
 * Los roles son los mismos del CDP y por la misma razón: la solicitud la radica
 * quien lleva el contrato, pero verificar la disponibilidad y expedir es
 * competencia de la Dirección Financiera, que es la que compromete el
 * presupuesto de la entidad.
 */
@ApiTags('Etapa 8 · Registro presupuestal')
@Controller('procesos/:id/registro-presupuestal')
export class RegistroPresupuestalController {
  constructor(private readonly service: RegistroPresupuestalService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({
    summary: 'Registro presupuestal del contrato',
    description:
      'Si el contrato está suscrito, en qué punto va el trámite y si el monto alcanza a cubrirlo.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.actividad.edit')
  @ApiOperation({
    summary: 'Actividad 8.3 · Radicar la solicitud del RP',
    description: 'Solo sobre un contrato ya firmado por las dos partes.',
  })
  solicitar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: SolicitarRpDto,
    @Req() req: any,
  ) {
    return this.service.solicitar(procesoId, dto, getHiringAccess(req));
  }

  @Post('verificar')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.presupuesto.gestionar')
  @ApiOperation({
    summary: 'Verificar la disponibilidad',
    description:
      'La Dirección Financiera confirma que hay recursos que comprometer. Es el paso que certifica el compromiso antes de expedirlo.',
  })
  verificar(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.verificar(procesoId, getHiringAccess(req));
  }

  @Post('expedir')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.presupuesto.gestionar')
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(MIME_DOCUMENTOS, 'El soporte del RP se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Expedir el registro presupuestal',
    description:
      'Con su número, valor y fecha: son lo que hace verificable el compromiso ante los entes de control.',
  })
  async expedir(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: ExpedirRpDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    // El soporte es opcional: el número y la fecha son lo que compromete, y en
    // el CDP se resolvió igual.
    if (!file) {
      return this.service.expedir(procesoId, dto, null, null, getHiringAccess(req));
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.expedir(
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

  @Post('rechazar')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.presupuesto.gestionar')
  @ApiOperation({
    summary: 'Rechazar la solicitud',
    description: 'Con el motivo: sin él, quien solicita no sabe si corregir el rubro o el valor.',
  })
  rechazar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RechazarRpDto,
    @Req() req: any,
  ) {
    return this.service.rechazar(procesoId, dto, getHiringAccess(req));
  }
}

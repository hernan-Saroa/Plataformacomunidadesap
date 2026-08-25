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

import { LegalizacionService } from './legalizacion.service';
import {
  CargarGarantiaDto,
  RechazarGarantiaDto,
  RegistrarArlDto,
} from './dto/legalizacion.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_APROBAR_GARANTIAS,
  ROLES_LECTURA_CONTRATACION,
  ROLES_LEGALIZACION,
} from '../../auth/hiring-access';
import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';

/**
 * Pólizas, garantías y ARL — actividades 8.4 y 8.5 (EFDS-1164).
 *
 * Cargar y aprobar son dos actuaciones distintas y por eso tienen roles
 * distintos: el contratista presenta —a través del gestor— y la entidad
 * verifica. Que quien carga pudiera aprobar dejaría la revisión sin sentido.
 */
@ApiTags('Etapa 8 · Legalización')
@Controller('procesos/:id/legalizacion')
export class LegalizacionController {
  constructor(private readonly service: LegalizacionService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({
    summary: 'Legalización del contrato',
    description:
      'Garantías con sus amparos y vencimientos, afiliación a la ARL cuando aplica, y qué falta para legalizar.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post('garantias')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LEGALIZACION)
  @UseInterceptors(
    FileInterceptor('file', opcionesDeCarga(MIME_DOCUMENTOS, 'La póliza se carga en PDF, Word o Excel')),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 8.4 · Cargar una garantía con sus amparos',
    description:
      'Los amparos van desglosados con su propia vigencia, para poder controlar el que vence primero.',
  })
  async cargarGarantia(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: CargarGarantiaDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta la póliza: aprobar una garantía que nadie ve no cubre nada',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.cargarGarantia(
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

  @Post('garantias/:garantiaId/aprobar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_APROBAR_GARANTIAS)
  @ApiOperation({
    summary: 'Aprobar una póliza',
    description:
      'Con todas las garantías aprobadas —y la ARL si el contratista es persona natural— el contrato queda legalizado.',
  })
  aprobar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('garantiaId', ParseUUIDPipe) garantiaId: string,
    @Req() req: any,
  ) {
    return this.service.aprobarGarantia(procesoId, garantiaId, getHiringAccess(req));
  }

  @Post('garantias/:garantiaId/rechazar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_APROBAR_GARANTIAS)
  @ApiOperation({
    summary: 'Devolver una póliza con su motivo',
    description: 'La póliza devuelta se conserva en el expediente; después se carga la corregida.',
  })
  rechazar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('garantiaId', ParseUUIDPipe) garantiaId: string,
    @Body() dto: RechazarGarantiaDto,
    @Req() req: any,
  ) {
    return this.service.rechazarGarantia(procesoId, garantiaId, dto, getHiringAccess(req));
  }

  @Post('arl')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LEGALIZACION)
  @UseInterceptors(
    FileInterceptor('file', opcionesDeCarga(MIME_DOCUMENTOS, 'El soporte se carga en PDF, Word o Excel')),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 8.5 · Registrar la afiliación a la ARL',
    description:
      'Obligatoria para contratistas persona natural. La afiliación puede haberla hecho la entidad o el propio contratista.',
  })
  async registrarArl(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RegistrarArlDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('Adjunta el soporte de la afiliación a la ARL');
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.registrarArl(
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
}

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
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { join } from 'path';
import { unlink } from 'fs/promises';

import { LegalizacionService } from './legalizacion.service';
import {
  AgregarAmparoDto,
  AprobarGarantiaDto,
  CargarGarantiaDto,
  RechazarGarantiaDto,
  RegistrarArlDto,
} from './dto/legalizacion.dto';
import { RolesGuard } from '../../auth/roles.guard';

import { getHiringAccess } from '../../auth/hiring-access';
import { Puede } from '../../auth/puede.guard';

import {
  MIME_DOCUMENTOS,
  MIME_IMAGENES,
  opcionesDeCarga,
  sha256Archivo,
  STORAGE_PATH,
} from '../archivos';

/**
 * Pólizas, garantías y ARL — actividades 8.4 y 8.5 (EFDS-1164).
 *
 * Desde la revisión de QA (2026-10-16) la póliza se aprueba en SECOP II y aquí
 * se registra con esa fecha y su evidencia. Aprobar y devolver se quedan para
 * las pólizas que se cargaron antes del cambio.
 */
@ApiTags('Etapa 8 · Legalización')
@Controller('procesos/:id/legalizacion')
export class LegalizacionController {
  constructor(private readonly service: LegalizacionService) {}

  @Get()
  @Puede('ver', '8.4')
  @ApiOperation({
    summary: 'Legalización del contrato',
    description:
      'Garantías con sus amparos y vencimientos, afiliación a la ARL cuando aplica, y qué falta para legalizar.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post('garantias')
  @Puede('editar', '8.4')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'evidencia', maxCount: 1 },
      ],
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'La póliza y la evidencia se cargan en PDF, Word, Excel o imagen',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 8.4 · Registrar una póliza con sus amparos',
    description:
      'Con la fecha en que se aprobó en SECOP II y la evidencia (campo `evidencia`), la póliza queda aprobada: ya no se aprueba otra vez en la plataforma. Los amparos van desglosados con su propia vigencia.',
  })
  async cargarGarantia(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: CargarGarantiaDto,
    @UploadedFiles() files: { file?: any[]; evidencia?: any[] },
    @Req() req: any,
  ) {
    const file = files?.file?.[0];
    const evidencia = files?.evidencia?.[0];
    const rutas = [file, evidencia].filter(Boolean).map((f) => join(STORAGE_PATH, f.filename));

    try {
      if (!file) {
        throw new BadRequestException('Adjunta la póliza: una garantía que nadie ve no cubre nada');
      }
      if (!evidencia) {
        throw new BadRequestException('Adjunta la evidencia de la aprobación de la póliza en SECOP II');
      }
      return await this.service.cargarGarantia(
        procesoId,
        dto,
        file,
        await sha256Archivo(join(STORAGE_PATH, file.filename)),
        getHiringAccess(req),
        { archivo: evidencia, hash: await sha256Archivo(join(STORAGE_PATH, evidencia.filename)) },
      );
    } catch (error) {
      await Promise.all(rutas.map((r) => unlink(r).catch(() => undefined)));
      throw error;
    }
  }

  @Post('garantias/:garantiaId/amparos')
  @Puede('editar', '8.4')
  @ApiOperation({
    summary: 'Agregar un amparo a una póliza ya registrada',
    description: 'Una póliza de cumplimiento trae varios amparos; un anexo puede sumar uno después.',
  })
  agregarAmparo(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('garantiaId', ParseUUIDPipe) garantiaId: string,
    @Body() dto: AgregarAmparoDto,
    @Req() req: any,
  ) {
    return this.service.agregarAmparo(procesoId, garantiaId, dto, getHiringAccess(req));
  }

  @Post('garantias/:garantiaId/aprobar')
  @Puede('aprobar', '8.4')
  @ApiOperation({
    summary: 'Aprobar una póliza',
    description:
      'Con todas las garantías aprobadas —y la ARL si el contratista es persona natural— el contrato queda legalizado.',
  })
  aprobar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('garantiaId', ParseUUIDPipe) garantiaId: string,
    @Body() dto: AprobarGarantiaDto,
    @Req() req: any,
  ) {
    return this.service.aprobarGarantia(procesoId, garantiaId, getHiringAccess(req), dto.firma);
  }

  @Post('garantias/:garantiaId/rechazar')
  @Puede('aprobar', '8.4')
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
  @Puede('editar', '8.5')
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

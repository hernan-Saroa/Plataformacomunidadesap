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

import { InformeFinalService } from './informe-final.service';
import {
  AgregarEntregableDto,
  AnularInformeFinalDto,
  ElaborarInformeFinalDto,
} from './dto/informe-final.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_INFORME_FINAL,
  ROLES_LECTURA_EJECUCION,
} from '../../auth/hiring-access';
import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';

/**
 * Informe final de ejecución — actividad 10.1 (EFDS-1171).
 *
 * Lo firma el supervisor, que es quien vigiló. El rol abre la puerta y el
 * servicio exige que sea el supervisor vigente de ese contrato, con la misma
 * regla del aval del pago.
 */
@ApiTags('Etapa 10 · Informe final de ejecución')
@Controller('procesos/:id/informe-final')
export class InformeFinalController {
  constructor(private readonly service: InformeFinalService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_EJECUCION)
  @ApiOperation({
    summary: 'Informe final del contrato',
    description:
      'El informe vigente con su balance congelado y su consolidado de entregables, el balance de hoy para comparar, y los informes que se anularon antes.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_INFORME_FINAL)
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(MIME_DOCUMENTOS, 'El informe final se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 10.1 · Elaborar el informe final',
    description:
      'Con el informe firmado y la conclusión sobre la ejecución. El balance del contrato queda congelado tal como está el día en que se elabora.',
  })
  async elaborar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: ElaborarInformeFinalDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta el informe firmado: sin él hay un balance, no un informe',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.elaborar(
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

  @Post('entregables')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_INFORME_FINAL)
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(MIME_DOCUMENTOS, 'El soporte del entregable se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Sumar un entregable al consolidado',
    description:
      'El soporte es opcional: muchos entregables ya están en el expediente por otra actividad. Sin fecha de entrega, el entregable queda registrado como lo que se pactó y no se cumplió.',
  })
  async agregarEntregable(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: AgregarEntregableDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    const ruta = file ? join(STORAGE_PATH, file.filename) : null;
    try {
      return await this.service.agregarEntregable(
        procesoId,
        dto,
        file ?? null,
        ruta ? await sha256Archivo(ruta) : null,
        getHiringAccess(req),
      );
    } catch (error) {
      if (ruta) await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  @Post('anular')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_INFORME_FINAL)
  @ApiOperation({
    summary: 'Anular el informe vigente',
    description:
      'Para rehacerlo. El anterior queda en el expediente con su balance: pudo haberse remitido para la liquidación.',
  })
  anular(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: AnularInformeFinalDto,
    @Req() req: any,
  ) {
    return this.service.anular(procesoId, dto, getHiringAccess(req));
  }
}

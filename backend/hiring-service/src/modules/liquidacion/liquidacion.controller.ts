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

import { LiquidacionService } from './liquidacion.service';
import { AnularLiquidacionDto, LiquidarDto } from './dto/liquidacion.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_LECTURA_EJECUCION,
  ROLES_LIQUIDAR,
} from '../../auth/hiring-access';
import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';

/**
 * Acta de liquidación — actividad 10.2 (EFDS-1172).
 *
 * La liquidación es de la Dirección de Contratación, no del supervisor: él
 * concluye sobre la ejecución en el informe final (10.1), y sobre ese informe
 * la entidad cierra el contrato.
 */
@ApiTags('Etapa 10 · Liquidación del contrato')
@Controller('procesos/:id/liquidacion')
export class LiquidacionController {
  constructor(private readonly service: LiquidacionService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_EJECUCION)
  @ApiOperation({
    summary: 'Estado de la liquidación',
    description:
      'El acta vigente si la hay, la ventana de plazos con la alerta de cuántos días quedan, y qué liquidación está habilitada hoy.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LIQUIDAR)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'acta', maxCount: 1 },
        { name: 'pazYSalvoSoporte', maxCount: 1 },
      ],
      opcionesDeCarga(
        MIME_DOCUMENTOS,
        'El acta y el paz y salvo se cargan en PDF, Word o Excel',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 10.2 · Liquidar el contrato',
    description:
      'Bilateral dentro de los cuatro meses siguientes a la terminación, o unilateral en los dos adicionales cuando ese plazo venció. El balance financiero queda congelado.',
  })
  async liquidar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: LiquidarDto,
    @UploadedFiles() archivos: { acta?: any[]; pazYSalvoSoporte?: any[] },
    @Req() req: any,
  ) {
    const acta = archivos?.acta?.[0];
    const soporte = archivos?.pazYSalvoSoporte?.[0];

    if (!acta) {
      await this.descartar(acta, soporte);
      throw new BadRequestException(
        'Adjunta el acta firmada: sin ella no hay liquidación que probar',
      );
    }

    try {
      return await this.service.liquidar(
        procesoId,
        dto,
        acta,
        await sha256Archivo(join(STORAGE_PATH, acta.filename)),
        soporte ?? null,
        soporte ? await sha256Archivo(join(STORAGE_PATH, soporte.filename)) : null,
        getHiringAccess(req),
      );
    } catch (error) {
      // Multer ya escribió los archivos antes de que el servicio validara nada.
      await this.descartar(acta, soporte);
      throw error;
    }
  }

  @Post('anular')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LIQUIDAR)
  @ApiOperation({
    summary: 'Anular el acta de liquidación',
    description:
      'Para rehacerla. La anterior queda en el expediente con su balance y su motivo: pudo notificarse al contratista.',
  })
  anular(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: AnularLiquidacionDto,
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

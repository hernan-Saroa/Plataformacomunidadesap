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

import { CierreFinancieroService } from './cierre-financiero.service';
import { CerrarFinancieramenteDto, RevertirCierreDto } from './dto/cierre-financiero.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_CIERRE_FINANCIERO,
  ROLES_LECTURA_EJECUCION,
} from '../../auth/hiring-access';
import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';

/**
 * Cierre financiero — actividad 10.3 (EFDS-1173).
 *
 * De la Dirección Financiera y de nadie más. Es la lista más estrecha del
 * módulo junto con la del CDP, y por la misma razón: mover el presupuesto de la
 * entidad es competencia suya.
 */
@ApiTags('Etapa 10 · Cierre financiero')
@Controller('procesos/:id/cierre-financiero')
export class CierreFinancieroController {
  constructor(private readonly service: CierreFinancieroService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_EJECUCION)
  @ApiOperation({
    summary: 'Estado del cierre financiero',
    description:
      'El cuadre del contrato contra su RP —expedido, pagado y saldo por liberar—, el cierre vigente si lo hay y los que se revirtieron.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_CIERRE_FINANCIERO)
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(MIME_DOCUMENTOS, 'El soporte del cierre se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 10.3 · Registrar el pago final y liberar el saldo',
    description:
      'Sobre un contrato liquidado y con RP expedido. El cuadre queda congelado con el saldo que se reintegró al presupuesto.',
  })
  async cerrar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: CerrarFinancieramenteDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    // El soporte es opcional: mientras no exista KLIC hay entidades que
    // tramitan la liberación con un memorando y otras con el reporte del
    // sistema financiero, y exigir uno concreto dejaría a alguien sin poder
    // cerrar.
    const ruta = file ? join(STORAGE_PATH, file.filename) : null;
    try {
      return await this.service.cerrar(
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

  @Post('revertir')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_CIERRE_FINANCIERO)
  @ApiOperation({
    summary: 'Revertir el cierre financiero',
    description:
      'El anterior queda en el expediente con su motivo: el saldo pudo haberse reintegrado al presupuesto, y deshacerlo tiene consecuencias fuera de la plataforma.',
  })
  revertir(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RevertirCierreDto,
    @Req() req: any,
  ) {
    return this.service.revertir(procesoId, dto, getHiringAccess(req));
  }
}

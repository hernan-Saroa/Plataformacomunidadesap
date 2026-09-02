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

import { PagosService } from './pagos.service';
import {
  AnularPagoDto,
  AvalarPagoDto,
  CargarSoporteDto,
  DevolverPagoDto,
  RadicarPagoDto,
  TramitarPagoDto,
} from './dto/pagos.dto';
import { RolesGuard } from '../../auth/roles.guard';

import { getHiringAccess } from '../../auth/hiring-access';

import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';

/**
 * Trámite de pagos — actividad 9.4 (EFDS-1170).
 *
 * Tres actos y tres responsables: radica el gestor o el supervisor, avala el
 * supervisor del contrato, y tramita la Dirección Financiera. Cada uno con su
 * lista de roles, porque confundirlos sería dejar que quien cobra se apruebe a
 * sí mismo o que quien vigila mueva el presupuesto.
 */
@ApiTags('Etapa 9 · Trámite de pagos')
@Controller('procesos/:id/pagos')
export class PagosController {
  constructor(private readonly service: PagosService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.seguimiento.ver')
  @ApiOperation({
    summary: 'Cuentas de cobro del contrato',
    description:
      'Las cuentas con su estado y sus documentos, quién supervisa, y cuánto se lleva cobrado y tramitado contra el valor del contrato.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.acta-inicio.suscribir')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'factura', maxCount: 1 },
        { name: 'informe', maxCount: 1 },
      ],
      opcionesDeCarga(
        MIME_DOCUMENTOS,
        'La factura y el informe de actividades se cargan en PDF, Word o Excel',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 9.4 · Radicar la cuenta de cobro',
    description:
      'Con la factura y el informe de actividades, que son los dos que exige el criterio de la historia. Sobre un contrato en ejecución.',
  })
  async radicar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RadicarPagoDto,
    @UploadedFiles() archivos: { factura?: any[]; informe?: any[] },
    @Req() req: any,
  ) {
    const factura = archivos?.factura?.[0];
    const informe = archivos?.informe?.[0];

    if (!factura || !informe) {
      await this.descartar(factura, informe);
      throw new BadRequestException(
        'Adjunta la factura y el informe de actividades: la factura es lo que se cobra y el informe lo que sustenta que se prestó',
      );
    }

    try {
      return await this.service.radicar(
        procesoId,
        dto,
        factura,
        await sha256Archivo(join(STORAGE_PATH, factura.filename)),
        informe,
        await sha256Archivo(join(STORAGE_PATH, informe.filename)),
        getHiringAccess(req),
      );
    } catch (error) {
      // Multer ya escribió los archivos antes de que el servicio validara nada.
      await this.descartar(factura, informe);
      throw error;
    }
  }

  @Post(':pagoId/soportes')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.acta-inicio.suscribir')
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(MIME_DOCUMENTOS, 'El soporte se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Sumar un soporte a la cuenta',
    description:
      'Seguridad social, RUT, certificación bancaria u otro anexo. Se cargan a mano mientras no exista la integración con Click.',
  })
  async cargarSoporte(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('pagoId', ParseUUIDPipe) pagoId: string,
    @Body() dto: CargarSoporteDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Adjunta el soporte que acompaña la cuenta');

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.cargarSoporte(
        procesoId,
        pagoId,
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

  @Post(':pagoId/avalar')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.supervision.avalar')
  @ApiOperation({
    summary: 'Avalar la cuenta de cobro',
    description:
      'El aval del supervisor: es su responsabilidad la que respalda el pago. Lo da el supervisor vigente de este contrato y nadie más.',
  })
  avalar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('pagoId', ParseUUIDPipe) pagoId: string,
    @Body() dto: AvalarPagoDto,
    @Req() req: any,
  ) {
    return this.service.avalar(procesoId, pagoId, dto, getHiringAccess(req));
  }

  @Post(':pagoId/devolver')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.supervision.avalar')
  @ApiOperation({
    summary: 'Devolver la cuenta para que la corrijan',
    description:
      'No se borra: el periodo y los documentos que el contratista presentó existieron. El motivo es lo que le dice qué arreglar.',
  })
  devolver(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('pagoId', ParseUUIDPipe) pagoId: string,
    @Body() dto: DevolverPagoDto,
    @Req() req: any,
  ) {
    return this.service.devolver(procesoId, pagoId, dto, getHiringAccess(req));
  }

  @Post(':pagoId/tramitar')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.presupuesto.gestionar')
  @ApiOperation({
    summary: 'Tramitar el pago avalado',
    description:
      'La Dirección Financiera registra que el pago se tramitó y con qué referencia. La plataforma no gira: el pago sale del sistema financiero de la entidad.',
  })
  tramitar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('pagoId', ParseUUIDPipe) pagoId: string,
    @Body() dto: TramitarPagoDto,
    @Req() req: any,
  ) {
    return this.service.tramitar(procesoId, pagoId, dto, getHiringAccess(req));
  }

  @Post(':pagoId/anular')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.acta-inicio.suscribir')
  @ApiOperation({
    summary: 'Anular la cuenta de cobro',
    description:
      'Para la que no debió radicarse. Queda con su motivo, que es lo que explica el salto en el consecutivo del contrato.',
  })
  anular(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('pagoId', ParseUUIDPipe) pagoId: string,
    @Body() dto: AnularPagoDto,
    @Req() req: any,
  ) {
    return this.service.anular(procesoId, pagoId, dto, getHiringAccess(req));
  }

  private async descartar(...archivos: Array<{ filename?: string } | undefined>) {
    for (const archivo of archivos) {
      if (archivo?.filename) {
        await unlink(join(STORAGE_PATH, archivo.filename)).catch(() => undefined);
      }
    }
  }
}

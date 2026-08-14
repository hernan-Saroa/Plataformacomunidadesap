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

import { AperturaService } from './apertura.service';
import { RegistrarAperturaDto } from './dto/apertura.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_LECTURA_CONTRATACION,
  ROLES_SOLICITUD_CDP,
} from '../../auth/hiring-access';
import {
  MIME_DOCUMENTOS,
  MIME_IMAGENES,
  opcionesDeCarga,
  sha256Archivo,
  STORAGE_PATH,
} from '../archivos';

/**
 * Apertura formal del proceso — actividad 5.7 (EFDS-1152).
 *
 * Es la única vía para abrir un proceso: la resolución y el pliego definitivo
 * se registran en la misma petición que lo abre. Dejar además un endpoint que
 * solo moviera la etapa habría permitido abrir sin acto administrativo, que es
 * justo lo que esta historia impide.
 */
@ApiTags('Etapa 5 · Apertura del proceso')
@Controller('procesos/:id/apertura')
export class AperturaProcesoController {
  constructor(private readonly service: AperturaService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({
    summary: 'Estado de la apertura y qué falta para poder abrir',
    description:
      'Devuelve los requisitos por separado —CDP y documentos del proceso— para que la pantalla diga qué falta en vez de limitarse a bloquear el botón.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string) {
    return this.service.estado(procesoId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_SOLICITUD_CDP)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'resolucion', maxCount: 1 },
        { name: 'pliegoDefinitivo', maxCount: 1 },
        { name: 'evidencia', maxCount: 1 },
      ],
      // Las imágenes se admiten por la evidencia, no por los otros dos: la
      // prueba de que el pliego se publicó suele ser una captura de SECOP II,
      // y exigir PDF obligaría a convertirla antes de subirla. Que un pliego
      // llegue en PNG lo frena la validación del servicio, no el filtro: aquí
      // multer no sabe a qué campo pertenece cada archivo.
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'Se admiten archivos PDF, Word, Excel o imágenes PNG y JPG',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 5.7 · Registrar la apertura y publicar el pliego definitivo',
    description:
      'Los tres documentos van en la misma petición que los datos de la resolución: el proceso se abre con ellos o no se abre. La evidencia prueba que el pliego definitivo se publicó, igual que en la actividad 5.2. Requiere el CDP expedido (RF-EST-05).',
  })
  async registrar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RegistrarAperturaDto,
    @UploadedFiles()
    archivos: { resolucion?: any[]; pliegoDefinitivo?: any[]; evidencia?: any[] },
    @Req() req: any,
  ) {
    const resolucion = archivos?.resolucion?.[0];
    const pliego = archivos?.pliegoDefinitivo?.[0];
    const evidencia = archivos?.evidencia?.[0];

    // Se limpian todos aunque falte uno: multer ya escribió en disco los que sí
    // llegaron, y sin expediente que los reclame quedarían ocupando espacio.
    if (!resolucion || !pliego || !evidencia) {
      await this.descartar(resolucion, pliego, evidencia);
      throw new BadRequestException(
        'Adjunta la resolución de apertura, el pliego definitivo y la evidencia de su publicación',
      );
    }

    // El acto y el pliego se firman y rigen el proceso: una captura de pantalla
    // no sirve como ninguno de los dos.
    for (const [archivo, cual] of [
      [resolucion, 'La resolución de apertura'],
      [pliego, 'El pliego definitivo'],
    ] as const) {
      if (!MIME_DOCUMENTOS.includes(archivo.mimetype)) {
        await this.descartar(resolucion, pliego, evidencia);
        throw new BadRequestException(`${cual} debe ser un PDF, Word o Excel, no una imagen`);
      }
    }

    try {
      return await this.service.registrar(
        procesoId,
        dto,
        resolucion,
        await sha256Archivo(join(STORAGE_PATH, resolucion.filename)),
        pliego,
        await sha256Archivo(join(STORAGE_PATH, pliego.filename)),
        evidencia,
        await sha256Archivo(join(STORAGE_PATH, evidencia.filename)),
        getHiringAccess(req),
      );
    } catch (error) {
      await this.descartar(resolucion, pliego, evidencia);
      throw error;
    }
  }

  private async descartar(...archivos: Array<{ filename?: string } | undefined>) {
    for (const archivo of archivos) {
      if (archivo?.filename) {
        await unlink(join(STORAGE_PATH, archivo.filename)).catch(() => undefined);
      }
    }
  }
}

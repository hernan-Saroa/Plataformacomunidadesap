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
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { join } from 'path';
import { unlink } from 'fs/promises';

import { EvaluacionService } from './evaluacion.service';
import {
  ActualizarInformeDto,
  CargarEvidenciaDto,
  RectificarResultadoDto,
  RegistrarResultadoDto,
} from './dto/evaluacion.dto';
import { RolesGuard } from '../../auth/roles.guard';

import { getHiringAccess } from '../../auth/hiring-access';
import { PuedeOEsDelComite } from './puede-o-es-del-comite.guard';

import {
  MIME_DOCUMENTOS,
  MIME_IMAGENES,
  opcionesDeCarga,
  sha256Archivo,
  STORAGE_PATH,
} from '../archivos';

/**
 * Evaluación de ofertas — actividad 6.3 (EFDS-1157).
 *
 * La plataforma no califica: el comité evalúa por fuera y aquí registra el
 * resultado con su informe. Quién puede registrar lo decide la membresía del
 * comité de este proceso, no el rol: el designado entra aunque no tenga el
 * alcance de la 6.3, y un evaluador designado en otro proceso llega hasta aquí
 * y no escribe nada.
 */
/** Archivos del informe: el consolidado y uno por dimensión, con holgura. */
const MAX_ARCHIVOS_INFORME = 10;

@ApiTags('Etapa 6 · Evaluación de ofertas')
@Controller('procesos/:id/evaluacion')
export class EvaluacionController {
  constructor(private readonly service: EvaluacionService) {}

  @Get()
  @PuedeOEsDelComite('ver', '6.3')
  @ApiOperation({
    summary: 'Estado de la evaluación del proceso',
    description:
      'Las ofertas de la lista publicada, el resultado registrado con su informe y evidencias, y si quien consulta integra el comité.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post('resultado')
  @PuedeOEsDelComite('editar', '6.3')
  @UseInterceptors(
    FilesInterceptor(
      'files',
      MAX_ARCHIVOS_INFORME,
      // Solo ofimáticos: el informe de evaluación es una pieza firmada.
      opcionesDeCarga(MIME_DOCUMENTOS, 'El informe de evaluación se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 6.3 · Cargar el informe de evaluación preliminar',
    description:
      'El informe consolidado del comité, en uno o varios archivos (jurídico, técnico, financiero y económico). Sin puntajes ni ganadora: la evaluación es preliminar.',
  })
  async registrar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RegistrarResultadoDto,
    @UploadedFiles() files: any[],
    @Req() req: any,
  ) {
    return this.conArchivos(files, (informes) =>
      this.service.registrar(procesoId, dto, informes, getHiringAccess(req)),
    );
  }

  @Post('resultado/actualizar')
  @PuedeOEsDelComite('editar', '6.3')
  @UseInterceptors(
    FilesInterceptor(
      'files',
      MAX_ARCHIVOS_INFORME,
      opcionesDeCarga(MIME_DOCUMENTOS, 'El informe de evaluación se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Volver a cargar el informe de evaluación preliminar',
    description:
      'Si tiene un error u omisión. El anterior queda en el historial con la fecha, el usuario y el motivo.',
  })
  async actualizar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: ActualizarInformeDto,
    @UploadedFiles() files: any[],
    @Req() req: any,
  ) {
    return this.conArchivos(files, (informes) =>
      this.service.actualizar(procesoId, dto, informes, getHiringAccess(req)),
    );
  }

  @Post('resultado/rectificar')
  @PuedeOEsDelComite('editar', '6.3')
  @ApiOperation({
    summary: 'Rectificar el resultado registrado',
    description:
      'Deja sin efecto el resultado vigente para poder registrar otro. El anterior se conserva con su motivo y su informe.',
  })
  rectificar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RectificarResultadoDto,
    @Req() req: any,
  ) {
    return this.service.rectificar(procesoId, dto, getHiringAccess(req));
  }

  @Post('resultado/evidencias')
  @PuedeOEsDelComite('editar', '6.3')
  @UseInterceptors(
    FileInterceptor(
      'file',
      // Aquí sí entran imágenes: parte de la evidencia son capturas de lo que
      // muestra otra plataforma, con el mismo criterio de la etapa 5.
      opcionesDeCarga(
        [...MIME_DOCUMENTOS, ...MIME_IMAGENES],
        'La evidencia se carga en PDF, Word, Excel o imagen',
      ),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Cargar una evidencia de la evaluación',
    description:
      'Las verificaciones jurídica, financiera y técnica, el cuadro comparativo o las actas del comité, de a una.',
  })
  async cargarEvidencia(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: CargarEvidenciaDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Adjunta el archivo de la evidencia');

    const ruta = join(STORAGE_PATH, file.filename);

    try {
      const hash = await sha256Archivo(ruta);
      return await this.service.agregarEvidencia(procesoId, dto, file, hash, getHiringAccess(req));
    } catch (error) {
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }

  /**
   * Calcula el hash de cada archivo y, si la regla de negocio los rechaza, los
   * borra del disco para no dejar huérfanos en el almacenamiento.
   */
  private async conArchivos<T>(
    files: any[],
    accion: (informes: { archivo: any; hash: string }[]) => Promise<T>,
  ): Promise<T> {
    if (!files?.length) {
      throw new BadRequestException(
        'Adjunta el informe del comité: sin él la evaluación es la opinión de quien la digitó',
      );
    }

    const rutas = files.map((f) => join(STORAGE_PATH, f.filename));
    try {
      const informes = await Promise.all(
        files.map(async (archivo, i) => ({ archivo, hash: await sha256Archivo(rutas[i]) })),
      );
      return await accion(informes);
    } catch (error) {
      await Promise.all(rutas.map((r) => unlink(r).catch(() => undefined)));
      throw error;
    }
  }
}

import {
  BadRequestException,
  Body,
  Controller,
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

import { IncumplimientoService } from './incumplimiento.service';
import { SancionatorioService } from './sancionatorio.service';
import {
  AbrirTramiteDto,
  CelebrarAudienciaDto,
  CerrarSinCelebrarDto,
  CitarAudienciaDto,
  DecidirCasoDto,
  NotificarResolucionDto,
  RevocarResolucionDto,
} from './dto/sancionatorio.dto';
import { PermisosGuard } from '../../auth/permisos.guard';
import { Permisos } from '../../auth/permisos.decorator';
import {
  PERMISO_INCUMPLIMIENTO_DECIDIR,
  PERMISO_INCUMPLIMIENTO_TRAMITAR,
} from '../../auth/permisos';
import { getHiringAccess } from '../../auth/hiring-access';
import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';

const MENSAJE_CARGA = 'El documento se carga en PDF, Word o Excel';

/**
 * Trámite sancionatorio — RF-INC-02 (EFDS-1181).
 *
 * Cuelga del caso que EFDS-1180 abrió: el supervisor reporta y aquí el área
 * jurídica instruye y decide.
 *
 * **Dos permisos y no uno.** Instruir —citar audiencias, registrar actas,
 * notificar— es del abogado que lleva el caso; declarar el incumplimiento o la
 * caducidad es un acto que compromete a la entidad frente al contratista.
 * Reunirlos le daría a quien instruye la facultad de sancionar.
 *
 * Cada acción devuelve el estado completo del bloque, que compone el servicio
 * de EFDS-1180: es el dueño de esa vista, y así los dos servicios no dependen
 * el uno del otro.
 *
 * El acceso restringido por reserva legal (RF-INC-03) es EFDS-1182 y se
 * resuelve allí, sobre estos mismos permisos.
 */
@ApiTags('Presunto incumplimiento')
@Controller('procesos/:id/incumplimiento/:casoId')
export class SancionatorioController {
  constructor(
    private readonly service: SancionatorioService,
    private readonly incumplimiento: IncumplimientoService,
  ) {}

  @Post('abrir')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_INCUMPLIMIENTO_TRAMITAR)
  @UseInterceptors(FileInterceptor('file', opcionesDeCarga(MIME_DOCUMENTOS, MENSAJE_CARGA)))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Abrir el trámite sancionatorio del caso',
    description:
      'Convierte el reporte en un procedimiento: hasta aquí hay un hecho observado, y desde aquí una entidad que decidió examinarlo.',
  })
  async abrir(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('casoId', ParseUUIDPipe) casoId: string,
    @Body() dto: AbrirTramiteDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    return this.conArchivo(file, 'la resolución de apertura', req, (archivo, hash, acceso) =>
      this.service.abrir(procesoId, casoId, dto, archivo, hash, acceso),
    ).then(() => this.incumplimiento.estado(procesoId, getHiringAccess(req)));
  }

  @Post('audiencias')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_INCUMPLIMIENTO_TRAMITAR)
  @UseInterceptors(FileInterceptor('file', opcionesDeCarga(MIME_DOCUMENTOS, MENSAJE_CARGA)))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Citar a audiencia sancionatoria',
    description:
      'La fecha mira al futuro, a diferencia del resto del módulo: es una citación. El acto que convoca es obligatorio.',
  })
  async citar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('casoId', ParseUUIDPipe) casoId: string,
    @Body() dto: CitarAudienciaDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    return this.conArchivo(file, 'el acto que cita a la audiencia', req, (archivo, hash, acceso) =>
      this.service.citar(procesoId, casoId, dto, archivo, hash, acceso),
    ).then(() => this.incumplimiento.estado(procesoId, getHiringAccess(req)));
  }

  @Post('audiencias/:audienciaId/celebrar')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_INCUMPLIMIENTO_TRAMITAR)
  @UseInterceptors(FileInterceptor('file', opcionesDeCarga(MIME_DOCUMENTOS, MENSAJE_CARGA)))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Registrar la audiencia celebrada',
    description:
      'El acta es obligatoria: es la prueba de que el contratista fue oído, y de ella depende poder decidir después.',
  })
  async celebrar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('casoId', ParseUUIDPipe) casoId: string,
    @Param('audienciaId', ParseUUIDPipe) audienciaId: string,
    @Body() dto: CelebrarAudienciaDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    return this.conArchivo(file, 'el acta de la audiencia', req, (archivo, hash, acceso) =>
      this.service.celebrar(procesoId, casoId, audienciaId, dto, archivo, hash, acceso),
    ).then(() => this.incumplimiento.estado(procesoId, getHiringAccess(req)));
  }

  @Post('audiencias/:audienciaId/suspender')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_INCUMPLIMIENTO_TRAMITAR)
  @ApiOperation({
    summary: 'Registrar que la audiencia se suspendió',
    description: 'Se cita otra después. Exige motivo: de la audiencia depende que hubiera defensa.',
  })
  async suspender(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('casoId', ParseUUIDPipe) casoId: string,
    @Param('audienciaId', ParseUUIDPipe) audienciaId: string,
    @Body() dto: CerrarSinCelebrarDto,
    @Req() req: any,
  ) {
    const acceso = getHiringAccess(req);
    await this.service.cerrarSinCelebrar(procesoId, casoId, audienciaId, 'SUSPENDIDA', dto, acceso);
    return this.incumplimiento.estado(procesoId, acceso);
  }

  @Post('audiencias/:audienciaId/cancelar')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_INCUMPLIMIENTO_TRAMITAR)
  @ApiOperation({ summary: 'Registrar que la audiencia se canceló' })
  async cancelar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('casoId', ParseUUIDPipe) casoId: string,
    @Param('audienciaId', ParseUUIDPipe) audienciaId: string,
    @Body() dto: CerrarSinCelebrarDto,
    @Req() req: any,
  ) {
    const acceso = getHiringAccess(req);
    await this.service.cerrarSinCelebrar(procesoId, casoId, audienciaId, 'CANCELADA', dto, acceso);
    return this.incumplimiento.estado(procesoId, acceso);
  }

  @Post('decidir')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_INCUMPLIMIENTO_DECIDIR)
  @UseInterceptors(FileInterceptor('file', opcionesDeCarga(MIME_DOCUMENTOS, MENSAJE_CARGA)))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Decidir el caso: archivar, declarar el incumplimiento o la caducidad',
    description:
      'Sancionar exige al menos una audiencia celebrada. La caducidad deja el contrato TERMINADO: es la causal contractual del bloque.',
  })
  async decidir(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('casoId', ParseUUIDPipe) casoId: string,
    @Body() dto: DecidirCasoDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    return this.conArchivo(file, 'la resolución que decide', req, (archivo, hash, acceso) =>
      this.service.decidir(procesoId, casoId, dto, archivo, hash, acceso),
    ).then(() => this.incumplimiento.estado(procesoId, getHiringAccess(req)));
  }

  @Post('resoluciones/:resolucionId/notificar')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_INCUMPLIMIENTO_TRAMITAR)
  @ApiOperation({
    summary: 'Registrar la notificación de la resolución y, si la hay, su firmeza',
    description:
      'Se registran las fechas; no se cuentan términos, porque ninguna fuente del proyecto dice cuántos días corren.',
  })
  async notificar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('casoId', ParseUUIDPipe) casoId: string,
    @Param('resolucionId', ParseUUIDPipe) resolucionId: string,
    @Body() dto: NotificarResolucionDto,
    @Req() req: any,
  ) {
    const acceso = getHiringAccess(req);
    await this.service.notificar(procesoId, casoId, resolucionId, dto, acceso);
    return this.incumplimiento.estado(procesoId, acceso);
  }

  @Post('resoluciones/:resolucionId/revocar')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_INCUMPLIMIENTO_DECIDIR)
  @ApiOperation({
    summary: 'Revocar una resolución del trámite',
    description:
      'Deshace lo que hizo: la decisión devuelve el caso al trámite y, si declaraba la caducidad, el contrato a donde estaba. No se borra.',
  })
  async revocar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('casoId', ParseUUIDPipe) casoId: string,
    @Param('resolucionId', ParseUUIDPipe) resolucionId: string,
    @Body() dto: RevocarResolucionDto,
    @Req() req: any,
  ) {
    const acceso = getHiringAccess(req);
    await this.service.revocar(procesoId, casoId, resolucionId, dto, acceso);
    return this.incumplimiento.estado(procesoId, acceso);
  }

  /**
   * El archivo es obligatorio en todo lo que produce un acto.
   *
   * Se borra si la operación falla, con el criterio del resto del módulo: un
   * archivo huérfano en disco es basura que nadie va a reclamar.
   */
  private async conArchivo(
    file: any,
    que: string,
    req: any,
    accion: (archivo: any, hash: string, acceso: ReturnType<typeof getHiringAccess>) => Promise<void>,
  ) {
    if (!file) {
      throw new BadRequestException(
        `Adjunta ${que}: sin el documento el expediente afirmaría algo que no puede probar`,
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await accion(file, await sha256Archivo(ruta), getHiringAccess(req));
    } catch (error) {
      await unlink(ruta).catch(() => undefined);
      throw error;
    }
  }
}

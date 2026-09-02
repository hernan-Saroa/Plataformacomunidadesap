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

import { SupervisionService } from './supervision.service';
import {
  DesignarSupervisorDto,
  ReasignarSupervisorDto,
  RelevarSupervisorDto,
} from './dto/supervision.dto';
import { PermisosGuard } from '../../auth/permisos.guard';
import { Permisos } from '../../auth/permisos.decorator';
import { PERMISO_SUPERVISION_REASIGNAR } from '../../auth/permisos';
import { RolesGuard } from '../../auth/roles.guard';

import { getHiringAccess } from '../../auth/hiring-access';

import { MIME_DOCUMENTOS, opcionesDeCarga, sha256Archivo, STORAGE_PATH } from '../archivos';

/**
 * Supervisión del contrato — actividad 8.2 (EFDS-1165).
 *
 * Designar es competencia del Ordenador del Gasto y no del gestor que lleva el
 * proceso: es él quien responde por a quién encarga la vigilancia. Mismo
 * criterio que la designación del comité evaluador.
 */
@ApiTags('Etapa 8 · Supervisión del contrato')
@Controller('procesos/:id/supervision')
export class SupervisionController {
  constructor(private readonly service: SupervisionService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({
    summary: 'Supervisor del contrato',
    description:
      'Si el contrato admite supervisor, quién lo supervisa, si ya se le avisó y quiénes lo supervisaron antes.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.designacion.ordenar')
  @UseInterceptors(
    FileInterceptor(
      'file',
      // Solo ofimáticos: el acto de designación es un acto administrativo.
      opcionesDeCarga(MIME_DOCUMENTOS, 'El acto de designación se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 8.2 · Designar el supervisor',
    description:
      'Con el acto administrativo firmado. Sobre un contrato ya perfeccionado por las dos partes.',
  })
  async designar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: DesignarSupervisorDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta el acto de designación: sin él hay un nombre, no un supervisor',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.designar(
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

  @Post('relevar')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.designacion.ordenar')
  @ApiOperation({
    summary: 'Relevar al supervisor vigente',
    description:
      'El relevado se conserva en el expediente con su motivo: vigiló ese periodo y respondió por él. Después se designa otro.',
  })
  relevar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RelevarSupervisorDto,
    @Req() req: any,
  ) {
    return this.service.relevar(procesoId, dto, getHiringAccess(req));
  }

  /**
   * Actividad 9.3 · Reasignación de la supervisión (EFDS-1169).
   *
   * Declara permiso y no roles: los roles los crea y renombra el administrador
   * desde la plataforma, así que nombrarlos aquí ataría el endpoint a una
   * configuración que puede cambiar mañana.
   */
  @Post('reasignar')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_SUPERVISION_REASIGNAR)
  @UseInterceptors(
    FileInterceptor(
      'file',
      opcionesDeCarga(MIME_DOCUMENTOS, 'El acto de reasignación se carga en PDF, Word o Excel'),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actividad 9.3 · Reasignar la supervisión del contrato',
    description:
      'Releva al vigente y designa al nuevo en un solo acto, para que el contrato no quede sin quien lo vigile. El anterior se conserva en el expediente con el motivo del cambio.',
  })
  async reasignar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: ReasignarSupervisorDto,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Adjunta el acto de reasignación: sin él hay un cambio de nombre, no una designación',
      );
    }

    const ruta = join(STORAGE_PATH, file.filename);
    try {
      return await this.service.reasignar(
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

  @Post('aviso')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.designacion.ordenar')
  @ApiOperation({
    summary: 'Dejar constancia de que se le avisó al supervisor',
    description:
      'La matriz pide en 8.2 que se le alerte. Mientras no exista el envío automático, el aviso lo hace una persona y aquí se registra cuándo.',
  })
  registrarAviso(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.registrarAviso(procesoId, getHiringAccess(req));
  }
}

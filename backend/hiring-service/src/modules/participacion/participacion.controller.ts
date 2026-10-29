import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ParticipacionService } from './participacion.service';
import { PuestosService } from './puestos.service';
import { ActualizarPuestoDto, AsignarPuestoDto, GuardarPuestoDto, MotivoDto } from './dto/participacion.dto';
import { getHiringAccess } from '../../auth/hiring-access';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';
import { Puede } from '../../auth/puede.guard';

/**
 * Quién está en el proceso: quien lo tomó en la Dirección (EFDS-1183) y
 * quién ocupa cada puesto (109).
 *
 * Asignar no lleva `@Permisos`: lo hace quien tomó *este* proceso, y eso el
 * guard no lo sabe. Lo comprueba el servicio.
 */
@ApiTags('Etapa 3 · Quién está en el proceso')
@Controller('procesos/:id/participacion')
export class ParticipacionController {
  constructor(
    private readonly service: ParticipacionService,
    private readonly puestos: PuestosService,
  ) {}

  @Get()
  @Puede('ver', '3.3')
  @ApiOperation({
    summary: 'Quién lleva el proceso',
    description:
      'Quién lo tomó en la Dirección, quiénes estuvieron antes y por qué salieron. Consultarlo lo puede cualquiera que vea el proceso: saber a quién preguntarle no es un dato reservado.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post('tomar')
  @Puede('editar', '3.3')
  @ApiOperation({
    summary: 'Actividad 3.3 · Tomar el proceso de la bandeja',
    description:
      'Quien lo toma queda a cargo. Nadie lo entrega: la bandeja es compartida y el primero que llega se lo queda. Si otro lo tomó antes, responde 409.',
  })
  tomar(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.tomar(procesoId, getHiringAccess(req));
  }

  // ------------------------------------------------ los puestos (109) --

  @Get('puestos')
  @Puede('ver', '3.3')
  @ApiOperation({
    summary: 'Los puestos del proceso y quién los ocupa',
    description:
      'Cada puesto configurado que haga algo en la modalidad del proceso, quién lo ocupa, qué actividades hace o aprueba y qué le impide actuar, si algo se lo impide.',
  })
  delProceso(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.puestos.delProceso(procesoId, getHiringAccess(req));
  }

  @Get('puestos/:puestoId/candidatos')
  @Puede('ver', '3.3')
  @ApiOperation({
    summary: 'Quiénes pueden ocupar el puesto',
    description: 'Las cuentas con todos los permisos de lo que el puesto hace en la modalidad del proceso.',
  })
  candidatos(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('puestoId', ParseUUIDPipe) puestoId: string,
    @Query('q') q?: string,
  ) {
    return this.puestos.candidatos(procesoId, puestoId, q ?? '');
  }

  @Post('puestos/:puestoId')
  @ApiOperation({
    summary: 'Poner a alguien en un puesto, o cambiarlo',
    description: 'Lo hace quien tomó el proceso, o el Director. Cambiar a quien estaba exige motivo.',
  })
  asignar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('puestoId', ParseUUIDPipe) puestoId: string,
    @Body() dto: AsignarPuestoDto,
    @Req() req: any,
  ) {
    return this.puestos.asignar(procesoId, puestoId, dto.usuarioId, dto.motivo, getHiringAccess(req));
  }

  @Post('puestos/:puestoId/quitar')
  @ApiOperation({ summary: 'Dejar el puesto vacío', description: 'Exige motivo; el proceso queda marcado como pendiente.' })
  quitar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Param('puestoId', ParseUUIDPipe) puestoId: string,
    @Body() dto: MotivoDto,
    @Req() req: any,
  ) {
    return this.puestos.quitar(procesoId, puestoId, dto.motivo, getHiringAccess(req));
  }
}

/**
 * Los puestos del proceso en Configuración (109): los crea, nombra y archiva
 * la Dirección, y el diagnóstico dice qué quedaría sin salida.
 */
@ApiTags('Configuración de etapas')
@Controller('configuracion/puestos')
export class PuestosConfigController {
  constructor(private readonly service: PuestosService) {}

  @Get()
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({ summary: 'Los puestos del proceso, con las actividades que hace o aprueba cada uno' })
  listar() {
    return this.service.listar();
  }

  @Get('diagnostico')
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({
    summary: 'Lo que la configuración deja sin salida',
    description: 'Puestos que nadie puede ocupar con los permisos de hoy y actividades que apuntan a un puesto archivado.',
  })
  diagnostico() {
    return this.service.diagnostico();
  }

  @Post()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({ summary: 'Crear un puesto' })
  crear(@Body() dto: GuardarPuestoDto, @Req() req: any) {
    return this.service.crear(dto, getHiringAccess(req));
  }

  @Put(':puestoId')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({ summary: 'Renombrar o ajustar un puesto' })
  actualizar(@Param('puestoId', ParseUUIDPipe) id: string, @Body() dto: ActualizarPuestoDto, @Req() req: any) {
    return this.service.actualizar(id, dto, getHiringAccess(req));
  }

  @Delete(':puestoId')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({ summary: 'Archivar un puesto', description: 'No se deja mientras alguna actividad lo use.' })
  archivar(@Param('puestoId', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.archivar(id, getHiringAccess(req));
  }
}

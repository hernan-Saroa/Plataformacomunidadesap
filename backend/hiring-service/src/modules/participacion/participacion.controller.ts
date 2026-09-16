import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ParticipacionService } from './participacion.service';
import { AsignarAbogadoDto, MotivoDto, ReasignarAbogadoDto } from './dto/participacion.dto';
import { PermisosGuard } from '../../auth/permisos.guard';
import { Permisos } from '../../auth/permisos.decorator';
import {
  PERMISO_PROCESO_TOMAR,
  PERMISO_PROCESO_VER,
} from '../../auth/permisos';
import { getHiringAccess } from '../../auth/hiring-access';

/**
 * Quién está en un proceso (EFDS-1183).
 *
 * El guard solo comprueba el permiso general; que el abogado lo reparta **quien
 * tomó el proceso** no es un permiso, es una relación con ese expediente, y eso
 * lo verifica el servicio. Ponerlo en el decorador obligaría a un permiso por
 * proceso, que no es lo que `auth.role_permissions` sabe expresar.
 */
@ApiTags('Etapa 3 · Quién está en el proceso')
@Controller('procesos/:id/participacion')
export class ParticipacionController {
  constructor(private readonly service: ParticipacionService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_PROCESO_VER)
  @ApiOperation({
    summary: 'Quién lleva el proceso',
    description:
      'Quién lo tomó en la Dirección, qué abogado lo revisa, quiénes estuvieron antes y por qué salieron. Consultarlo lo puede cualquiera que vea el proceso: saber a quién preguntarle no es un dato reservado.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.estado(procesoId, getHiringAccess(req));
  }

  @Post('tomar')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_PROCESO_TOMAR)
  @ApiOperation({
    summary: 'Actividad 3.3 · Tomar el proceso de la bandeja',
    description:
      'Quien lo toma queda a cargo. Nadie lo entrega: la bandeja es compartida y el primero que llega se lo queda. Si otro lo tomó antes, responde 409.',
  })
  tomar(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.tomar(procesoId, getHiringAccess(req));
  }

  /**
   * Sin `@Permisos`: quién puede repartir el abogado depende de quién tomó
   * *este* proceso, y eso el guard no puede saberlo. Lo comprueba el servicio,
   * que sí tiene el proceso a mano.
   */
  @Post('abogado')
  @ApiOperation({
    summary: 'Asignar el abogado que revisará el proceso',
    description:
      'Lo hace quien tomó el proceso, o el Director. Sobre un proceso que todavía no tiene abogado.',
  })
  asignar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: AsignarAbogadoDto,
    @Req() req: any,
  ) {
    return this.service.asignarAbogado(procesoId, dto, getHiringAccess(req));
  }

  @Post('abogado/reasignar')
  @ApiOperation({
    summary: 'Cambiar de abogado',
    description:
      'Releva al vigente y asigna al nuevo en un solo acto, para que el proceso no se quede sin revisor entre uno y otro. Exige motivo.',
  })
  reasignar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: ReasignarAbogadoDto,
    @Req() req: any,
  ) {
    return this.service.reasignarAbogado(procesoId, dto, getHiringAccess(req));
  }

  @Post('abogado/quitar')
  @ApiOperation({
    summary: 'Quitar al abogado sin poner otro',
    description:
      'No debería hacer falta, pero pasa —el abogado sale de la entidad, el reparto estaba mal—. El proceso queda marcado como pendiente de reasignar en vez de obligar a inventar un sustituto. Exige motivo.',
  })
  quitar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: MotivoDto,
    @Req() req: any,
  ) {
    return this.service.quitarAbogado(procesoId, dto, getHiringAccess(req));
  }
}

/**
 * A quién se le puede dar un papel en un proceso.
 *
 * Ruta propia y no colgada de `procesos/:id` porque la lista no depende del
 * proceso: es la misma para todos, y colgarla de uno obligaría a la pantalla a
 * tener un proceso a mano para poder ofrecer el desplegable.
 */
@ApiTags('Etapa 3 · Quién está en el proceso')
@Controller('participacion')
export class CandidatosController {
  constructor(private readonly service: ParticipacionService) {}

  @Get('abogados')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_PROCESO_VER)
  @ApiOperation({
    summary: 'Cuentas que pueden revisar un proceso',
    description:
      'Las que tienen permiso para aprobar actividades, que es lo que hace el abogado en la 3.4. Se resuelve por permiso y no por código de rol.',
  })
  abogados(@Query('q') q?: string) {
    return this.service.abogados(q ?? '');
  }
}

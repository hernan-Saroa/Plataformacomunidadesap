import { Controller, DefaultValuePipe, Get, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AlertasService, ANTICIPACION_POR_DEFECTO } from './alertas.service';
import { PermisosGuard } from '../../auth/permisos.guard';
import { Permisos } from '../../auth/permisos.decorator';
import { PERMISO_ALERTA_VER } from '../../auth/permisos';
import { getHiringAccess } from '../../auth/hiring-access';


/** Alertas de vencimiento — transversal (EFDS-1185, RF-SIS-03). */
@ApiTags('Transversal · Alertas de vencimiento')
@Controller('alertas')
export class AlertasController {
  constructor(private readonly service: AlertasService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_ALERTA_VER)
  @ApiOperation({
    summary: 'Vencimientos próximos y ya cumplidos',
    description:
      'Pólizas, CDP, RP y plazos de liquidación que vencen dentro de la anticipación pedida, más lo ya vencido. Lo más urgente primero.',
  })
  listar(
    @Query('dias', new DefaultValuePipe(ANTICIPACION_POR_DEFECTO), ParseIntPipe)
    dias: number,
    @Req() req: any,
  ) {
    return this.service.listar(dias, getHiringAccess(req));
  }

  @Post('notificar')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_ALERTA_VER)
  @ApiOperation({
    summary: 'Avisar a los responsables de cada vencimiento',
    description:
      'Delega en notifications-service. Si está caído las alertas se siguen consultando: solo se pierde el correo.',
  })
  notificar(
    @Query('dias', new DefaultValuePipe(ANTICIPACION_POR_DEFECTO), ParseIntPipe)
    dias: number,
    @Req() req: any,
  ) {
    return this.service.notificar(dias, getHiringAccess(req));
  }
}

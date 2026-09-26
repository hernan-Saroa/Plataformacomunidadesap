import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { AlertasService } from './alertas.service';
import { ParametrosAlertaService } from './parametros-alerta.service';
import { PermisosGuard } from '../../auth/permisos.guard';
import { Permisos } from '../../auth/permisos.decorator';
import { PERMISO_CONFIG_ADMINISTRAR } from '../../auth/permisos';
import { getHiringAccess } from '../../auth/hiring-access';
import { Puede } from '../../auth/puede.guard';

/**
 * `dias` opcional: sin él rige la anticipación configurada de cada tipo.
 *
 * Antes caía en 30 por defecto, así que la anticipación configurada nunca se
 * habría usado desde la pantalla.
 */
function leerDias(dias?: string): number | null {
  if (dias === undefined || dias === '') return null;
  const n = Number(dias);
  if (!Number.isInteger(n) || n < 0) {
    throw new BadRequestException('Los días deben ser un número entero no negativo');
  }
  return n;
}

/** Alertas de vencimiento — transversal (EFDS-1185, RF-SIS-03). */
@ApiTags('Transversal · Alertas de vencimiento')
@Controller('alertas')
export class AlertasController {
  constructor(
    private readonly service: AlertasService,
    private readonly parametros: ParametrosAlertaService,
  ) {}

  @Get()
  @Puede('ver')
  @ApiQuery({ name: 'dias', required: false, description: 'Sin valor: la anticipación configurada de cada tipo.' })
  @ApiOperation({
    summary: 'Vencimientos próximos y ya cumplidos',
    description:
      'Pólizas, CDP, RP y plazos de liquidación que vencen dentro de la anticipación, más lo ya vencido. Lo más urgente primero.',
  })
  listar(@Query('dias') dias: string | undefined, @Req() req: any) {
    return this.service.listar(leerDias(dias), getHiringAccess(req));
  }

  @Post('notificar')
  @Puede('ver')
  @ApiQuery({ name: 'dias', required: false })
  @ApiOperation({
    summary: 'Avisar a los responsables de cada vencimiento',
    description:
      'Delega en notifications-service. Si está caído las alertas se siguen consultando: solo se pierde el aviso.',
  })
  notificar(@Query('dias') dias: string | undefined, @Req() req: any) {
    return this.service.notificar(leerDias(dias), getHiringAccess(req));
  }

  // --------------------------------------------------------- parámetros ----

  @Get('parametros')
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  @ApiOperation({ summary: 'Anticipación, tolerancia y hora del aviso diario' })
  leerParametros() {
    return this.parametros.listar();
  }

  @Put('parametros')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_CONFIG_ADMINISTRAR)
  @ApiOperation({
    summary: 'Cambiar los plazos de las alertas',
    description: 'Recibe { clave: valor }. Cada valor debe estar dentro del rango que declara su parámetro.',
  })
  guardarParametros(@Body() cambios: Record<string, number>, @Req() req: any) {
    return this.parametros.guardar(cambios, getHiringAccess(req));
  }
}

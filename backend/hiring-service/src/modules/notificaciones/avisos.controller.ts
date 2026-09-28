import { Body, Controller, Delete, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { PermisosGuard } from '../../auth/permisos.guard';
import { Permisos } from '../../auth/permisos.decorator';
import { PERMISO_CONFIG_ADMINISTRAR } from '../../auth/permisos';
import { getHiringAccess } from '../../auth/hiring-access';
import { Puede } from '../../auth/puede.guard';
import { AvisosService, CambiosAviso } from './avisos.service';

/** A quién le llega cada aviso de una actividad (EFDS-1183). */
@ApiTags('Configuración · Notificaciones')
@Controller('configuracion/actividades/:numeral/avisos')
export class AvisosController {
  constructor(private readonly avisos: AvisosService) {}

  @Get()
  @Puede('ver', undefined, { oPermiso: PERMISO_CONFIG_ADMINISTRAR })
  @ApiOperation({ summary: 'Los avisos de la actividad: si están encendidos y a quién llegan' })
  listar(@Param('numeral') numeral: string) {
    return this.avisos.deActividad(numeral);
  }

  @Put(':evento')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_CONFIG_ADMINISTRAR)
  @ApiOperation({
    summary: 'Encender, apagar o cambiar a quién llega un aviso de la actividad',
    description:
      'Recibe { activo, dependencias, roles, personas, titulo, mensaje, correosExternos, alContratista }; lo que no llegue se conserva. Los avisos que salen siempre no se configuran.',
  })
  guardar(
    @Param('numeral') numeral: string,
    @Param('evento') evento: string,
    @Body() cambios: CambiosAviso,
    @Req() req: any,
  ) {
    return this.avisos.guardar(numeral, evento, cambios, getHiringAccess(req));
  }

  @Delete(':evento')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_CONFIG_ADMINISTRAR)
  @ApiOperation({ summary: 'Volver al aviso sugerido' })
  restablecer(@Param('numeral') numeral: string, @Param('evento') evento: string) {
    return this.avisos.restablecer(numeral, evento);
  }
}

/** Si los avisos de la actividad salen también por correo. */
@ApiTags('Configuración · Notificaciones')
@Controller('configuracion/actividades/:numeral/correo')
export class CorreoAvisosController {
  constructor(private readonly avisos: AvisosService) {}

  @Put()
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_CONFIG_ADMINISTRAR)
  @ApiOperation({ summary: 'Encender o apagar el correo de los avisos de la actividad' })
  guardar(@Param('numeral') numeral: string, @Body('porCorreo') porCorreo: boolean) {
    return this.avisos.guardarCorreo(numeral, porCorreo);
  }
}

/** Las dependencias de la plataforma, para elegir a quién avisar. */
@ApiTags('Configuración · Notificaciones')
@Controller('configuracion/dependencias')
export class DependenciasController {
  constructor(private readonly avisos: AvisosService) {}

  @Get()
  @Puede('ver', undefined, { oPermiso: PERMISO_CONFIG_ADMINISTRAR })
  @ApiOperation({ summary: 'Dependencias de la ESAP, del catálogo de la plataforma' })
  listar() {
    return this.avisos.dependencias();
  }
}

import { Body, Controller, Delete, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { PermisosGuard } from '../../auth/permisos.guard';
import { Permisos } from '../../auth/permisos.decorator';
import { PERMISO_CONFIG_ADMINISTRAR, PERMISO_PROCESO_VER } from '../../auth/permisos';
import { getHiringAccess } from '../../auth/hiring-access';
import { AvisosService } from './avisos.service';

/** A quién le llega cada aviso de una actividad (EFDS-1183). */
@ApiTags('Configuración · Notificaciones')
@Controller('configuracion/actividades/:numeral/avisos')
export class AvisosController {
  constructor(private readonly avisos: AvisosService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_PROCESO_VER)
  @ApiOperation({ summary: 'Los avisos de la actividad: si están encendidos y a quién llegan' })
  listar(@Param('numeral') numeral: string) {
    return this.avisos.deActividad(numeral);
  }

  @Put(':evento')
  @UseGuards(PermisosGuard)
  @Permisos(PERMISO_CONFIG_ADMINISTRAR)
  @ApiOperation({
    summary: 'Encender, apagar o cambiar a quién llega un aviso de la actividad',
    description: 'Recibe { activo, papeles, roles }; lo que no llegue se conserva. Rige desde que se guarda.',
  })
  guardar(
    @Param('numeral') numeral: string,
    @Param('evento') evento: string,
    @Body() cambios: { activo?: boolean; papeles?: string[]; roles?: string[] },
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

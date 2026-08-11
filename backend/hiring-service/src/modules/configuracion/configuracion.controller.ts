import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ConfiguracionService } from './configuracion.service';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ROLES_ADMIN_UMBRALES, ROLES_LECTURA_CONTRATACION } from '../../auth/hiring-access';
import {
  ActualizarActividadDto,
  AplicabilidadDto,
  GuardarReglaDto,
  ActualizarCampoDto,
} from './dto/configuracion.dto';

/**
 * Consulta del Módulo de Configuración de Etapas.
 *
 * La edición de reglas y umbrales va aparte: exige rol administrador y
 * cambia el comportamiento de procesos en curso.
 */
@ApiTags('Configuración de etapas')
@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly service: ConfiguracionService) {}

  @Get('actividades')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({ summary: 'Las 63 actividades de la matriz, agrupadas por etapa' })
  catalogo() {
    return this.service.catalogo();
  }

  @Get('actividades/modalidad/:modalidad')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({
    summary: 'Actividades marcadas según apliquen o no a una modalidad',
  })
  porModalidad(@Param('modalidad') modalidad: string) {
    return this.service.actividadesDe(modalidad);
  }

  @Get('reglas/:numeral')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({ summary: 'Reglas vigentes de una actividad' })
  reglas(@Param('numeral') numeral: string, @Query('modalidad') modalidad?: string) {
    return this.service.reglasDe(numeral, modalidad ?? null);
  }

  // ------------------------------------------------------------ edicion ----
  // Cambiar una regla altera como se evaluan los procesos en curso, asi que
  // la edicion queda en el mismo rol que administra los umbrales.

  @Put('actividades/:numeral')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADMIN_UMBRALES)
  @ApiOperation({ summary: 'Corregir el nombre o la descripcion de una actividad' })
  actualizarActividad(@Param('numeral') numeral: string, @Body() dto: ActualizarActividadDto) {
    return this.service.actualizarActividad(numeral, dto);
  }

  @Put('actividades/:numeral/aplicabilidad')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADMIN_UMBRALES)
  @ApiOperation({ summary: 'Marcar si la actividad aplica a una modalidad' })
  cambiarAplicabilidad(@Param('numeral') numeral: string, @Body() dto: AplicabilidadDto) {
    return this.service.cambiarAplicabilidad(numeral, dto);
  }

  @Post('actividades/:numeral/reglas')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADMIN_UMBRALES)
  @ApiOperation({ summary: 'Agregar una regla a la actividad' })
  crearRegla(@Param('numeral') numeral: string, @Body() dto: GuardarReglaDto) {
    return this.service.crearRegla(numeral, dto);
  }

  @Put('reglas/:id')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADMIN_UMBRALES)
  @ApiOperation({
    summary: 'Editar una regla',
    description:
      'Cierra la vigente y abre otra, para que un proceso aprobado bajo la ' +
      'version anterior siga siendo auditable con las reglas de su momento.',
  })
  reemplazarRegla(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GuardarReglaDto) {
    return this.service.reemplazarRegla(id, dto);
  }

  @Delete('reglas/:id')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADMIN_UMBRALES)
  @ApiOperation({ summary: 'Derogar una regla sin borrarla del historico' })
  derogarRegla(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.derogarRegla(id);
  }

  @Get('actividades/:numeral/cobertura')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({
    summary: 'Matriz de la actividad: que exige cada modalidad',
    description: 'Una fila por condicion, sin repetir la global en cada columna.',
  })
  cobertura(@Param('numeral') numeral: string) {
    return this.service.cobertura(numeral);
  }

  @Get('actividades/:numeral/campos')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({ summary: 'Campos del formulario de la actividad' })
  campos(@Param('numeral') numeral: string) {
    return this.service.campos(numeral);
  }

  @Put('campos/:id')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADMIN_UMBRALES)
  @ApiOperation({ summary: 'Corregir la etiqueta o la ayuda de un campo' })
  actualizarCampo(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarCampoDto) {
    return this.service.actualizarCampo(id, dto);
  }
}

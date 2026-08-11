import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ConfiguracionService } from './configuracion.service';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ROLES_ADMIN_UMBRALES, ROLES_LECTURA_CONTRATACION } from '../../auth/hiring-access';
import { ActualizarActividadDto, AplicabilidadDto } from './dto/configuracion.dto';

/**
 * Módulo de Configuración de Etapas.
 *
 * Se expone lo que cambia sin desplegar: si una modalidad recorre una
 * actividad, y el texto que lee el gestor. Lo que cada actividad valida vive en
 * el código de su etapa, así que no hay endpoints para armar reglas desde la
 * pantalla.
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

  @Get('matriz')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({
    summary: 'La matriz completa: cada actividad contra cada modalidad',
  })
  matriz() {
    return this.service.matriz();
  }

  @Get('flujo/:modalidad')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({
    summary: 'El recorrido de una modalidad, etapa por etapa, con lo que se salta',
  })
  flujo(@Param('modalidad') modalidad: string) {
    return this.service.flujoDe(modalidad);
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

  // Lo que se configuraba desde la pantalla —crear y editar reglas, corregir
  // campos, simular el formulario— dejo de exponerse: las condiciones que
  // valida cada actividad se escriben en el codigo de su etapa, no se arman
  // desde un formulario. El servicio y el evaluador siguen intactos porque los
  // procesos en curso se evaluan con las reglas ya guardadas, y
  // `instanciarActividades` lo usa estudio-previo al radicar.
}

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ConfiguracionService } from './configuracion.service';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ROLES_ADMIN_UMBRALES, ROLES_LECTURA_CONTRATACION } from '../../auth/hiring-access';
import {
  ActualizarActividadDto,
  ActualizarCampoDto,
  AplicabilidadDto,
  CrearCampoDto,
} from './dto/configuracion.dto';

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

  // ------------------------------------------- que se le pide al gestor ----
  // Lo que la actividad exige: un documento, una justificacion, una fecha, una
  // casilla o el visto bueno de alguien. Sin condiciones ni excepciones por
  // modalidad: una actividad pide lo mismo en todas las que la recorren, y lo
  // que varia entre ellas es si la recorre, que ya resuelve la aplicabilidad.

  @Get('actividades/:numeral/campos')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION)
  @ApiOperation({ summary: 'Lo que la actividad le pide al gestor' })
  campos(@Param('numeral') numeral: string) {
    return this.service.campos(numeral);
  }

  @Post('actividades/:numeral/campos')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADMIN_UMBRALES)
  @ApiOperation({ summary: 'Agregar algo que el gestor tendra que hacer' })
  crearCampo(@Param('numeral') numeral: string, @Body() dto: CrearCampoDto) {
    return this.service.crearCampo(numeral, dto);
  }

  @Put('campos/:id')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADMIN_UMBRALES)
  @ApiOperation({
    summary: 'Corregir el texto de un campo o dejar de pedirlo',
    description:
      'Desactivarlo no lo borra: los procesos que ya guardaron un valor ahi lo ' +
      'conservan, y borrarlo dejaria huerfano lo diligenciado.',
  })
  actualizarCampo(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarCampoDto) {
    return this.service.actualizarCampo(id, dto);
  }
}

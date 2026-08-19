import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CriteriosService } from './criterios.service';
import {
  ActualizarCriterioDto,
  CambiarActivoCriterioDto,
  CrearCriterioDto,
} from './dto/criterios.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_ADMIN_CRITERIOS,
  ROLES_EVALUACION,
  ROLES_LECTURA_CONTRATACION,
} from '../../auth/hiring-access';

/**
 * Catálogo de criterios de evaluación (EFDS-1443).
 *
 * Consulta abierta al módulo —el evaluador y el gestor necesitan ver con qué
 * reglas se califica, y cuáles siguen sin confirmar— y escritura restringida a
 * la Dirección de Contratación: quien evalúa no reescribe la regla con la que
 * se le evalúa.
 *
 * Cuelga de la raíz y no de un proceso porque el catálogo no es de ninguno: es
 * la regla con la que se evalúan todos.
 */
@ApiTags('Etapa 6 · Criterios de evaluación')
@Controller('criterios-evaluacion')
export class CriteriosController {
  constructor(private readonly service: CriteriosService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION, ...ROLES_EVALUACION)
  @ApiOperation({
    summary: 'Catálogo de criterios por modalidad y dimensión',
    description:
      'Activos e inactivos, con su tipo, su puntaje máximo, si están confirmados y cuántas evaluaciones los usan. Incluye `puedeEditar` y el total ponderable de cada modalidad.',
  })
  catalogo(@Req() req: any) {
    return this.service.catalogo(getHiringAccess(req));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADMIN_CRITERIOS)
  @ApiOperation({ summary: 'Agregar un criterio al catálogo' })
  crear(@Body() dto: CrearCriterioDto, @Req() req: any) {
    return this.service.crear(dto, getHiringAccess(req));
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADMIN_CRITERIOS)
  @ApiOperation({
    summary: 'Corregir un criterio, o marcarlo confirmado',
    description:
      'Editar sin mandar `confirmado` lo deja sin confirmar: la ratificación es sobre un texto y una cifra concretos. Un criterio ya usado no cambia de dimensión ni de tipo.',
  })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarCriterioDto,
    @Req() req: any,
  ) {
    return this.service.actualizar(id, dto, getHiringAccess(req));
  }

  // No hay DELETE: un criterio usado en una evaluación no se borra, porque el
  // expediente tiene que poder explicar con qué reglas se calificó.
  @Put(':id/activo')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_ADMIN_CRITERIOS)
  @ApiOperation({ summary: 'Retirar un criterio de las evaluaciones nuevas, o devolverlo' })
  cambiarActivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CambiarActivoCriterioDto,
    @Req() req: any,
  ) {
    return this.service.cambiarActivo(id, dto, getHiringAccess(req));
  }
}

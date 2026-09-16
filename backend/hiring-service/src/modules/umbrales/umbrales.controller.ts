import { Body, Controller, Get, Param, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { UmbralesService } from './umbrales.service';
import { ConsultarSugerenciaDto, CrearUmbralDto, GuardarSmmlvDto } from './dto/umbral.dto';
import { RolesGuard } from '../../auth/roles.guard';

import { getHiringAccess } from '../../auth/hiring-access';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';


/**
 * Umbrales de cuantía por modalidad (EFDS-1147).
 *
 * Consulta abierta a todo el módulo —el gestor necesita entender por qué el
 * sistema le sugiere una modalidad— y escritura restringida a la Dirección de
 * Contratación, que es quien fija la regla.
 */
@ApiTags('Umbrales de cuantía')
@Controller('umbrales')
export class UmbralesController {
  constructor(private readonly service: UmbralesService) {}

  @Get()
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({
    summary: 'Umbrales vigentes por modalidad, con sus límites convertidos a pesos',
    description:
      'Incluye `puedeEditar`, para que la interfaz sepa si ofrecer la edición sin replicar la matriz de roles.',
  })
  vigentes(@Req() req: any) {
    return this.service.vigentes(getHiringAccess(req));
  }

  // Se consulta antes de crear el proceso, así que no cuelga de ninguno: recibe
  // la cuantía y responde qué modalidad corresponde.
  @Get('sugerencia')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({
    summary: 'Modalidad que corresponde a una cuantía, con el umbral aplicado',
    description:
      'Devuelve la modalidad sugerida, el umbral que la decidió, si la asignación es forzosa y qué modalidades quedan bloqueadas por el monto. La sugerencia orienta, salvo en licitación pública.',
  })
  sugerencia(@Query() dto: ConsultarSugerenciaDto) {
    return this.service.sugerirParaFormulario(dto.valorEstimado);
  }

  @Get('smmlv')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({ summary: 'Salarios mínimos registrados, base de los umbrales en SMMLV' })
  smmlv() {
    return this.service.smmlv();
  }

  @Put('smmlv')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({ summary: 'Registrar o corregir el salario mínimo de un año' })
  guardarSmmlv(@Body() dto: GuardarSmmlvDto) {
    return this.service.guardarSmmlv(dto.anio, dto.valor);
  }

  // Va después de las rutas fijas: `smmlv` no debe caer aquí como si fuera un
  // código de modalidad.
  @Get(':modalidad/historial')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view')
  @ApiOperation({ summary: 'Umbrales que ha tenido una modalidad, vigentes y cerrados' })
  historial(@Param('modalidad') modalidad: string) {
    return this.service.historial(modalidad);
  }

  @Put(':modalidad')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.config.manage')
  @ApiOperation({
    summary: 'Abrir un umbral nuevo para la modalidad y cerrar el anterior',
    description:
      'No edita el vigente: lo cierra y abre otro, para que los procesos ya creados sigan explicándose con las reglas que regían ese día.',
  })
  reemplazar(
    @Param('modalidad') modalidad: string,
    @Body() dto: CrearUmbralDto,
    @Req() req: any,
  ) {
    return this.service.reemplazar(modalidad, dto, getHiringAccess(req));
  }
}

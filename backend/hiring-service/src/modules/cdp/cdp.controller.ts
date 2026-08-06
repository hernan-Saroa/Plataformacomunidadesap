import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CdpService } from './cdp.service';
import { ExpedirCdpDto, RechazarCdpDto, SolicitarCdpDto } from './dto/cdp.dto';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import {
  getHiringAccess,
  ROLES_GESTION_CDP,
  ROLES_LECTURA_CONTRATACION,
  ROLES_SOLICITUD_CDP,
} from '../../auth/hiring-access';

/**
 * Ciclo del CDP — etapa 4 (EFDS-1148).
 *
 * El área solicitante radica; la Dirección Financiera verifica y expide. Esa
 * separación no es de interfaz: es quién compromete el presupuesto.
 */
@ApiTags('CDP')
@Controller('procesos/:id/cdp')
export class CdpController {
  constructor(private readonly service: CdpService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_LECTURA_CONTRATACION, ...ROLES_GESTION_CDP)
  @ApiOperation({
    summary: 'Estado del respaldo presupuestal del proceso',
    description:
      'Devuelve el CDP en curso, si la modalidad lo requiere y por qué el proceso todavía no puede abrirse.',
  })
  estado(@Param('id', ParseUUIDPipe) procesoId: string) {
    return this.service.estadoRespaldo(procesoId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...ROLES_SOLICITUD_CDP)
  @ApiOperation({ summary: 'Actividad 4.1 · Radicar la solicitud de CDP' })
  solicitar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: SolicitarCdpDto,
    @Req() req: any,
  ) {
    return this.service.solicitar(procesoId, dto, getHiringAccess(req));
  }

  @Post('verificar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION_CDP)
  @ApiOperation({ summary: 'Actividad 4.2 · Verificar la disponibilidad presupuestal' })
  verificar(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.service.verificar(procesoId, getHiringAccess(req));
  }

  @Post('expedir')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION_CDP)
  @ApiOperation({
    summary: 'Actividad 4.3 · Expedir el CDP',
    description:
      'Mientras no exista la integración con KLIC, el número y el valor se registran a mano con el soporte de la Dirección Financiera.',
  })
  expedir(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: ExpedirCdpDto,
    @Req() req: any,
  ) {
    return this.service.expedir(procesoId, dto, getHiringAccess(req));
  }

  @Post('rechazar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_GESTION_CDP)
  @ApiOperation({ summary: 'Cerrar el ciclo por falta de disponibilidad en el rubro' })
  rechazar(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Body() dto: RechazarCdpDto,
    @Req() req: any,
  ) {
    return this.service.rechazar(procesoId, dto, getHiringAccess(req));
  }
}

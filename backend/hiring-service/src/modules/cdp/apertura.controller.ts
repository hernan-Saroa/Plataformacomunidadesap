import { Controller, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CdpService } from './cdp.service';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { getHiringAccess, ROLES_SOLICITUD_CDP } from '../../auth/hiring-access';

/**
 * Apertura del proceso — actividad 5.7 de la matriz.
 *
 * Va aparte del controller del CDP porque abrir el proceso no es parte del
 * ciclo presupuestal: solo está condicionada por él. Cuando lleguen las demás
 * actividades de la etapa 5 —pliego definitivo, publicación en SECOP— este es
 * el punto donde se acumulan sus requisitos.
 */
@ApiTags('Apertura del proceso')
@Controller('procesos')
export class AperturaController {
  constructor(private readonly cdp: CdpService) {}

  @Post(':id/abrir')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_SOLICITUD_CDP)
  @ApiOperation({
    summary: 'Actividad 5.7 · Abrir el proceso',
    description:
      'Impide la apertura mientras el CDP no esté expedido (RF-EST-05). Hoy solo cubre el control presupuestal: los demás requisitos de la etapa 5 son de historias posteriores.',
  })
  abrir(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.cdp.abrirProceso(procesoId, getHiringAccess(req));
  }
}

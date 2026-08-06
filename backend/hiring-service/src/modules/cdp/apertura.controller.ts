import { Controller, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CdpService } from './cdp.service';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { getHiringAccess, ROLES_SOLICITUD_CDP } from '../../auth/hiring-access';

/**
 * Actividades de la etapa 5 que el CDP condiciona.
 *
 * Van aparte del controller del CDP porque no son parte del ciclo
 * presupuestal: solo están condicionadas por él. Cuando lleguen las demás
 * actividades de la etapa —cronograma, publicación en SECOP— este es el punto
 * donde se acumulan sus requisitos.
 */
@ApiTags('Etapa 5 · Elaboración y apertura')
@Controller('procesos')
export class AperturaController {
  constructor(private readonly cdp: CdpService) {}

  @Post(':id/documentos/iniciar')
  @UseGuards(RolesGuard)
  @Roles(...ROLES_SOLICITUD_CDP)
  @ApiOperation({
    summary: 'Actividad 5.1 · Iniciar la elaboración de documentos',
    description:
      'En contratación directa exige el CDP expedido antes de empezar (RF-EST-06). En las demás modalidades el control presupuestal es la apertura, no este paso.',
  })
  iniciarDocumentos(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.cdp.iniciarDocumentos(procesoId, getHiringAccess(req));
  }

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

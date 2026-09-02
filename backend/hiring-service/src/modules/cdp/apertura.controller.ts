import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CdpService } from './cdp.service';
import { RolesGuard } from '../../auth/roles.guard';

import { getHiringAccess } from '../../auth/hiring-access';
import { Permisos } from '../../auth/permisos.decorator';
import { PermisosGuard } from '../../auth/permisos.guard';


/**
 * Actividades de la etapa 5 que el CDP condiciona.
 *
 * Van aparte del controller del CDP porque no son parte del ciclo
 * presupuestal: solo están condicionadas por él. Desde EFDS-1152 la apertura
 * tiene su propio módulo, porque registrar la resolución y el pliego definitivo
 * dejó de ser un asunto del CDP.
 */
@ApiTags('Etapa 5 · Actividades y elaboración')
@Controller('procesos')
export class AperturaController {
  constructor(private readonly cdp: CdpService) {}

  @Get(':id/actividades')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.proceso.view', 'contratacion.presupuesto.gestionar')
  @ApiOperation({
    summary: 'Actividades de una etapa del proceso, con su estado',
    description:
      'Alimenta el riel de la interfaz. Por omisión devuelve las de la etapa en que va el proceso; con ?etapa=N, las de esa etapa.',
  })
  actividades(
    @Param('id', ParseUUIDPipe) procesoId: string,
    @Query('etapa') etapa?: string,
  ) {
    return this.cdp.actividadesDelProceso(procesoId, etapa ? Number(etapa) : undefined);
  }

  @Post(':id/documentos/iniciar')
  @UseGuards(PermisosGuard)
  @Permisos('contratacion.actividad.edit')
  @ApiOperation({
    summary: 'Actividad 5.1 · Iniciar la elaboración de documentos',
    description:
      'En contratación directa exige el CDP expedido antes de empezar (RF-EST-06). En las demás modalidades el control presupuestal es la apertura, no este paso.',
  })
  iniciarDocumentos(@Param('id', ParseUUIDPipe) procesoId: string, @Req() req: any) {
    return this.cdp.iniciarDocumentos(procesoId, getHiringAccess(req));
  }

  // La apertura del proceso se registra en POST /procesos/:id/apertura desde
  // EFDS-1152. Aquí había un endpoint que solo movía la etapa; mantenerlo habría
  // dejado una vía para abrir un proceso sin la resolución que lo respalda. La
  // regla del CDP que introdujo EFDS-1148 sigue exigiéndose: vive en
  // CdpService.abrirProceso, que es lo que aquel endpoint llamaba y lo que el
  // registro de la apertura invoca ahora.
}

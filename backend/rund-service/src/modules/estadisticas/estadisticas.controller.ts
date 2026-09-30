import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EstadisticasService } from './estadisticas.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { RequirePermissions } from '../../auth/auth.decorators';

@ApiTags('Estadísticas e Indicadores RUND')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('estadisticas')
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @Get('dashboard')
  @RequirePermissions('rund.view')
  @ApiOperation({ summary: 'Obtener métricas, KPIs y resúmenes para el dashboard RUND' })
  async getDashboardSummary() {
    return this.estadisticasService.getDashboardSummary();
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTROLLER: Evaluaciones de Procesos (DAFP)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Endpoints CRUD para evaluaciones DAFP de procesos auditables.
 * Base: /universo-auditorias/evaluaciones
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ControlInternoPermissions as CIP } from '../../common/permissions.constants';
import { EvaluacionProcesoService } from './evaluacion-proceso.service';
import { CreateEvaluacionProcesoDto, UpdateEvaluacionProcesoDto } from './dto/evaluacion-proceso.dto';

@Controller('universo-auditorias/evaluaciones')
export class EvaluacionProcesoController {
  constructor(private readonly evaluacionService: EvaluacionProcesoService) {}

  /**
   * GET /universo-auditorias/evaluaciones
   * Obtiene todas las evaluaciones con filtros opcionales
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findAll(
    @Query('vigencia') vigencia?: string,
    @Query('procesoId') procesoId?: string,
    @Query('decisionFinal') decisionFinal?: string,
    @Query('soloActivos') soloActivos?: string,
  ) {
    return this.evaluacionService.findAll({
      vigencia: vigencia && vigencia !== 'undefined' ? parseInt(vigencia, 10) : undefined,
      procesoId: procesoId === 'undefined' ? undefined : procesoId,
      decisionFinal: decisionFinal === 'undefined' ? undefined : decisionFinal,
      soloActivos: soloActivos !== 'false',
    });
  }

  /**
   * GET /universo-auditorias/evaluaciones/estadisticas/:vigencia
   * Obtiene estadísticas de evaluaciones por vigencia
   */
  @Get('estadisticas/:vigencia')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  getEstadisticas(@Param('vigencia') vigencia: string) {
    return this.evaluacionService.getEstadisticas(parseInt(vigencia, 10));
  }

  /**
   * GET /universo-auditorias/evaluaciones/proceso/:procesoId
   * Obtiene todas las evaluaciones de un proceso específico
   */
  @Get('proceso/:procesoId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findByProceso(@Param('procesoId') procesoId: string) {
    return this.evaluacionService.findByProceso(procesoId);
  }

  /**
   * GET /universo-auditorias/evaluaciones/:id
   * Obtiene una evaluación por ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findOne(@Param('id') id: string) {
    return this.evaluacionService.findOne(id);
  }

  /**
   * POST /universo-auditorias/evaluaciones
   * Crea una nueva evaluación
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_CREATE)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateEvaluacionProcesoDto) {
    return this.evaluacionService.create(createDto);
  }

  /**
   * PUT /universo-auditorias/evaluaciones/:id
   * Actualiza una evaluación existente
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  update(@Param('id') id: string, @Body() updateDto: UpdateEvaluacionProcesoDto) {
    return this.evaluacionService.update(id, updateDto);
  }

  /**
   * DELETE /universo-auditorias/evaluaciones/:id
   * Inactiva una evaluación (soft delete)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.evaluacionService.delete(id);
  }
}

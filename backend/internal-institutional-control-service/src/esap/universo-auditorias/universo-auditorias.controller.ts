import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import { UniversoAuditoriasService } from './universo-auditorias.service';
import { CreateProcesoAuditableDto } from './dto/create-proceso-auditable.dto';
import { UpdateProcesoAuditableDto } from './dto/update-proceso-auditable.dto';
import { CreateTipoProcesoDto, UpdateTipoProcesoDto } from './dto/tipo-proceso.dto';

@Controller('universo-auditorias')
export class UniversoAuditoriasController {
  constructor(private readonly universoAuditoriasService: UniversoAuditoriasService) {}

  /**
   * GET /universo-auditorias/tipos-proceso
   * Obtiene los tipos de proceso parametrizados.
   */
  @Get('tipos-proceso')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findTiposProceso(@Query('soloActivos') soloActivos?: string) {
    return this.universoAuditoriasService.findTiposProceso(soloActivos !== 'false');
  }

  /**
   * POST /universo-auditorias/tipos-proceso/seed-defaults
   * Restaura/reactiva los tipos base sin eliminar tipos personalizados.
   */
  @Post('tipos-proceso/seed-defaults')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  seedTiposProcesoDefaults() {
    return this.universoAuditoriasService.seedTiposProcesoDefaults();
  }

  /**
   * POST /universo-auditorias/tipos-proceso
   * Crea un tipo de proceso parametrizado.
   */
  @Post('tipos-proceso')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_CREATE)
  @HttpCode(HttpStatus.CREATED)
  createTipoProceso(@Body() createDto: CreateTipoProcesoDto) {
    return this.universoAuditoriasService.createTipoProceso(createDto);
  }

  /**
   * PUT /universo-auditorias/tipos-proceso/:id
   * Actualiza un tipo de proceso parametrizado.
   */
  @Put('tipos-proceso/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  updateTipoProceso(@Param('id') id: string, @Body() updateDto: UpdateTipoProcesoDto) {
    return this.universoAuditoriasService.updateTipoProceso(id, updateDto);
  }

  /**
   * PATCH /universo-auditorias/tipos-proceso/:id/inactivar
   * Inactiva un tipo de proceso si no tiene procesos activos asociados.
   */
  @Patch('tipos-proceso/:id/inactivar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  inactivarTipoProceso(@Param('id') id: string) {
    return this.universoAuditoriasService.inactivarTipoProceso(id);
  }

  /**
   * GET /universo-auditorias/procesos
   * Obtiene todos los procesos auditables con filtros opcionales
   */
  @Get('procesos')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findAll(
    @Query('tipo') tipo?: string,
    @Query('macroproceso') macroproceso?: string,
    @Query('nivelRiesgo') nivelRiesgo?: string,
    @Query('territorial') territorial?: string,
    @Query('search') search?: string,
    @Query('soloActivos') soloActivos?: string,
  ) {
    return this.universoAuditoriasService.findAll({
      tipo,
      macroproceso,
      nivelRiesgo,
      territorial,
      search,
      soloActivos: soloActivos !== 'false',
    });
  }

  /**
   * GET /universo-auditorias/procesos/:id
   * Obtiene un proceso auditable por ID
   */
  @Get('procesos/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findOne(@Param('id') id: string) {
    return this.universoAuditoriasService.findOne(id);
  }

  /**
   * POST /universo-auditorias/procesos
   * Crea un nuevo proceso auditable
   */
  @Post('procesos')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_CREATE)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateProcesoAuditableDto) {
    return this.universoAuditoriasService.create(createDto);
  }

  /**
   * PUT /universo-auditorias/procesos/:id
   * Actualiza un proceso auditable existente
   */
  @Put('procesos/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  update(@Param('id') id: string, @Body() updateDto: UpdateProcesoAuditableDto) {
    return this.universoAuditoriasService.update(id, updateDto);
  }

  /**
   * PATCH /universo-auditorias/procesos/:id/inactivar
   * Inactiva un proceso (sin eliminar historial)
   */
  @Patch('procesos/:id/inactivar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  inactivar(@Param('id') id: string) {
    return this.universoAuditoriasService.inactivar(id);
  }

  /**
   * PATCH /universo-auditorias/procesos/:id/activar
   * Reactiva un proceso
   */
  @Patch('procesos/:id/activar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  activar(@Param('id') id: string) {
    return this.universoAuditoriasService.activar(id);
  }

  /**
   * DELETE /universo-auditorias/procesos/:id
   * Elimina un proceso auditable
   */
  @Delete('procesos/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.universoAuditoriasService.delete(id);
  }

  /**
   * GET /universo-auditorias/procesos/:id/riesgo
   * Obtiene la evaluación de riesgo de un proceso
   */
  @Get('procesos/:id/riesgo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  getEvaluacionRiesgo(@Param('id') id: string) {
    return this.universoAuditoriasService.getEvaluacionRiesgo(id);
  }

  /**
   * POST /universo-auditorias/procesos/:id/riesgo
   * Evalúa el riesgo de un proceso
   */
  @Post('procesos/:id/riesgo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  evaluarRiesgo(@Param('id') id: string, @Body() evaluacionRiesgo: any) {
    return this.universoAuditoriasService.evaluarRiesgo(id, evaluacionRiesgo);
  }

  /**
   * GET /universo-auditorias/matriz-riesgo
   * Obtiene la matriz de riesgo (agrupada por nivel)
   */
  @Get('matriz-riesgo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  getMatrizRiesgo() {
    return this.universoAuditoriasService.getMatrizRiesgo();
  }

  /**
   * GET /universo-auditorias/priorizacion
   * Obtiene la priorización de auditorías por años
   */
  @Get('priorizacion')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  getPriorizacion() {
    return this.universoAuditoriasService.getPriorizacion();
  }
}

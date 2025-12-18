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
} from '@nestjs/common';
import { UniversoAuditoriasService } from './universo-auditorias.service';
import { CreateProcesoAuditableDto } from './dto/create-proceso-auditable.dto';
import { UpdateProcesoAuditableDto } from './dto/update-proceso-auditable.dto';

@Controller('universo-auditorias')
export class UniversoAuditoriasController {
  constructor(private readonly universoAuditoriasService: UniversoAuditoriasService) {}

  /**
   * GET /universo-auditorias/procesos
   * Obtiene todos los procesos auditables con filtros opcionales
   */
  @Get('procesos')
  findAll(
    @Query('tipo') tipo?: string,
    @Query('macroproceso') macroproceso?: string,
    @Query('nivelRiesgo') nivelRiesgo?: string,
    @Query('territorial') territorial?: string,
    @Query('search') search?: string,
  ) {
    return this.universoAuditoriasService.findAll({
      tipo,
      macroproceso,
      nivelRiesgo,
      territorial,
      search,
    });
  }

  /**
   * GET /universo-auditorias/procesos/:id
   * Obtiene un proceso auditable por ID
   */
  @Get('procesos/:id')
  findOne(@Param('id') id: string) {
    return this.universoAuditoriasService.findOne(id);
  }

  /**
   * POST /universo-auditorias/procesos
   * Crea un nuevo proceso auditable
   */
  @Post('procesos')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateProcesoAuditableDto) {
    return this.universoAuditoriasService.create(createDto);
  }

  /**
   * PUT /universo-auditorias/procesos/:id
   * Actualiza un proceso auditable existente
   */
  @Put('procesos/:id')
  update(@Param('id') id: string, @Body() updateDto: UpdateProcesoAuditableDto) {
    return this.universoAuditoriasService.update(id, updateDto);
  }

  /**
   * DELETE /universo-auditorias/procesos/:id
   * Elimina un proceso auditable
   */
  @Delete('procesos/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.universoAuditoriasService.delete(id);
  }

  /**
   * GET /universo-auditorias/procesos/:id/riesgo
   * Obtiene la evaluación de riesgo de un proceso
   */
  @Get('procesos/:id/riesgo')
  getEvaluacionRiesgo(@Param('id') id: string) {
    return this.universoAuditoriasService.getEvaluacionRiesgo(id);
  }

  /**
   * POST /universo-auditorias/procesos/:id/riesgo
   * Evalúa el riesgo de un proceso
   */
  @Post('procesos/:id/riesgo')
  evaluarRiesgo(@Param('id') id: string, @Body() evaluacionRiesgo: any) {
    return this.universoAuditoriasService.evaluarRiesgo(id, evaluacionRiesgo);
  }

  /**
   * GET /universo-auditorias/matriz-riesgo
   * Obtiene la matriz de riesgo (agrupada por nivel)
   */
  @Get('matriz-riesgo')
  getMatrizRiesgo() {
    return this.universoAuditoriasService.getMatrizRiesgo();
  }

  /**
   * GET /universo-auditorias/priorizacion
   * Obtiene la priorización de auditorías por años
   */
  @Get('priorizacion')
  getPriorizacion() {
    return this.universoAuditoriasService.getPriorizacion();
  }
}


import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuditoriasService } from './auditorias.service';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';
import { UpdateAuditoriaDto } from './dto/update-auditoria.dto';
import { FaseAuditoria } from './entities/auditoria.entity';

@Controller('auditorias')
export class AuditoriasController {
  constructor(private readonly auditoriasService: AuditoriasService) {}

  /**
   * GET /esap/auditorias
   * Obtiene todas las auditorías con filtros opcionales
   */
  @Get()
  findAll(
    @Query('tipo') tipo?: string,
    @Query('fase') fase?: string,
    @Query('prioridad') prioridad?: string,
    @Query('territorial') territorial?: string,
    @Query('search') search?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.auditoriasService.findAll({
      tipo,
      fase,
      prioridad,
      territorial,
      search,
      fechaDesde,
      fechaHasta,
    });
  }

  /**
   * GET /esap/auditorias/estadisticas
   * Obtiene estadísticas generales de auditorías
   */
  @Get('estadisticas')
  getEstadisticas() {
    return this.auditoriasService.getEstadisticas();
  }

  /**
   * GET /esap/auditorias/fase/:fase
   * Obtiene auditorías por fase (útil para Kanban)
   */
  @Get('fase/:fase')
  findByFase(@Param('fase') fase: FaseAuditoria) {
    return this.auditoriasService.findByFase(fase);
  }

  /**
   * GET /esap/auditorias/:id
   * Obtiene una auditoría por ID
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auditoriasService.findOne(id);
  }

  /**
   * GET /esap/auditorias/codigo/:codigo
   * Busca una auditoría por código
   */
  @Get('codigo/:codigo')
  findByCodigo(@Param('codigo') codigo: string) {
    return this.auditoriasService.findByCodigo(codigo);
  }

  /**
   * POST /esap/auditorias
   * Crea una nueva auditoría
   */
  @Post()
  create(@Body() createDto: CreateAuditoriaDto) {
    return this.auditoriasService.create(createDto);
  }

  /**
   * PATCH /esap/auditorias/:id
   * Actualiza una auditoría existente
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateAuditoriaDto) {
    return this.auditoriasService.update(id, updateDto);
  }

  /**
   * PATCH /esap/auditorias/:id/progreso
   * Actualiza el progreso de una auditoría
   */
  @Patch(':id/progreso')
  updateProgreso(
    @Param('id') id: string,
    @Body('progreso') progreso: number,
  ) {
    return this.auditoriasService.updateProgreso(id, progreso);
  }

  /**
   * PATCH /esap/auditorias/:id/fase
   * Actualiza la fase de una auditoría
   */
  @Patch(':id/fase')
  updateFase(
    @Param('id') id: string,
    @Body('fase') fase: FaseAuditoria,
  ) {
    return this.auditoriasService.updateFase(id, fase);
  }

  /**
   * POST /esap/auditorias/:id/hallazgos/incrementar
   * Incrementa el contador de hallazgos
   */
  @Post(':id/hallazgos/incrementar')
  incrementarHallazgos(@Param('id') id: string) {
    return this.auditoriasService.incrementarHallazgos(id);
  }

  /**
   * POST /esap/auditorias/:id/hallazgos/decrementar
   * Decrementa el contador de hallazgos
   */
  @Post(':id/hallazgos/decrementar')
  decrementarHallazgos(@Param('id') id: string) {
    return this.auditoriasService.decrementarHallazgos(id);
  }

  /**
   * DELETE /esap/auditorias/:id
   * Elimina una auditoría
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.auditoriasService.delete(id);
  }
}













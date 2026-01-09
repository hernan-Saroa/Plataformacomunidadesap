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
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuditoriasService } from './auditorias.service';
import { HallazgosService } from '../hallazgos/hallazgos.service';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';
import { UpdateAuditoriaDto } from './dto/update-auditoria.dto';
import { CreateNotaDto } from './dto/create-nota.dto';
import { UpdateNotaDto } from './dto/update-nota.dto';
import { SolicitarAmpliacionPlazoDto } from './dto/solicitar-ampliacion-plazo.dto';
import { AprobarAmpliacionPlazoDto } from './dto/aprobar-ampliacion-plazo.dto';
import { RechazarAmpliacionPlazoDto } from './dto/rechazar-ampliacion-plazo.dto';
import { FaseAuditoria } from './entities/auditoria.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('auditorias')
export class AuditoriasController {
  constructor(
    private readonly auditoriasService: AuditoriasService,
    private readonly hallazgosService: HallazgosService,
  ) {}

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
   * POST /esap/auditorias/:id/notas
   * Crea una nueva nota para una auditoría
   */
  @Post(':id/notas')
  @HttpCode(HttpStatus.CREATED)
  createNota(@Param('id') id: string, @Body() createDto: CreateNotaDto) {
    return this.auditoriasService.createNota(id, createDto);
  }

  /**
   * PATCH /esap/auditorias/:id/notas/:notaId
   * Actualiza una nota existente
   */
  @Patch(':id/notas/:notaId')
  updateNota(
    @Param('id') id: string,
    @Param('notaId') notaId: string,
    @Body() updateDto: UpdateNotaDto,
  ) {
    return this.auditoriasService.updateNota(id, notaId, updateDto);
  }

  /**
   * DELETE /esap/auditorias/:id/notas/:notaId
   * Elimina una nota (soft delete)
   */
  @Delete(':id/notas/:notaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteNota(@Param('id') id: string, @Param('notaId') notaId: string) {
    return this.auditoriasService.deleteNota(id, notaId);
  }

  /**
   * PATCH /esap/auditorias/:id/notas/:notaId/importante
   * Marca o desmarca una nota como importante
   */
  @Patch(':id/notas/:notaId/importante')
  toggleImportanteNota(@Param('id') id: string, @Param('notaId') notaId: string) {
    return this.auditoriasService.toggleImportanteNota(id, notaId);
  }

  /**
   * POST /auditorias/:id/aprobar
   * Aprueba una auditoría
   */
  @Post(':id/aprobar')
  @HttpCode(HttpStatus.OK)
  aprobar(@Param('id') id: string, @Body() body: { comentarios?: string }) {
    return this.auditoriasService.aprobarAuditoria(id, body.comentarios);
  }

  /**
   * POST /auditorias/:id/rechazar
   * Rechaza una auditoría
   */
  @Post(':id/rechazar')
  @HttpCode(HttpStatus.OK)
  rechazar(@Param('id') id: string, @Body() body: { justificacion: string }) {
    if (!body.justificacion || body.justificacion.trim().length < 20) {
      throw new BadRequestException('La justificación debe tener al menos 20 caracteres');
    }
    return this.auditoriasService.rechazarAuditoria(id, body.justificacion);
  }

  /**
   * POST /auditorias/:id/modificacion
   * Solicita modificación de una auditoría
   */
  @Post(':id/modificacion')
  @HttpCode(HttpStatus.OK)
  solicitarModificacion(@Param('id') id: string, @Body() body: { observaciones: string }) {
    if (!body.observaciones || body.observaciones.trim().length < 20) {
      throw new BadRequestException('Las observaciones deben tener al menos 20 caracteres');
    }
    return this.auditoriasService.solicitarModificacionAuditoria(id, body.observaciones);
  }

  /**
   * GET /esap/auditorias/kanban/all
   * Obtiene todas las auditorías para el Kanban con todas las relaciones
   */
  @Get('kanban/all')
  findAllKanban() {
    return this.auditoriasService.findAllKanban();
  }

  /**
   * GET /esap/auditorias/kanban/archivadas
   * Obtiene todas las auditorías archivadas para el Kanban
   */
  @Get('kanban/archivadas')
  findAllKanbanArchivadas() {
    return this.auditoriasService.findAllKanbanArchivadas();
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
   * GET /esap/auditorias/:id/hallazgos
   * Obtiene todos los hallazgos de una auditoría
   */
  @Get(':id/hallazgos')
  getHallazgosByAuditoria(@Param('id') id: string) {
    return this.hallazgosService.findByAuditoria(id);
  }

  /**
   * GET /esap/auditorias/:id/notas
   * Obtiene todas las notas de una auditoría
   */
  @Get(':id/notas')
  getNotasByAuditoria(@Param('id') id: string) {
    return this.auditoriasService.getNotasByAuditoria(id);
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

  /**
   * POST /esap/auditorias/:id/ampliar-plazo/solicitar
   * Solicita ampliación de plazo de una auditoría en curso
   * RN-031.2: Solo Auditor Líder asignado a la auditoría puede solicitar
   */
  @Post(':id/ampliar-plazo/solicitar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AUDITOR_LIDER', 'SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  solicitarAmpliacionPlazo(
    @Param('id') id: string,
    @Body() solicitarDto: SolicitarAmpliacionPlazoDto,
    @Req() req: any,
  ) {
    const user = req.user;
    return this.auditoriasService.solicitarAmpliacionPlazo(
      id, 
      solicitarDto, 
      user.userId,
      user.roles || [user.role]
    );
  }

  /**
   * POST /esap/auditorias/:id/ampliar-plazo/aprobar
   * Aprueba una solicitud de ampliación de plazo
   * RN-031.3: Solo Jefe de Control Interno o Administrador pueden aprobar
   */
  @Post(':id/ampliar-plazo/aprobar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('JEFE_CONTROL_INTERNO', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  aprobarAmpliacionPlazo(
    @Param('id') id: string,
    @Body() aprobarDto: AprobarAmpliacionPlazoDto,
    @Req() req: any,
  ) {
    const user = req.user;
    return this.auditoriasService.aprobarAmpliacionPlazo(
      id, 
      aprobarDto, 
      user.userId,
      user.roles || [user.role]
    );
  }

  /**
   * POST /esap/auditorias/:id/ampliar-plazo/rechazar
   * Rechaza una solicitud de ampliación de plazo
   * RN-031.3: Solo Jefe de Control Interno o Administrador pueden rechazar
   */
  @Post(':id/ampliar-plazo/rechazar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('JEFE_CONTROL_INTERNO', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  rechazarAmpliacionPlazo(
    @Param('id') id: string,
    @Body() rechazarDto: RechazarAmpliacionPlazoDto,
    @Req() req: any,
  ) {
    const user = req.user;
    return this.auditoriasService.rechazarAmpliacionPlazo(
      id, 
      rechazarDto, 
      user.userId,
      user.roles || [user.role]
    );
  }

  /**
   * GET /esap/auditorias/ampliar-plazo/pendientes
   * Obtiene todas las solicitudes de ampliación de plazo pendientes
   * Útil para que el Jefe OCI vea todas las solicitudes que requieren aprobación
   */
  @Get('ampliar-plazo/pendientes')
  getSolicitudesAmpliacionPendientes() {
    return this.auditoriasService.getSolicitudesAmpliacionPendientes();
  }

  /**
   * GET /esap/auditorias/:id/historial
   * Obtiene el historial completo de cambios de una auditoría
   */
  @Get(':id/historial')
  getHistorialAuditoria(@Param('id') id: string) {
    return this.auditoriasService.getHistorialAuditoria(id);
  }
}













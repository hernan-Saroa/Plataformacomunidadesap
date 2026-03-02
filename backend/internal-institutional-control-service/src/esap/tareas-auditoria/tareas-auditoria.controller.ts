import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ControlInternoPermissions as CIP } from '../../common/permissions.constants';
import { TareasAuditoriaService } from './tareas-auditoria.service';
import { CreateTareaAuditoriaDto } from './dto/create-tarea-auditoria.dto';
import { UpdateTareaAuditoriaDto } from './dto/update-tarea-auditoria.dto';
import { FaseTarea } from './entities/tarea-auditoria.entity';

@Controller('tareas-auditoria')
export class TareasAuditoriaController {
  constructor(private readonly tareasService: TareasAuditoriaService) {}

  /**
   * GET /tareas-auditoria
   * Lista de tareas con filtros opcionales
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findAll(
    @Query('auditoriaId') auditoriaId?: string,
    @Query('estado') estado?: string,
    @Query('prioridad') prioridad?: string,
    @Query('fase') fase?: string,
    @Query('responsableId') responsableId?: string,
  ) {
    return this.tareasService.findAll({ auditoriaId, estado, prioridad, fase, responsableId });
  }

  /**
   * GET /tareas-auditoria/auditoria/:auditoriaId
   * Lista tareas de una auditoría específica
   */
  @Get('auditoria/:auditoriaId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findByAuditoria(@Param('auditoriaId') auditoriaId: string) {
    return this.tareasService.findByAuditoria(auditoriaId);
  }

  /**
   * GET /tareas-auditoria/auditoria/:auditoriaId/estadisticas
   * Obtiene estadísticas de tareas por auditoría
   */
  @Get('auditoria/:auditoriaId/estadisticas')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  getEstadisticas(@Param('auditoriaId') auditoriaId: string) {
    return this.tareasService.getEstadisticas(auditoriaId);
  }

  /**
   * GET /tareas-auditoria/auditoria/:auditoriaId/fase/:fase/verificar
   * Verifica si todas las tareas de una fase están completas
   */
  @Get('auditoria/:auditoriaId/fase/:fase/verificar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  verificarFase(
    @Param('auditoriaId') auditoriaId: string,
    @Param('fase') fase: FaseTarea,
  ) {
    return this.tareasService.verificarFaseCompleta(auditoriaId, fase);
  }

  /**
   * GET /tareas-auditoria/:id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findOne(@Param('id') id: string) {
    return this.tareasService.findOne(id);
  }

  /**
   * POST /tareas-auditoria
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  create(@Body() createDto: CreateTareaAuditoriaDto) {
    return this.tareasService.create(createDto);
  }

  /**
   * PUT /tareas-auditoria/:id
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  update(@Param('id') id: string, @Body() updateDto: UpdateTareaAuditoriaDto) {
    return this.tareasService.update(id, updateDto);
  }

  /**
   * PATCH /tareas-auditoria/:id/completar
   * Marca una tarea como completada
   */
  @Patch(':id/completar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  completar(@Param('id') id: string) {
    return this.tareasService.completar(id);
  }

  /**
   * DELETE /tareas-auditoria/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.tareasService.remove(id);
  }
}

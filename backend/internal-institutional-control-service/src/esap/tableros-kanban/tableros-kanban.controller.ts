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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { ControlInternoPermissions as CIP } from '../../common/permissions.constants';
import { TablerosKanbanService } from './tableros-kanban.service';
import { CreateTableroKanbanDto } from './dto/create-tablero-kanban.dto';
import { UpdateTableroKanbanDto } from './dto/update-tablero-kanban.dto';
import { CreateEtapaKanbanDto } from './dto/create-etapa-kanban.dto';
import { UpdateEtapaKanbanDto } from './dto/update-etapa-kanban.dto';

@Controller('tableros-kanban')
export class TablerosKanbanController {
  constructor(private readonly tablerosKanbanService: TablerosKanbanService) {}

  /**
   * GET /tableros-kanban
   * Obtener todos los tableros
   */
  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findAll(@Query('includeInactive') includeInactive?: string) {
    const includeInactiveBool = includeInactive === 'true';
    return this.tablerosKanbanService.findAll(includeInactiveBool);
  }

  /**
   * GET /tableros-kanban/:id
   * Obtener un tablero por ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findOne(@Param('id') id: string) {
    return this.tablerosKanbanService.findOne(id);
  }

  /**
   * GET /tableros-kanban/tipo/:tipo
   * Obtener tablero por tipo
   */
  @Get('tipo/:tipo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findByTipo(@Param('tipo') tipo: string) {
    return this.tablerosKanbanService.findByTipo(tipo);
  }

  /**
   * POST /tableros-kanban
   * Crear un nuevo tablero
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  create(@Body() createDto: CreateTableroKanbanDto) {
    return this.tablerosKanbanService.create(createDto);
  }

  /**
   * PATCH /tableros-kanban/:id
   * Actualizar un tablero
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  update(@Param('id') id: string, @Body() updateDto: UpdateTableroKanbanDto) {
    return this.tablerosKanbanService.update(id, updateDto);
  }

  /**
   * DELETE /tableros-kanban/:id
   * Eliminar un tablero (soft delete)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.tablerosKanbanService.remove(id);
  }

  /**
   * POST /tableros-kanban/:id/restore
   * Restaurar un tablero eliminado
   */
  @Post(':id/restore')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  restore(@Param('id') id: string) {
    return this.tablerosKanbanService.restore(id);
  }

  // ============================================
  // ENDPOINTS PARA ETAPAS
  // ============================================

  /**
   * POST /tableros-kanban/:tableroId/etapas
   * Crear una nueva etapa
   */
  @Post(':tableroId/etapas')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  createEtapa(
    @Param('tableroId') tableroId: string,
    @Body() createDto: CreateEtapaKanbanDto,
  ) {
    return this.tablerosKanbanService.createEtapa(tableroId, createDto);
  }

  /**
   * PATCH /tableros-kanban/:tableroId/etapas/:etapaId
   * Actualizar una etapa
   */
  @Patch(':tableroId/etapas/:etapaId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  updateEtapa(
    @Param('tableroId') tableroId: string,
    @Param('etapaId') etapaId: string,
    @Body() updateDto: UpdateEtapaKanbanDto,
  ) {
    return this.tablerosKanbanService.updateEtapa(
      tableroId,
      etapaId,
      updateDto,
    );
  }

  /**
   * DELETE /tableros-kanban/:tableroId/etapas/:etapaId
   * Eliminar una etapa
   */
  @Delete(':tableroId/etapas/:etapaId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeEtapa(
    @Param('tableroId') tableroId: string,
    @Param('etapaId') etapaId: string,
  ) {
    return this.tablerosKanbanService.removeEtapa(tableroId, etapaId);
  }

  /**
   * POST /tableros-kanban/:tableroId/etapas/reordenar
   * Reordenar etapas
   */
  @Post(':tableroId/etapas/reordenar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  reordenarEtapas(
    @Param('tableroId') tableroId: string,
    @Body() body: { etapasIds: string[] },
  ) {
    return this.tablerosKanbanService.reordenarEtapas(
      tableroId,
      body.etapasIds,
    );
  }
}



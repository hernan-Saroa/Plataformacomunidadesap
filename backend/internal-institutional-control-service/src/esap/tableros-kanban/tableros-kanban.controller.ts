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
  findAll(@Query('includeInactive') includeInactive?: string) {
    const includeInactiveBool = includeInactive === 'true';
    return this.tablerosKanbanService.findAll(includeInactiveBool);
  }

  /**
   * GET /tableros-kanban/:id
   * Obtener un tablero por ID
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tablerosKanbanService.findOne(id);
  }

  /**
   * GET /tableros-kanban/tipo/:tipo
   * Obtener tablero por tipo
   */
  @Get('tipo/:tipo')
  findByTipo(@Param('tipo') tipo: string) {
    return this.tablerosKanbanService.findByTipo(tipo);
  }

  /**
   * POST /tableros-kanban
   * Crear un nuevo tablero
   */
  @Post()
  create(@Body() createDto: CreateTableroKanbanDto) {
    return this.tablerosKanbanService.create(createDto);
  }

  /**
   * PATCH /tableros-kanban/:id
   * Actualizar un tablero
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateTableroKanbanDto) {
    return this.tablerosKanbanService.update(id, updateDto);
  }

  /**
   * DELETE /tableros-kanban/:id
   * Eliminar un tablero (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.tablerosKanbanService.remove(id);
  }

  /**
   * POST /tableros-kanban/:id/restore
   * Restaurar un tablero eliminado
   */
  @Post(':id/restore')
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



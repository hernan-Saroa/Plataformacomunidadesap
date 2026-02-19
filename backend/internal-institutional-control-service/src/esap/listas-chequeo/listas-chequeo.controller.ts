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
import { ListasChequeoService } from './listas-chequeo.service';
import { CreateListaChequeoDto } from './dto/create-lista-chequeo.dto';
import { UpdateListaChequeoDto } from './dto/update-lista-chequeo.dto';

@Controller('listas-chequeo')
export class ListasChequeoController {
  constructor(private readonly listasChequeoService: ListasChequeoService) {}

  // ════════════════════════════════════════════════════════════════════════════
  // RUTAS ESPECÍFICAS (deben ir ANTES de las rutas con :id genérico)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /listas-chequeo/auditoria/:auditoriaId
   * Obtener listas de chequeo vinculadas a una auditoría
   */
  @Get('auditoria/:auditoriaId')
  getByAuditoria(@Param('auditoriaId') auditoriaId: string) {
    return this.listasChequeoService.findByAuditoria(auditoriaId);
  }

  /**
   * POST /listas-chequeo/aplicar
   * Aplicar una lista a una auditoría
   */
  @Post('aplicar')
  aplicarLista(@Body() data: { listaChequeoId: string; auditoriaId: string; aplicadoPor: string }) {
    return this.listasChequeoService.aplicarAuditoria(data);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RUTAS GENERALES DE LISTAS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /listas-chequeo
   * Obtener todas las listas de chequeo
   */
  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    const includeInactiveBool = includeInactive === 'true';
    return this.listasChequeoService.findAll(includeInactiveBool);
  }

  /**
   * POST /listas-chequeo
   * Crear una nueva lista de chequeo
   */
  @Post()
  create(@Body() createDto: CreateListaChequeoDto) {
    return this.listasChequeoService.create(createDto);
  }

  /**
   * GET /listas-chequeo/:id
   * Obtener una lista de chequeo por ID
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listasChequeoService.findOne(id);
  }

  /**
   * PATCH /listas-chequeo/:id
   * Actualizar una lista de chequeo
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateListaChequeoDto) {
    return this.listasChequeoService.update(id, updateDto);
  }

  /**
   * DELETE /listas-chequeo/:id
   * Eliminar una lista de chequeo (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.listasChequeoService.remove(id);
  }

  /**
   * POST /listas-chequeo/:id/restore
   * Restaurar una lista de chequeo eliminada
   */
  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.listasChequeoService.restore(id);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ENDPOINTS DE ITEMS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /listas-chequeo/:id/items
   * Obtener los items de una lista
   */
  @Get(':id/items')
  getItems(@Param('id') id: string) {
    return this.listasChequeoService.getItems(id);
  }

  /**
   * POST /listas-chequeo/:id/items
   * Agregar un item a una lista
   */
  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() itemData: any) {
    return this.listasChequeoService.addItem(id, itemData);
  }

  /**
   * PATCH /listas-chequeo/:id/items/:itemId
   * Actualizar un item de una lista (completar/pendiente)
   */
  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() updateData: { completado?: boolean; responsable?: string; fechaCompletado?: string; observaciones?: string }
  ) {
    return this.listasChequeoService.updateItem(id, itemId, updateData);
  }
}

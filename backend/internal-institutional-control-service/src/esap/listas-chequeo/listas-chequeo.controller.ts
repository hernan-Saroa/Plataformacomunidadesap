import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  getByAuditoria(@Param('auditoriaId') auditoriaId: string) {
    return this.listasChequeoService.findByAuditoria(auditoriaId);
  }

  /**
   * POST /listas-chequeo/aplicar
   * Aplicar una lista a una auditoría
   */
  @Post('aplicar')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  aplicarLista(@Body() data: { 
    listaChequeoId: string; 
    auditoriaId: string; 
    aplicadoPor: string;
    etapaKanban?: string;
  }) {
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findAll(
    @Query('includeInactive') includeInactive?: string,
    @Query('planAnualVigencia') planAnualVigencia?: string,
    @Query('planAnualId') planAnualId?: string,
  ) {
    const includeInactiveBool = includeInactive === 'true';
    const vigenciaNum =
      planAnualVigencia != null && planAnualVigencia !== ''
        ? parseInt(planAnualVigencia, 10)
        : undefined;
    return this.listasChequeoService.findAll(includeInactiveBool, {
      planAnualId,
      planAnualVigencia: Number.isNaN(vigenciaNum) ? undefined : vigenciaNum,
    });
  }

  /**
   * POST /listas-chequeo
   * Crear una nueva lista de chequeo
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_LISTAS_CHEQUEO)
  create(@Body() createDto: CreateListaChequeoDto) {
    return this.listasChequeoService.create(createDto);
  }

  /**
   * GET /listas-chequeo/:id
   * Obtener una lista de chequeo por ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  findOne(@Param('id') id: string) {
    return this.listasChequeoService.findOne(id);
  }

  /**
   * PATCH /listas-chequeo/:id
   * Actualizar una lista de chequeo (parcial)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_LISTAS_CHEQUEO)
  update(@Param('id') id: string, @Body() updateDto: UpdateListaChequeoDto) {
    return this.listasChequeoService.update(id, updateDto);
  }

  /**
   * PUT /listas-chequeo/:id
   * Actualizar una lista de chequeo (completa)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_LISTAS_CHEQUEO)
  updateFull(@Param('id') id: string, @Body() updateDto: UpdateListaChequeoDto) {
    return this.listasChequeoService.update(id, updateDto);
  }

  /**
   * DELETE /listas-chequeo/:id
   * Eliminar una lista de chequeo (soft delete)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_LISTAS_CHEQUEO)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.listasChequeoService.remove(id);
  }

  /**
   * POST /listas-chequeo/:id/restore
   * Restaurar una lista de chequeo eliminada
   */
  @Post(':id/restore')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_LISTAS_CHEQUEO)
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_VIEW)
  getItems(@Param('id') id: string) {
    return this.listasChequeoService.getItems(id);
  }

  /**
   * POST /listas-chequeo/:id/items
   * Agregar un item a una lista
   */
  @Post(':id/items')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_LISTAS_CHEQUEO)
  addItem(@Param('id') id: string, @Body() itemData: any) {
    return this.listasChequeoService.addItem(id, itemData);
  }

  /**
   * PATCH /listas-chequeo/:id/items/:itemId
   * Actualizar un item de una lista (completar/pendiente)
   */
  @Patch(':id/items/:itemId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() updateData: { 
      completado?: boolean; 
      responsable?: string; 
      fechaCompletado?: string; 
      observaciones?: string;
      auditoriaId?: string; // ID de la auditoría para guardar estado específico
    }
  ) {
    return this.listasChequeoService.updateItem(id, itemId, updateData);
  }

  /**
   * DELETE /listas-chequeo/:id/auditoria/:auditoriaId
   * Desvincular una lista de una auditoría
   */
  @Delete(':id/auditoria/:auditoriaId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.AUDITORIA_EDIT)
  @HttpCode(HttpStatus.NO_CONTENT)
  desaplicarAuditoria(
    @Param('id') listaId: string,
    @Param('auditoriaId') auditoriaId: string,
  ) {
    return this.listasChequeoService.desaplicarAuditoria(listaId, auditoriaId);
  }
}

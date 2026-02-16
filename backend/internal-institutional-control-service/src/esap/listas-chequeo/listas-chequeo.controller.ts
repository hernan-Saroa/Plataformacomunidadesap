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
   * GET /listas-chequeo/:id
   * Obtener una lista de chequeo por ID
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listasChequeoService.findOne(id);
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
}

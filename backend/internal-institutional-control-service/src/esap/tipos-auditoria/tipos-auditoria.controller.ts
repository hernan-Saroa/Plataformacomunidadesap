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
import { TiposAuditoriaService } from './tipos-auditoria.service';
import { CreateTipoAuditoriaDto } from './dto/create-tipo-auditoria.dto';
import { UpdateTipoAuditoriaDto } from './dto/update-tipo-auditoria.dto';

@Controller('tipos-auditoria')
export class TiposAuditoriaController {
  constructor(private readonly tiposAuditoriaService: TiposAuditoriaService) {}

  /**
   * GET /tipos-auditoria
   * Obtener todos los tipos de auditoría
   */
  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    const includeInactiveBool = includeInactive === 'true';
    return this.tiposAuditoriaService.findAll(includeInactiveBool);
  }

  /**
   * GET /tipos-auditoria/:id
   * Obtener un tipo de auditoría por ID
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tiposAuditoriaService.findOne(id);
  }

  /**
   * POST /tipos-auditoria
   * Crear un nuevo tipo de auditoría
   */
  @Post()
  create(@Body() createDto: CreateTipoAuditoriaDto) {
    return this.tiposAuditoriaService.create(createDto);
  }

  /**
   * PATCH /tipos-auditoria/:id
   * Actualizar un tipo de auditoría
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateTipoAuditoriaDto) {
    return this.tiposAuditoriaService.update(id, updateDto);
  }

  /**
   * DELETE /tipos-auditoria/:id
   * Eliminar un tipo de auditoría (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.tiposAuditoriaService.remove(id);
  }

  /**
   * POST /tipos-auditoria/:id/restore
   * Restaurar un tipo de auditoría eliminado
   */
  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.tiposAuditoriaService.restore(id);
  }
}

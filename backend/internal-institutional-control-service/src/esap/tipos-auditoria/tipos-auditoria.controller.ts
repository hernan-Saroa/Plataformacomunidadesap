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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_MANAGE)
  findAll(@Query('includeInactive') includeInactive?: string) {
    const includeInactiveBool = includeInactive === 'true';
    return this.tiposAuditoriaService.findAll(includeInactiveBool);
  }

  /**
   * GET /tipos-auditoria/:id
   * Obtener un tipo de auditoría por ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_MANAGE)
  findOne(@Param('id') id: string) {
    return this.tiposAuditoriaService.findOne(id);
  }

  /**
   * POST /tipos-auditoria
   * Crear un nuevo tipo de auditoría
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_MANAGE)
  create(@Body() createDto: CreateTipoAuditoriaDto) {
    return this.tiposAuditoriaService.create(createDto);
  }

  /**
   * PATCH /tipos-auditoria/:id
   * Actualizar un tipo de auditoría
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_MANAGE)
  update(@Param('id') id: string, @Body() updateDto: UpdateTipoAuditoriaDto) {
    return this.tiposAuditoriaService.update(id, updateDto);
  }

  /**
   * DELETE /tipos-auditoria/:id
   * Eliminar un tipo de auditoría (soft delete)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.tiposAuditoriaService.remove(id);
  }

  /**
   * POST /tipos-auditoria/:id/restore
   * Restaurar un tipo de auditoría eliminado
   */
  @Post(':id/restore')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(CIP.CONFIG_MANAGE)
  restore(@Param('id') id: string) {
    return this.tiposAuditoriaService.restore(id);
  }
}

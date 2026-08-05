import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { ModulesService, ModulesFilters } from './modules.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateModuleDto } from './dto/update-module.dto';

@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  /**
   * GET /api/v1/modules
   * Lista todos los módulos con sus permisos
   * Query params: category, is_active, search
   */
  @Get()
  async findAll(
    @Query('category') category?: 'backoffice' | 'portal',
    @Query('is_active') isActive?: string,
    @Query('search') search?: string,
    @Query('include_inactive_permissions') includeInactivePermissions?: string,
    @Query('include_permissions') includePermissions?: string,
  ) {
    const filters: ModulesFilters = {};

    if (category) {
      filters.category = category;
    }

    if (isActive !== undefined) {
      filters.is_active = isActive === 'true';
    }

    if (search) {
      filters.search = search;
    }

    if (includeInactivePermissions !== undefined) {
      filters.include_inactive_permissions = includeInactivePermissions === 'true';
    }

    filters.include_permissions = true;
    if (includePermissions !== undefined) {
      filters.include_permissions = includePermissions === 'true';
    }

    // Devolver el array directamente - el ResponseInterceptor lo envuelve en { data: [...] }
    return this.modulesService.findAllWithPermissions(filters);
  }

  /**
   * GET /api/v1/modules/stats
   * Estadísticas de módulos y permisos
   */
  @Get('stats')
  async getStats() {
    return this.modulesService.getStats();
  }

  /**
   * GET /api/v1/modules/permissions
   * Lista todos los permisos (flat list)
   */
  @Get('permissions')
  async getAllPermissions() {
    return this.modulesService.getAllPermissions();
  }

  /**
   * GET /api/v1/modules/:id
   * Obtiene un módulo específico con sus permisos
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.modulesService.findOne(id);
  }

  /**
   * PUT /api/v1/modules/:id
   * Actualiza la información de un módulo (Exclusivo para usuarios con rol SUPER_ADMIN)
   */
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  async update(
    @Param('id') id: string,
    @Body() updateModuleDto: UpdateModuleDto,
  ) {
    return this.modulesService.update(id, updateModuleDto);
  }
}

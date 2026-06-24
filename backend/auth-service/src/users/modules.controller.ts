import { Controller, Get, Param, Query } from '@nestjs/common';
import { ModulesService, ModulesFilters } from './modules.service';

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
}

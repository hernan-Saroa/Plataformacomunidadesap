import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Module } from './module.entity';
import { Permission } from './permission.entity';
import { UpdateModuleDto } from './dto/update-module.dto';

export interface ModuleWithPermissions {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  display_order: number;
  category: string;
  is_active: boolean;
  permissions?: PermissionDto[];
}

export interface PermissionDto {
  id: string;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
}

export interface ModulesFilters {
  category?: 'backoffice' | 'portal';
  is_active?: boolean;
  search?: string;
  include_permissions?: boolean;
  include_inactive_permissions?: boolean;
}

@Injectable()
export class ModulesService {
  constructor(
    @InjectRepository(Module)
    private readonly moduleRepo: Repository<Module>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  /**
   * Obtiene todos los módulos con sus permisos
   */
  async findAllWithPermissions(filters: ModulesFilters = {}): Promise<ModuleWithPermissions[]> {
    const query = this.moduleRepo
      .createQueryBuilder('module')
      .leftJoinAndSelect('module.permissions', 'permission')
      .orderBy('LOWER(module.name)', 'ASC')
      .addOrderBy('LOWER(permission.name)', 'ASC');

    if (filters.category) {
      query.andWhere('module.category = :category', { category: filters.category });
    }

    if (filters.is_active !== undefined) {
      query.andWhere('module.is_active = :is_active', { is_active: filters.is_active });
    }

    if (filters.search) {
      query.andWhere(
        '(module.name ILIKE :search OR module.description ILIKE :search OR permission.name ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    const modules = await query.getMany();

    if (!filters.include_permissions) {
      return modules.map(module => ({
        id: module.id_module,
        code: module.code,
        name: module.name,
        description: module.description || '',
        icon: module.icon,
        color: module.color,
        display_order: module.display_order,
        category: module.category,
        is_active: module.is_active,
      }));
    }

    return modules.map(module => ({
      id: module.id_module,
      code: module.code,
      name: module.name,
      description: module.description || '',
      icon: module.icon,
      color: module.color,
      display_order: module.display_order,
      category: module.category,
      is_active: module.is_active,
      permissions: (module.permissions || [])
        .filter(p => filters.include_inactive_permissions || p.is_active)
        .map(p => ({
          id: p.id_permission,
          code: p.code,
          name: p.name,
          description: p.description || '',
          is_active: p.is_active,
        })),
    }));
  }

  /**
   * Obtiene un módulo por ID con sus permisos
   */
  async findOne(id: string): Promise<ModuleWithPermissions> {
    const module = await this.moduleRepo.findOne({
      where: [{ id_module: id }, { code: id }],
      relations: ['permissions'],
    });

    if (!module) {
      throw new NotFoundException('Módulo no encontrado');
    }

    return {
      id: module.id_module,
      code: module.code,
      name: module.name,
      description: module.description || '',
      icon: module.icon,
      color: module.color,
      display_order: module.display_order,
      category: module.category,
      is_active: module.is_active,
      permissions: (module.permissions || []).map(p => ({
        id: p.id_permission,
        code: p.code,
        name: p.name,
        description: p.description || '',
        is_active: p.is_active,
      })),
    };
  }

  /**
   * Actualiza la información de un módulo por ID o por código
   */
  async update(id: string, updateModuleDto: UpdateModuleDto): Promise<ModuleWithPermissions> {
    const module = await this.moduleRepo.findOne({
      where: [{ id_module: id }, { code: id }],
      relations: ['permissions'],
    });

    if (!module) {
      throw new NotFoundException(`Módulo '${id}' no encontrado`);
    }

    if (updateModuleDto.name !== undefined) module.name = updateModuleDto.name;
    if (updateModuleDto.description !== undefined) module.description = updateModuleDto.description;
    if (updateModuleDto.icon !== undefined) module.icon = updateModuleDto.icon;
    if (updateModuleDto.color !== undefined) module.color = updateModuleDto.color;
    if (updateModuleDto.display_order !== undefined) module.display_order = updateModuleDto.display_order;
    if (updateModuleDto.category !== undefined) module.category = updateModuleDto.category;
    if (updateModuleDto.is_active !== undefined) module.is_active = updateModuleDto.is_active;

    await this.moduleRepo.save(module);

    return this.findOne(module.id_module);
  }

  /**
   * Obtiene todos los permisos agrupados por módulo
   */
  async getPermissionsGroupedByModule(filters: ModulesFilters = {}): Promise<ModuleWithPermissions[]> {
    return this.findAllWithPermissions(filters);
  }

  /**
   * Obtiene todos los permisos (flat list)
   */
  async getAllPermissions(): Promise<PermissionDto[]> {
    const permissions = await this.permissionRepo.find({
      relations: ['module'],
      order: { name: 'ASC' },
    });

    return permissions.map(p => ({
      id: p.id_permission,
      code: p.code,
      name: p.name,
      description: p.description || '',
      is_active: p.is_active,
      module_code: p.module?.code || '',
      module_name: p.module?.name || '',
    })) as any;
  }

  /**
   * Obtiene estadísticas de módulos y permisos
   */
  async getStats(): Promise<{
    total_modules: number;
    total_permissions: number;
    backoffice_modules: number;
    portal_modules: number;
    active_modules: number;
  }> {
    const [totalModules, backofficeModules, portalModules, activeModules, totalPermissions] =
      await Promise.all([
        this.moduleRepo.count(),
        this.moduleRepo.count({ where: { category: 'backoffice' } }),
        this.moduleRepo.count({ where: { category: 'portal' } }),
        this.moduleRepo.count({ where: { is_active: true } }),
        this.permissionRepo.count(),
      ]);

    return {
      total_modules: totalModules,
      total_permissions: totalPermissions,
      backoffice_modules: backofficeModules,
      portal_modules: portalModules,
      active_modules: activeModules,
    };
  }
}

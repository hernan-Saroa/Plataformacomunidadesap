import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Module } from './module.entity';
import { Permission } from './permission.entity';

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
  permissions: PermissionDto[];
}

export interface PermissionDto {
  id: string;
  code: string;
  name: string;
  description: string;
}

export interface ModulesFilters {
  category?: 'backoffice' | 'portal';
  is_active?: boolean;
  search?: string;
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
      .orderBy('module.display_order', 'ASC')
      .addOrderBy('permission.name', 'ASC');

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
        .filter(p => p.is_active)
        .map(p => ({
          id: p.id_permission,
          code: p.code,
          name: p.name,
          description: p.description || '',
        })),
    }));
  }

  /**
   * Obtiene un módulo por ID con sus permisos
   */
  async findOne(id: string): Promise<ModuleWithPermissions> {
    const module = await this.moduleRepo.findOne({
      where: { id_module: id },
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
      })),
    };
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

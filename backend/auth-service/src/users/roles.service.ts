import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { isUUID } from 'class-validator';
import { v4 as uuidv4 } from 'uuid';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { User } from './user.entity';

export interface CreateRoleDto {
  id?: string;
  name: string;
  code?: string;
  description?: string;
  icon?: string;
  color?: string;
  type?: 'sistema' | 'personalizado';
  category?: 'backoffice' | 'portal' | 'sistema' | 'academico' | 'directivo' | 'administrativo';
  requires_2fa?: boolean;
  permissionIds?: string[];
}

export interface UpdateRoleDto {
  name?: string;
  code?: string;
  description?: string;
  icon?: string;
  color?: string;
  type?: 'sistema' | 'personalizado';
  category?: 'backoffice' | 'portal' | 'sistema' | 'academico' | 'directivo' | 'administrativo';
  requires_2fa?: boolean;
  permissionIds?: string[];
}

export interface RoleFilters {
  search?: string;
  type?: 'sistema' | 'personalizado';
  is_active?: boolean;
  requires_2fa?: boolean;
  page?: number;
  limit?: number;
}

export interface RoleStats {
  total_roles: number;
  roles_sistema: number;
  usuarios_asignados: number;
  permisos_disponibles: number;
}

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll(filters: RoleFilters = {}): Promise<{ roles: Role[], total: number }> {
    const query = this.roleRepo.createQueryBuilder('role');

    // Aplicar filtros
    if (filters.search) {
      query.andWhere('(role.name ILIKE :search OR role.description ILIKE :search)', {
        search: `%${filters.search}%`
      });
    }

    if (filters.type) {
      query.andWhere('role.type = :type', { type: filters.type });
    }

    if (filters.is_active !== undefined) {
      query.andWhere('role.is_active = :is_active', { is_active: filters.is_active });
    }

    if (filters.requires_2fa !== undefined) {
      query.andWhere('role.requires_2fa = :requires_2fa', { requires_2fa: filters.requires_2fa });
    }

    // Agregar subqueries para conteos
    query
      .addSelect(
        `(SELECT COUNT(*) FROM auth.user_roles ur WHERE ur.id_rol = role.id AND ur.is_active = true)`,
        'usuarios_count',
      )
      .addSelect(
        `(SELECT COUNT(*) FROM auth.role_permissions rp WHERE rp.id_rol = role.id)`,
        'permisos_count',
      );

    // Paginación
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const countQuery = query.clone(); // importante: clonar antes de skip/take
    const total = await countQuery.getCount();

    query.skip(offset).take(limit);

    // Ordenar por id ascendente
    query.orderBy('role.id', 'ASC');

    const {raw, entities} = await query.getRawAndEntities();

    // Mapear los resultados con los conteos
    // Mapear conteos desde raw a cada entidad
    const rolesWithCounts = entities.map((role, index) => {
      const row = raw[index];
      return {
        ...role,
        usuarios_count: Number(row.usuarios_count ?? 0),
        permisos_count: Number(row.permisos_count ?? 0),
      };
    });

    return { roles: rolesWithCounts as any[], total };
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepo
      .createQueryBuilder('role')
      .addSelect(
        `(SELECT COUNT(*) FROM auth.user_roles ur WHERE ur.id_rol = role.id AND ur.is_active = true)`,
        'usuarios_count',
      )
      .addSelect(
        `(SELECT COUNT(*) FROM auth.role_permissions rp WHERE rp.id_rol = role.id)`,
        'permisos_count',
      )
      .where('role.id = :id', { id })
      .getOne();

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    // Mapear los conteos
    return {
      ...role,
      usuarios_count: parseInt(role['usuarios_count'] || 0),
      permisos_count: parseInt(role['permisos_count'] || 0),
    } as any;
  }

  private generateCode(base: string): string {
    const normalized = base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const cleaned = normalized
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    const fallback = cleaned || 'ROL_SIN_NOMBRE';
    return fallback.slice(0, 50);
  }

  async create(createRoleDto: CreateRoleDto, createdBy?: string): Promise<Role> {
    // Normalizar y validar nombre/código únicos
    const code = this.generateCode(createRoleDto.code || createRoleDto.name);

    const existingRole = await this.roleRepo.findOne({ where: [{ name: createRoleDto.name }, { code }] });
    if (existingRole) {
      throw new BadRequestException('Ya existe un rol con este nombre o código');
    }

    const roleId = createRoleDto.id && isUUID(createRoleDto.id) ? createRoleDto.id : uuidv4();

    const role = this.roleRepo.create({
      id: roleId,
      code,
      name: createRoleDto.name,
      description: createRoleDto.description,
      icon: createRoleDto.icon || 'Shield',
      color: createRoleDto.color || '#003DA5',
      type: createRoleDto.type || 'personalizado',
      category: createRoleDto.category || 'sistema',
      requires_2fa: createRoleDto.requires_2fa || false,
      created_by: createdBy,
      is_active: true,
    });

    // Asignar permisos si se proporcionan
    if (createRoleDto.permissionIds && createRoleDto.permissionIds.length > 0) {
      const permissions = await this.permissionRepo.find({
        where: { id_permission: In(createRoleDto.permissionIds) }
      });
      role.permissions = permissions;
    }

    return this.roleRepo.save(role);
  }

  async update(id: string, updateRoleDto: UpdateRoleDto, updatedBy?: string): Promise<Role> {
    const role = await this.findOne(id);

    // Verificar nombre único si se está cambiando
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.roleRepo.findOne({ where: { name: updateRoleDto.name } });
      if (existingRole) {
        throw new BadRequestException('Ya existe un rol con este nombre');
      }
    }

    // Actualizar campos
    if (updateRoleDto.name) role.name = updateRoleDto.name;
    if (updateRoleDto.description !== undefined) role.description = updateRoleDto.description;
    if (updateRoleDto.icon) role.icon = updateRoleDto.icon;
    if (updateRoleDto.color) role.color = updateRoleDto.color;
    if (updateRoleDto.category) role.category = updateRoleDto.category;
    if (updateRoleDto.requires_2fa !== undefined) role.requires_2fa = updateRoleDto.requires_2fa;
    if (updatedBy) role.updated_by = updatedBy;
    if (updateRoleDto.code) {
      const newCode = this.generateCode(updateRoleDto.code);
      const existingCode = await this.roleRepo.findOne({ where: { code: newCode } });
      if (existingCode && existingCode.id !== role.id) {
        throw new BadRequestException('Ya existe un rol con este código');
      }
      role.code = newCode;
    }

    // Actualizar permisos si se proporcionan
    if (updateRoleDto.permissionIds !== undefined) {
      if (updateRoleDto.permissionIds.length === 0) {
        role.permissions = [];
      } else {
        const permissions = await this.permissionRepo.find({
          where: { id_permission: In(updateRoleDto.permissionIds) }
        });
        role.permissions = permissions;
      }
    }

    return this.roleRepo.save(role);
  }

  async delete(id: string): Promise<void> {
    const role = await this.roleRepo.findOne({ where: { id } });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    // No permitir eliminar roles de sistema
    if (role.type === 'sistema') {
      throw new BadRequestException('No se pueden eliminar roles de sistema');
    }

    // TODO: Verificar si el rol tiene usuarios asignados antes de eliminar
    // Por ahora, permitir eliminación sin validación

    await this.roleRepo.remove(role);
  }

  async duplicate(id: string, duplicatedBy?: string): Promise<Role> {
    const originalRole = await this.findOne(id);

    const duplicatedRole = this.roleRepo.create({
      name: `${originalRole.name} (Copia)`,
      description: originalRole.description,
      icon: originalRole.icon,
      color: originalRole.color,
      type: 'personalizado',
      requires_2fa: originalRole.requires_2fa,
      is_active: true,
      created_by: duplicatedBy,
      permissions: originalRole.permissions, // Copiar permisos
    });

    return this.roleRepo.save(duplicatedRole);
  }

  async toggleActive(id: string, updatedBy?: string): Promise<Role> {
    const role = await this.findOne(id);

    role.is_active = !role.is_active;
    if (updatedBy) role.updated_by = updatedBy;

    return this.roleRepo.save(role);
  }

  async toggle2FA(id: string, updatedBy?: string): Promise<Role> {
    const role = await this.findOne(id);

    role.requires_2fa = !role.requires_2fa;
    if (updatedBy) role.updated_by = updatedBy;

    return this.roleRepo.save(role);
  }

  async getStats(): Promise<RoleStats> {
    const [totalRoles, systemRoles, totalUsers, totalPermissions] = await Promise.all([
      this.roleRepo.count(),
      this.roleRepo.count({ where: { type: 'sistema' } }),
      this.userRepo.count(),
      this.permissionRepo.count(),
    ]);

    return {
      total_roles: totalRoles,
      roles_sistema: systemRoles,
      usuarios_asignados: totalUsers,
      permisos_disponibles: totalPermissions,
    };
  }

  async getPermissions(roleId: string): Promise<Permission[]> {
    if (!roleId || !isUUID(roleId)) {
      throw new BadRequestException('ID de rol inválido');
    }

    // Obtener el rol con sus permisos usando la relación de TypeORM
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    return role.permissions || [];
  }

  async updatePermissions(roleId: string, permissionIds: string[], updatedBy?: string): Promise<Role> {
    // Obtener el rol con sus permisos actuales
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    if (permissionIds.length === 0) {
      role.permissions = [];
    } else {
      const permissions = await this.permissionRepo.find({
        where: { id_permission: In(permissionIds) }
      });
      role.permissions = permissions;
    }

    if (updatedBy) role.updated_by = updatedBy;

    return this.roleRepo.save(role);
  }

  async getAllPermissions(): Promise<Permission[]> {
    return this.permissionRepo.find({ order: { name: 'ASC' } });
  }
}

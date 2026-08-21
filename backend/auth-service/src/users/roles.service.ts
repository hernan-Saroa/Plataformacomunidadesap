import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
  sistema_destino?: string;
  alcance?: any;
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
  sistema_destino?: string;
  alcance?: any;
  category?: 'backoffice' | 'portal' | 'sistema' | 'academico' | 'directivo' | 'administrativo';
  requires_2fa?: boolean;
  permissionIds?: string[];
}

export interface RoleFilters {
  search?: string;
  type?: 'sistema' | 'personalizado';
  is_active?: boolean;
  requires_2fa?: boolean;
  sistema_destino?: 'Backoffice' | 'Portal' | 'Ambos';
  page?: number;
  limit?: number;
}

export interface RoleStats {
  total_roles: number;
  roles_sistema: number;
  usuarios_asignados: number;
  permisos_disponibles: number;
}

const POSTGRES_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LABOR_CERTIFICATE_ASSIGNABLE_PERMISSION_CODES = new Set([
  'certificados-laborales.certificate.deliver',
  'certificados-laborales.certificate.sign',
  'certificados-laborales.certificate.verify',
  'certificados-laborales.config.edit',
  'certificados-laborales.export.report',
  'certificados-laborales.template.manage',
  'certificados-laborales.correction.manage',
]);

const isLaborCertificatePermission = (code?: string | null) =>
  typeof code === 'string' && code.startsWith('certificados-laborales.');

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

  private isPostgresUuid(value?: string | null): value is string {
    return typeof value === 'string' && POSTGRES_UUID_PATTERN.test(value.trim());
  }

  private isAssignablePermission(permission: Permission): boolean {
    if (!permission.is_active) {
      return false;
    }

    if (isLaborCertificatePermission(permission.code)) {
      return LABOR_CERTIFICATE_ASSIGNABLE_PERMISSION_CODES.has(permission.code);
    }

    return true;
  }

  private async findPermissionsByIdsOrCodes(permissionIds: string[]): Promise<Permission[]> {
    if (!permissionIds.length) {
      return [];
    }

    const uuidIds = permissionIds.filter(id => this.isPostgresUuid(id));
    const codeIds = permissionIds.filter(id => !this.isPostgresUuid(id));

    const whereConditions: any[] = [];
    if (uuidIds.length > 0) whereConditions.push({ id_permission: In(uuidIds) });
    if (codeIds.length > 0) whereConditions.push({ code: In(codeIds) });

    if (!whereConditions.length) {
      return [];
    }

    const permissions = await this.permissionRepo.find({
      where: whereConditions,
    });

    return permissions.filter((permission) => this.isAssignablePermission(permission));
  }

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

    if (filters.sistema_destino) {
      query.andWhere('role.sistema_destino = :sistema_destino', { sistema_destino: filters.sistema_destino });
    }

    // Agregar subqueries para conteos
    query
      .addSelect(
        `(SELECT COUNT(*) FROM auth.user_roles ur WHERE ur.id_rol = role.id AND ur.is_active = true)`,
        'usuarios_count',
      )
      .addSelect(
        `(
          SELECT COUNT(*)
          FROM auth.role_permissions rp
          INNER JOIN auth.permission p ON p.id_permission = rp.id_permission
          WHERE rp.id_rol = role.id
            AND COALESCE(rp.is_active, true) = true
            AND p.is_active = true
        )`,
        'permisos_count',
      );

    // Paginación
    const page = filters.page || 1;
    const limit = filters.limit || 100;
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
        `(
          SELECT COUNT(*)
          FROM auth.role_permissions rp
          INNER JOIN auth.permission p ON p.id_permission = rp.id_permission
          WHERE rp.id_rol = role.id
            AND COALESCE(rp.is_active, true) = true
            AND p.is_active = true
        )`,
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

    const roleId = this.isPostgresUuid(createRoleDto.id) ? createRoleDto.id.trim() : uuidv4();

    const role = this.roleRepo.create({
      id: roleId,
      code,
      name: createRoleDto.name,
      description: createRoleDto.description,
      icon: createRoleDto.icon || 'Shield',
      color: createRoleDto.color || '#003DA5',
      type: createRoleDto.type || 'personalizado',
      sistema_destino: createRoleDto.sistema_destino || 'Backoffice',
      alcance: createRoleDto.alcance,
      category: createRoleDto.category || 'sistema',
      requires_2fa: createRoleDto.requires_2fa || false,
      created_by: createdBy,
      is_active: true,
    });

    // Asignar exactamente los permisos seleccionados al crear el rol.
    if (createRoleDto.permissionIds !== undefined) {
      role.permissions = await this.findPermissionsByIdsOrCodes(
        createRoleDto.permissionIds,
      );
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
    if (updateRoleDto.sistema_destino) role.sistema_destino = updateRoleDto.sistema_destino;
    if (updateRoleDto.alcance !== undefined) role.alcance = updateRoleDto.alcance;
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
      role.permissions = await this.findPermissionsByIdsOrCodes(updateRoleDto.permissionIds);
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

    // Generar código único para el rol duplicado
    const duplicatedName = `${originalRole.name} (Copia)`;
    const code = this.generateCode(duplicatedName);

    const duplicatedRole = this.roleRepo.create({
      id: uuidv4(),
      code,
      name: duplicatedName,
      description: originalRole.description,
      icon: originalRole.icon,
      color: originalRole.color,
      type: 'personalizado',
      sistema_destino: originalRole.sistema_destino,
      alcance: originalRole.alcance,
      category: originalRole.category,
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
    if (!roleId || roleId === 'undefined') {
      throw new BadRequestException('ID o código de rol requerido');
    }

    // Obtener el rol con sus permisos usando la relación de TypeORM
    const normalizedRoleId = roleId.trim();
    const whereCondition = this.isPostgresUuid(normalizedRoleId)
      ? { id: normalizedRoleId }
      : { code: normalizedRoleId };
    
    const role = await this.roleRepo.findOne({
      where: whereCondition,
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    const permissions: Permission[] = await this.permissionRepo.query(
      `SELECT p.*
       FROM auth.permission p
       INNER JOIN auth.role_permissions rp ON rp.id_permission = p.id_permission
       WHERE rp.id_rol = $1
         AND COALESCE(rp.is_active, true) = true`,
      [role.id],
    );

    return permissions.filter((permission) => this.isAssignablePermission(permission));
  }

  async updatePermissions(roleId: string, permissionIds: string[], updatedBy?: string): Promise<Role> {
    const normalizedRoleId = roleId.trim();
    const whereCondition = this.isPostgresUuid(normalizedRoleId)
      ? { id: normalizedRoleId }
      : { code: normalizedRoleId };
    
    // Obtener el rol con sus permisos actuales
    const role = await this.roleRepo.findOne({
      where: whereCondition,
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    role.permissions = await this.findPermissionsByIdsOrCodes(permissionIds);

    if (updatedBy) role.updated_by = updatedBy;

    return this.roleRepo.save(role);
  }

  async getAllPermissions(): Promise<Permission[]> {
    return this.permissionRepo.find({ order: { name: 'ASC' } });
  }

  async getUsersByRole(roleId: string): Promise<any[]> {
    try {
      const rows = await this.roleRepo.query(
        `SELECT 
           u.id_user AS id,
           u.username,
           COALESCE(p.nom_largo, p.nom_tercero || ' ' || p.pri_apellido, '') AS nombre,
           COALESCE(sec.nom_seccional, '') AS territorial,
           COALESCE(s.nom_sede, '') AS cetap,
           '' AS programa
         FROM auth."user" u
         JOIN auth.user_roles ur ON ur.id_user = u.id_user
         LEFT JOIN auth.personas p ON p.id_person = u.id_person
         LEFT JOIN auth.sedes s ON s.id_sede = p.id_sede
         LEFT JOIN auth.seccionales sec ON sec.id_seccional = COALESCE(p.id_seccional, s.id_seccional)
         WHERE ur.id_rol = $1 AND u.is_active = TRUE
         ORDER BY p.pri_apellido ASC NULLS LAST, p.nom_tercero ASC NULLS LAST
         LIMIT 500`,
        [roleId],
      );
      return rows || [];
    } catch (error) {
      console.error('[RolesService] Error en getUsersByRole:', error.message);
      return [];
    }
  }
}

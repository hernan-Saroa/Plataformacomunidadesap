import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import type { CreateRoleDto, UpdateRoleDto, RoleFilters, RoleStats } from './roles.service';
import { InternalServiceAccess } from '../auth/decorators/internal-service.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  AUTH_MANAGE_ROLES,
  AUTH_READ_ROLES,
} from '../auth/authorization.constants';

export interface RoleResponse {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  type: 'sistema' | 'personalizado';
  is_active: boolean;
  requires_2fa: boolean;
  usuarios_count: number;
  permisos_count: number;
  created_by?: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
}

@Controller('roles')
@UseGuards(RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @InternalServiceAccess()
  @Roles(...AUTH_READ_ROLES)
  async findAll(@Query() filters: RoleFilters): Promise<{ roles: RoleResponse[], total: number }> {
    const result = await this.rolesService.findAll(filters);
    return {
      roles: result.roles.map((role: any) => ({
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        icon: role.icon,
        color: role.color,
        type: role.type,
        is_active: role.is_active,
        requires_2fa: role.requires_2fa,
        usuarios_count: role.usuarios_count || 0,
        permisos_count: role.permisos_count || 0,
        created_by: role.created_by,
        updated_by: role.updated_by,
        created_at: role.created_at,
        updated_at: role.updated_at,
      })),
      total: result.total,
    };
  }

  @Get('stats')
  @InternalServiceAccess()
  @Roles(...AUTH_READ_ROLES)
  async getStats(): Promise<RoleStats> {
    return this.rolesService.getStats();
  }

  @Get(':id')
  @InternalServiceAccess()
  @Roles(...AUTH_READ_ROLES)
  async findOne(@Param('id') id: string): Promise<RoleResponse> {
    const role = await this.rolesService.findOne(id) as any;
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      icon: role.icon,
      color: role.color,
      type: role.type,
      is_active: role.is_active,
      requires_2fa: role.requires_2fa,
      usuarios_count: role.usuarios_count || 0,
      permisos_count: role.permisos_count || 0,
      created_by: role.created_by,
      updated_by: role.updated_by,
      created_at: role.created_at,
      updated_at: role.updated_at,
    };
  }

  @Post()
  @Roles(...AUTH_MANAGE_ROLES)
  async create(@Body() createRoleDto: CreateRoleDto): Promise<RoleResponse> {
    const role = await this.rolesService.create(createRoleDto, 'current_user'); // TODO: obtener usuario actual
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      icon: role.icon,
      color: role.color,
      type: role.type,
      is_active: role.is_active,
      requires_2fa: role.requires_2fa,
      usuarios_count: 0,
      permisos_count: role.permissions?.length || 0,
      created_by: role.created_by,
      updated_by: role.updated_by,
      created_at: role.created_at,
      updated_at: role.updated_at,
    };
  }

  @Put(':id')
  @Roles(...AUTH_MANAGE_ROLES)
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto): Promise<RoleResponse> {
    const role = await this.rolesService.update(id, updateRoleDto, 'current_user') as any; // TODO: obtener usuario actual
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      icon: role.icon,
      color: role.color,
      type: role.type,
      is_active: role.is_active,
      requires_2fa: role.requires_2fa,
      usuarios_count: role.usuarios_count || 0,
      permisos_count: role.permisos_count || 0,
      created_by: role.created_by,
      updated_by: role.updated_by,
      created_at: role.created_at,
      updated_at: role.updated_at,
    };
  }

  @Delete(':id')
  @Roles(...AUTH_MANAGE_ROLES)
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.rolesService.delete(id);
    return { message: 'Rol eliminado exitosamente' };
  }

  @Post(':id/duplicate')
  @Roles(...AUTH_MANAGE_ROLES)
  async duplicate(@Param('id') id: string): Promise<RoleResponse> {
    const role = await this.rolesService.duplicate(id, 'current_user'); // TODO: obtener usuario actual
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      icon: role.icon,
      color: role.color,
      type: role.type,
      is_active: role.is_active,
      requires_2fa: role.requires_2fa,
      usuarios_count: 0,
      permisos_count: role.permissions?.length || 0,
      created_by: role.created_by,
      updated_by: role.updated_by,
      created_at: role.created_at,
      updated_at: role.updated_at,
    };
  }

  @Patch(':id/toggle-active')
  @Roles(...AUTH_MANAGE_ROLES)
  async toggleActive(@Param('id') id: string): Promise<RoleResponse> {
    const role = await this.rolesService.toggleActive(id, 'current_user') as any; // TODO: obtener usuario actual
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      icon: role.icon,
      color: role.color,
      type: role.type,
      is_active: role.is_active,
      requires_2fa: role.requires_2fa,
      usuarios_count: role.usuarios_count || 0,
      permisos_count: role.permisos_count || 0,
      created_by: role.created_by,
      updated_by: role.updated_by,
      created_at: role.created_at,
      updated_at: role.updated_at,
    };
  }

  @Patch(':id/toggle-2fa')
  @Roles(...AUTH_MANAGE_ROLES)
  async toggle2FA(@Param('id') id: string): Promise<RoleResponse> {
    const role = await this.rolesService.toggle2FA(id, 'current_user') as any; // TODO: obtener usuario actual
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      icon: role.icon,
      color: role.color,
      type: role.type,
      is_active: role.is_active,
      requires_2fa: role.requires_2fa,
      usuarios_count: role.usuarios_count || 0,
      permisos_count: role.permisos_count || 0,
      created_by: role.created_by,
      updated_by: role.updated_by,
      created_at: role.created_at,
      updated_at: role.updated_at,
    };
  }

  @Get(':id/permissions')
  @InternalServiceAccess()
  @Roles(...AUTH_READ_ROLES)
  async getPermissions(@Param('id') id: string) {
    const permissions = await this.rolesService.getPermissions(id);
    // Mapear campos para consistencia con frontend
    return permissions.map(p => ({
      id: p.id_permission,
      code: p.code,
      name: p.name,
      description: p.description,
    }));
  }

  @Put(':id/permissions')
  @Roles(...AUTH_MANAGE_ROLES)
  async updatePermissions(
    @Param('id') id: string,
    @Body() body: { permissionIds: string[] }
  ): Promise<RoleResponse> {
    const role = await this.rolesService.updatePermissions(id, body.permissionIds, 'current_user') as any; // TODO: obtener usuario actual
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      icon: role.icon,
      color: role.color,
      type: role.type,
      is_active: role.is_active,
      requires_2fa: role.requires_2fa,
      usuarios_count: role.usuarios_count || 0,
      permisos_count: role.permisos_count || 0,
      created_by: role.created_by,
      updated_by: role.updated_by,
      created_at: role.created_at,
      updated_at: role.updated_at,
    };
  }

  @Get('permissions/all')
  @InternalServiceAccess()
  @Roles(...AUTH_READ_ROLES)
  async getAllPermissions() {
    return this.rolesService.getAllPermissions();
  }
}

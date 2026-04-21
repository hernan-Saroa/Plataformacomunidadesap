import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { RolesService } from './roles.service';
import { Public } from '../auth/decorators/public.decorator';
import type { CreateRoleDto, UpdateRoleDto, RoleFilters, RoleStats } from './roles.service';

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
// TODO: Agregar guards de autenticación y roles
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('super_admin', 'admin') // Solo super admin y admin pueden gestionar roles
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Public()
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
  async getStats(): Promise<RoleStats> {
    return this.rolesService.getStats();
  }

  @Get(':id')
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
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.rolesService.delete(id);
    return { message: 'Rol eliminado exitosamente' };
  }

  @Post(':id/duplicate')
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
  async getAllPermissions() {
    return this.rolesService.getAllPermissions();
  }
}

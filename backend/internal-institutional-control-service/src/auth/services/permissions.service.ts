import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Servicio para consultar permisos desde la base de datos
 * Basado en los códigos de roles del usuario autenticado
 */
@Injectable()
export class PermissionsService {
  constructor(private dataSource: DataSource) {}

  /**
   * Obtiene los permisos de un usuario basándose en sus códigos de roles
   * @param roleCodes Array de códigos de roles (ej: ['AUDITOR', 'JEFE_OCI'])
   * @returns Array de códigos de permisos (ej: ['control-interno.plan-anual.view'])
   */
  async getPermissionsByRoles(roleCodes: string[]): Promise<string[]> {
    if (!roleCodes || roleCodes.length === 0) {
      return [];
    }

    try {
      // Query para obtener permisos de los roles
      const result = await this.dataSource.query(
        `
        SELECT DISTINCT p.code
        FROM auth.permission p
        INNER JOIN auth.role_permissions rp ON p.id = rp.permission_id
        INNER JOIN auth.role r ON rp.role_id = r.id
        WHERE UPPER(r.code) = ANY($1::text[])
          AND rp.is_active = true
          AND p.is_active = true
        `,
        [roleCodes.map((c) => c.toUpperCase())],
      );

      return result.map((row: { code: string }) => row.code.toLowerCase());
    } catch (error) {
      console.error('❌ [PermissionsService] Error consultando permisos:', error);
      return [];
    }
  }

  /**
   * Verifica si un usuario tiene un permiso específico
   */
  async hasPermission(roleCodes: string[], permissionCode: string): Promise<boolean> {
    const permissions = await this.getPermissionsByRoles(roleCodes);
    return permissions.includes(permissionCode.toLowerCase());
  }

  /**
   * Verifica si un usuario tiene al menos uno de los permisos requeridos
   */
  async hasAnyPermission(roleCodes: string[], requiredPermissions: string[]): Promise<boolean> {
    const permissions = await this.getPermissionsByRoles(roleCodes);
    return requiredPermissions.some((p) => permissions.includes(p.toLowerCase()));
  }
}

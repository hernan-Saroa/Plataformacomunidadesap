import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Servicio para consultar permisos granulares desde la base de datos
 * Basado en los códigos de roles que vienen en el JWT del usuario autenticado.
 *
 * Este servicio replica el patrón usado en internal-institutional-control-service
 * para soportar permisos como CONTROL_DISCIPLINARIO_EXPEDIENTE_ELECTRONICO_VIEW_ALL.
 */
@Injectable()
export class PermissionsService {
  constructor(private dataSource: DataSource) {}

  /**
   * Obtiene todos los permisos activos de un usuario a partir de sus códigos de rol.
   */
  async getPermissionsByRoles(roleCodes: string[]): Promise<string[]> {
    if (!roleCodes || roleCodes.length === 0) {
      return [];
    }

    try {
      const result = await this.dataSource.query(
        `
        SELECT DISTINCT LOWER(p.code) as code
        FROM auth.permission p
        INNER JOIN auth.role_permissions rp ON p.id_permission = rp.id_permission
        INNER JOIN auth.role r ON rp.id_rol = r.id
        WHERE UPPER(r.code) = ANY($1::text[])
          AND rp.is_active = true
          AND p.is_active = true
        `,
        [roleCodes.map((c) => c.toUpperCase())],
      );

      return result.map((row: { code: string }) => row.code);
    } catch (error) {
      console.error('❌ [PermissionsService][disciplinario] Error consultando permisos:', error);
      return [];
    }
  }

  /**
   * Verifica si el usuario tiene un permiso específico (o uno que termine en el sufijo indicado).
   */
  async hasPermission(roleCodes: string[], permissionCode: string): Promise<boolean> {
    const permissions = await this.getPermissionsByRoles(roleCodes);
    const target = permissionCode.toLowerCase();
    return permissions.some((p) => p === target || p.endsWith(target.replace(/^.*\./, '.')));
  }

  /**
   * Verifica si el usuario tiene AL MENOS UNO de los permisos requeridos.
   */
  async hasAnyPermission(roleCodes: string[], requiredPermissions: string[]): Promise<boolean> {
    const permissions = await this.getPermissionsByRoles(roleCodes);
    return requiredPermissions.some((req) =>
      permissions.some((p) => p === req.toLowerCase() || p.endsWith(req.toLowerCase().replace(/^.*\./, '.'))),
    );
  }
}

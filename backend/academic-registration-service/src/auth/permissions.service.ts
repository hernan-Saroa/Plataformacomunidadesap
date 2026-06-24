import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class PermissionsService {
  constructor(private readonly dataSource: DataSource) {}

  async getPermissionCodesByRoles(roleCodes: string[]): Promise<string[]> {
    const normalizedRoleCodes = Array.from(
      new Set(
        roleCodes
          .map((roleCode) => roleCode.trim().toUpperCase())
          .filter(Boolean),
      ),
    );

    if (normalizedRoleCodes.length === 0) {
      return [];
    }

    try {
      const permissions = await this.dataSource.query(
        `
        SELECT DISTINCT p.code
        FROM auth.permission p
        INNER JOIN auth.role_permissions rp ON p.id_permission = rp.id_permission
        INNER JOIN auth.role r ON rp.id_rol = r.id
        WHERE UPPER(r.code) = ANY($1::text[])
          AND rp.is_active = true
          AND p.is_active = true
        `,
        [normalizedRoleCodes],
      );

      return permissions
        .map((permission: { code?: string }) => permission.code?.toLowerCase())
        .filter((code: string | undefined): code is string => Boolean(code));
    } catch (error) {
      console.error('[PermissionsService] Error consultando permisos:', error);
      return [];
    }
  }
}

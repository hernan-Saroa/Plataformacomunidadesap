import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class LaborCertificatePermissionsService {
  constructor(private readonly dataSource: DataSource) {}

  async assertRequestPermission(
    req: any,
    permissionCode: string,
    deniedMessage: string,
  ): Promise<void> {
    const roleCodes = this.extractSignedRoleCodes(req?.user?.roles);

    if (roleCodes.length === 0) {
      throw new ForbiddenException(deniedMessage);
    }

    const rows = await this.dataSource.query(
      `SELECT EXISTS (
         SELECT 1
         FROM auth.role role
         INNER JOIN auth.role_permissions role_permission
           ON role_permission.id_rol = role.id
          AND COALESCE(role_permission.is_active, TRUE) = TRUE
         INNER JOIN auth.permission permission
           ON permission.id_permission = role_permission.id_permission
          AND permission.is_active = TRUE
         WHERE role.is_active = TRUE
           AND role.code = ANY($1::text[])
           AND permission.code = $2
       ) AS allowed`,
      [roleCodes, permissionCode],
    );

    if (!this.toBoolean(rows?.[0]?.allowed)) {
      throw new ForbiddenException(deniedMessage);
    }
  }

  private extractSignedRoleCodes(roles: unknown): string[] {
    const source = Array.isArray(roles) ? roles : [roles];
    return Array.from(
      new Set(
        source
          .map((role: any) => (typeof role === 'string' ? role : role?.code))
          .map((role) => String(role || '').trim())
          .filter(Boolean),
      ),
    );
  }

  private toBoolean(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Resuelve los permisos reales del usuario desde `auth.role_permissions`.
 *
 * Espeja el mecanismo de `PtaPermissionsService` (academic-work-plan-service):
 * misma tabla y mismo criterio, acotado por prefijo al módulo. Se resuelve
 * SIEMPRE en el servidor, nunca a partir de banderas enviadas por el cliente.
 */
@Injectable()
export class ProgramacionPermissionsService {
  private readonly logger = new Logger(ProgramacionPermissionsService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async resolveForRoles(roleCodes: string[]): Promise<Set<string>> {
    const codes = (roleCodes || []).map((r) => String(r || '')).filter(Boolean);
    if (codes.length === 0) return new Set();

    try {
      const rows: Array<{ code: string }> = await this.dataSource.query(
        `SELECT DISTINCT p.code
           FROM auth.role_permissions rp
           INNER JOIN auth.role r ON r.id = rp.id_rol AND COALESCE(r.is_active, true) = true
           INNER JOIN auth.permission p ON p.id_permission = rp.id_permission
          WHERE COALESCE(rp.is_active, true) = true
            AND r.code = ANY($1::text[])
            AND p.code LIKE 'programacion.%'`,
        [codes],
      );
      return new Set((rows || []).map((r) => String(r.code)).filter(Boolean));
    } catch (error: any) {
      // Fail-closed: si no se pueden resolver los permisos, el usuario no ve
      // catálogo de ningún nivel. Es preferible bloquear a filtrar de más.
      this.logger.error(`No se pudieron resolver permisos de programación: ${error?.message}`);
      return new Set();
    }
  }
}

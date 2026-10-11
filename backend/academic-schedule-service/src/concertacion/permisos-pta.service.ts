import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/** Un permiso del PTA con el alcance del rol que lo otorga. */
export interface PermisoPta {
  codigo: string;
  /** 'global' = cualquier territorial; 'limitado' = alcance filtrado o por persona. */
  alcance: 'global' | 'limitado';
}

/**
 * Permisos del PTA del usuario, para la concertación — EFDS-2315.
 *
 * Mismo origen y mismo criterio que el PTA (`auth.role_permissions` y el alcance
 * del rol en `auth.role.alcance`, ver pta-territorial-role-scope.ts): cada
 * permiso conserva el alcance de SU rol.
 *
 * ⚠️ ALCANCE TERRITORIAL. El PTA compara la seccional del aprobador contra
 * dónde se dicta. Aquí la territorial del docente viene del RUND (`DT-009`) y
 * no hay hoy un vínculo estructurado con `auth.seccionales` (el RUND no trae
 * `sedeId`). Por eso solo un alcance GLOBAL habilita decidir; un alcance
 * filtrado o por persona queda 'limitado' y NO decide (fail-closed) hasta que
 * exista ese vínculo. Reportado como decisión pendiente.
 */
@Injectable()
export class PermisosPtaService {
  private readonly logger = new Logger(PermisosPtaService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async resolver(roleCodes: string[]): Promise<PermisoPta[]> {
    const codes = (roleCodes || []).map((r) => String(r || '')).filter(Boolean);
    if (!codes.length) return [];
    try {
      const filas: Array<{ code: string; alcance: any }> = await this.dataSource.query(
        `SELECT DISTINCT p.code, r.alcance
           FROM auth.role_permissions rp
           JOIN auth.role r       ON r.id = rp.id_rol AND COALESCE(r.is_active, true) = true
           JOIN auth.permission p ON p.id_permission = rp.id_permission
          WHERE COALESCE(rp.is_active, true) = true
            AND r.code = ANY($1::text[])
            AND p.code LIKE 'pta.%'`,
        [codes],
      );
      return filas.map((f) => ({ codigo: f.code, alcance: esGlobal(f.alcance) ? 'global' : 'limitado' }));
    } catch (error: any) {
      // Fail-closed: sin poder resolver permisos, nadie decide.
      this.logger.error(`No se pudieron resolver permisos del PTA: ${error?.message}`);
      return [];
    }
  }
}

function esGlobal(alcance: unknown): boolean {
  let a: any = alcance;
  if (typeof a === 'string') { try { a = JSON.parse(a); } catch { return false; } }
  return String(a?.tipo ?? '').trim().toLowerCase() === 'global';
}

/** ¿Tiene alguno de estos permisos con alcance global? */
export function tieneGlobal(permisos: readonly PermisoPta[], codigos: readonly string[]): boolean {
  return permisos.some((p) => p.alcance === 'global' && codigos.includes(p.codigo));
}

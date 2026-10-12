import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Un permiso del PTA con el alcance del rol que lo otorga. Misma semántica que
 * el PTA (`territorialGrantsFromRoles` en pta-territorial-role-scope.ts):
 *   · global    — alcance Global, o Filtrado con territorial "Todas" sin filtros;
 *   · filtrado  — Filtrado con una territorial concreta (id de auth.seccionales);
 *   · persona   — sin alcance o "territorial por persona": la(s) seccional(es)
 *                 de la persona del usuario.
 * Un alcance desconocido, o filtrado por CETAP/programa (no soportado aquí),
 * NO se convierte en permiso: falla cerrado.
 */
export interface PermisoPta {
  codigo: string;
  alcance: 'global' | 'filtrado' | 'persona';
  /** Solo en 'filtrado': id de auth.seccionales. */
  territorial?: string;
}

/** Contexto territorial de una decisión: dónde está el docente y dónde el usuario. */
export interface ContextoTerritorial {
  /** Seccional del docente según la equivalencia; null = no mapeada. */
  seccionalDocente: string | null;
  /** Seccionales de la persona del usuario que decide. */
  seccionalesUsuario: readonly string[];
}

/**
 * Permisos del PTA del usuario, para la concertación — EFDS-2315.
 * Origen: `auth.role_permissions` y el alcance del rol en `auth.role.alcance`.
 */
@Injectable()
export class PermisosPtaService {
  private readonly logger = new Logger(PermisosPtaService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async resolver(roleCodes: string[]): Promise<PermisoPta[]> {
    const codes = (roleCodes || []).map((r) => String(r || '')).filter(Boolean);
    if (!codes.length) return [];
    // Mismo criterio que el PTA (SUPER_ADMIN_ROLE_CODES): el superusuario decide
    // todo, sin depender del alcance del rol.
    if (codes.some((c) => SUPER_ADMIN_ROLE_CODES.includes(c))) {
      return ['pta.review.all', 'pta.approve.all'].map((codigo) => ({ codigo, alcance: 'global' as const }));
    }
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
      return filas.flatMap((f) => {
        const a = alcanceDe(f.alcance);
        return a ? [{ codigo: f.code, ...a }] : [];
      });
    } catch (error: any) {
      // Fail-closed: sin poder resolver permisos, nadie decide.
      this.logger.error(`No se pudieron resolver permisos del PTA: ${error?.message}`);
      return [];
    }
  }
}

/** Copia de SUPER_ADMIN_ROLE_CODES del PTA (otro servicio, no importable). */
const SUPER_ADMIN_ROLE_CODES = ['SUPER_ADMIN', 'super_admin'];

function alcanceDe(valor: unknown): Omit<PermisoPta, 'codigo'> | null {
  let a: any = valor;
  if (typeof a === 'string') { try { a = JSON.parse(a); } catch { return null; } }
  const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const tipo = texto(a?.tipo).toLowerCase();
  if (!a || tipo === 'territorial' || tipo === 'territorial_por_persona') return { alcance: 'persona' };
  if (tipo === 'global') return { alcance: 'global' };
  if (tipo === 'filtrado' && texto(a.territorial)) {
    const conFiltros = ['cetap', 'programa'].some((k) => texto(a[k]) && texto(a[k]).toLowerCase() !== 'todos');
    if (conFiltros) return null; // CETAP/programa: no soportado aquí → no decide
    if (texto(a.territorial).toLowerCase() === 'todas') return { alcance: 'global' };
    return { alcance: 'filtrado', territorial: texto(a.territorial) };
  }
  return null; // alcance desconocido: nunca acceso global
}

/** ¿Alguno de estos permisos alcanza la territorial del docente? */
export function decide(permisos: readonly PermisoPta[], codigos: readonly string[], ctx: ContextoTerritorial): boolean {
  return permisos.some((p) => {
    if (!codigos.includes(p.codigo)) return false;
    if (p.alcance === 'global') return true;
    if (!ctx.seccionalDocente) return false; // territorial no mapeada: falla cerrado
    if (p.alcance === 'filtrado') return p.territorial === ctx.seccionalDocente;
    return ctx.seccionalesUsuario.includes(ctx.seccionalDocente);
  });
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Permisos y alcance territorial de quien decide la concertación — EFDS-2315.
 *
 * La concertación decide la Docencia del PTA, así que decide EXACTAMENTE como
 * el PTA decide hoy sus componentes de Docencia (auditado en el PTA):
 *   · permisos: `PtaPermissionsService.resolveForUser` — roles VIGENTES de la
 *     cuenta en auth (no los del token) y sus permisos `pta.*`;
 *   · alcance: `assertAlcancePersonalDeActividades` — la seccional de la persona
 *     del aprobador (auth.personas.id_seccional o la de su sede,
 *     `resolvePersonalScopeForUser`) contra la territorial de CADA asignatura,
 *     comparando id o nombre normalizado (`normalizeSeccionalNombre`).
 * Igual que el PTA: el superusuario no tiene restricción geográfica, y un
 * aprobador sin seccional en Personas tampoco (eso está reportado como un hueco
 * del PTA; no se corrige aquí con datos a mano, porque lo comparten los dos).
 * El alcance del rol (`auth.role.alcance`) NO se usa: el PTA tampoco lo usa.
 */
export interface PermisoPta {
  codigo: string;
}

/** Marca del superusuario (SUPER_ADMIN): decide todo y sin restricción geográfica. */
export const SUPERUSUARIO = '*superusuario*';

/** Contexto territorial de una decisión, con la forma de los datos del PTA. */
export interface ContextoTerritorial {
  /** Seccionales (auth.seccionales.id_seccional) de la persona que decide. */
  seccionalesUsuario: readonly string[];
  /** Territorial (auth.seccionales.id_seccional) de cada asignatura; null = sin dato. */
  territorialesAsignaturas: ReadonlyArray<string | null>;
  /** id_seccional → nombre, para comparar por nombre como el PTA. */
  nombres: ReadonlyMap<string, string>;
}

@Injectable()
export class PermisosPtaService {
  private readonly logger = new Logger(PermisosPtaService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Permisos `pta.*` vigentes de la cuenta (mismo SQL que el PTA). Falla cerrado. */
  async resolver(idUser: string | null): Promise<PermisoPta[]> {
    if (!idUser) return [];
    try {
      const filas: Array<{ role_code: string; permission_code: string | null }> = await this.dataSource.query(
        `SELECT DISTINCT r.code AS role_code, p.code AS permission_code
           FROM auth."user" u
           JOIN auth.user_roles ur ON ur.id_user = u.id_user AND COALESCE(ur.is_active, true) = true
           JOIN auth.role r ON r.id = ur.id_rol AND COALESCE(r.is_active, true) = true
           LEFT JOIN auth.role_permissions rp ON rp.id_rol = r.id AND COALESCE(rp.is_active, true) = true
           LEFT JOIN auth.permission p ON p.id_permission = rp.id_permission
             AND COALESCE(p.is_active, true) = true AND p.code LIKE 'pta.%'
          WHERE u.id_user::text = $1 AND COALESCE(u.is_active, true) = true`,
        [String(idUser)],
      );
      if (filas.some((f) => SUPER_ADMIN_ROLE_CODES.includes(f.role_code))) {
        return [SUPERUSUARIO, 'pta.review.all', 'pta.approve.all'].map((codigo) => ({ codigo }));
      }
      return [...new Set(filas.map((f) => f.permission_code).filter((c): c is string => !!c))].map((codigo) => ({ codigo }));
    } catch (error: any) {
      this.logger.error(`No se pudieron resolver permisos del PTA: ${error?.message}`);
      return [];
    }
  }

  /** Seccionales de la persona de la cuenta y de su sede (`resolvePersonalScopeForUser`). */
  async seccionalesDeUsuario(idUser: string): Promise<string[]> {
    const filas: Array<{ id: string | null }> = await this.dataSource.query(
      `SELECT COALESCE(p.id_seccional, s.id_seccional)::text AS id
         FROM auth."user" u
         JOIN auth.personas p ON p.id_person = u.id_person
         LEFT JOIN auth.sedes s ON s.id_sede = p.id_sede
        WHERE u.id_user::text = $1 AND COALESCE(u.is_active, true) = true`,
      [String(idUser)]);
    return [...new Set(filas.map((f) => f.id).filter((x): x is string => !!x))];
  }

  /** Nombres de seccionales por id (`resolveNombrePorSeccionalId`). */
  async nombresDeSeccionales(ids: readonly string[]): Promise<Map<string, string>> {
    const unicos = [...new Set(ids.filter(Boolean))];
    if (!unicos.length) return new Map();
    const filas: Array<{ id: string; nombre: string | null }> = await this.dataSource.query(
      `SELECT id_seccional::text AS id, nom_seccional AS nombre FROM auth.seccionales WHERE id_seccional::text = ANY($1::text[])`,
      [unicos]);
    return new Map(filas.map((f) => [f.id, String(f.nombre ?? f.id)]));
  }
}

/** Copia de SUPER_ADMIN_ROLE_CODES del PTA (otro servicio, no importable). */
const SUPER_ADMIN_ROLE_CODES = ['SUPER_ADMIN', 'super_admin'];

/** `normalizeSeccionalNombre` del PTA, idéntica. */
export function normalizarSeccional(valor: unknown): string {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

/**
 * ¿Estos permisos deciden estas asignaturas? Misma regla que el PTA:
 * permiso del componente + alcance personal de `assertAlcancePersonalDeActividades`.
 */
export function decide(permisos: readonly PermisoPta[], codigos: readonly string[], ctx: ContextoTerritorial): boolean {
  if (permisos.some((p) => p.codigo === SUPERUSUARIO)) return true;
  if (!permisos.some((p) => codigos.includes(p.codigo))) return false;
  // PTA: `!auth.territorialIds?.length` → sin restricción geográfica.
  if (!ctx.seccionalesUsuario.length) return true;
  // PTA: una actividad sin territorial no se puede verificar → 403.
  if (ctx.territorialesAsignaturas.some((t) => !t)) return false;
  const tokens = (id: string) => [id, ctx.nombres.get(id)].map(normalizarSeccional).filter(Boolean);
  const propios = new Set(ctx.seccionalesUsuario.flatMap(tokens));
  return ctx.territorialesAsignaturas.every((t) => tokens(t!).some((x) => propios.has(x)));
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  PTAComponentKey,
  PTA_COMPONENT_KEYS,
  COMPONENT_PERMISSION,
  COMPONENT_LEVEL,
  PTA_APPROVE_ALL,
  SUPER_ADMIN_ROLE_CODES,
  componentsFromPermissions,
  REVIEW_SUBSECCIONES_BY_COMPONENT,
  COMPONENT_REVIEW_PERMISSION,
  PTA_REVIEW_ALL,
  reviewPermissionFor,
} from './pta-permissions.constants';

export interface PtaAuthContext {
  /** Superusuario del sistema (rol SUPER_ADMIN): aprueba todo. */
  isSuperUser: boolean;
  /**
   * Aprobador integral: puede aprobar todos los componentes (superusuario del
   * sistema, o rol con el permiso pta.approve.all). Es quien puede hacer
   * aprobación masiva / de todo el PTA.
   */
  approvesAll: boolean;
  /** Permisos PTA efectivos del usuario (pta.approve.* y pta.backoffice.*). */
  permissions: Set<string>;
  /** Componentes que el usuario está autorizado a aprobar. */
  allowedComponents: PTAComponentKey[];
  /**
   * Niveles (1/2/3) que el usuario puede aprobar en el flujo legacy por estado.
   * Se derivan de los componentes autorizados (compatibilidad), NO de permisos
   * de nivel (eliminados). Sirve para acotar la aprobación vía /estado.
   */
  approvalLevels: number[];
  /**
   * Revisor integral: puede revisar (preaprobar) cualquier subsección de
   * cualquier componente (superusuario del sistema, o rol con pta.review.all).
   */
  reviewsAll: boolean;
  /** Claves "componente:subseccion" que el usuario está autorizado a revisar. */
  allowedReviewSubsecciones: string[];
}

/**
 * Resuelve los permisos PTA de un usuario a partir de sus roles (JWT), consultando
 * la tabla auth.role_permissions. Es el reemplazo server-side de los flags que antes
 * enviaba el cliente (isSuperUser / componentesAutorizados), que eran manipulables.
 *
 * Modelo: aprobación POR COMPONENTE. Cada componente exige su permiso
 * pta.approve.<componente>. Un rol con pta.approve.all aprueba todos.
 */
@Injectable()
export class PtaPermissionsService {
  private readonly logger = new Logger(PtaPermissionsService.name);

  // Caché corto por combinación de roles: los permisos por rol cambian poco y esto
  // evita una consulta por cada aprobación de componente.
  private readonly cache = new Map<string, { at: number; value: PtaAuthContext }>();
  private readonly cacheTtlMs = 60_000;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private buildContext(isSuperUser: boolean, permissions: Set<string>): PtaAuthContext {
    const approvesAll = isSuperUser || permissions.has(PTA_APPROVE_ALL);
    const allowedComponents = approvesAll
      ? [...PTA_COMPONENT_KEYS]
      : componentsFromPermissions(permissions);

    // Niveles derivados de los componentes autorizados (compatibilidad con el flujo
    // legacy por estado). Un aprobador integral cubre los tres niveles.
    const approvalLevels = Array.from(
      new Set(allowedComponents.map((key) => COMPONENT_LEVEL[key]).filter(Boolean)),
    ).sort();

    const reviewsAll = isSuperUser || permissions.has(PTA_REVIEW_ALL);
    const allowedReviewSubsecciones = reviewsAll
      ? Object.keys(COMPONENT_REVIEW_PERMISSION)
      : Object.entries(COMPONENT_REVIEW_PERMISSION)
          .filter(([, permission]) => permissions.has(permission))
          .map(([key]) => key);

    return {
      isSuperUser,
      approvesAll,
      permissions,
      allowedComponents,
      approvalLevels,
      reviewsAll,
      allowedReviewSubsecciones,
    };
  }

  /**
   * Resuelve el contexto de autorización PTA para un conjunto de códigos de rol.
   */
  async resolveForRoles(roles: unknown): Promise<PtaAuthContext> {
    const roleCodes = Array.isArray(roles)
      ? Array.from(new Set(roles.map((r) => String(r || '')).filter(Boolean)))
      : [];

    const isSuperUser = roleCodes.some((code) => SUPER_ADMIN_ROLE_CODES.includes(code));

    // Superusuario: no requiere consultar la BD; aprueba todo.
    if (isSuperUser) {
      return this.buildContext(true, new Set<string>());
    }

    if (roleCodes.length === 0) {
      return this.buildContext(false, new Set<string>());
    }

    const cacheKey = roleCodes.slice().sort().join('|');
    const cached = this.cache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.at < this.cacheTtlMs) {
      return cached.value;
    }

    let permissions = new Set<string>();
    try {
      const rows: Array<{ code: string }> = await this.dataSource.query(
        `SELECT DISTINCT p.code
           FROM auth.role_permissions rp
           INNER JOIN auth.role r ON r.id = rp.id_rol AND COALESCE(r.is_active, true) = true
           INNER JOIN auth.permission p ON p.id_permission = rp.id_permission
          WHERE COALESCE(rp.is_active, true) = true
            AND r.code = ANY($1::text[])
            AND p.code LIKE 'pta.%'`,
        [roleCodes],
      );
      permissions = new Set(rows.map((row) => row.code).filter(Boolean));
    } catch (error: any) {
      // Si la consulta falla, negamos por defecto (fail-closed) salvo superusuario,
      // que ya se resolvió arriba. Registramos para diagnóstico.
      this.logger.error(
        `No se pudieron resolver permisos PTA para roles [${roleCodes.join(', ')}]: ${error?.message}`,
      );
      permissions = new Set<string>();
    }

    const value = this.buildContext(false, permissions);
    this.cache.set(cacheKey, { at: now, value });
    return value;
  }

  /** ¿El usuario puede aprobar el componente indicado? */
  canApproveComponent(ctx: PtaAuthContext, componente: string): boolean {
    if (ctx.approvesAll) return true;
    return ctx.allowedComponents.includes(componente as PTAComponentKey);
  }

  /** Permiso granular asociado a un componente (para mensajes de error claros). */
  permissionForComponent(componente: string): string | undefined {
    return COMPONENT_PERMISSION[componente as PTAComponentKey];
  }

  /** Nivel (informativo/compatibilidad) de un componente. */
  levelForComponent(componente: string): number | undefined {
    return COMPONENT_LEVEL[componente as PTAComponentKey];
  }

  /** ¿El usuario puede revisar (preaprobar) la subsección indicada del componente? */
  canReviewSubseccion(ctx: PtaAuthContext, componente: string, subseccion: string): boolean {
    if (ctx.reviewsAll) return true;
    return ctx.allowedReviewSubsecciones.includes(`${componente}:${subseccion}`);
  }

  /** Subsecciones de revisión válidas para un componente dado. */
  reviewSubseccionesForComponent(componente: string): string[] {
    return REVIEW_SUBSECCIONES_BY_COMPONENT[componente as PTAComponentKey] || [];
  }

  /**
   * Territoriales (auth.seccionales.id_seccional) a las que pertenece el usuario.
   *
   * Sigue la convención ya documentada en `auth.role.alcance` para
   * JEFATURA_TERRITORIAL: *"El rol se filtra por la seccional asignada a la persona,
   * no por roles separados"* → la territorial NO vive en el rol sino en
   * auth.personas.id_seccional. Se usa para que un aprobador/revisor territorial solo
   * pueda actuar sobre las asignaturas de SU territorial.
   *
   * Devuelve [] si no se puede resolver; quien lo consuma decide (los llamadores
   * tratan el vacío como "sin alcance territorial", que es fail-closed para el
   * componente territorial).
   */
  async resolveTerritorialIdsForUser(userId: string | null | undefined): Promise<string[]> {
    if (!userId) return [];
    try {
      const rows: Array<{ id_seccional: string }> = await this.dataSource.query(
        `SELECT p.id_seccional::text AS id_seccional
           FROM auth."user" u
           INNER JOIN auth.personas p ON p.id_person = u.id_person
          WHERE u.id_user::text = $1
            AND p.id_seccional IS NOT NULL`,
        [String(userId)],
      );
      return Array.from(new Set((rows || []).map((r) => String(r.id_seccional)).filter(Boolean)));
    } catch (error: any) {
      this.logger.error(`No se pudo resolver la territorial del usuario ${userId}: ${error?.message}`);
      return [];
    }
  }

  /** Permiso granular asociado a una subsección de revisión (para mensajes de error). */
  reviewPermissionForSubseccion(componente: string, subseccion: string): string | undefined {
    return reviewPermissionFor(componente, subseccion);
  }
}

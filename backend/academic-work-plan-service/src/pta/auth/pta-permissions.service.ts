import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { territorialGrantsFromRoles, PtaTerritorialDecisionGrants } from './pta-territorial-role-scope';
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
  hasReviewPermission,
  PTANivelDocencia,
  TERRITORIAL_NIVEL_APPROVE_PERMISSION,
  TERRITORIAL_NIVEL_REVIEW_PERMISSION,
  TERRITORIAL_NIVEL_PERMISSION_BY_COMPONENT,
} from './pta-permissions.constants';

const NIVELES_DOCENCIA: PTANivelDocencia[] = ['pregrado', 'posgrado'];

export interface PtaAuthContext {
  /** Alcance del rol que concede cada permiso territorial, separado por etapa y nivel. */
  territorialDecisionGrants?: PtaTerritorialDecisionGrants;
  territorialDecisionGrantsByComponent?: Record<string, PtaTerritorialDecisionGrants>;
  /** Superusuario del sistema (rol SUPER_ADMIN): aprueba todo. */
  isSuperUser: boolean;
  /**
   * Aprobador integral: puede aprobar todos los componentes (superusuario del
   * sistema, o rol con el permiso pta.approve.all). No es un permiso exclusivo
   * para operar en lote: un aprobador granular también puede procesar masivamente
   * los componentes incluidos en `allowedComponents`.
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
  /**
   * Niveles de Docencia Territorial (pregrado/posgrado) que el usuario puede
   * APROBAR, derivados de TERRITORIAL_NIVEL_APPROVE_PERMISSION. Junto con
   * territorialIds (poblado por el guard), acota qué filas de
   * PtaTerritorialApproval puede resolver (ver assertAlcanceTerritorial).
   */
  allowedNivelesTerritorialAprobar: PTANivelDocencia[];
  /** Igual que allowedNivelesTerritorialAprobar, pero para la etapa de Revisión. */
  allowedNivelesTerritorialRevisar: PTANivelDocencia[];
}

/**
 * Resuelve los permisos PTA consultando las asignaciones activas de la cuenta y
 * auth.role_permissions. Es el reemplazo server-side de los flags que antes
 * enviaba el cliente (isSuperUser / componentesAutorizados), que eran manipulables.
 *
 * Modelo: aprobación POR COMPONENTE. Cada componente exige su permiso
 * pta.approve.<componente>. Un rol con pta.approve.all aprueba todos.
 */
@Injectable()
export class PtaPermissionsService {
  private readonly logger = new Logger(PtaPermissionsService.name);

  // Caché del resolver por roles usado por otros módulos. Las decisiones del PTA
  // usan resolveForUser, que consulta las asignaciones vigentes sin esta caché.
  private readonly cache = new Map<string, { at: number; value: PtaAuthContext }>();
  private readonly cacheTtlMs = 60_000;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Permisos vigentes de la cuenta: una sesión abierta puede contener roles antiguos. */
  async resolveForUser(userId: string): Promise<PtaAuthContext & { roles: string[] }> {
    try {
      const rows: Array<{ role_code: string; permission_code: string | null; role_scope?: unknown }> = await this.dataSource.query(
        `SELECT DISTINCT r.code AS role_code, r.alcance AS role_scope, p.code AS permission_code
           FROM auth."user" u
           JOIN auth.user_roles ur ON ur.id_user = u.id_user AND COALESCE(ur.is_active, true) = true
           JOIN auth.role r ON r.id = ur.id_rol AND COALESCE(r.is_active, true) = true
           LEFT JOIN auth.role_permissions rp ON rp.id_rol = r.id AND COALESCE(rp.is_active, true) = true
           LEFT JOIN auth.permission p ON p.id_permission = rp.id_permission
             AND COALESCE(p.is_active, true) = true AND p.code LIKE 'pta.%'
          WHERE u.id_user::text = $1 AND COALESCE(u.is_active, true) = true`,
        [userId],
      );
      const roles = [...new Set(rows.map(row => row.role_code).filter(Boolean))];
      const permissions = new Set(rows.map(row => row.permission_code).filter((code): code is string => Boolean(code)));
      return { ...this.buildContext(roles.some(code => SUPER_ADMIN_ROLE_CODES.includes(code)), permissions),
        roles, territorialDecisionGrants: territorialGrantsFromRoles(rows),
        territorialDecisionGrantsByComponent: Object.fromEntries(Object.keys(TERRITORIAL_NIVEL_PERMISSION_BY_COMPONENT)
          .map(componente => [componente, territorialGrantsFromRoles(rows, componente)])),
      };
    } catch (error: any) {
      this.logger.error(`No se pudieron verificar los permisos vigentes del usuario: ${error?.message}`);
      throw new ForbiddenException('No fue posible verificar sus permisos. Intente nuevamente.');
    }
  }

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
      : Object.keys(COMPONENT_REVIEW_PERMISSION).filter((key) => {
          const [componente, subseccion] = key.split(':');
          return hasReviewPermission(permissions, componente, subseccion);
        });

    const allowedNivelesTerritorialAprobar = approvesAll
      ? [...NIVELES_DOCENCIA]
      : NIVELES_DOCENCIA.filter((nivel) => permissions.has(TERRITORIAL_NIVEL_APPROVE_PERMISSION[nivel]));
    const allowedNivelesTerritorialRevisar = reviewsAll
      ? [...NIVELES_DOCENCIA]
      : NIVELES_DOCENCIA.filter((nivel) => permissions.has(TERRITORIAL_NIVEL_REVIEW_PERMISSION[nivel]));

    return {
      isSuperUser,
      approvesAll,
      permissions,
      allowedComponents,
      approvalLevels,
      reviewsAll,
      allowedReviewSubsecciones,
      allowedNivelesTerritorialAprobar,
      allowedNivelesTerritorialRevisar,
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
    if (componente === 'academica_territorial') {
      return `${TERRITORIAL_NIVEL_APPROVE_PERMISSION.pregrado} o ${TERRITORIAL_NIVEL_APPROVE_PERMISSION.posgrado}`;
    }
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
   * Asignacion vigente de Personas, incluyendo equivalencias Sede/CETAP.
   * Una asignacion vacia es valida; un fallo al consultarla nunca amplia acceso.
   */
  async resolvePersonalScopeForUser(userId: string): Promise<{ territorialIds: string[]; cetapIds: string[] }> {
    try {
      const rows = await this.dataSource.query(
        `SELECT COALESCE(p.id_seccional, s.id_seccional)::text AS id_seccional,
                p.id_sede::text AS id_sede, s.cod_sede::text AS codigo_sede,
                s.nom_sede AS nombre_sede, c.id::text AS id_cetap,
                c.codigo AS codigo_cetap, c.nombre AS nombre_cetap
           FROM auth."user" u
           INNER JOIN auth.personas p ON p.id_person = u.id_person
           LEFT JOIN auth.sedes s ON s.id_sede = p.id_sede
           LEFT JOIN auth.sede_cetap_mapping m ON m.id_sede = s.id_sede
           LEFT JOIN academic_work_plan.cetap c ON c.id = m.id_cetap
          WHERE u.id_user::text = $1 AND COALESCE(u.is_active, true) = true`,
        [userId],
      );
      if (!rows.length) throw new Error('Cuenta sin persona vinculada');
      const values = (keys: string[]): string[] => [...new Set<string>(rows.flatMap(row =>
        keys.map(key => row[key] == null ? '' : String(row[key]).trim()).filter(Boolean),
      ))];
      return {
        territorialIds: values(['id_seccional']),
        cetapIds: values(['id_sede', 'codigo_sede', 'nombre_sede', 'id_cetap', 'codigo_cetap', 'nombre_cetap']),
      };
    } catch (error: any) {
      this.logger.error(`No se pudo resolver el alcance de Personas del usuario ${userId}: ${error?.message}`);
      throw new ForbiddenException('No fue posible verificar su territorial y sede en Personas. Intente nuevamente.');
    }
  }

  /** Permiso granular asociado a una subsección de revisión (para mensajes de error). */
  reviewPermissionForSubseccion(componente: string, subseccion: string): string | undefined {
    return reviewPermissionFor(componente, subseccion);
  }
}

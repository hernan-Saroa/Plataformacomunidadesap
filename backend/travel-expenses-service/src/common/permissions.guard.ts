import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';

const SUPER_ADMIN_ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'ADMINISTRATIVO',
  'Super Administrador',
  'SUPER_ADMINISTRADOR',
  'super_administrador',
  'SUPERUSER',
  'superuser',
];

const ROLE_PERMISSIONS_FALLBACK: Record<string, string[]> = {
  ENLACE_DEPENDENCIA: [
    'travel_expenses:create_request',
    'travel_expenses:view_own_requests',
    'travel_expenses:read_my_requests',
  ],
  ROL_ENLACE_DEPENDENCIA: [
    'travel_expenses:create_request',
    'travel_expenses:view_own_requests',
    'travel_expenses:read_my_requests',
  ],
  ENLACE: [
    'travel_expenses:create_request',
    'travel_expenses:view_own_requests',
    'travel_expenses:read_my_requests',
  ],
  ROL_ENLACE: [
    'travel_expenses:create_request',
    'travel_expenses:view_own_requests',
    'travel_expenses:read_my_requests',
  ],
  ENLACE_DE_DEPENDENCIA: [
    'travel_expenses:create_request',
    'travel_expenses:view_own_requests',
    'travel_expenses:read_my_requests',
  ],
  CONTROL_VIATICOS: [
    'travel_expenses:read_siif_requested',
    'travel_expenses:double_check_request',
    'travel_expenses:return_to_analyst',
  ],
  ROL_CONTROL_VIATICOS: [
    'travel_expenses:read_siif_requested',
    'travel_expenses:double_check_request',
    'travel_expenses:return_to_analyst',
  ],
  ANALISTA: [
    'travel_expenses:read_assigned',
    'travel_expenses:view_assigned_requests',
    'travel_expenses:verify_request',
    'travel_expenses:export_siif',
    'travel_expenses:return_assigned',
    'travel_expenses:send_to_budget',
  ],
  ROL_ANALISTA: [
    'travel_expenses:read_assigned',
    'travel_expenses:view_assigned_requests',
    'travel_expenses:verify_request',
    'travel_expenses:export_siif',
    'travel_expenses:return_assigned',
    'travel_expenses:send_to_budget',
  ],
  ANALISTA_VIATICOS: [
    'travel_expenses:read_assigned',
    'travel_expenses:view_assigned_requests',
    'travel_expenses:verify_request',
    'travel_expenses:export_siif',
    'travel_expenses:return_assigned',
    'travel_expenses:send_to_budget',
  ],
  SECRETARIO: [
    'travel_expenses:read_inbox',
    'travel_expenses:set_priority',
    'travel_expenses:return_request',
    'travel_expenses:assign_analyst',
  ],
  SECRETARIO_VIATICOS: [
    'travel_expenses:read_inbox',
    'travel_expenses:set_priority',
    'travel_expenses:return_request',
    'travel_expenses:assign_analyst',
  ],
  SOLICITANTE: [
    'travel_expenses:create_request',
    'travel_expenses:read_my_requests',
  ],
  PRESUPUESTO: [
    'travel_expenses:read_authorized',
    'travel_expenses:read_budget',
    'travel_expenses:issue_rp',
    'travel_expenses:register_rp',
  ],
  GRUPO_PRESUPUESTO: [
    'travel_expenses:read_authorized',
    'travel_expenses:read_budget',
    'travel_expenses:issue_rp',
    'travel_expenses:register_rp',
  ],
  SUBDIRECCION_GESTION_CORPORATIVA: [
    'travel_expenses:authorize_expense',
    'travel_expenses:read_authorizations',
    'travel_expenses:return_authorization',
  ],
  ROL_SUBDIRECCION_GESTION_CORPORATIVA: [
    'travel_expenses:authorize_expense',
    'travel_expenses:read_authorizations',
    'travel_expenses:return_authorization',
  ],
  DIRECCION_NACIONAL: [
    'travel_expenses:authorize_extemporaneous',
    'travel_expenses:read_extemporaneous_authorizations',
    'travel_expenses:reject_extemporaneous',
  ],
  ROL_DIRECCION_NACIONAL: [
    'travel_expenses:authorize_extemporaneous',
    'travel_expenses:read_extemporaneous_authorizations',
    'travel_expenses:reject_extemporaneous',
  ],
  RESPONSABLE_TIQUETES: [
    'travel_expenses:create_request',
    'travel_expenses:manage_tickets',
  ],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'No tiene permisos para acceder a este recurso.',
      );
    }

    const userRoles = this.extractRoles(user);
    const isSuperAdmin = userRoles.some((role) => {
      if (typeof role !== 'string') return false;
      const normalized = role.toUpperCase().replace(/\s+/g, '_');
      return (
        SUPER_ADMIN_ROLES.includes(normalized) ||
        SUPER_ADMIN_ROLES.includes(role.toUpperCase())
      );
    });

    if (isSuperAdmin) {
      return true;
    }

    const rawPermissions = Array.isArray(user.permissions)
      ? user.permissions
      : [];
    const userPermissions = new Set<string>(
      rawPermissions.map((p: any) =>
        typeof p === 'string' ? p : p?.code || '',
      ),
    );

    // Fallback: incluir permisos asociados a los roles reconocidos
    userRoles.forEach((role) => {
      const normalized = (
        typeof role === 'string' ? role : (role as any)?.code || ''
      )
        .toUpperCase()
        .replace(/\s+/g, '_');
      const fallbackPerms = ROLE_PERMISSIONS_FALLBACK[normalized];
      if (fallbackPerms) {
        fallbackPerms.forEach((p) => userPermissions.add(p));
      }
    });

    if (
      userPermissions.has('*') ||
      userPermissions.has('travel_expenses:*')
    ) {
      return true;
    }

    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.has(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'No tiene permisos para acceder a este recurso.',
      );
    }

    return true;
  }

  private extractRoles(user: any): string[] {
    const roles: string[] = [];

    if (Array.isArray(user.roles)) {
      user.roles.forEach((role: any) => {
        if (typeof role === 'string') {
          roles.push(role);
        } else if (role?.code) {
          roles.push(role.code);
        } else if (role?.name) {
          roles.push(role.name);
        }
      });
    }

    if (user.role) {
      if (typeof user.role === 'string') {
        roles.push(user.role);
      } else if (user.role?.code) {
        roles.push(user.role.code);
      }
    }

    return roles;
  }
}

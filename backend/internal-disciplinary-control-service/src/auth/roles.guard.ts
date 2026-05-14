import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { DISCIPLINARY_MODULE_ACCESS } from './authorization.constants';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ROLES_KEY } from './roles.decorator';

const LEGACY_DISCIPLINARY_ROLES = new Set([
  'CONTROL_DISCIPLINARIO',
  'RADICADOR_DISCIPLINARIO',
  'SECRETARIO_DISCIPLINARIO',
  'SECRETARIA_RADICADOR',
  'OPERADOR_DISCIPLINARIO',
  'ABOGADO_DISCIPLINARIO',
  'JEFE_OCID',
  'JEFE_DE_LA_OCID',
  'PROFESIONAL_SUSTANCIADOR',
  'PROFESIONAL_ASIGNADO',
  'PROFESIONAL',

]);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { roles?: unknown[] } }>();
    const userRoles = extractNormalizedRoles(request.user?.roles);

    if (userRoles.has('SUPER_ADMIN')) {
      return true;
    }

    const hasRequiredRole = requiredRoles.some((requiredRole) =>
      this.matchesRequiredRole(requiredRole, userRoles),
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        'No tiene permisos para acceder a este recurso.',
      );
    }

    return true;
  }

  private matchesRequiredRole(
    requiredRole: string,
    userRoles: Set<string>,
  ): boolean {
    const normalizedRequiredRole = normalizeRoleCode(requiredRole);

    if (normalizedRequiredRole === DISCIPLINARY_MODULE_ACCESS) {
      return hasDisciplinaryAccess(userRoles);
    }

    return userRoles.has(normalizedRequiredRole);
  }
}

function hasDisciplinaryAccess(userRoles: Set<string>): boolean {
  return Array.from(userRoles).some((role) => {
    if (LEGACY_DISCIPLINARY_ROLES.has(role)) {
      return true;
    }

    return role.includes('DISCIPLINARIO') || role.includes('OCID') || role.includes('SECRETARIA') || role.includes('RADICADOR') || role.includes('PROFESIONAL');
  });
}

function extractNormalizedRoles(roles: unknown[] | undefined): Set<string> {
  const normalizedRoles = new Set<string>();

  for (const role of roles ?? []) {
    if (typeof role === 'string') {
      normalizedRoles.add(normalizeRoleCode(role));
      continue;
    }

    if (role && typeof role === 'object') {
      const roleLike = role as { code?: string; name?: string };
      if (roleLike.code) {
        normalizedRoles.add(normalizeRoleCode(roleLike.code));
      }
      if (roleLike.name) {
        normalizedRoles.add(normalizeRoleCode(roleLike.name));
      }
    }
  }

  return normalizedRoles;
}

function normalizeRoleCode(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

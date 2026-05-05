import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<
        Request & { user?: { roles?: unknown[]; internalService?: boolean } }
      >();

    if (request.user?.internalService) {
      return true;
    }

    const userRoles = extractNormalizedRoles(request.user?.roles);

    if (userRoles.has('SUPER_ADMIN')) {
      return true;
    }

    const hasRequiredRole = requiredRoles
      .map(normalizeRoleCode)
      .some((role) => userRoles.has(role));

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        'No tiene permisos para acceder a este recurso.',
      );
    }

    return true;
  }
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

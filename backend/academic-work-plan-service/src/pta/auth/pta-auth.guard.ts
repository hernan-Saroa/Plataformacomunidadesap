import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PtaPermissionsService, PtaAuthContext } from './pta-permissions.service';

export interface PtaAuthenticatedUser extends PtaAuthContext {
  userId: string | null;
  name: string | null;
  email: string | null;
  roles: string[];
}

declare module 'express' {
  interface Request {
    ptaAuth?: PtaAuthenticatedUser;
  }
}

/**
 * Guard de autorización PTA.
 *
 * El PtaController está marcado @Public() (muchos endpoints de solo lectura y
 * stubs), por lo que el JwtAuthGuard global no puebla req.user. Este guard, aplicado
 * SÓLO en los endpoints sensibles (aprobación de componentes), verifica el token por
 * su cuenta, resuelve los permisos reales del usuario desde auth.role_permissions y
 * los deja en req.ptaAuth para que el servicio autorice server-side.
 */
@Injectable()
export class PtaAuthGuard implements CanActivate {
  private readonly logger = new Logger(PtaAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly ptaPermissions: PtaPermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);

    if (!token) {
      throw new UnauthorizedException('Autenticación requerida para esta acción del PTA.');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'esap-super-secret-jwt-key-2024',
      });
    } catch (error: any) {
      this.logger.warn(`Token PTA inválido/expirado: ${error?.message}`);
      throw new UnauthorizedException('Sesión inválida o expirada.');
    }

    const roles = Array.isArray(payload?.roles) ? payload.roles : [];
    const ctx = await this.ptaPermissions.resolveForRoles(roles);

    req.ptaAuth = {
      userId: payload?.sub ? String(payload.sub) : null,
      name: payload?.name ? String(payload.name) : null,
      email: payload?.email ? String(payload.email) : null,
      roles: roles.map((r: unknown) => String(r || '')).filter(Boolean),
      ...ctx,
    };

    return true;
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.headers?.authorization;
    if (authHeader && /^Bearer\s+/i.test(authHeader)) {
      return authHeader.replace(/^Bearer\s+/i, '').trim() || null;
    }

    const cookieHeader = req.headers?.cookie;
    if (cookieHeader) {
      for (const part of cookieHeader.split(';')) {
        const [key, ...rest] = part.trim().split('=');
        if (key.trim() === 'esap_access_token') {
          return rest.join('=').trim() || null;
        }
      }
    }

    return null;
  }
}

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PermissionsService } from './permissions.service';

const fromProxyTokenHeader = (req: Request): string | null => {
  const header =
    req?.headers?.['x-access-token'] || req?.headers?.['x-auth-token'];
  const token = Array.isArray(header) ? header[0] : header;

  if (!token || typeof token !== 'string') {
    return null;
  }

  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  return /^bearer\s+/i.test(trimmed)
    ? trimmed.replace(/^bearer\s+/i, '').trim()
    : trimmed;
};

const fromHttpOnlyCookie = (req: Request): string | null => {
  const cookieHeader = req?.headers?.cookie;
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key.trim() === 'esap_access_token') {
      return rest.join('=').trim() || null;
    }
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly permissionsService: PermissionsService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        fromProxyTokenHeader,
        fromHttpOnlyCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'esap-super-secret-jwt-key-2024',
    });
  }

  async validate(payload: any) {
    const roles = getRoleCodes(payload.roles);

    return {
      userId: payload.sub,
      username: payload.username,
      roles,
      permissions: await this.permissionsService.getPermissionCodesByRoles(roles),
      email: payload.email,
    };
  }
}

const getRoleCodes = (roles: unknown): string[] =>
  Array.isArray(roles)
    ? roles
        .map((role) => {
          if (typeof role === 'string') {
            return role;
          }

          if (role && typeof role === 'object') {
            return (role as { code?: unknown }).code;
          }

          return undefined;
        })
        .filter((role): role is string => typeof role === 'string' && Boolean(role.trim()))
    : [];

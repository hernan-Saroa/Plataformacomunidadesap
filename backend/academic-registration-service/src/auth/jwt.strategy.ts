import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

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

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        fromProxyTokenHeader,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'esap-super-secret-jwt-key-2024',
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      username: payload.username,
      roles: payload.roles,
      permissions: payload.permissions,
      email: payload.email,
    };
  }
}

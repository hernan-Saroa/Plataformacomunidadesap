import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

const fromHttpOnlyCookie = (req: Request): string | null => {
  const cookieHeader = req?.headers?.cookie;
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key.trim() === 'esap_access_token') {
      const value = rest.join('=').trim();
      if (!value) return null;

      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        fromHttpOnlyCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'esap-super-secret-jwt-key-2024',
    });
  }

  async validate(payload: any) {
    let roles = payload.roles;

    if (Array.isArray(roles) && roles.length > 0 && typeof roles[0] === 'object' && roles[0].code) {
      roles = roles.map(r => r.code);
    }

    return {
      userId: payload.sub,
      username: payload.username,
      roles: roles || [],
      role: roles && roles[0] ? roles[0] : payload.role,
      email: payload.email,
    };
  }
}

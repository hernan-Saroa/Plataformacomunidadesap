import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { requireInProduction } from '../common/require-env';

// Sesión web: además del Bearer, acepta la cookie httpOnly esap_access_token.
const fromHttpOnlyCookie = (req: Request): string | null => {
  const cookieHeader = req?.headers?.cookie;
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key.trim() === 'esap_access_token') return rest.join('=').trim() || null;
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken(), fromHttpOnlyCookie]),
      ignoreExpiration: false,
      secretOrKey: requireInProduction('JWT_SECRET', configService.get<string>('JWT_SECRET'), 'esap-super-secret-jwt-key-2024'),
    });
  }

  async validate(payload: any) {
    return {
      // `userId`/`username` los exigen banco-docentes y macro-docente.
      userId: payload.sub || payload.id,
      username: payload.username,
      id: payload.sub || payload.id,
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      ...payload,
    };
  }
}

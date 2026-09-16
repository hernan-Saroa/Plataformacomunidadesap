import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

/**
 * Validación del token — espejo de la estrategia del PTA (jwt.strategy.ts).
 *
 * Se replica en vez de inventar otra: el token lo emite el mismo auth-service y
 * llega por Authorization o por la cookie HttpOnly, según por dónde entre la
 * petición.
 */
const desdeCookieHttpOnly = (req: Request): string | null => {
  const cookies = req?.headers?.cookie;
  if (!cookies) return null;
  for (const parte of cookies.split(';')) {
    const [clave, ...resto] = parte.trim().split('=');
    if (clave.trim() === 'esap_access_token') {
      return resto.join('=').trim() || null;
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
        desdeCookieHttpOnly,
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
      email: payload.email,
    };
  }
}

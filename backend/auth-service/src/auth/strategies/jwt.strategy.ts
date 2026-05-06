import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

const AUTH_COOKIE_NAME = 'esap_access_token';

const extractJwtFromCookie = (request: Request): string | null => {
  const rawCookieHeader = request?.headers?.cookie;

  if (!rawCookieHeader) {
    return null;
  }

  const cookie = rawCookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`));

  if (!cookie) {
    return null;
  }

  const [, ...valueParts] = cookie.split('=');
  const value = valueParts.join('=');

  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        extractJwtFromCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'esap-super-secret-jwt-key-2024',
    });
  }

  async validate(payload: any) {
    // Lo que retornes aquí se inyecta como req.user
    return {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      name: payload.name,
      roles: payload.roles,
      permissions: payload.permissions,
    };
  }
}

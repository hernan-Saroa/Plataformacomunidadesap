import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

const fromProxyTokenHeader = (req: Request): string | null => {
  const header = req?.headers?.['x-access-token'] || req?.headers?.['x-auth-token'];
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

// Extrae JWT del cookie HttpOnly 'esap_access_token' (OTIC-001)
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
  constructor() {
    super({
      jwtFromRequest: (req) => {
        const token = ExtractJwt.fromExtractors([
          ExtractJwt.fromAuthHeaderAsBearerToken(),
          fromProxyTokenHeader,
          fromHttpOnlyCookie,
        ])(req);
        const secret = process.env.JWT_SECRET || 'esap-super-secret-jwt-key-2024';
        const fs = require('fs');
        try { fs.appendFileSync('C:\\\\Users\\\\Hernan_Buitrago\\\\.gemini\\\\antigravity-ide\\\\brain\\\\883b3a72-b726-4e69-988f-a5e16cb54cd3\\\\scratch\\\\gateway-jwt-error.log', `[Strategy] Token: ${token}\n[Strategy] Secret: ${secret}\n`); } catch(e) {}
        return token;
      },
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'esap-super-secret-jwt-key-2024',
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      name: payload.name,
      roles: payload.roles,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

/**
 * El shell guarda el token en una cookie httpOnly; las llamadas de servicio a
 * servicio usan el header Authorization. Se aceptan ambos.
 */
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
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        fromHttpOnlyCookie,
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
      /**
       * Los permisos del token, cuando vengan.
       *
       * auth-service los calcula al iniciar sesión pero arma el JWT solo con
       * los roles, así que hoy esto llega vacío y `permisosDelUsuario` cae al
       * mapa de respaldo. Se propaga igual: sin esta línea, el día que el
       * payload los incluya se seguirían perdiendo aquí y el módulo nunca
       * pasaría a usarlos.
       */
      permissions: payload.permissions,
    };
  }
}

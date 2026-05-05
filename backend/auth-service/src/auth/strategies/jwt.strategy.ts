import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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

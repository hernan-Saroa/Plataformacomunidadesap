import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-esap',
    });
  }

  async validate(payload: any) {
    // Extraer códigos de roles si vienen como objetos con 'code'
    let roles = payload.roles;
    
    if (Array.isArray(roles) && roles.length > 0 && typeof roles[0] === 'object' && roles[0].code) {
      roles = roles.map(r => r.code);
    }

    const user = {
      userId: payload.sub,
      username: payload.username,
      roles: roles || [],
      role: roles && roles[0] ? roles[0] : payload.role,
      email: payload.email,
    };
    
    return user;
  }
}


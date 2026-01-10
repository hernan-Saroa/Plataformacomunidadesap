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
    console.log('🔐 JwtStrategy initialized with secret:', process.env.JWT_SECRET ? 'CONFIGURED' : 'USING DEFAULT');
  }

  async validate(payload: any) {
    console.log('🔍 [JWT Strategy] Validating token payload:', JSON.stringify(payload, null, 2));
    
    // Extraer códigos de roles si vienen como objetos con 'code'
    let roles = payload.roles;
    console.log('🔍 [JWT Strategy] Original roles:', roles);
    
    if (Array.isArray(roles) && roles.length > 0 && typeof roles[0] === 'object' && roles[0].code) {
      roles = roles.map(r => r.code);
      console.log('🔍 [JWT Strategy] Extracted role codes:', roles);
    }

    const user = {
      userId: payload.sub,
      username: payload.username,
      roles: roles || [],
      role: roles && roles[0] ? roles[0] : payload.role,
      email: payload.email,
    };
    
    console.log('✅ [JWT Strategy] User validated:', JSON.stringify(user, null, 2));
    return user;
  }
}


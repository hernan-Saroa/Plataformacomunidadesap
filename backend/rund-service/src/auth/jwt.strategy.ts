import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'esap-super-secret-jwt-key-2024'),
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub || payload.id,
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      ...payload,
    };
  }
}

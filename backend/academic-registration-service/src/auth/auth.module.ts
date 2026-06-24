import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'esap-super-secret-jwt-key-2024',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [JwtStrategy, PermissionsService],
  exports: [PassportModule, JwtModule],
})
export class AuthModule {}

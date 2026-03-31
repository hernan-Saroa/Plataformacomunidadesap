import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { PermissionsService } from './services/permissions.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'esap-super-secret-jwt-key-2024',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard, PermissionsGuard, PermissionsService],
  exports: [PassportModule, JwtModule, JwtAuthGuard, PermissionsGuard, PermissionsService],
})
export class AuthModule {}



import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { LaborCertificatePermissionsService } from './labor-certificate-permissions.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'esap-super-secret-jwt-key-2024',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [JwtStrategy, LaborCertificatePermissionsService],
  exports: [PassportModule, JwtModule, LaborCertificatePermissionsService],
})
export class AuthModule {}

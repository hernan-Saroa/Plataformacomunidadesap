import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { AlcanceService } from './alcance.service';
import { PermisosService } from './permisos.service';

/**
 * Global para que `PermisosGuard` y `PuedeGuard` encuentren sus services sin que los
 * treinta y tantos módulos de negocio tengan que importar AuthModule solo para
 * poder proteger sus endpoints.
 */
@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'esap-super-secret-jwt-key-2024',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [JwtStrategy, PermisosService, AlcanceService],
  exports: [PassportModule, JwtModule, PermisosService, AlcanceService],
})
export class AuthModule {}

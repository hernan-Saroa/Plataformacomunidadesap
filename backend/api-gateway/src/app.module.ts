import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { GatewayModule } from './gateway/gateway.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { IS_PUBLIC_KEY } from './auth/public.decorator';

@Module({
  imports: [GatewayModule, AuditModule, AuthModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

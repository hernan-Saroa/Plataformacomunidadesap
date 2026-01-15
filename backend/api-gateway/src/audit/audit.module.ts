import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuditClientService } from './audit-client.service';
import { AuditInterceptor } from './audit.interceptor';

@Module({
  imports: [
    HttpModule.register({
      timeout: 500,
      maxRedirects: 0,
    }),
  ],
  providers: [AuditClientService, AuditInterceptor],
  exports: [AuditClientService, AuditInterceptor],
})
export class AuditModule {}



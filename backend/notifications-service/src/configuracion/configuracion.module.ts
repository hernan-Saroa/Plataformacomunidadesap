import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmailsModule } from '../emails/emails.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CompuertaModule } from './compuerta.module';
import { ConfiguracionController } from './configuracion.controller';
import { ConfiguracionService } from './configuracion.service';

/** Consola de configuración de notificaciones por módulo (EFDS-2406). */
@Module({
  imports: [CompuertaModule, AuthModule, NotificationsModule, EmailsModule],
  controllers: [ConfiguracionController],
  providers: [ConfiguracionService],
})
export class ConfiguracionModule {}

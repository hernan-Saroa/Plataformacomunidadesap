import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { CompuertaModule } from '../configuracion/compuerta.module';
import { EmailsModule } from '../emails/emails.module';
@Module({
  imports: [TypeOrmModule.forFeature([Notification]), CompuertaModule, EmailsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

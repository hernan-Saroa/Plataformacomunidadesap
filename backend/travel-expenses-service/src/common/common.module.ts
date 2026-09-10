import { Module } from '@nestjs/common';
import { NotificationClientService } from './notification-client.service';

@Module({
  providers: [NotificationClientService],
  exports: [NotificationClientService],
})
export class CommonModule {}

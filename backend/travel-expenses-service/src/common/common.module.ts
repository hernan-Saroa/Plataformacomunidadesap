import { Module } from '@nestjs/common';
import { NotificationClientService } from './notification-client.service';
import { HumanResourcesClientService } from './human-resources-client.service';

@Module({
  providers: [NotificationClientService, HumanResourcesClientService],
  exports: [NotificationClientService, HumanResourcesClientService],
})
export class CommonModule {}


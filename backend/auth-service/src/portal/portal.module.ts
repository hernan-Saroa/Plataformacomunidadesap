import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { Person } from '../users/person.entity';
import { User } from '../users/user.entity';
import { CarpetaDigitalModule } from '../carpeta-digital/carpeta-digital.module';

@Module({
  imports: [TypeOrmModule.forFeature([Person, User]), CarpetaDigitalModule],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KlicService, KLIC_SQL } from './klic.service';
import { KlicController } from './klic.controller';

@Module({
  imports: [ConfigModule],
  controllers: [KlicController],
  providers: [
    KlicService,
    {
      provide: KLIC_SQL,
      useFactory: () => require('mssql'),
    },
  ],
  exports: [KlicService],
})
export class KlicModule {}

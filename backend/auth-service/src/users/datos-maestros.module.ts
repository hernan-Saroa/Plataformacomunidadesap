import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatosMaestrosService } from './datos-maestros.service';
import { DatosMaestrosController } from './datos-maestros.controller';

@Module({
  imports: [],
  controllers: [DatosMaestrosController],
  providers: [DatosMaestrosService],
  exports: [DatosMaestrosService],
})
export class DatosMaestrosModule {}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatosMaestrosService } from './datos-maestros.service';
import { DatosMaestrosController } from './datos-maestros.controller';
import { Seccional } from './seccional.entity';
import { Sede } from './sede.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Seccional, Sede])],
  controllers: [DatosMaestrosController],
  providers: [DatosMaestrosService],
  exports: [DatosMaestrosService],
})
export class DatosMaestrosModule {}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrdConfiguracion } from './trd-configuracion.entity';
import { TrdSerieSubserie } from './trd-serie-subserie.entity';
import { TrdService } from './trd.service';
import { TrdController } from './trd.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TrdConfiguracion, TrdSerieSubserie])],
  controllers: [TrdController],
  providers: [TrdService],
  exports: [TrdService],
})
export class TrdModule {}

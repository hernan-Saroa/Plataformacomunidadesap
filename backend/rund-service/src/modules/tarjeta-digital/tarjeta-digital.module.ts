import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TarjetaRundLogEntity } from '../../entities/tarjeta-rund-log.entity';
import { DocenteEntity } from '../../entities/docente.entity';
import { TarjetaDigitalService } from './tarjeta-digital.service';
import { TarjetaDigitalController } from './tarjeta-digital.controller';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TarjetaRundLogEntity, DocenteEntity]),
    AuthModule,
  ],
  controllers: [TarjetaDigitalController],
  providers: [TarjetaDigitalService],
  exports: [TarjetaDigitalService],
})
export class TarjetaDigitalModule {}

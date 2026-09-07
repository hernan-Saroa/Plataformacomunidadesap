import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UmbralesController } from './umbrales.controller';
import { UmbralesService } from './umbrales.service';

import { UmbralModalidad } from '../../entities/umbral-modalidad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Smmlv } from '../../entities/smmlv.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UmbralModalidad, Modalidad, Smmlv])],
  controllers: [UmbralesController],
  providers: [UmbralesService],
  // Lo consumirá la regla de sugerencia de modalidad (EFDS-1325).
  exports: [UmbralesService],
})
export class UmbralesModule {}

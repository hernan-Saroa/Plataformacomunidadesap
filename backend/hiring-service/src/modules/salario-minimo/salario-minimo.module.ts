import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SalarioMinimoController } from './salario-minimo.controller';
import { SalarioMinimoService } from './salario-minimo.service';
import { Smmlv } from '../../entities/smmlv.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Smmlv])],
  controllers: [SalarioMinimoController],
  providers: [SalarioMinimoService],
})
export class SalarioMinimoModule {}

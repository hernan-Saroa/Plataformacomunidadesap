import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ENTIDADES_PAA } from '../../entities/paa.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { PaaController } from './paa.controller';
import { PaaAdminService } from './paa-admin.service';
import { PaaCamposService } from './paa-campos.service';
import { PaaLineasService } from './paa-lineas.service';

@Module({
  imports: [TypeOrmModule.forFeature([...ENTIDADES_PAA, Trazabilidad])],
  controllers: [PaaController],
  providers: [PaaAdminService, PaaCamposService, PaaLineasService],
  exports: [PaaAdminService, PaaCamposService],
})
export class PaaModule {}

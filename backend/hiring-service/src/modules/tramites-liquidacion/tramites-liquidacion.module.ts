import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ENTIDADES_TRAMITE_LIQUIDACION } from '../../entities/tramite-liquidacion.entity';
import { CierreDefinitivoModule } from '../cierre-definitivo/cierre-definitivo.module';
import { LiquidacionModule } from '../liquidacion/liquidacion.module';
import { TramitesLiquidacionController } from './tramites-liquidacion.controller';
import { TramitesLiquidacionService } from './tramites-liquidacion.service';

/** La liquidación y el cierre del contrato como trámite, dentro del proceso (151). */
@Module({
  imports: [TypeOrmModule.forFeature(ENTIDADES_TRAMITE_LIQUIDACION), LiquidacionModule, CierreDefinitivoModule],
  controllers: [TramitesLiquidacionController],
  providers: [TramitesLiquidacionService],
})
export class TramitesLiquidacionModule {}

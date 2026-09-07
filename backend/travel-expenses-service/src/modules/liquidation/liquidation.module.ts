import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiquidationController } from './liquidation.controller';
import { LiquidationService } from './liquidation.service';
import { LiquidationConfigController } from './liquidation-config.controller';
import { LiquidationConfigService } from './liquidation-config.service';
import { EscalaViaticoEntity } from '../../entities/liquidation/escala-viatico.entity';
import { TarifaInvestigadorEntity } from '../../entities/liquidation/tarifa-investigador.entity';
import { TarifaRegionalExcepcionEntity } from '../../entities/liquidation/tarifa-regional-excepcion.entity';
import { LiquidationParamEntity } from '../../entities/liquidation/liquidation-param.entity';

/**
 * Módulo de autoliquidación de viáticos.
 * Agrupa entidades, DTOs, servicio y controlador para el cálculo de viáticos
 * según Decreto 314 de 2026.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      EscalaViaticoEntity,
      TarifaInvestigadorEntity,
      TarifaRegionalExcepcionEntity,
      LiquidationParamEntity,
    ]),
  ],
  controllers: [LiquidationController, LiquidationConfigController],
  providers: [LiquidationService, LiquidationConfigService],
  exports: [LiquidationService, LiquidationConfigService],
})
export class LiquidationModule {}

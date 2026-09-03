import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { SaldoTiqueteEntity } from '../../entities/tickets/saldo-tiquete.entity';
import { RutaRestringidaEntity } from '../../entities/tickets/ruta-restringida.entity';
import { ExcepcionTiqueteEntity } from '../../entities/tickets/excepcion-tiquete.entity';
import { LiquidationParamEntity } from '../../entities/liquidation/liquidation-param.entity';

/**
 * Módulo de gestión de tiquetes con restricciones y saldo presupuestal
 * (RF-LIQ-003 / RF-LIQ-004).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SaldoTiqueteEntity,
      RutaRestringidaEntity,
      ExcepcionTiqueteEntity,
      LiquidationParamEntity,
    ]),
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CierreFinancieroService } from './cierre-financiero.service';
import { CierreFinancieroController } from './cierre-financiero.controller';

import { CierreFinanciero } from '../../entities/cierre-financiero.entity';
import { RegistroPresupuestal } from '../../entities/registro-presupuestal.entity';
import { ActaLiquidacion } from '../../entities/acta-liquidacion.entity';
import { PagoContrato } from '../../entities/pago-contrato.entity';
import { Contrato } from '../../entities/contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CierreFinanciero,
      RegistroPresupuestal,
      ActaLiquidacion,
      PagoContrato,
      Contrato,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
  ],
  controllers: [CierreFinancieroController],
  providers: [CierreFinancieroService],
  // El cierre definitivo (EFDS-1175) preguntará aquí: no se archiva un
  // expediente cuyo contrato sigue con saldo sin liberar.
  exports: [CierreFinancieroService],
})
export class CierreFinancieroModule {}

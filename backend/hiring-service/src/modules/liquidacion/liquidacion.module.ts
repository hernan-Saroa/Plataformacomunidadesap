import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LiquidacionService } from './liquidacion.service';

import { ActaLiquidacion } from '../../entities/acta-liquidacion.entity';
import { InformeFinal } from '../../entities/informe-final.entity';
import { PagoContrato } from '../../entities/pago-contrato.entity';
import { ActaInicio } from '../../entities/acta-inicio.entity';
import { Contrato } from '../../entities/contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActaLiquidacion,
      InformeFinal,
      PagoContrato,
      ActaInicio,
      Contrato,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
  ],
  providers: [LiquidacionService],
  // El cierre definitivo (EFDS-1175) preguntará aquí: no se archiva un
  // expediente cuyo contrato sigue sin liquidar.
  exports: [LiquidacionService],
})
export class LiquidacionModule {}

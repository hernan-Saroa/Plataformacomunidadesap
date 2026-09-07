import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InformeFinalService } from './informe-final.service';
import { InformeFinalController } from './informe-final.controller';

import { EntregableInforme, InformeFinal } from '../../entities/informe-final.entity';
import { PagoContrato } from '../../entities/pago-contrato.entity';
import { ActaInicio } from '../../entities/acta-inicio.entity';
import { Contrato } from '../../entities/contrato.entity';
import { SupervisionContrato } from '../../entities/supervision-contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InformeFinal,
      EntregableInforme,
      PagoContrato,
      ActaInicio,
      Contrato,
      SupervisionContrato,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
  ],
  controllers: [InformeFinalController],
  providers: [InformeFinalService],
  // La liquidación (EFDS-1172) preguntará aquí por el informe: no se liquida un
  // contrato sin el que dice cómo se ejecutó.
  exports: [InformeFinalService],
})
export class InformeFinalModule {}

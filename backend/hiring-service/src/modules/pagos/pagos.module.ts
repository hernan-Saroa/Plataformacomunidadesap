import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PagosService } from './pagos.service';
import { PagosController } from './pagos.controller';

import { PagoContrato, SoportePago } from '../../entities/pago-contrato.entity';
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
      PagoContrato,
      SoportePago,
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
  controllers: [PagosController],
  providers: [PagosService],
  // La liquidación (EFDS-1172) preguntará aquí cuánto se pagó de verdad.
  exports: [PagosService],
})
export class PagosModule {}

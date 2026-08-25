import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActaInicioService } from './acta-inicio.service';
import { ActaInicioController } from './acta-inicio.controller';

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
  controllers: [ActaInicioController],
  providers: [ActaInicioService],
  // El trámite de pagos (EFDS-1170) preguntará aquí desde cuándo corre la
  // ejecución: no hay factura anterior al inicio.
  exports: [ActaInicioService],
})
export class ActaInicioModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActaInicioService } from './acta-inicio.service';
import { ActaInicioController } from './acta-inicio.controller';

import { Contrato } from '../../entities/contrato.entity';
import { ActaInicio } from '../../entities/acta-inicio.entity';
import { SupervisionContrato } from '../../entities/supervision-contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contrato,
      ActaInicio,
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
  // El seguimiento (EFDS-1168) y la reasignación (EFDS-1169) preguntarán aquí
  // si el contrato ya arrancó: las dos ocurren durante la ejecución.
  exports: [ActaInicioService],
})
export class ActaInicioModule {}

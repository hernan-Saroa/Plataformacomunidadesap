import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SupervisionService } from './supervision.service';
import { SupervisionController } from './supervision.controller';

import { Contrato } from '../../entities/contrato.entity';
import { SupervisionContrato } from '../../entities/supervision-contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { CierreActividadModule } from '../cierre-actividad/cierre-actividad.module';
import { ParticipacionModule } from '../participacion/participacion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contrato,
      SupervisionContrato,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
    CierreActividadModule,
    // Designar ocupa el puesto que avala la 9.4 (121).
    ParticipacionModule,
  ],
  controllers: [SupervisionController],
  providers: [SupervisionService],
  // La etapa 9 (EFDS-1167 y EFDS-1168) preguntará aquí quién supervisa para
  // saber quién puede suscribir el acta de inicio y cargar los informes.
  exports: [SupervisionService],
})
export class SupervisionModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RiesgosService } from './riesgos.service';
import { RiesgosController } from './riesgos.controller';

import {
  AudienciaRiesgos,
  AudienciaRiesgosConfig,
} from '../../entities/audiencia-riesgos.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { AperturaProceso } from '../../entities/apertura-proceso.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { CierreActividadModule } from '../cierre-actividad/cierre-actividad.module';

@Module({
  imports: [
    CierreActividadModule,
    TypeOrmModule.forFeature([
      AudienciaRiesgos,
      AudienciaRiesgosConfig,
      ActividadExcluida,
      AperturaProceso,
      Modalidad,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
  ],
  controllers: [RiesgosController],
  providers: [RiesgosService],
  // Lo consume la recepción de ofertas: desde la 112 la audiencia va después de
  // la apertura, y sin la obligatoria celebrada no se cierran las ofertas.
  exports: [RiesgosService],
})
export class RiesgosModule {}

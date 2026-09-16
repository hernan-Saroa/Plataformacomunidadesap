import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RiesgosService } from './riesgos.service';
import { RiesgosController } from './riesgos.controller';

import {
  AudienciaRiesgos,
  AudienciaRiesgosConfig,
} from '../../entities/audiencia-riesgos.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AudienciaRiesgos,
      AudienciaRiesgosConfig,
      ActividadExcluida,
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
  // Lo consume la apertura (EFDS-1402): sin la audiencia obligatoria celebrada
  // el proceso no puede abrirse.
  exports: [RiesgosService],
})
export class RiesgosModule {}

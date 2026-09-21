import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CausalContratacionService } from './causal-contratacion.service';
import { CausalContratacionController } from './causal-contratacion.controller';

import { Proceso } from '../../entities/proceso.entity';
import { CausalContratacion } from '../../entities/causal-contratacion.entity';
import { ActividadSalvedad } from '../../entities/actividad.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { ParticipacionModule } from '../participacion/participacion.module';
import { CdpModule } from '../cdp/cdp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Proceso,
      CausalContratacion,
      ActividadSalvedad,
      ProcesoActividad,
      Trazabilidad,
    ]),
    // Quién la elige es el abogado repartido en la 3.3.
    ParticipacionModule,
    // Elegirla cierra la actividad, y en menor cuantía eso cierra la etapa 3:
    // la solicitud de CDP nace en ese momento.
    CdpModule,
  ],
  controllers: [CausalContratacionController],
  providers: [CausalContratacionService],
})
export class CausalContratacionModule {}

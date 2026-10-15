import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ParticipacionService } from './participacion.service';
import { CandidatosController, ParticipacionController } from './participacion.controller';

import { ParticipacionProceso } from '../../entities/participacion-proceso.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { CdpModule } from '../cdp/cdp.module';
import { CadenaAprobacionModule } from '../cadena-aprobacion/cadena-aprobacion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ParticipacionProceso, Proceso, ProcesoActividad, Trazabilidad]),
    // Tomar el proceso cierra la 3.3, y con ella puede cerrarse la etapa 3
    // entera: si es así, la solicitud de CDP nace en ese mismo acto.
    CdpModule,
    // Quién decide cada escalón por rol de la 3.1 se designa aquí (102).
    CadenaAprobacionModule,
  ],
  controllers: [ParticipacionController, CandidatosController],
  providers: [ParticipacionService],
  // El listado pregunta aquí en qué procesos está quien consulta, y la 3.4
  // preguntará quién es el abogado que puede decidir.
  exports: [ParticipacionService],
})
export class ParticipacionModule {}

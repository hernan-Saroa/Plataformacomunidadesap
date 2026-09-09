import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ParticipacionService } from './participacion.service';
import { CandidatosController, ParticipacionController } from './participacion.controller';

import { ParticipacionProceso } from '../../entities/participacion-proceso.entity';
import { Proceso } from '../../entities/proceso.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ParticipacionProceso, Proceso, Trazabilidad])],
  controllers: [ParticipacionController, CandidatosController],
  providers: [ParticipacionService],
  // El listado pregunta aquí en qué procesos está quien consulta, y la 3.4
  // preguntará quién es el abogado que puede decidir.
  exports: [ParticipacionService],
})
export class ParticipacionModule {}

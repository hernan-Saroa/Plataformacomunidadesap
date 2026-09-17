import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ComiteContratacionService } from './comite-contratacion.service';
import { ComiteContratacionController } from './comite-contratacion.controller';

import { Proceso } from '../../entities/proceso.entity';
import { Expediente } from '../../entities/expediente.entity';
import { Documento } from '../../entities/documento.entity';
import { Smmlv } from '../../entities/smmlv.entity';
import {
  SesionComiteContratacion,
  UmbralComiteContratacion,
} from '../../entities/comite-contratacion.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Revision } from '../../entities/revision.entity';
import { ParticipacionModule } from '../participacion/participacion.module';
import { CdpModule } from '../cdp/cdp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Proceso,
      Expediente,
      Documento,
      // El umbral de la directa está en SMMLV: sin el salario del año no se
      // puede comparar.
      Smmlv,
      SesionComiteContratacion,
      UmbralComiteContratacion,
      ProcesoActividad,
      Trazabilidad,
      Revision,
    ]),
    // Quién transcribe lo que decidió el comité es el abogado repartido en la 3.3.
    ParticipacionModule,
    // Aprobar cierra la 3.7, que en las modalidades que pasan por comité es la
    // última de la etapa 3: la solicitud de CDP nace ahí.
    CdpModule,
  ],
  controllers: [ComiteContratacionController],
  providers: [ComiteContratacionService],
})
export class ComiteContratacionModule {}

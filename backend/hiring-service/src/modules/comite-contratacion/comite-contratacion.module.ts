import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ComiteContratacionService } from './comite-contratacion.service';
import { ComiteContratacionController } from './comite-contratacion.controller';
import { SegundaSesionService } from './segunda-sesion.service';
import { SegundaSesionController } from './segunda-sesion.controller';

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
import { CierreActividadModule } from '../cierre-actividad/cierre-actividad.module';
import { AprobacionModule } from '../aprobacion/aprobacion.module';
import { DocumentosActividadModule } from '../documentos-actividad/documentos-actividad.module';
import { DocumentoProceso } from '../../entities/documento-proceso.entity';

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
      DocumentoProceso,
    ]),
    // Quién transcribe lo que decidió el comité es el abogado repartido en la 3.3.
    ParticipacionModule,
    // Aprobar cierra la 3.7, que en las modalidades que pasan por comité es la
    // última de la etapa 3: la solicitud de CDP nace ahí.
    CdpModule,
    CierreActividadModule,
    // La 5.6.1 se aprueba por el trámite genérico, con la condición del CDP
    // que registra su servicio, y sube versión a los documentos de la 5.1 (113).
    AprobacionModule,
    DocumentosActividadModule,
  ],
  controllers: [ComiteContratacionController, SegundaSesionController],
  providers: [ComiteContratacionService, SegundaSesionService],
})
export class ComiteContratacionModule {}

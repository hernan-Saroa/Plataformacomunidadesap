import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ObservacionesService } from './observaciones.service';
import { ObservacionesController } from './observaciones.controller';
import { PublicacionModule } from '../publicacion/publicacion.module';

import { ObservacionPliego } from '../../entities/observacion-pliego.entity';
import { Actividad, ActividadExcluida } from '../../entities/actividad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ObservacionPliego,
      Actividad,
      ActividadExcluida,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
    // De la publicación salen la fecha de vencimiento contra la que se decide
    // si una observación llegó en término, y la comprobación de que hay pliego
    // publicado sobre el que observar.
    PublicacionModule,
  ],
  controllers: [ObservacionesController],
  providers: [ObservacionesService],
  exports: [ObservacionesService],
})
export class ObservacionesModule {}

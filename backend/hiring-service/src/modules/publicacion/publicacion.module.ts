import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PublicacionService } from './publicacion.service';
import { PublicacionController } from './publicacion.controller';
import { PlazosController } from './plazos.controller';

import { Modalidad } from '../../entities/modalidad.entity';
import { PublicacionPliego } from '../../entities/publicacion-pliego.entity';
import { PlazoPublicacion } from '../../entities/plazo-publicacion.entity';
import { DiaNoHabil } from '../../entities/dia-no-habil.entity';
import { Actividad, ActividadExcluida } from '../../entities/actividad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PublicacionPliego,
      PlazoPublicacion,
      DiaNoHabil,
      Modalidad,
      Actividad,
      ActividadExcluida,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
  ],
  controllers: [PublicacionController, PlazosController],
  providers: [PublicacionService],
  // Lo consumirán las historias siguientes de la etapa 5: las observaciones al
  // pliego (EFDS-1151) corren dentro de este mismo plazo de publicidad.
  exports: [PublicacionService],
})
export class PublicacionModule {}

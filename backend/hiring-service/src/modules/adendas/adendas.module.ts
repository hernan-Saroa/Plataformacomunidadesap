import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdendasService } from './adendas.service';
import { AdendasController } from './adendas.controller';

import { Adenda } from '../../entities/adenda.entity';
import { PublicacionPliego } from '../../entities/publicacion-pliego.entity';
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
      Adenda,
      // La adenda de cronograma mueve el vencimiento de la publicación vigente
      // (EFDS-1150), que es la fecha contra la que corre el término.
      PublicacionPliego,
      ActividadExcluida,
      Modalidad,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
  ],
  controllers: [AdendasController],
  providers: [AdendasService],
})
export class AdendasModule {}

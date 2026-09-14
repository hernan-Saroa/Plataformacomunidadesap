import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ComiteService } from './comite.service';
import { ComiteController } from './comite.controller';

import { ComiteEvaluador } from '../../entities/comite-evaluador.entity';
import { MiembroComite } from '../../entities/miembro-comite.entity';
// El comité se designa sobre una recepción ya cerrada (EFDS-1155). Se leen las
// entidades y no el servicio de ofertas: lo que hace falta son dos datos, y
// pedirlos por su estado completo ataría esta actividad a la forma de aquella.
import { RecepcionOfertas } from '../../entities/recepcion-ofertas.entity';
import { Oferente } from '../../entities/oferente.entity';
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
      ComiteEvaluador,
      MiembroComite,
      RecepcionOfertas,
      Oferente,
      ActividadExcluida,
      Modalidad,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
  ],
  controllers: [ComiteController],
  providers: [ComiteService],
  // La evaluación (EFDS-1157) preguntará aquí quién puede evaluar.
  exports: [ComiteService],
})
export class ComiteModule {}

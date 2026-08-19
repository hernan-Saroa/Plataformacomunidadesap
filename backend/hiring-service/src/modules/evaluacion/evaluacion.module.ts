import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EvaluacionService } from './evaluacion.service';
import { EvaluacionController } from './evaluacion.controller';
import { CriteriosService } from './criterios.service';
import { CriteriosController } from './criterios.controller';

import { CriterioEvaluacion } from '../../entities/criterio-evaluacion.entity';
import { EvaluacionOferta } from '../../entities/evaluacion-oferta.entity';
import { EvaluacionCriterio } from '../../entities/evaluacion-criterio.entity';
import { RecepcionOfertas } from '../../entities/recepcion-ofertas.entity';
import { Oferente } from '../../entities/oferente.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
// Quién evalúa y si hay comité son preguntas de EFDS-1156; se le preguntan a su
// servicio en vez de repetir la regla aquí.
import { ComiteModule } from '../comite/comite.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CriterioEvaluacion,
      EvaluacionOferta,
      EvaluacionCriterio,
      RecepcionOfertas,
      Oferente,
      ActividadExcluida,
      Modalidad,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
    ]),
    ComiteModule,
  ],
  controllers: [EvaluacionController, CriteriosController],
  providers: [EvaluacionService, CriteriosService],
  exports: [EvaluacionService],
})
export class EvaluacionModule {}

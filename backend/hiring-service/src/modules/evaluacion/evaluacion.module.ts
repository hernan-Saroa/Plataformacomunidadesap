import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EvaluacionService } from './evaluacion.service';
import { EvaluacionController } from './evaluacion.controller';

import { ResultadoEvaluacion } from '../../entities/resultado-evaluacion.entity';
import { EvidenciaEvaluacion } from '../../entities/evidencia-evaluacion.entity';
import { RecepcionOfertas } from '../../entities/recepcion-ofertas.entity';
import { Oferente } from '../../entities/oferente.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
// Quién integra el comité y si lo hay son preguntas de EFDS-1156; se le
// preguntan a su servicio en vez de repetir la regla aquí.
import { ComiteModule } from '../comite/comite.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ResultadoEvaluacion,
      EvidenciaEvaluacion,
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
    ComiteModule,
  ],
  controllers: [EvaluacionController],
  providers: [EvaluacionService],
  exports: [EvaluacionService],
})
export class EvaluacionModule {}

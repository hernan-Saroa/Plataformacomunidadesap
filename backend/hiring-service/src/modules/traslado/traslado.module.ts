import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TrasladoService } from './traslado.service';
import { TrasladoController } from './traslado.controller';

import { InformeEvaluacion } from '../../entities/informe-evaluacion.entity';
import { PlazoTraslado } from '../../entities/plazo-traslado.entity';
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
import { DiaNoHabil } from '../../entities/dia-no-habil.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InformeEvaluacion,
      PlazoTraslado,
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
      // El conteo en días hábiles necesita el calendario propio de la entidad,
      // igual que la publicación del pliego.
      DiaNoHabil,
    ]),
  ],
  controllers: [TrasladoController],
  providers: [TrasladoService],
  exports: [TrasladoService],
})
export class TrasladoModule {}

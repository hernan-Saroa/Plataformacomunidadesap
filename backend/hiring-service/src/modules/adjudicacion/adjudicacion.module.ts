import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AudienciaService } from './audiencia.service';
import { AudienciaController } from './audiencia.controller';
import { InformeDefinitivoService } from './informe-definitivo.service';
import { InformeDefinitivoController } from './informe-definitivo.controller';
import { ActoAdjudicacionService } from './acto-adjudicacion.service';
import { ActoAdjudicacionController } from './acto-adjudicacion.controller';
import { DeclaratoriaDesiertaService } from './declaratoria-desierta.service';
import { DeclaratoriaDesiertaController } from './declaratoria-desierta.controller';

import {
  AudienciaAdjudicacion,
  PiezaAudiencia,
} from '../../entities/audiencia-adjudicacion.entity';
import { SobreEconomico } from '../../entities/sobre-economico.entity';
import { InformeDefinitivo } from '../../entities/informe-definitivo.entity';
import { ActoAdjudicacion } from '../../entities/acto-adjudicacion.entity';
import { DeclaratoriaDesierta } from '../../entities/declaratoria-desierta.entity';
import { InformeEvaluacion } from '../../entities/informe-evaluacion.entity';
import { Subsanacion } from '../../entities/subsanacion.entity';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AudienciaAdjudicacion,
      PiezaAudiencia,
      SobreEconomico,
      InformeDefinitivo,
      ActoAdjudicacion,
      DeclaratoriaDesierta,
      // De la etapa 6: la adjudicación va después de un traslado cerrado, y el
      // informe definitivo congela el resultado del comité.
      InformeEvaluacion,
      Subsanacion,
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
  ],
  controllers: [
    AudienciaController,
    InformeDefinitivoController,
    ActoAdjudicacionController,
    DeclaratoriaDesiertaController,
  ],
  providers: [
    AudienciaService,
    InformeDefinitivoService,
    ActoAdjudicacionService,
    DeclaratoriaDesiertaService,
  ],
  exports: [
    AudienciaService,
    InformeDefinitivoService,
    ActoAdjudicacionService,
    DeclaratoriaDesiertaService,
  ],
})
export class AdjudicacionModule {}

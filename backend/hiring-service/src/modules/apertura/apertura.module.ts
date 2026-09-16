import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AperturaService } from './apertura.service';
import { AperturaProcesoController } from './apertura-proceso.controller';

import { AperturaProceso } from '../../entities/apertura-proceso.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Modalidad } from '../../entities/modalidad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { CdpModule } from '../cdp/cdp.module';
import { DocumentosModule } from '../documentos/documentos.module';
import { RiesgosModule } from '../riesgos/riesgos.module';
import { OfertasModule } from '../ofertas/ofertas.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AperturaProceso,
      ActividadExcluida,
      Modalidad,
      Proceso,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
    // La regla del CDP y la mecánica de abrir vienen de EFDS-1148.
    CdpModule,
    // Para informar si la elaboración de documentos quedó a medias (EFDS-1149).
    DocumentosModule,
    // La audiencia de riesgos obligatoria condiciona la apertura (EFDS-1153).
    RiesgosModule,
    // Abrir el proceso arranca el plazo de ofertas de la etapa 6 (EFDS-1155).
    OfertasModule,
  ],
  controllers: [AperturaProcesoController],
  providers: [AperturaService],
})
export class AperturaModule {}

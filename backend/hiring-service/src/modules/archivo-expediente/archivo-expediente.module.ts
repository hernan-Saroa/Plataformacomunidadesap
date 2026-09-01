import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ArchivoExpedienteService } from './archivo-expediente.service';
import { ArchivoExpedienteController } from './archivo-expediente.controller';

import { PlazoPublicacionActa, PublicacionActa } from '../../entities/publicacion-acta.entity';
import { ActaLiquidacion } from '../../entities/acta-liquidacion.entity';
import { CierreFinanciero } from '../../entities/cierre-financiero.entity';
import { Contrato } from '../../entities/contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';
import { DiaNoHabil } from '../../entities/dia-no-habil.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PublicacionActa,
      PlazoPublicacionActa,
      ActaLiquidacion,
      CierreFinanciero,
      Contrato,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
      DiaNoHabil,
    ]),
  ],
  controllers: [ArchivoExpedienteController],
  providers: [ArchivoExpedienteService],
  exports: [ArchivoExpedienteService],
})
export class ArchivoExpedienteModule {}

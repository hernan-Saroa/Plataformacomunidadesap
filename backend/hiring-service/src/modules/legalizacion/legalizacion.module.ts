import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LegalizacionService } from './legalizacion.service';
import { LegalizacionController } from './legalizacion.controller';

import { Contrato } from '../../entities/contrato.entity';
import { Garantia } from '../../entities/garantia.entity';
import { Amparo, TipoAmparo } from '../../entities/amparo.entity';
import { AfiliacionArl } from '../../entities/afiliacion-arl.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contrato,
      Garantia,
      Amparo,
      TipoAmparo,
      AfiliacionArl,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
  ],
  controllers: [LegalizacionController],
  providers: [LegalizacionService],
})
export class LegalizacionModule {}

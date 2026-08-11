import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MipymeService } from './mipyme.service';
import { MipymeController } from './mipyme.controller';

import { ManifestacionMipyme } from '../../entities/manifestacion-mipyme.entity';
import { LimitacionMipyme } from '../../entities/limitacion-mipyme.entity';
import { ParametroMipyme } from '../../entities/parametro-mipyme.entity';
import { Smmlv } from '../../entities/smmlv.entity';
import { ActividadExcluida } from '../../entities/actividad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ManifestacionMipyme,
      LimitacionMipyme,
      ParametroMipyme,
      // El tope puede venir en SMMLV, y convertirlo a pesos exige el salario
      // del año: el mismo dato del que ya dependen los umbrales de cuantía.
      Smmlv,
      ActividadExcluida,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
  ],
  controllers: [MipymeController],
  providers: [MipymeService],
  exports: [MipymeService],
})
export class MipymeModule {}

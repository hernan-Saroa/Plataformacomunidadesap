import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CierreDefinitivoService } from './cierre-definitivo.service';
import { CierreDefinitivoController } from './cierre-definitivo.controller';

import { CierreContrato } from '../../entities/cierre-contrato.entity';
import { ActaLiquidacion } from '../../entities/acta-liquidacion.entity';
import { CierreFinanciero } from '../../entities/cierre-financiero.entity';
import { Garantia } from '../../entities/garantia.entity';
import { Amparo, TipoAmparo } from '../../entities/amparo.entity';
import { Contrato } from '../../entities/contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CierreContrato,
      ActaLiquidacion,
      CierreFinanciero,
      Garantia,
      Amparo,
      TipoAmparo,
      Contrato,
      Proceso,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
  ],
  controllers: [CierreDefinitivoController],
  providers: [CierreDefinitivoService],
  exports: [CierreDefinitivoService],
})
export class CierreDefinitivoModule {}

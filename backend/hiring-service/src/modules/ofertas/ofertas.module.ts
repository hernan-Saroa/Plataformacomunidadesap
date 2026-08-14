import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OfertasService } from './ofertas.service';
import { OfertasController } from './ofertas.controller';

import { RecepcionOfertas } from '../../entities/recepcion-ofertas.entity';
import { Oferente } from '../../entities/oferente.entity';
import { PlazoOfertas } from '../../entities/plazo-ofertas.entity';
// El plazo se cuenta desde la fecha de la resolución de apertura (EFDS-1152).
// Se lee la entidad y no el módulo: es la apertura la que llama aquí, y al
// revés se cerraría el círculo.
import { AperturaProceso } from '../../entities/apertura-proceso.entity';
import { DiaNoHabil } from '../../entities/dia-no-habil.entity';
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
      RecepcionOfertas,
      Oferente,
      PlazoOfertas,
      AperturaProceso,
      DiaNoHabil,
      ActividadExcluida,
      Modalidad,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
  ],
  controllers: [OfertasController],
  providers: [OfertasService],
  // La apertura abre la recepción dentro de su propia transacción.
  exports: [OfertasService],
})
export class OfertasModule {}

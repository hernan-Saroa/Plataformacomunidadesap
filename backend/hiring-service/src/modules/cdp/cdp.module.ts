import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CdpService } from './cdp.service';

import { Cdp } from '../../entities/cdp.entity';
import { Actividad, ActividadExcluida } from '../../entities/actividad.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cdp, Actividad, ActividadExcluida, Proceso, ProcesoActividad])],
  providers: [CdpService],
  // Lo consumirán el ciclo del CDP (EFDS-1338) y las validaciones de apertura
  // (EFDS-1340) y de contratación directa (EFDS-1341).
  exports: [CdpService],
})
export class CdpModule {}

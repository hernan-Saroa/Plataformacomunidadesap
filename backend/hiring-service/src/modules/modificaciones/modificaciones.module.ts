import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ModificacionesController } from './modificaciones.controller';
import { ModificacionesService } from './modificaciones.service';
import { Contrato } from '../../entities/contrato.entity';
import { ModificacionContrato } from '../../entities/modificacion-contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';

/** Modificaciones contractuales — actividad 9.5 (EFDS-1177). */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contrato,
      ModificacionContrato,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
  ],
  controllers: [ModificacionesController],
  providers: [ModificacionesService],
  // Lo consumirán la adición en dinero (EFDS-1176) y las modificaciones de
  // RF-MOD-03 (EFDS-1178), que comparten tabla y trámite.
  exports: [ModificacionesService],
})
export class ModificacionesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PublicacionContratoService } from './publicacion-contrato.service';
import { PublicacionContratoController } from './publicacion-contrato.controller';

import { Contrato } from '../../entities/contrato.entity';
import {
  PlazoPublicacionContrato,
  PublicacionContrato,
} from '../../entities/publicacion-contrato.entity';
// El calendario de días no hábiles se comparte con la publicidad del pliego:
// dos calendarios distintos darían dos respuestas para la misma fecha.
import { DiaNoHabil } from '../../entities/dia-no-habil.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contrato,
      PublicacionContrato,
      PlazoPublicacionContrato,
      DiaNoHabil,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
  ],
  controllers: [PublicacionContratoController],
  providers: [PublicacionContratoService],
})
export class PublicacionContratoModule {}

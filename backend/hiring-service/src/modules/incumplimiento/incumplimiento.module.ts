import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IncumplimientoService } from './incumplimiento.service';
import { IncumplimientoController } from './incumplimiento.controller';

import { Contrato } from '../../entities/contrato.entity';
import { CasoIncumplimiento } from '../../entities/caso-incumplimiento.entity';
import { SupervisionContrato } from '../../entities/supervision-contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contrato,
      CasoIncumplimiento,
      SupervisionContrato,
      Proceso,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
  ],
  controllers: [IncumplimientoController],
  providers: [IncumplimientoService],
  // El trámite sancionatorio (EFDS-1181) preguntará aquí qué casos hay
  // abiertos sobre el contrato para poder instruirlos.
  exports: [IncumplimientoService],
})
export class IncumplimientoModule {}

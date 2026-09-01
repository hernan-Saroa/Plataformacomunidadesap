import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IncumplimientoService } from './incumplimiento.service';
import { IncumplimientoController } from './incumplimiento.controller';
import { SancionatorioService } from './sancionatorio.service';
import { SancionatorioController } from './sancionatorio.controller';

import { Contrato } from '../../entities/contrato.entity';
import { CasoIncumplimiento } from '../../entities/caso-incumplimiento.entity';
import {
  AudienciaSancionatoria,
  ResolucionSancionatoria,
} from '../../entities/actuacion-sancionatoria.entity';
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
      AudienciaSancionatoria,
      ResolucionSancionatoria,
      SupervisionContrato,
      Proceso,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
  ],
  controllers: [IncumplimientoController, SancionatorioController],
  providers: [IncumplimientoService, SancionatorioService],
  // Los dos van juntos porque son el mismo bloque visto desde dos
  // competencias: el supervisor reporta (EFDS-1180) y el área jurídica
  // instruye y decide (EFDS-1181). Separarlos en dos módulos obligaría a
  // exportar uno para que el otro compusiera la misma pantalla.
  exports: [IncumplimientoService],
})
export class IncumplimientoModule {}

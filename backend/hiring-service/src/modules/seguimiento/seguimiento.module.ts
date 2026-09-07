import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SeguimientoService } from './seguimiento.service';
import { SeguimientoController } from './seguimiento.controller';

import { Contrato } from '../../entities/contrato.entity';
import { SeguimientoContrato } from '../../entities/seguimiento-contrato.entity';
import { SupervisionContrato } from '../../entities/supervision-contrato.entity';
import { ActaInicio } from '../../entities/acta-inicio.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contrato,
      SeguimientoContrato,
      SupervisionContrato,
      ActaInicio,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
  ],
  controllers: [SeguimientoController],
  providers: [SeguimientoService],
  // La liquidación (etapa 10) preguntará aquí qué se ejecutó y con qué
  // soportes para poder cerrar el contrato.
  exports: [SeguimientoService],
})
export class SeguimientoModule {}

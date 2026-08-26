import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ModificacionesService } from './modificaciones.service';
import { ModificacionesController } from './modificaciones.controller';

import {
  ModificacionContrato,
  PublicacionModificacion,
  TopeAdicion,
} from '../../entities/modificacion-contrato.entity';
import { Cdp } from '../../entities/cdp.entity';
import { RegistroPresupuestal } from '../../entities/registro-presupuestal.entity';
import { Contrato } from '../../entities/contrato.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ModificacionContrato,
      TopeAdicion,
      PublicacionModificacion,
      Cdp,
      RegistroPresupuestal,
      Contrato,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
  ],
  controllers: [ModificacionesController],
  providers: [ModificacionesService],
  exports: [ModificacionesService],
})
export class ModificacionesModule {}

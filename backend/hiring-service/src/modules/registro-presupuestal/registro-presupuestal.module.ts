import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RegistroPresupuestalService } from './registro-presupuestal.service';
import { RegistroPresupuestalController } from './registro-presupuestal.controller';

import { Contrato } from '../../entities/contrato.entity';
import { RegistroPresupuestal } from '../../entities/registro-presupuestal.entity';
import { Proceso } from '../../entities/proceso.entity';
import { ProcesoActividad } from '../../entities/proceso-actividad.entity';
import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { Documento } from '../../entities/documento.entity';
import { Expediente } from '../../entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contrato,
      RegistroPresupuestal,
      Proceso,
      ProcesoActividad,
      Trazabilidad,
      Documento,
      Expediente,
    ]),
  ],
  controllers: [RegistroPresupuestalController],
  providers: [RegistroPresupuestalService],
  // La ejecución (etapa 9) preguntará aquí si el gasto quedó comprometido.
  exports: [RegistroPresupuestalService],
})
export class RegistroPresupuestalModule {}

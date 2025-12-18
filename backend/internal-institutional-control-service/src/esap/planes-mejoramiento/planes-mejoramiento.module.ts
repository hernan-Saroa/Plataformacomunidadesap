import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanesMejoramientoService } from './planes-mejoramiento.service';
import { PlanesMejoramientoController } from './planes-mejoramiento.controller';
import { PlanMejoramiento } from './entities/plan-mejoramiento.entity';
import { AccionCorrectiva } from './entities/accion-correctiva.entity';
import { SeguimientoTrimestral } from './entities/seguimiento-trimestral.entity';
import { RegistroSeguimiento } from './entities/registro-seguimiento.entity';
import { Hallazgo } from '../hallazgos/entities/hallazgo.entity';
import { Auditoria } from '../auditorias/entities/auditoria.entity';
import { Aprobacion } from '../aprobaciones/entities/aprobacion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlanMejoramiento,
      AccionCorrectiva,
      SeguimientoTrimestral,
      RegistroSeguimiento,
      Hallazgo,
      Auditoria,
      Aprobacion,
    ]),
  ],
  controllers: [PlanesMejoramientoController],
  providers: [PlanesMejoramientoService],
  exports: [PlanesMejoramientoService, TypeOrmModule],
})
export class PlanesMejoramientoModule {}












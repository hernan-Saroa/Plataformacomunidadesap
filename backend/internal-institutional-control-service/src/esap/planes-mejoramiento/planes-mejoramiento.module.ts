import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanesMejoramientoService } from './planes-mejoramiento.service';
import { PlanesMejoramientoController } from './planes-mejoramiento.controller';
import { DocumentosPlanService } from './documentos-plan.service';
import { DocumentosPlanController } from './documentos-plan.controller';
import { PlanMejoramiento } from './entities/plan-mejoramiento.entity';
import { AccionCorrectiva } from './entities/accion-correctiva.entity';
import { SeguimientoTrimestral } from './entities/seguimiento-trimestral.entity';
import { RegistroSeguimiento } from './entities/registro-seguimiento.entity';
import { EventoTimeline } from './entities/evento-timeline.entity';
import { DocumentoPlanMejoramiento } from './entities/documento-plan.entity';
import { Hallazgo } from '../hallazgos/entities/hallazgo.entity';
import { Auditoria } from '../auditorias/entities/auditoria.entity';
import { Aprobacion } from '../aprobaciones/entities/aprobacion.entity';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlanMejoramiento,
      AccionCorrectiva,
      SeguimientoTrimestral,
      RegistroSeguimiento,
      EventoTimeline,
      DocumentoPlanMejoramiento,
      Hallazgo,
      Auditoria,
      Aprobacion,
    ]),
    NotificacionesModule,
    AuthModule,
  ],
  controllers: [PlanesMejoramientoController, DocumentosPlanController],
  providers: [PlanesMejoramientoService, DocumentosPlanService],
  exports: [PlanesMejoramientoService, DocumentosPlanService, TypeOrmModule],
})
export class PlanesMejoramientoModule {}












import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanesMejoramientoService } from './planes-mejoramiento.service';
import { PlanMejoramientoRol4TareaSyncService } from './plan-mejoramiento-rol4-tarea-sync.service';
import { PlanesMejoramientoController } from './planes-mejoramiento.controller';
import { DocumentosPlanService } from './documentos-plan.service';
import { DocumentosPlanController } from './documentos-plan.controller';
import { PlanMejoramiento } from './entities/plan-mejoramiento.entity';
import { AccionCorrectiva } from './entities/accion-correctiva.entity';
import { SeguimientoTrimestral } from './entities/seguimiento-trimestral.entity';
import { RegistroSeguimiento } from './entities/registro-seguimiento.entity';
import { EventoTimeline } from './entities/evento-timeline.entity';
import { DocumentoPlanMejoramiento } from './entities/documento-plan.entity';
import { EvidenciaAccion } from './entities/evidencia-accion.entity';
import { AlertaPlan } from './entities/alerta-plan.entity';
import { CierrePlan } from './entities/cierre-plan.entity';
import { SeguimientoPlan } from './entities/seguimiento-plan.entity';
import { SeguimientoCron } from './seguimiento.cron';
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
      EvidenciaAccion,
      AlertaPlan,
      CierrePlan,
      SeguimientoPlan,
      Hallazgo,
      Auditoria,
      Aprobacion,
    ]),
    NotificacionesModule,
    AuthModule,
  ],
  controllers: [PlanesMejoramientoController, DocumentosPlanController],
  providers: [
    PlanesMejoramientoService,
    DocumentosPlanService,
    PlanMejoramientoRol4TareaSyncService,
    SeguimientoCron,
  ],
  exports: [
    PlanesMejoramientoService,
    DocumentosPlanService,
    PlanMejoramientoRol4TareaSyncService,
    TypeOrmModule,
  ],
})
export class PlanesMejoramientoModule {}












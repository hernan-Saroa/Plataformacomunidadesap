import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesAutomaticasService } from './notificaciones-automaticas.service';
import { SchedulerNotificacionesService } from './scheduler-notificaciones.service';
import { Notificacion } from './entities/notificacion.entity';
import { PreferenciaNotificacion } from './entities/preferencia-notificacion.entity';
import { Auditoria } from '../auditorias/entities/auditoria.entity';
import { PlanMejoramiento } from '../planes-mejoramiento/entities/plan-mejoramiento.entity';
import { SeguimientoTrimestral } from '../planes-mejoramiento/entities/seguimiento-trimestral.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notificacion,
      PreferenciaNotificacion,
      Auditoria,
      PlanMejoramiento,
      SeguimientoTrimestral,
    ]),
  ],
  controllers: [NotificacionesController],
  providers: [
    NotificacionesService,
    NotificacionesAutomaticasService,
    SchedulerNotificacionesService,
  ],
  exports: [NotificacionesService, NotificacionesAutomaticasService, TypeOrmModule],
})
export class NotificacionesModule {}


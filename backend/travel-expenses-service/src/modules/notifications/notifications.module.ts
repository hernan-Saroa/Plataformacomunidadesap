import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolicitudComisionEntity } from '../../entities/solicitud-comision.entity';
import { SolicitudHistorialEstadoEntity } from '../../entities/solicitud-historial-estado.entity';
import { CommonModule } from '../../common/common.module';
import { SstNotificationService } from './sst-notification.service';
import { SstNotificationController } from './sst-notification.controller';

/**
 * Módulo de notificaciones del servicio de viáticos.
 * Gestiona el despacho asíncrono hacia el área de Seguridad y Salud en el Trabajo (SST)
 * mediante correo electrónico a todos los usuarios del rol y notificaciones in-app
 * en la bandeja central de notificaciones (notifications.notificacion) [RF-PAG-002].
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SolicitudComisionEntity,
      SolicitudHistorialEstadoEntity,
    ]),
    CommonModule,
  ],
  controllers: [SstNotificationController],
  providers: [SstNotificationService],
  exports: [SstNotificationService],
})
export class NotificationsModule {}

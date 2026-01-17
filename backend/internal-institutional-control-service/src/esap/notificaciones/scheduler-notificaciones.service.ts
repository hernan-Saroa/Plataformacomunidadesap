import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { NotificacionesAutomaticasService } from './notificaciones-automaticas.service';

@Injectable()
export class SchedulerNotificacionesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerNotificacionesService.name);
  private intervalNotificaciones: NodeJS.Timeout | null = null;

  constructor(
    private readonly notificacionesAutomaticasService: NotificacionesAutomaticasService,
  ) {}

  onModuleInit() {
    this.logger.log('Iniciando scheduler de notificaciones automáticas...');

    // Job de notificaciones automáticas: diariamente
    // Se ejecuta cada 6 horas para pruebas, pero debería ser diario (24 horas)
    // Para producción, cambiar a: 24 * 60 * 60 * 1000
    this.intervalNotificaciones = setInterval(async () => {
      try {
        this.logger.log('Ejecutando job de notificaciones automáticas...');
        const resultado =
          await this.notificacionesAutomaticasService.ejecutarNotificacionesAutomaticas();
        this.logger.log(
          `Job de notificaciones completado: ${resultado.notificacionesEnviadas} enviadas, ${resultado.notificacionesError} errores`,
        );
      } catch (error) {
        this.logger.error(`Error en job de notificaciones: ${error.message}`, error.stack);
      }
    }, 6 * 60 * 60 * 1000); // Cada 6 horas (cambiar a 24 horas en producción)

    this.logger.log('Scheduler de notificaciones iniciado correctamente');
  }

  onModuleDestroy() {
    this.logger.log('Deteniendo scheduler de notificaciones...');

    if (this.intervalNotificaciones) {
      clearInterval(this.intervalNotificaciones);
    }

    this.logger.log('Scheduler de notificaciones detenido');
  }
}

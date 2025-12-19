import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { TerminosProcesalesService } from './terminos-procesales.service';
import { AlertasAutomaticasService } from './alertas-automaticas.service';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private intervalRecalcular: NodeJS.Timeout | null = null;
  private intervalAlertas: NodeJS.Timeout | null = null;

  constructor(
    private terminosService: TerminosProcesalesService,
    private alertasAutomaticasService: AlertasAutomaticasService,
  ) {}

  onModuleInit() {
    this.logger.log('Iniciando scheduler de jobs automáticos...');

    // Job de recálculo de términos: cada hora
    this.intervalRecalcular = setInterval(async () => {
      try {
        this.logger.log('Ejecutando job de recálculo de términos...');
        await this.terminosService.recalcularTodos();
        this.logger.log('Job de recálculo completado');
      } catch (error) {
        this.logger.error(`Error en job de recálculo: ${error.message}`);
      }
    }, 60 * 60 * 1000); // Cada hora

    // Job de envío de alertas: cada 6 horas
    this.intervalAlertas = setInterval(async () => {
      try {
        this.logger.log('Ejecutando job de envío de alertas...');
        const resultado = await this.alertasAutomaticasService.ejecutarEnvioAlertas();
        this.logger.log(
          `Job de alertas completado: ${resultado.alertasEnviadas} enviadas, ${resultado.alertasError} errores`,
        );
      } catch (error) {
        this.logger.error(`Error en job de alertas: ${error.message}`);
      }
    }, 6 * 60 * 60 * 1000); // Cada 6 horas

    this.logger.log('Scheduler iniciado correctamente');
  }

  onModuleDestroy() {
    this.logger.log('Deteniendo scheduler...');

    if (this.intervalRecalcular) {
      clearInterval(this.intervalRecalcular);
    }

    if (this.intervalAlertas) {
      clearInterval(this.intervalAlertas);
    }

    this.logger.log('Scheduler detenido');
  }
}



import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { TerminoProcesal, TerminoEstado } from '../entities/termino-procesal.entity';
import { ReglaAlerta } from '../entities/regla-alerta.entity';
import { AlertaEnviada, TipoAlerta, EstadoAlerta } from '../entities/alerta-enviada.entity';
import { AlertasService } from './alertas.service';
import { TerminosCalculatorService } from './terminos-calculator.service';

@Injectable()
export class AlertasAutomaticasService {
  private readonly logger = new Logger(AlertasAutomaticasService.name);

  constructor(
    @InjectRepository(TerminoProcesal)
    private terminosRepository: Repository<TerminoProcesal>,
    @InjectRepository(ReglaAlerta)
    private reglasRepository: Repository<ReglaAlerta>,
    @InjectRepository(AlertaEnviada)
    private alertasRepository: Repository<AlertaEnviada>,
    private alertasService: AlertasService,
    private terminosCalculator: TerminosCalculatorService,
  ) {}

  /**
   * Job que se ejecuta periódicamente para enviar alertas automáticas
   * Se debe configurar como cron job (ej: cada hora o diario)
   */
  async ejecutarEnvioAlertas(): Promise<{
    alertasEnviadas: number;
    alertasError: number;
  }> {
    this.logger.log('Iniciando job de envío de alertas automáticas...');

    // Obtener reglas activas
    const reglasActivas = await this.reglasRepository.find({
      where: { activa: true },
      order: { diasAnticipacion: 'ASC' },
    });

    if (reglasActivas.length === 0) {
      this.logger.warn('No hay reglas de alerta activas');
      return { alertasEnviadas: 0, alertasError: 0 };
    }

    let alertasEnviadas = 0;
    let alertasError = 0;

    // Para cada regla activa
    for (const regla of reglasActivas) {
      // Obtener términos que cumplen la condición de la regla
      const terminos = await this.obtenerTerminosParaAlerta(regla);

      for (const termino of terminos) {
        try {
          // Verificar que no se haya enviado ya esta alerta para este término y regla
          // Solo verificar si la alerta fue enviada exitosamente
          const alertaExistente = await this.alertasRepository.findOne({
            where: {
              terminoId: termino.id,
              reglaAlertaId: regla.id,
              estado: EstadoAlerta.ENVIADA,
            },
          });

          if (alertaExistente) {
            continue; // Ya se envió esta alerta exitosamente
          }

          // Crear y enviar alerta
          await this.crearYEnviarAlerta(termino, regla);
          alertasEnviadas++;

          // Marcar término como alerta enviada
          termino.alertaEnviada = true;
          await this.terminosRepository.save(termino);
        } catch (error) {
          this.logger.error(
            `Error al enviar alerta para término ${termino.id}: ${error.message}`,
          );
          alertasError++;
        }
      }
    }

    this.logger.log(
      `Job completado: ${alertasEnviadas} alertas enviadas, ${alertasError} errores`,
    );

    return { alertasEnviadas, alertasError };
  }

  /**
   * Obtiene términos que cumplen la condición de una regla de alerta
   */
  private async obtenerTerminosParaAlerta(
    regla: ReglaAlerta,
  ): Promise<TerminoProcesal[]> {
    // Obtener términos que tienen días restantes iguales a la anticipación de la regla
    // y que no están cumplidos
    const terminos = await this.terminosRepository
      .createQueryBuilder('termino')
      .where('termino.estado != :estado', { estado: TerminoEstado.CUMPLIDO })
      .andWhere('termino.diasRestantes = :diasAnticipacion', {
        diasAnticipacion: regla.diasAnticipacion,
      })
      .andWhere('termino.diasRestantes >= 0') // Solo términos que aún no han vencido
      .getMany();

    return terminos;
  }

  /**
   * Crea y envía una alerta según la configuración de la regla
   */
  private async crearYEnviarAlerta(
    termino: TerminoProcesal,
    regla: ReglaAlerta,
  ): Promise<void> {
    // Determinar tipo de alerta
    let tipoAlerta: TipoAlerta;
    if (regla.enviarEmail) {
      tipoAlerta = TipoAlerta.EMAIL;
    } else if (regla.mostrarPanel) {
      tipoAlerta = TipoAlerta.VISUAL;
    } else {
      tipoAlerta = TipoAlerta.SISTEMA;
    }

    // Construir asunto y mensaje
    const asunto = `Término próximo a vencer: ${termino.actuacion}`;
    const mensaje = this.construirMensajeAlerta(termino, regla);

    // Crear alerta en BD
    const alerta = await this.alertasService.crear(
      termino.id,
      regla.id,
      tipoAlerta,
      termino.emailResponsable,
      asunto,
      mensaje,
    );

    // Si es email, intentar enviarlo (integración con servicio de notificaciones)
    if (regla.enviarEmail) {
      try {
        // TODO: Integrar con servicio de notificaciones para envío real de email
        // await this.notificacionesService.enviarEmail(...);
        await this.alertasService.marcarEnviada(alerta.id);
        this.logger.log(`Email enviado a ${termino.emailResponsable}`);
      } catch (error) {
        await this.alertasService.marcarError(
          alerta.id,
          `Error al enviar email: ${error.message}`,
        );
        throw error;
      }
    } else {
      // Para alertas visuales o de sistema, marcar como enviada directamente
      await this.alertasService.marcarEnviada(alerta.id);
    }
  }

  /**
   * Construye el mensaje de la alerta
   */
  private construirMensajeAlerta(
    termino: TerminoProcesal,
    regla: ReglaAlerta,
  ): string {
    return `
Término Procesal Próximo a Vencer

Proceso: ${termino.numeroProceso}
Actuación: ${termino.actuacion}
Responsable: ${termino.responsableNombre}
Email: ${termino.emailResponsable}

Fecha de Inicio: ${termino.fechaInicio.toLocaleDateString('es-CO')}
Días Hábiles: ${termino.diasHabiles}
Fecha de Vencimiento: ${termino.fechaVencimiento.toLocaleDateString('es-CO')}
Días Restantes: ${termino.diasRestantes}

Estado: ${termino.estado}

Esta alerta se envía porque faltan ${regla.diasAnticipacion} días hábiles para el vencimiento del término.

Por favor, tome las acciones necesarias para cumplir con el término procesal.
    `.trim();
  }
}


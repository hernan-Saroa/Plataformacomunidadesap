import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { HiringAccess } from '../../auth/hiring-access';
import { AlertasService, ANTICIPACION_POR_DEFECTO } from './alertas.service';

/**
 * El aviso diario de los vencimientos (EFDS-1185, RF-SIS-03).
 *
 * El criterio de aceptación dice «cuando se aproxima el vencimiento, el sistema
 * notifica al responsable»: es el sistema quien avisa, no alguien que se acuerda
 * de pulsar un botón. Sin esto, `POST /alertas/notificar` existía y funcionaba,
 * pero no lo llamaba nadie y una póliza podía vencer sin que su supervisor se
 * enterara.
 *
 * A las 7:00 de Bogotá y no a medianoche: el correo debe estar en la bandeja
 * cuando el responsable llega a trabajar, no ocho horas antes entre el resto de
 * lo que llegó de noche. Misma hora y misma zona que las alertas de gestión
 * legal, que resuelven el mismo problema en su módulo.
 */
@Injectable()
export class AlertasCron {
  private readonly logger = new Logger(AlertasCron.name);

  constructor(private readonly alertas: AlertasService) {}

  /**
   * El proceso corre sin usuario: no hay token que mirar porque no lo dispara
   * nadie. Se identifica como «Sistema» para que la trazabilidad distinga un
   * aviso automático de uno que pidió una persona.
   */
  private static readonly ACCESO_SISTEMA: HiringAccess = {
    userId: '',
    userName: 'Sistema',
    roles: [],
    puedeEditar: false,
  };

  @Cron('0 7 * * *', {
    name: 'contratacion-alertas-vencimiento',
    timeZone: 'America/Bogota',
  })
  async avisarVencimientos(): Promise<void> {
    this.logger.log('Revisando vencimientos de amparos, CDP, RP y liquidación…');

    try {
      const resultado = await this.alertas.notificar(
        ANTICIPACION_POR_DEFECTO,
        AlertasCron.ACCESO_SISTEMA,
      );

      // Se registran las tres cifras y no solo el total: «20 alertas y 0
      // notificadas» es un problema —nadie tiene responsable asignado— y «0 y 0»
      // es un día tranquilo. Con un solo número los dos casos se leen igual.
      this.logger.log(
        `Vencimientos: ${resultado.alertas} alertas, ${resultado.notificadas ?? 0} notificadas` +
          (resultado.sinDestinatario
            ? `, ${resultado.sinDestinatario} sin responsable a quién avisar`
            : '') +
          (resultado.error ? ` — ${resultado.error}` : ''),
      );
    } catch (error: any) {
      // Se traga el fallo a propósito: si el aviso de hoy no sale, mañana vuelve
      // a intentarlo, y las alertas se siguen consultando en pantalla. Dejar
      // caer la excepción tumbaría el planificador y con él los avisos futuros.
      this.logger.error(`No se pudieron avisar los vencimientos: ${error.message}`);
    }
  }
}

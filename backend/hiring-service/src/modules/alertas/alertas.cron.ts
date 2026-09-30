import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { HiringAccess } from '../../auth/hiring-access';
import { AlertasService } from './alertas.service';
import { NotificadorService } from '../notificaciones/notificador.service';
import { ParametrosAlertaService } from './parametros-alerta.service';

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

  constructor(
    private readonly alertas: AlertasService,
    private readonly parametros: ParametrosAlertaService,
    @Optional() private readonly notificador?: NotificadorService,
  ) {}

  /**
   * El proceso corre sin usuario: no hay token que mirar porque no lo dispara
   * nadie. Se identifica como «Sistema» para que la trazabilidad distinga un
   * aviso automático de uno que pidió una persona.
   */
  private static readonly ACCESO_SISTEMA: HiringAccess = {
    userId: '',
    userName: 'Sistema',
    roles: [],
  };

  /**
   * Corre cada hora y avisa solo a la configurada.
   *
   * La hora del aviso la edita la Dirección: fijarla en el decorador obligaría a
   * reiniciar el servicio para cambiarla. Revisar cada hora cuesta una consulta
   * y deja que el cambio rija desde la hora siguiente.
   */
  @Cron('0 * * * *', {
    name: 'contratacion-alertas-vencimiento',
    timeZone: 'America/Bogota',
  })
  async avisarVencimientos(): Promise<void> {
    const { hora_aviso } = await this.parametros.valores();
    const horaActual = Number(
      new Date().toLocaleString('en-US', { timeZone: 'America/Bogota', hour: 'numeric', hour12: false }),
    ) % 24;
    if (horaActual !== hora_aviso) return;

    this.logger.log(
      'Revisando vencimientos de amparos, CDP, RP y liquidación, y solicitudes de CDP sin atender…',
    );

    try {
      const resultado = await this.alertas.notificar(
        // Sin número: cada vencimiento con la anticipación configurada para su tipo.
        null,
        AlertasCron.ACCESO_SISTEMA,
      );

      // Se desglosa y no se registra solo el total: «20 alertas y 0 notificadas»
      // es un problema —nadie tiene responsable asignado— y «0 y 0» es un día
      // tranquilo. Con un solo número los dos casos se leen igual. Las repetidas
      // son las que el aprobador ya tiene sin leer, y no notificarlas es lo
      // correcto: sin distinguirlas parecerían avisos perdidos.
      this.logger.log(
        `Vencimientos: ${resultado.alertas} alertas, ${resultado.notificadas ?? 0} notificadas` +
          (resultado.repetidas
            ? `, ${resultado.repetidas} ya avisadas y sin leer`
            : '') +
          (resultado.sinDestinatario
            ? `, ${resultado.sinDestinatario} sin responsable a quién avisar`
            : '') +
          (resultado.error ? ` — ${resultado.error}` : ''),
      );

      await this.avisarPlazos();
    } catch (error: any) {
      // Se traga el fallo a propósito: si el aviso de hoy no sale, mañana vuelve
      // a intentarlo, y las alertas se siguen consultando en pantalla. Dejar
      // caer la excepción tumbaría el planificador y con él los avisos futuros.
      this.logger.error(`No se pudieron avisar los vencimientos: ${error.message}`);
    }
  }

  /**
   * «Se vence el plazo», a quien le toca cada actividad.
   *
   * Va por el motor de avisos y no como las demás alertas: así llega a quien se
   * configuró en la ficha de la actividad, y por correo si la actividad lo
   * pide. No se repite cada día: la campana descarta el aviso igual que el
   * destinatario aún no ha leído, y cambia cuando el plazo pasa a vencido.
   */
  async avisarPlazos(): Promise<number> {
    if (!this.notificador) return 0;
    const plazos = await this.alertas.plazosDeActividades();
    const enviados = await this.notificador.despachar(
      plazos.map((p) => ({
        evento: 'VENCE_PLAZO' as const,
        numeral: p.numeral,
        procesoId: p.procesoId,
        actorId: null,
        actorNombre: null,
        observaciones: null,
        plazo: { vence: p.vence, vencido: p.estado === 'VENCIDO' },
      })),
    );
    this.logger.log(`Plazos de actividades: ${plazos.length} por vencer o vencidos, ${enviados} avisos`);
    return enviados;
  }
}

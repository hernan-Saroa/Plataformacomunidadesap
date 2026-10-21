import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LegalizacionDisparadorService } from './legalizacion-disparador.service';
import { LegalizacionVencimientosService } from './legalizacion-vencimientos.service';
import { LegalizacionCanarioService } from './legalizacion-canario.service';

/**
 * EFDS-1309 — Procesos automáticos de la legalización. Mismo patrón que
 * contratación (hiring-service/alertas.cron.ts): corren sin usuario y en hora
 * de Colombia declarada en el decorador, no la del contenedor (que no define TZ).
 */
@Injectable()
export class LegalizacionCron implements OnApplicationBootstrap {
  private readonly logger = new Logger(LegalizacionCron.name);

  constructor(
    private readonly disparador: LegalizacionDisparadorService,
    private readonly vencimientos: LegalizacionVencimientosService,
    private readonly canario: LegalizacionCanarioService,
  ) {}

  /**
   * Un barrido al arrancar, sin bloquear el arranque. Las comisiones que ya
   * estaban en PAGADA antes de desplegar este módulo no van a emitir el evento:
   * sin esto esperarían hasta el primer barrido programado.
   */
  onApplicationBootstrap(): void {
    if (process.env.NODE_ENV === 'test') return;
    setTimeout(() => void this.barrido(), 5_000).unref();
  }

  /**
   * Red de seguridad del disparador. El evento de pago abre la legalización al
   * instante; esto recoge lo que el evento no alcanzó (reinicio del servicio,
   * error puntual) y los cambios de configuración posteriores al pago.
   */
  @Cron('*/15 * * * *', { name: 'viaticos-legalizacion-barrido', timeZone: 'America/Bogota' })
  async barrido(): Promise<void> {
    try {
      const r = await this.disparador.barrer();
      const abiertas = r.filter((x) => x.accion === 'ABIERTA').length;
      const transicionadas = r.filter((x) => x.transicionada).length;
      if (r.length) {
        this.logger.warn(
          `[EFDS-1309] Barrido: ${r.length} pendientes (${abiertas} abiertas, ${transicionadas} a PENDIENTE_LEGALIZACION). ` +
            'Si se repite, el evento de pago no está llegando.',
        );
      }
    } catch (err: any) {
      this.logger.error(`[EFDS-1309] Barrido falló: ${err?.message}`, err?.stack);
    }
  }

  /**
   * A las 7:00 de Bogotá, igual que las alertas de contratación y gestión legal:
   * el aviso debe estar en la bandeja cuando el responsable llega a trabajar.
   */
  @Cron('0 7 * * *', { name: 'viaticos-legalizacion-avisos', timeZone: 'America/Bogota' })
  async avisos(): Promise<void> {
    try {
      await this.vencimientos.avisar();
    } catch (err: any) {
      this.logger.error(`[EFDS-1309] Avisos de vencimiento fallaron: ${err?.message}`, err?.stack);
    }
  }

  @Cron('45 6 * * *', { name: 'viaticos-legalizacion-canario', timeZone: 'America/Bogota' })
  async verificarInvariantes(): Promise<void> {
    try {
      const r = await this.canario.verificar();
      if (r.ok) {
        this.logger.log(
          `[EFDS-1309] Canario OK: ${r.poblacion.legalizaciones} legalizaciones / ${r.poblacion.alcanzaronDisparador} solicitudes que alcanzaron el disparador.`,
        );
      } else {
        this.logger.error(`[EFDS-1309] Canario FALLÓ: ${JSON.stringify(r)}`);
      }
    } catch (err: any) {
      this.logger.error(`[EFDS-1309] Canario no pudo ejecutarse: ${err?.message}`, err?.stack);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  QueryRunner,
  TransactionCommitEvent,
  TransactionRollbackEvent,
} from 'typeorm';

import { Trazabilidad } from '../../entities/trazabilidad.entity';
import { EventoOcurrido, eventosDeTraza } from './eventos';
import { motorDeAvisosEncendido, NotificadorService } from './notificador.service';

/** Un proceso que cambió, y quién lo cambió: puede haber habilitado la siguiente actividad. */
interface ProcesoTocado {
  procesoId: string;
  actorId: string | null;
  actorNombre: string | null;
}

/** Lo que dejó una transacción, pendiente de que se confirme. */
interface Pendiente {
  ocurridos: EventoOcurrido[];
  procesos: ProcesoTocado[];
}

/**
 * El único punto donde se enteran los avisos de lo que pasa (EFDS-1183).
 *
 * Treinta y cinco servicios escriben su trazabilidad, cada uno con su propia
 * función, pero todos en la misma tabla. Escuchar la tabla evita tocar esos
 * servicios, y hace que un panel nuevo quede cubierto en cuanto registre su
 * trazabilidad.
 *
 * Cada fila sirve para dos cosas: lo que dice que pasó —se devolvió, se aprobó—
 * y el proceso donde pasó, porque cualquier cambio puede haber cerrado lo que
 * bloqueaba la siguiente actividad y hay que mirar si ahora le toca a alguien.
 *
 * **Solo se avisa lo confirmado.** Casi todo se guarda dentro de una
 * transacción: el evento espera a que se confirme, y si se deshace se descarta.
 * Avisar «se aprobó» de algo que un error posterior revirtió le haría a alguien
 * actuar sobre un hecho que no existe.
 */
@Injectable()
export class NotificacionesSubscriber implements EntitySubscriberInterface<Trazabilidad> {
  private readonly logger = new Logger(NotificacionesSubscriber.name);
  private readonly pendientes = new WeakMap<QueryRunner, Pendiente>();

  constructor(
    dataSource: DataSource,
    private readonly notificador: NotificadorService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Trazabilidad;
  }

  afterInsert(event: InsertEvent<Trazabilidad>) {
    if (!motorDeAvisosEncendido() || !event.entity) return;

    const t = event.entity;
    if (!t.procesoId) return;

    const nuevo: Pendiente = {
      ocurridos: eventosDeTraza({
        procesoId: t.procesoId,
        entidad: t.entidad,
        accion: t.accion,
        detalle: t.detalle ?? null,
        usuarioId: t.usuarioId ?? null,
        usuarioNombre: t.usuarioNombre ?? null,
      }),
      procesos: [
        { procesoId: t.procesoId, actorId: t.usuarioId ?? null, actorNombre: t.usuarioNombre ?? null },
      ],
    };

    const qr = event.queryRunner;
    if (qr?.isTransactionActive) {
      const previo = this.pendientes.get(qr);
      this.pendientes.set(qr, {
        ocurridos: [...(previo?.ocurridos ?? []), ...nuevo.ocurridos],
        procesos: [...(previo?.procesos ?? []), ...nuevo.procesos],
      });
      return;
    }

    this.lanzar(nuevo);
  }

  afterTransactionCommit(event: TransactionCommitEvent) {
    const pendiente = this.pendientes.get(event.queryRunner);
    if (!pendiente) return;
    this.pendientes.delete(event.queryRunner);
    this.lanzar(pendiente);
  }

  afterTransactionRollback(event: TransactionRollbackEvent) {
    this.pendientes.delete(event.queryRunner);
  }

  /**
   * Fuera del hilo de la petición: el usuario no espera a que salgan los avisos.
   *
   * Primero lo que pasó y después lo que se habilitó, y cada proceso se revisa
   * una sola vez aunque la transacción haya dejado varias filas: quien lo tocó
   * de último es quien cerró lo que faltaba.
   */
  private lanzar({ ocurridos, procesos }: Pendiente) {
    const porProceso = new Map(procesos.map((p) => [p.procesoId, p]));

    setImmediate(async () => {
      try {
        if (ocurridos.length) await this.notificador.despachar(ocurridos);
        for (const p of porProceso.values()) {
          await this.notificador.revisarHabilitadas(p.procesoId, p.actorId, p.actorNombre);
        }
      } catch (error: any) {
        this.logger.warn(`Los avisos fallaron: ${error.message}`);
      }
    });
  }
}

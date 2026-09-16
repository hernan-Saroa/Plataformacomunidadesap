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

/**
 * El único punto donde se enteran los avisos de lo que pasa (EFDS-1183).
 *
 * Treinta y cinco servicios escriben su trazabilidad, cada uno con su propia
 * función, pero todos en la misma tabla. Escuchar la tabla evita tocar esos
 * servicios, y hace que un panel nuevo quede cubierto en cuanto registre su
 * trazabilidad.
 *
 * **Solo se avisa lo confirmado.** Casi todo se guarda dentro de una
 * transacción: el evento espera a que se confirme, y si se deshace se descarta.
 * Avisar «se aprobó» de algo que un error posterior revirtió le haría a alguien
 * actuar sobre un hecho que no existe.
 */
@Injectable()
export class NotificacionesSubscriber implements EntitySubscriberInterface<Trazabilidad> {
  private readonly logger = new Logger(NotificacionesSubscriber.name);
  private readonly pendientes = new WeakMap<QueryRunner, EventoOcurrido[]>();

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
    const ocurridos = eventosDeTraza({
      procesoId: t.procesoId ?? null,
      entidad: t.entidad,
      accion: t.accion,
      detalle: t.detalle ?? null,
      usuarioId: t.usuarioId ?? null,
      usuarioNombre: t.usuarioNombre ?? null,
    });
    if (!ocurridos.length) return;

    const qr = event.queryRunner;
    if (qr?.isTransactionActive) {
      this.pendientes.set(qr, [...(this.pendientes.get(qr) ?? []), ...ocurridos]);
      return;
    }

    this.lanzar(ocurridos);
  }

  afterTransactionCommit(event: TransactionCommitEvent) {
    const ocurridos = this.pendientes.get(event.queryRunner);
    if (!ocurridos) return;
    this.pendientes.delete(event.queryRunner);
    this.lanzar(ocurridos);
  }

  afterTransactionRollback(event: TransactionRollbackEvent) {
    this.pendientes.delete(event.queryRunner);
  }

  /** Fuera del hilo de la petición: el usuario no espera a que salgan los avisos. */
  private lanzar(ocurridos: EventoOcurrido[]) {
    setImmediate(() => {
      this.notificador.despachar(ocurridos).catch((error: any) => {
        this.logger.warn(`Los avisos fallaron: ${error.message}`);
      });
    });
  }
}

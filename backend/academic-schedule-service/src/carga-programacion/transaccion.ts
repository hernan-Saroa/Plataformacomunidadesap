import { Logger } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';

import { AsignacionesService } from '../asignaciones/asignaciones.service.js';
import type { ContratoClient } from '../asignaciones/contrato-client.js';
import { AsignaturaCatalogoEntity } from '../catalogo/entities/asignatura.readonly.entity.js';
import { DocenciaService } from '../docencia/docencia.service.js';
import { GrupoEntity } from '../grupos/grupo.entity.js';
import { GruposService } from '../grupos/grupos.service.js';
import { FranjaHorariaEntity } from '../horarios/franja-horaria.entity.js';
import { HorariosService } from '../horarios/horarios.service.js';

/**
 * Los MISMOS servicios de siempre (grupos, sesiones, asignación de docentes), pero
 * ligados a UNA transacción: la carga por plantilla y la copia de otro periodo pasan por
 * exactamente las mismas validaciones que la pantalla, ven lo que ya escribieron en la
 * misma operación (un aula o un docente usado dos veces en el archivo choca) y, si algo
 * falla, no queda nada escrito.
 *
 * `AsignacionesService` y `DocenciaService` reciben un DataSource: se les pasa uno que
 * responde con el EntityManager de la transacción (consultas y transacciones anidadas
 * van a la misma conexión).
 */
export function serviciosEnTransaccion(m: EntityManager, contrato: ContratoClient) {
  const ds = {
    manager: m,
    query: (sql: string, params?: unknown[]) => m.query(sql, params as any[]),
    transaction: (a: unknown, b?: unknown) => (typeof a === 'function' ? (a as any)(m) : (b as any)(m)),
  } as unknown as DataSource;
  return {
    grupos: new GruposService(m.getRepository(GrupoEntity), m.getRepository(AsignaturaCatalogoEntity)),
    horarios: new HorariosService(m.getRepository(FranjaHorariaEntity), m.getRepository(GrupoEntity)),
    asignaciones: new AsignacionesService(ds, contrato, new DocenciaService(ds, contrato)),
  };
}
export type ServiciosTx = ReturnType<typeof serviciosEnTransaccion>;

let contadorPuntos = 0;
/**
 * Ejecuta un paso con un SAVEPOINT: si falla, se deshace SOLO ese paso y la transacción
 * sigue viva para reportar los demás errores (Postgres aborta la transacción entera ante
 * cualquier error de SQL si no se vuelve al punto de guardado).
 */
export async function paso<T>(m: EntityManager, fn: () => Promise<T>): Promise<T> {
  const sp = `sp_carga_${++contadorPuntos}`;
  await m.query(`SAVEPOINT ${sp}`);
  try {
    const r = await fn();
    await m.query(`RELEASE SAVEPOINT ${sp}`);
    return r;
  } catch (e) {
    await m.query(`ROLLBACK TO SAVEPOINT ${sp}`);
    throw e;
  }
}

/** Texto legible de un error de Nest o de la base. */
export function mensajeDe(e: any): string {
  const r = e?.response;
  const m = r?.message ?? e?.message ?? 'Error desconocido.';
  return Array.isArray(m) ? m.join(' ') : String(m);
}

/**
 * Ejecuta `fn` en una transacción y la CONFIRMA solo si `confirmar(resultado)` es verdadero;
 * si no, la revierte. Así la validación previa y la carga real recorren el mismo código.
 */
export async function enTransaccion<T>(dataSource: DataSource, fn: (m: EntityManager) => Promise<T>, confirmar: (r: T) => boolean): Promise<T> {
  const qr = dataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    const r = await fn(qr.manager);
    if (confirmar(r)) await qr.commitTransaction();
    else await qr.rollbackTransaction();
    return r;
  } catch (e) {
    await qr.rollbackTransaction();
    throw e;
  } finally {
    await qr.release();
  }
}

const logger = new Logger('AuditoriaCargaProgramacion');
/** Auditoría en el audit-service (POST /logs); si no responde, queda en el log y el cambio ya se hizo. */
export async function auditar(accion: string, idEntidad: string, idUser: string | null, nuevo: unknown): Promise<void> {
  const base = process.env.AUDIT_SERVICE_URL || 'http://audit-service:3011';
  const ruta = '/programacion-academica/api/v1/carga-programacion';
  try {
    const res = await fetch(`${base}/logs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'POST', url: ruta, path: ruta, module: 'academic-schedule', submodule: 'carga-programacion',
        action: accion, statusCode: 200, responseTimeMs: 0, entityName: 'PeriodoAcademico', entityId: idEntidad,
        previousData: null, newData: { ...(nuevo as object), usuario: idUser },
      }),
    });
    if (!res.ok) throw new Error(`audit-service respondió ${res.status}`);
  } catch (e: any) {
    logger.error(`No se pudo registrar la auditoría de ${accion}: ${e?.message ?? e}`);
  }
}

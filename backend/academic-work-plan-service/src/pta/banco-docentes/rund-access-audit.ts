import { ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { canViewRundSensitiveData, getRequestRoleCodes } from './banco-docentes-sensitive-data';

export type RundAccessActor = { actorId: string; roles: string[]; fullAccess: boolean; ip?: string };
export function rundRequestActor(req: any): RundAccessActor {
  return {
    actorId: String(req?.user?.userId || req?.user?.sub || 'NO_AUTENTICADO'),
    roles: getRequestRoleCodes(req?.user),
    fullAccess: canViewRundSensitiveData(req?.user),
    ip: req?.ip || req?.socket?.remoteAddress,
  };
}

/** Auditoría independiente del perfil: admite borradores, archivos y filas de previsualización. */
export async function recordRundAccess(
  db: { query: (sql: string, parameters?: any[]) => Promise<any> },
  entry: RundAccessActor & {
    endpoint: string; resourceId?: string; docenteIds?: string[]; fields: readonly string[];
    result?: 'COMPLETO' | 'ENMASCARADO' | 'DENEGADO';
  },
): Promise<void> {
  if (!entry.fields.length) return;
  try {
    await db.query(
      `INSERT INTO academic_work_plan."RundAccesoDatosLog"
       (id, actor_id, roles, endpoint, recurso_id, docentes, campos, resultado, ip)
       VALUES ($1,$2,$3::text[],$4,$5,$6::text[],$7::text[],$8,$9)`,
      [randomUUID(), entry.actorId, entry.roles, entry.endpoint, entry.resourceId || null,
        Array.from(new Set(entry.docenteIds || [])), Array.from(new Set(entry.fields)),
        entry.result || (entry.fullAccess ? 'COMPLETO' : 'ENMASCARADO'), entry.ip || null],
    );
  } catch {
    throw new ServiceUnavailableException('No fue posible registrar el acceso. Intente nuevamente.');
  }
}

import { ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA = /^[0-9a-f]{64}$/;
const keys = (value: object, expected: string[]) => Object.keys(value).sort().join() === expected.sort().join();
const date = (value: unknown, nullable = true) => (nullable && value === null) ||
  (typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)));

/** Validación completa antes de escribir. Un listado parcial nunca equivale a una baja. */
export function validateAuthState(input: any, persona: string) {
  const state = input?.success === true ? input.data : input;
  const invalid = () => { throw new ServiceUnavailableException('Estado completo de Auth inválido.'); };
  if (!state || state.schema !== 1 || state.propietario !== 'auth' || state.scope !== 'documentos-generales' ||
      state.persona_id !== persona || state.complete !== true || typeof state.deleted !== 'boolean' ||
      typeof state.revision !== 'string' || !/^(0|[1-9][0-9]{0,18})$/.test(state.revision) || BigInt(state.revision) > 9223372036854775807n ||
      !Array.isArray(state.documentos) || state.documentos.length > 5000 || state.total !== state.documentos.length ||
      (state.deleted && state.total !== 0) || !SHA.test(state.fingerprint)) invalid();
  let previous = '';
  // Reconstruir las claves impide depender del orden del JSON recibido y excluye metadatos privados.
  const documentos = state.documentos.map((d: any) => {
    if (!d || !keys(d, ['id', 'revision_documento', 'categoria', 'tipo_documento_id', 'estado', 'fecha_subida', 'fecha_validacion', 'fecha_vencimiento']) ||
        typeof d.id !== 'string' || !UUID.test(d.id) || d.id <= previous || typeof d.revision_documento !== 'string' || !SHA.test(d.revision_documento) ||
        typeof d.categoria !== 'string' || d.categoria.length > 80 || d.categoria.trim().toLowerCase() === 'rund' ||
        !(d.tipo_documento_id === null || (typeof d.tipo_documento_id === 'string' && UUID.test(d.tipo_documento_id))) ||
        !['pendiente', 'validado', 'rechazado', 'vencido'].includes(d.estado) || !date(d.fecha_subida, false) ||
        !date(d.fecha_validacion) || !date(d.fecha_vencimiento)) invalid();
    previous = d.id;
    return { id: d.id, revision_documento: d.revision_documento, categoria: d.categoria, tipo_documento_id: d.tipo_documento_id,
      estado: d.estado, fecha_subida: d.fecha_subida, fecha_validacion: d.fecha_validacion, fecha_vencimiento: d.fecha_vencimiento };
  });
  const fingerprint = createHash('sha256').update(JSON.stringify({ deleted: state.deleted, documentos })).digest('hex');
  if (fingerprint !== state.fingerprint) invalid();
  return { revision: state.revision as string, fingerprint, deleted: state.deleted as boolean, documentos };
}

@Injectable()
export class RundAuthStateSyncService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}
  get enabled() { return process.env.RUND_CARPETA_SYNC_ENABLED === 'true'; }

  private async readAuth(persona: string) {
    const token = process.env.RUND_CARPETA_SYNC_TOKEN || process.env.INTERNAL_SERVICE_TOKEN;
    const configured = process.env.AUTH_SERVICE_URL;
    if (!token || !configured) throw new ServiceUnavailableException('Contrato interno de Auth no configurado.');
    const url = new URL(configured);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new ServiceUnavailableException('Dirección interna de Auth inválida.');
    }
    url.pathname = url.pathname.replace(/\/$/, '') + `/internal/carpeta-digital/personas/${persona}/estado-rund`;
    const response = await fetch(url, { headers: { 'x-rund-carpeta-sync-token': token, Accept: 'application/json' },
      redirect: 'error', signal: AbortSignal.timeout(15_000) });
    if (!response.ok || !response.body) { await response.body?.cancel(); throw new ServiceUnavailableException('Auth no entregó un estado completo.'); }
    // Límite también para respuestas chunked: no leer cantidades ilimitadas antes de validar.
    const reader = response.body.getReader(); let size = 0; const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.length; if (size > 8 * 1024 * 1024) throw new ServiceUnavailableException('Respuesta de Auth demasiado grande.');
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    return validateAuthState(JSON.parse(Buffer.concat(chunks).toString('utf8')), persona);
  }

  async syncPersona(persona: string) {
    if (!this.enabled) throw new ConflictException('Sincronización de carpeta deshabilitada.');
    persona = persona.toLowerCase();
    if (!UUID.test(persona)) throw new ConflictException('Identificador de persona inválido.');
    let attemptedAt: Date | undefined;
    try {
      await this.db.transaction(async manager => {
        // Serializa todos los perfiles/periodos de una persona antes de consultar al propietario.
        await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 6123))', [persona]);
        const [clock] = await manager.query('SELECT clock_timestamp() AS attempted_at');
        attemptedAt = clock.attempted_at;
        const state = await this.readAuth(persona);
        const [old] = await manager.query('SELECT revision::text, fingerprint FROM rund.carpeta_auth_sync WHERE persona_id=$1', [persona]);
        if (old?.revision != null && (BigInt(state.revision) < BigInt(old.revision) ||
            (state.revision === old.revision && state.fingerprint !== old.fingerprint))) {
          throw new ConflictException('Revisión de Auth antigua o inconsistente; se conserva la proyección previa.');
        }
        if (old?.revision !== state.revision) {
          for (const doc of state.documentos) {
            await manager.query(`INSERT INTO rund.carpeta_auth_documento (persona_id,documento_id,metadata) VALUES ($1,$2,$3::jsonb)
              ON CONFLICT (persona_id,documento_id) DO UPDATE SET metadata=EXCLUDED.metadata
              WHERE rund.carpeta_auth_documento.metadata IS DISTINCT FROM EXCLUDED.metadata`, [persona, doc.id, JSON.stringify(doc)]);
          }
          await manager.query('DELETE FROM rund.carpeta_auth_documento WHERE persona_id=$1 AND NOT (documento_id=ANY($2::uuid[]))',
            [persona, state.documentos.map(d => d.id)]);
          await manager.query(`INSERT INTO rund.carpeta_auth_sync_evento (persona_id,revision,fingerprint,total,deleted)
            VALUES ($1,$2,$3,$4,$5)`, [persona, state.revision, state.fingerprint, state.documentos.length, state.deleted]);
        }
        await manager.query(`INSERT INTO rund.carpeta_auth_sync (persona_id,revision,fingerprint,deleted,last_attempt_at,last_synced_at,error_code)
          VALUES ($1,$2,$3,$4,$5,clock_timestamp(),null) ON CONFLICT (persona_id) DO UPDATE SET revision=EXCLUDED.revision,
          fingerprint=EXCLUDED.fingerprint,deleted=EXCLUDED.deleted,last_attempt_at=EXCLUDED.last_attempt_at,last_synced_at=EXCLUDED.last_synced_at,error_code=null`,
          [persona, state.revision, state.fingerprint, state.deleted, attemptedAt]);
      });
    } catch (error) {
      // Registro operativo separado: nunca sustituye el último estado persistido por un vacío.
      try {
        if (attemptedAt) await this.db.query(`INSERT INTO rund.carpeta_auth_sync (persona_id,error_code,last_attempt_at) VALUES ($1,'AUTH_STATE_UNAVAILABLE',$2)
          ON CONFLICT (persona_id) DO UPDATE SET last_attempt_at=EXCLUDED.last_attempt_at,error_code=EXCLUDED.error_code
          WHERE rund.carpeta_auth_sync.last_attempt_at <= EXCLUDED.last_attempt_at`, [persona, attemptedAt]);
      } catch { /* No ocultar el fallo original si aún falta la migración. */ }
      if (error instanceof ConflictException || error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('No se pudo sincronizar el estado de Auth; se conserva el anterior.');
    }
    return this.getPersona(persona);
  }

  async getPersona(persona: string) {
    return this.db.transaction('REPEATABLE READ', async manager => {
      const [status] = await manager.query(`SELECT revision::text,last_synced_at,last_attempt_at,error_code,deleted
        FROM rund.carpeta_auth_sync WHERE persona_id=$1`, [persona]);
      const documents = await manager.query('SELECT metadata FROM rund.carpeta_auth_documento WHERE persona_id=$1 ORDER BY documento_id', [persona]);
      return { propietario: 'auth', scope: 'documentos-generales', sincronizado: status?.revision != null,
        revision: status?.revision ?? null, ultima_sincronizacion: status?.last_synced_at ?? null,
        ultimo_intento: status?.last_attempt_at ?? null, error: status?.error_code ?? null, deleted: status?.deleted ?? false,
        documentos: documents.map(d => d.metadata) };
    });
  }
}

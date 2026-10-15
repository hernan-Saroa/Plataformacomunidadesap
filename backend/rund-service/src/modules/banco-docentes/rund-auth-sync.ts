import { BadGatewayException, GatewayTimeoutException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EVIDENCE_TYPES } from './rund-evidence-workflow';
import { CAMPOS_SOPORTE_RUND } from './rund-document-fields';
import { RundAuthSyncOwner } from './rund-auth-sync-owner';

export type RundAuthSyncResult = { total: number; created: number; skipped: number; failed: number };
export type RundAuthSyncActor = { actorId: string; ip?: string };
type AuthPerson = { id: string; user: { id_user: string; is_active: boolean; roles?: Array<{ id: string; code: string; is_active: boolean }> } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 100;

function positiveSetting(name: string, fallback: number, maximum: number): number {
  const raw = String(process.env[name] || '').trim();
  const value = raw ? Number(raw) : fallback;
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new ServiceUnavailableException(`Configuración ${name} inválida para sincronizar RUND.`);
  }
  return value;
}

async function readAuthUsers(base: URL, token: string, roleId: string, timeout: number, maxPages: number): Promise<AuthPerson[]> {
  const users: AuthPerson[] = [];
  const seenUsers = new Set<string>();
  let expectedTotal: number | undefined;
  let expectedPages: number | undefined;
  let expectedLimit: number | undefined;
  for (let page = 1; page <= maxPages; page++) {
    const url = new URL(base);
    url.pathname = url.pathname.replace(/\/$/, '') + '/users';
    url.search = new URLSearchParams({ role: roleId, status: 'active', limit: String(PAGE_SIZE), page: String(page), sortBy: 'usuario', sortOrder: 'asc' }).toString();
    let body: any;
    try {
      const response = await fetch(url, { headers: { 'x-internal-service-token': token, Accept: 'application/json' },
        redirect: 'error', signal: AbortSignal.timeout(timeout) });
      if (!response.ok) throw new BadGatewayException(`Auth rechazó la consulta de docentes (HTTP ${response.status}).`);
      const text = await response.text();
      if (text.length > 4 * 1024 * 1024) throw new BadGatewayException('La respuesta de auth excede el límite de sincronización.');
      body = JSON.parse(text);
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      if ((error as Error).name === 'TimeoutError' || (error as Error).name === 'AbortError') {
        throw new GatewayTimeoutException('Auth no respondió dentro del plazo de sincronización.');
      }
      throw new BadGatewayException('No fue posible consultar los docentes de auth.');
    }
    // Auth puede devolver el controlador directamente o envolverlo con ResponseInterceptor.
    const envelope = Array.isArray(body?.data) ? body : body?.data;
    const meta = envelope?.meta;
    if (body?.success === false || !Array.isArray(envelope?.data) || !meta
      || !Number.isSafeInteger(meta.total) || meta.total < 0
      || !Number.isSafeInteger(meta.limit) || meta.limit < 1 || meta.limit > PAGE_SIZE
      || meta.page !== page || !Number.isSafeInteger(meta.totalPages)
      || meta.totalPages !== Math.ceil(meta.total / meta.limit) || meta.totalPages > maxPages
      || envelope.data.length !== Math.min(meta.limit, Math.max(0, meta.total - (page - 1) * meta.limit))) {
      throw new BadGatewayException('Auth devolvió una página de docentes incompleta o incompatible.');
    }
    if (expectedTotal !== undefined && (meta.total !== expectedTotal || meta.totalPages !== expectedPages || meta.limit !== expectedLimit)) {
      throw new BadGatewayException('El listado de auth cambió durante la sincronización. Repita la operación.');
    }
    expectedTotal = meta.total;
    expectedPages = meta.totalPages;
    expectedLimit = meta.limit;
    for (const person of envelope.data) {
      if (!person || typeof person.id !== 'string' || !UUID.test(person.id)
        || typeof person.user?.id_user !== 'string' || !UUID.test(person.user.id_user)
        || typeof person.user.is_active !== 'boolean' || !Array.isArray(person.user.roles)
        || !person.user.roles.every((role: any) => role && typeof role.id === 'string' && UUID.test(role.id)
          && typeof role.code === 'string' && typeof role.is_active === 'boolean')) {
        throw new BadGatewayException('Auth devolvió una identidad docente incompatible.');
      }
      const userId = person.user.id_user.toLowerCase();
      if (seenUsers.has(userId)) throw new BadGatewayException('Auth repitió una identidad entre páginas. Repita la operación.');
      seenUsers.add(userId);
      users.push(person);
    }
    if (page >= meta.totalPages) return users;
  }
  throw new BadGatewayException('El listado de auth excede el límite de páginas de sincronización.');
}

/** Alta mínima en RUND: jamás crea/actualiza personas, cuentas o asignaciones de auth. */
export async function syncRundProfilesFromAuth(db: DataSource, authServiceUrl: string, actor: RundAuthSyncActor): Promise<RundAuthSyncResult> {
  const token = String(process.env.AUTH_INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '').trim();
  if (!token) throw new ServiceUnavailableException('Falta AUTH_INTERNAL_SERVICE_TOKEN para sincronizar RUND con auth.');
  let base: URL;
  try {
    base = new URL(authServiceUrl);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error();
  } catch { throw new ServiceUnavailableException('AUTH_SERVICE_URL no es una base HTTP válida.'); }
  const timeout = positiveSetting('RUND_AUTH_SYNC_TIMEOUT_MS', 15000, 120000);
  const maxPages = positiveSetting('RUND_AUTH_SYNC_MAX_PAGES', 1000, 10000);
  const owner = new RundAuthSyncOwner(base, token, timeout);
  let roleId: string;
  try {
    roleId = await owner.rolDocente();
  } catch { throw new ServiceUnavailableException('No fue posible resolver el rol DOCENTE activo de auth.'); }
  // Completar/validar todas las páginas antes de abrir una transacción que escriba perfiles.
  const people = await readAuthUsers(base, token, roleId, timeout, maxPages);
  // Tomar los locks en el mismo orden aun si los nombres cambian entre dos snapshots.
  people.sort((a, b) => a.id.toLowerCase().localeCompare(b.id.toLowerCase()));
  try {
    return await db.transaction(async manager => {
      const result: RundAuthSyncResult = { total: people.length, created: 0, skipped: 0, failed: 0 };
      for (const person of people) {
        if (!person.user.is_active || !person.user.roles?.some(role => role && String(role.id).toLowerCase() === roleId.toLowerCase()
          && String(role.code).toUpperCase() === 'DOCENTE' && role.is_active === true)) {
          result.skipped++;
          continue;
        }
        const personId = person.id.toLowerCase();
        // Serializa sincronizaciones de esta persona, incluso entre instancias de rund-service.
        await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', ['rund-auth-sync:' + personId]);
        // Revalidar en el propietario DESPUÉS del lock, también al esperar otra instancia.
        const identity = await owner.revalidar(personId, person.user.id_user, roleId);
        if (!identity) { result.failed++; continue; }
        if (!identity.usuario_activo || !identity.rol_docente_activo) { result.skipped++; continue; }
        // Cualquier periodo existente se conserva; no crear otro perfil base ni modificarlo.
        const existing = await manager.query('SELECT id FROM rund."Docente" WHERE "personaId" = $1 LIMIT 1', [personId]);
        if (existing.length) { result.skipped++; continue; }
        const document = String(identity.num_identificacion || '').trim();
        const email = String(identity.dir_email || '').trim().toLowerCase();
        if (!document || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { result.failed++; continue; }
        const conflict = await manager.query('SELECT id FROM rund."Docente" WHERE LOWER("correoInstitucional") = $1 LIMIT 1', [email]);
        if (conflict.length) { result.failed++; continue; }
        const sequence = await manager.query("SELECT nextval('rund.docente_id_rund_seq')::text AS next_val");
        const idRund = 'RUND-' + String(sequence[0].next_val).padStart(4, '0');
        const created = await manager.query(`INSERT INTO rund."Docente"
            ("personaId", "territorialId", "territorialReportada", "sedeId", "tipoVinculacion", dedicacion,
             estado, "estadoAprobacion", "horasAsignables", "correoInstitucional", "idRund", canal_origen, "updatedAt")
          SELECT $1, $2, $3, $4, '', '', 'INACTIVO', 'PENDIENTE_APROBACION', 0, $5, $6, 'API', now()
          WHERE NOT EXISTS (SELECT 1 FROM rund."Docente" WHERE "personaId" = $1)
          ON CONFLICT DO NOTHING RETURNING id`,
          [personId, identity.territorial_id || '', identity.territorial_nombre || null, identity.sede_id || null, email, idRund]);
        if (!created.length) { result.skipped++; continue; }
        const docenteId = created[0].id;
        for (const block of Object.keys(EVIDENCE_TYPES)) {
          await manager.query(`INSERT INTO rund."RundCampoEstado"
            (docente_id, bloque, estado, cargado_por, canal_origen, version, soporte_ids, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, 'API', 1, '[]', now(), now())`,
            [docenteId, block, block === 'CONTACTO' ? 'Pendiente' : 'Soporte faltante', actor.actorId]);
        }
        for (const field of CAMPOS_SOPORTE_RUND) {
          await manager.query(`INSERT INTO rund.validacion_documental
            (docente_id, campo_rund, tipo_documento_soporte, estado_documento)
            VALUES ($1, $2, $3, 'Sin cargar') ON CONFLICT (docente_id, campo_rund) DO NOTHING`, [docenteId, field.campo, field.tipo]);
        }
        await manager.query(`INSERT INTO rund."RundAprobacionLog"
          (docente_id, bloque, accion, actor_id, canal_origen, soporte_id, observacion, ip, metadata)
          VALUES ($1, 'GENERAL', 'CREAR', $2, 'API', 'AUTH_SYNC',
            'Alta mínima desde auth; pendiente de completar y validar por Gestión Profesoral.', $3, $4::jsonb)`,
          [docenteId, actor.actorId, actor.ip || null, JSON.stringify({ fuente: 'auth-service', modo: 'solo_creacion', usuarioId: person.user.id_user })]);
        result.created++;
      }
      return result;
    });
  } catch { throw new ServiceUnavailableException('No fue posible completar la transacción de sincronización RUND.'); }
}

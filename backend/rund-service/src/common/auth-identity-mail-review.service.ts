import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AuthIdentityClient } from './auth-identity.client';
import { RUND_BANK_PERMISSIONS } from '../auth/rund-permission-catalog';

export interface MailReviewActor { actorId: string; roles: string[]; expiresAt: number }
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
const timestamp = (v: unknown) => typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(v)
  && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v.replace(/(\.\d{3})\d{3}Z$/,'$1Z');
const projection = `c.*,to_char(c.creada_en AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS fecha_creada,
  to_char(c.asumida_en AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS fecha_asumida,
  m.estado AS estado_correo,m.intento_id AS intento_actual,
  r.intento_id AS intento_resultado,r.resultado`;
const joins = `FROM rund.identidad_correo_revision c JOIN rund.identidad_correo m USING(intencion_id)
  LEFT JOIN rund.identidad_correo_resultado r USING(intencion_id)`;

/** Bandeja opcional; solo modifica casos. No importa consumidor, conciliador o SMTP. */
@Injectable()
export class AuthIdentityMailReviewService {
  constructor(private readonly db: DataSource, private readonly identities: AuthIdentityClient) {}
  private id(v: unknown) { if (!uuid(v)) throw new BadRequestException('Identificador de revision invalido.'); return v.toLowerCase(); }
  private actor(a: MailReviewActor): MailReviewActor {
    return { actorId: typeof a?.actorId === 'string' ? a.actorId.toLowerCase() : '',
      roles: Array.isArray(a?.roles) ? a.roles.filter(r => typeof r === 'string') : [], expiresAt: a?.expiresAt };
  }
  private async authorize(a: MailReviewActor) {
    if (!uuid(a.actorId) || !Number.isFinite(a.expiresAt) || a.expiresAt <= Date.now()/1000)
      throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
    if (a.roles.some(r => ['GESTION_PROFESORAL','SUPER_ADMIN','ADMIN'].includes(r))) return;
    let permissions: string[];
    try { permissions = await this.identities.permisosRoles(a.roles); }
    catch { throw new ForbiddenException('No se pudo confirmar la autorizacion RUND vigente.'); }
    if (!permissions.includes(RUND_BANK_PERMISSIONS.MANAGE)) throw new ForbiddenException('La revision requiere autorizacion RUND vigente.');
    if (a.expiresAt <= Date.now()/1000) throw new UnauthorizedException('La sesion requiere autenticacion vigente.');
  }
  private async safe<T>(work: () => Promise<T>): Promise<T> {
    try { return await work(); }
    catch (e) { if (e instanceof HttpException) throw e; throw new ServiceUnavailableException('No fue posible confirmar la revision de correo RUND.'); }
  }
  private dto(row: any) {
    if (!row || !uuid(row.caso_id) || !uuid(row.intencion_id) || !uuid(row.intento_id)
      || row.intento_actual !== row.intento_id || !['PENDIENTE','EN_REVISION'].includes(row.estado)
      || !['ENVIANDO','INCIERTO'].includes(row.estado_correo_inicial) || !uuid(row.registrada_por)
      || !timestamp(row.fecha_creada) || (row.estado === 'PENDIENTE' ? row.asumida_por !== null || row.fecha_asumida !== null
        : !uuid(row.asumida_por) || !timestamp(row.fecha_asumida))
      || !['ENVIANDO','ENVIADO','INCIERTO'].includes(row.estado_correo)
      || (row.resultado === null && row.intento_resultado !== null)
      || (row.resultado !== null && (row.intento_resultado !== row.intento_id || !['ACEPTADO','INCIERTO'].includes(row.resultado)
        || (row.estado_correo !== 'ENVIANDO' && row.estado_correo !== (row.resultado === 'ACEPTADO' ? 'ENVIADO' : 'INCIERTO'))))) throw new Error();
    return { version: 1 as const, casoId: row.caso_id, intencionId: row.intencion_id,
      estado: row.estado, creadaEn: row.fecha_creada, registradaPor: row.registrada_por,
      asumidaPor: row.asumida_por, asumidaEn: row.fecha_asumida, estadoCorreoInicial: row.estado_correo_inicial,
      estadoCorreo: row.estado_correo, resultadoRegistrado: row.resultado !== null, requiereRevision: row.estado_correo !== 'ENVIADO' };
  }
  private async read(manager: Pick<EntityManager,'query'>, id: string) {
    const [row] = await manager.query(`SELECT ${projection} ${joins} WHERE c.caso_id=$1`, [id]);
    if (!row) throw new NotFoundException('Caso de revision no registrado.'); return this.dto(row);
  }
  async consultar(value: string, actor: MailReviewActor) {
    const id = this.id(value), a = this.actor(actor); await this.authorize(a);
    return this.safe(async () => { const result = await this.read(this.db, id); await this.authorize(a); return result; });
  }
  async listar(raw: unknown, actor: MailReviewActor) {
    const a = this.actor(actor); await this.authorize(a);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).some(k => !['limite','cursor','estado'].includes(k)))
      throw new BadRequestException('Consulta de revisiones invalida.');
    const q = raw as Record<string,unknown>, state = q.estado ?? null;
    const limit = q.limite === undefined ? 25 : typeof q.limite === 'string' && /^[1-9]\d{0,2}$/.test(q.limite) ? Number(q.limite) : NaN;
    if (!Number.isInteger(limit) || limit > 100 || (state !== null && !['PENDIENTE','EN_REVISION'].includes(state as string)))
      throw new BadRequestException('Filtro de revisiones invalido.');
    let date: string | null = null, caseId: string | null = null;
    if (q.cursor !== undefined) {
      try {
        if (typeof q.cursor !== 'string' || q.cursor.length > 512 || !/^[-\w]+$/.test(q.cursor)) throw new Error();
        const bytes = Buffer.from(q.cursor,'base64url'), c = JSON.parse(bytes.toString('utf8'));
        if (bytes.toString('base64url') !== q.cursor || !c || Array.isArray(c) || Object.keys(c).length !== 4
          || c.version !== 1 || !uuid(c.casoId) || c.estado !== state || typeof c.creadaEn !== 'string'
          || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(c.creadaEn)
          || !Number.isFinite(Date.parse(c.creadaEn)) || new Date(c.creadaEn).toISOString() !== c.creadaEn.replace(/(\.\d{3})\d{3}Z$/,'$1Z')) throw new Error();
        date = c.creadaEn; caseId = c.casoId.toLowerCase();
      } catch { throw new BadRequestException('Cursor de revisiones invalido.'); }
    }
    return this.safe(async () => {
      const rows = await this.db.query(`SELECT ${projection} ${joins} WHERE ($1::text IS NULL OR c.estado=$1)
        AND ($2::timestamptz IS NULL OR (c.creada_en,c.caso_id)>($2::timestamptz,$3::uuid))
        ORDER BY c.creada_en,c.caso_id LIMIT $4`, [state,date,caseId,limit+1]);
      const page = rows.slice(0,limit), last = page[page.length-1];
      const result = { casos: page.map(r => this.dto(r)), siguienteCursor: rows.length > limit && last ?
        Buffer.from(JSON.stringify({version:1,creadaEn:last.fecha_creada,casoId:last.caso_id,estado:state})).toString('base64url') : null };
      await this.authorize(a); return result;
    });
  }
  async registrar(value: string, actor: MailReviewActor) {
    const id = this.id(value), a = this.actor(actor); await this.authorize(a);
    return this.safe(() => this.db.transaction(async manager => {
      await manager.query("SET LOCAL lock_timeout='5s'");
      const [mail] = await manager.query('SELECT * FROM rund.identidad_correo WHERE intencion_id=$1 FOR UPDATE', [id]);
      if (!mail) throw new NotFoundException('Aviso de correo RUND no registrado.');
      const [existing] = await manager.query('SELECT caso_id FROM rund.identidad_correo_revision WHERE intencion_id=$1', [id]);
      let caseId = existing?.caso_id;
      if (!caseId) {
        const [event] = await manager.query('SELECT intento_id FROM rund.identidad_correo_resultado WHERE intencion_id=$1', [id]);
        if (!['ENVIANDO','INCIERTO'].includes(mail.estado) || !uuid(mail.intento_id) || event)
          throw new ConflictException('El aviso no requiere revision por falta de resultado.');
        const [created] = await manager.query(`INSERT INTO rund.identidad_correo_revision
          (intencion_id,intento_id,estado_correo_inicial,registrada_por) VALUES($1,$2,$3,$4) RETURNING caso_id`,
        [id,mail.intento_id,mail.estado,a.actorId]);
        caseId = created?.caso_id; if (!uuid(caseId)) throw new Error();
      }
      const result = await this.read(manager, caseId); await this.authorize(a); return result;
    }));
  }
  /** Entrada explícita para incertidumbre registrada; no concilia, cierra o reenvía. */
  async registrarIncierto(value: string, actor: MailReviewActor) {
    const id = this.id(value), a = this.actor(actor); await this.authorize(a);
    return this.safe(() => this.db.transaction(async manager => {
      await manager.query("SET LOCAL lock_timeout='5s'");
      const [mail] = await manager.query('SELECT * FROM rund.identidad_correo WHERE intencion_id=$1 FOR UPDATE', [id]);
      if (!mail) throw new NotFoundException('Aviso de correo RUND no registrado.');
      const [event] = await manager.query('SELECT intento_id,resultado FROM rund.identidad_correo_resultado WHERE intencion_id=$1', [id]);
      if (mail.intencion_id !== id || mail.estado !== 'INCIERTO' || !uuid(mail.intento_id)
        || event?.resultado !== 'INCIERTO' || event.intento_id !== mail.intento_id)
        throw new ConflictException('La revision requiere resultado incierto conciliado del mismo intento.');
      const [existing] = await manager.query('SELECT caso_id FROM rund.identidad_correo_revision WHERE intencion_id=$1', [id]);
      let caseId = existing?.caso_id;
      if (!caseId) {
        const [created] = await manager.query(`INSERT INTO rund.identidad_correo_revision
          (intencion_id,intento_id,estado_correo_inicial,registrada_por) VALUES($1,$2,$3,$4) RETURNING caso_id`,
        [id,mail.intento_id,'INCIERTO',a.actorId]);
        caseId = created?.caso_id; if (!uuid(caseId)) throw new Error();
      }
      const result = await this.read(manager,caseId); await this.authorize(a); return result;
    }));
  }
  async asumir(value: string, actor: MailReviewActor) {
    const id = this.id(value), a = this.actor(actor); await this.authorize(a);
    return this.safe(() => this.db.transaction(async manager => {
      await manager.query("SET LOCAL lock_timeout='5s'");
      const [link] = await manager.query('SELECT intencion_id FROM rund.identidad_correo_revision WHERE caso_id=$1', [id]);
      if (!link) throw new NotFoundException('Caso de revision no registrado.');
      // Mismo orden que registro/resultado/conciliación: primero aviso, después caso.
      const [mail] = await manager.query('SELECT * FROM rund.identidad_correo WHERE intencion_id=$1 FOR UPDATE', [link.intencion_id]);
      const [current] = await manager.query('SELECT * FROM rund.identidad_correo_revision WHERE caso_id=$1 FOR UPDATE', [id]);
      if (!mail || !current) throw new Error();
      if (current.estado === 'EN_REVISION') {
        if (current.asumida_por !== a.actorId) throw new ConflictException('El caso ya tiene otro responsable.');
      } else {
        if (current.estado !== 'PENDIENTE' || mail.estado === 'ENVIADO') throw new ConflictException('El caso no admite asignacion.');
        const [updated] = await manager.query(`WITH asumida AS (UPDATE rund.identidad_correo_revision SET estado='EN_REVISION',
          asumida_por=$2,asumida_en=CURRENT_TIMESTAMP WHERE caso_id=$1 AND estado='PENDIENTE' RETURNING caso_id) SELECT * FROM asumida`, [id,a.actorId]);
        if (updated?.caso_id !== id) throw new Error();
      }
      const result = await this.read(manager, id); await this.authorize(a); return result;
    }));
  }
}
